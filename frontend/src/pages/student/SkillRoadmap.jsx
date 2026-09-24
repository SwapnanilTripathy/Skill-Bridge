import { useEffect, useState } from "react";

import { supabase } from "../../services/supabase";
import { useAuth } from "../../hooks/useAuth";
import "./SkillRoadmap.css";

function SkillRoadmap() {
  const { user } = useAuth();

  const [studentProfile, setStudentProfile] = useState(null);
  const [matches, setMatches] = useState([]);
  const [opportunities, setOpportunities] = useState({});
  const [roadmaps, setRoadmaps] = useState([]);

  const [loading, setLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* =========================
     LOAD PAGE DATA
  ========================= */

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    async function loadRoadmapData() {
      try {
        setLoading(true);
        setError("");

        /* STUDENT PROFILE */

        const { data: profileData, error: profileError } =
          await supabase
            .from("student_profiles")
            .select("id")
            .eq("user_id", user.id)
            .single();

        if (profileError) throw profileError;

        /* MATCHES */

        const { data: matchData, error: matchError } =
          await supabase
            .from("matches")
            .select("*")
            .eq("student_id", profileData.id)
            .order("calculated_at", {
              ascending: false,
            });

        if (matchError) throw matchError;

        const loadedMatches = matchData || [];

        /* OPPORTUNITIES */

        const opportunityIds = [
          ...new Set(
            loadedMatches
              .map((match) => match.opportunity_id)
              .filter(Boolean)
          ),
        ];

        let opportunityMap = {};

        if (opportunityIds.length > 0) {
          const {
            data: opportunityData,
            error: opportunityError,
          } = await supabase
            .from("opportunities")
            .select("id, title, type")
            .in("id", opportunityIds);

          if (opportunityError) throw opportunityError;

          opportunityMap = (opportunityData || []).reduce(
            (map, opportunity) => {
              map[opportunity.id] = opportunity;
              return map;
            },
            {}
          );
        }

        /* EXISTING ROADMAPS */

        const { data: roadmapData, error: roadmapError } =
          await supabase
            .from("roadmaps")
            .select("*")
            .eq("student_id", profileData.id)
            .order("created_at", {
              ascending: false,
            });

        if (roadmapError) throw roadmapError;

        if (!cancelled) {
          setStudentProfile(profileData);
          setMatches(loadedMatches);
          setOpportunities(opportunityMap);
          setRoadmaps(roadmapData || []);
        }
      } catch (err) {
        console.error("Roadmap loading error:", err);

        if (!cancelled) {
          setError(
            err?.message ||
              "Unable to load your skill roadmap."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadRoadmapData();

    return () => {
      cancelled = true;
    };
  }, [user]);

  /* =========================
     GENERATE ROADMAP
  ========================= */

  async function generateRoadmap(match) {
    if (!studentProfile) return;

    try {
      setGeneratingId(match.id);
      setError("");
      setSuccess("");

      const opportunity =
        opportunities[match.opportunity_id];

      const missingSkills = Array.isArray(
        match.missing_skills
      )
        ? match.missing_skills
        : [];

      if (missingSkills.length === 0) {
        setError(
          "No missing skills were found for this opportunity."
        );
        return;
      }

      /*
        Prioritize:
        1. Required before preferred
        2. Higher weight before lower weight
      */

      const prioritizedSkills = [...missingSkills].sort(
        (a, b) => {
          const aRequired =
            a?.requirement_type === "required" ? 1 : 0;

          const bRequired =
            b?.requirement_type === "required" ? 1 : 0;

          if (aRequired !== bRequired) {
            return bRequired - aRequired;
          }

          return (
            Number(b?.weight || 0) -
            Number(a?.weight || 0)
          );
        }
      );

      /*
        Convert gaps into roadmap steps.
      */

      const steps = prioritizedSkills.map(
        (skill, index) => {
          const requirementType =
            skill?.requirement_type || "preferred";

          const weight = Number(skill?.weight || 0);

          return {
            step: index + 1,
            skill_id: skill?.skill_id || null,
            skill_name:
              skill?.name || "Unnamed skill",
            requirement_type: requirementType,
            weight,
            status: "pending",
            completed: false,
            learning_goal:
              requirementType === "required"
                ? `Build the core ${skill?.name} knowledge required for this opportunity.`
                : `Strengthen ${skill?.name} to improve your overall fit for this opportunity.`,
          };
        }
      );

      /*
        Target score is a development target,
        not a guaranteed recalculated match.

        We cap it at 100.
      */

      const currentScore = Math.round(
        Number(match.match_score || 0)
      );

      const targetScore = Math.min(
        100,
        currentScore + 30
      );

      const title = opportunity?.title
        ? `Roadmap to ${opportunity.title}`
        : "Opportunity Skill Roadmap";

      const planData = {
        opportunity_title:
          opportunity?.title || "Opportunity",

        generated_from_match: match.id,

        generated_at: new Date().toISOString(),

        required_skill_score: Math.round(
          Number(match.required_skill_score || 0)
        ),

        preferred_skill_score: Math.round(
          Number(match.preferred_skill_score || 0)
        ),

        missing_skill_count: steps.length,

        steps,
      };

      /*
        Prevent duplicate active roadmap
        for same opportunity.
      */

      const existingRoadmap = roadmaps.find(
        (roadmap) =>
          roadmap.opportunity_id ===
            match.opportunity_id &&
          roadmap.status === "active"
      );

      if (existingRoadmap) {
        setError(
          "You already have an active roadmap for this opportunity."
        );

        return;
      }

      /* SAVE ROADMAP */

      const { data: newRoadmap, error: insertError } =
        await supabase
          .from("roadmaps")
          .insert({
            student_id: studentProfile.id,
            opportunity_id: match.opportunity_id,
            title,
            current_match_score: currentScore,
            target_match_score: targetScore,
            plan_data: planData,
            progress_percentage: 0,
            status: "active",
          })
          .select("*")
          .single();

      if (insertError) throw insertError;

      setRoadmaps((previous) => [
        newRoadmap,
        ...previous,
      ]);

      setSuccess(
        `Roadmap created for ${
          opportunity?.title || "this opportunity"
        }.`
      );
    } catch (err) {
      console.error(
        "Roadmap generation error:",
        err
      );

      setError(
        err?.message ||
          "Unable to generate the roadmap."
      );
    } finally {
      setGeneratingId(null);
    }
  }

  /* =========================
     COMPLETE ROADMAP STEP
  ========================= */

  async function toggleStep(roadmap, stepNumber) {
    try {
      setError("");
      setSuccess("");

      const currentPlan =
        roadmap.plan_data &&
        typeof roadmap.plan_data === "object"
          ? roadmap.plan_data
          : {};

      const currentSteps = Array.isArray(
        currentPlan.steps
      )
        ? currentPlan.steps
        : [];

      const updatedSteps = currentSteps.map(
        (step) => {
          if (step.step !== stepNumber) {
            return step;
          }

          const completed = !step.completed;

          return {
            ...step,
            completed,
            status: completed
              ? "completed"
              : "pending",
          };
        }
      );

      const completedCount = updatedSteps.filter(
        (step) => step.completed
      ).length;

      const progress =
        updatedSteps.length > 0
          ? Math.round(
              (completedCount /
                updatedSteps.length) *
                100
            )
          : 0;

      const roadmapStatus =
        progress === 100
          ? "completed"
          : "active";

      const updatedPlan = {
        ...currentPlan,
        steps: updatedSteps,
      };

      const { data, error: updateError } =
        await supabase
          .from("roadmaps")
          .update({
            plan_data: updatedPlan,
            progress_percentage: progress,
            status: roadmapStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", roadmap.id)
          .select("*")
          .single();

      if (updateError) throw updateError;

      setRoadmaps((previous) =>
        previous.map((item) =>
          item.id === roadmap.id ? data : item
        )
      );

      if (progress === 100) {
        setSuccess(
          "Roadmap completed. Complete a skill assessment after learning to verify your improved skills."
        );
      }
    } catch (err) {
      console.error(
        "Roadmap progress error:",
        err
      );

      setError(
        err?.message ||
          "Unable to update roadmap progress."
      );
    }
  }

  /* =========================
     LOADING
  ========================= */

  if (loading) {
    return (
      <div className="skill-roadmap-page">
        <div className="skill-roadmap-state">
          Loading your skill roadmap...
        </div>
      </div>
    );
  }

  /* =========================
     LOAD ERROR
  ========================= */

  if (error && !studentProfile) {
    return (
      <div className="skill-roadmap-page">
        <div className="skill-roadmap-state">
          <h3>Unable to load roadmap</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const activeRoadmaps = roadmaps.filter(
    (roadmap) => roadmap.status === "active"
  );

  const completedRoadmaps = roadmaps.filter(
    (roadmap) => roadmap.status === "completed"
  );

  /* =========================
     PAGE
  ========================= */

  return (
    <div className="skill-roadmap-page">
      {/* HEADER */}

      <section className="skill-roadmap-header">
        <span className="skill-roadmap-kicker">
          // personalized development
        </span>

        <h1>Skill Roadmap</h1>

        <p>
          Turn your opportunity skill gaps into a focused
          learning plan and track your progress toward
          stronger matches.
        </p>
      </section>

      {/* MESSAGES */}

      {error && (
        <div className="skill-roadmap-message error">
          {error}
        </div>
      )}

      {success && (
        <div className="skill-roadmap-message success">
          {success}
        </div>
      )}

      {/* STATS */}

      <section className="skill-roadmap-overview">
        <article className="skill-roadmap-stat">
          <span>Opportunity matches</span>
          <strong>{matches.length}</strong>

          <p>
            Opportunities analyzed against your current
            skill profile.
          </p>
        </article>

        <article className="skill-roadmap-stat">
          <span>Active roadmaps</span>
          <strong>{activeRoadmaps.length}</strong>

          <p>
            Personalized development plans currently in
            progress.
          </p>
        </article>

        <article className="skill-roadmap-stat">
          <span>Completed roadmaps</span>
          <strong>{completedRoadmaps.length}</strong>

          <p>
            Learning plans you have already completed.
          </p>
        </article>
      </section>

      {/* ROADMAPS */}

      <section className="skill-roadmap-section">
        <div className="skill-roadmap-section-heading">
          <div>
            <span className="skill-roadmap-kicker">
              // your plans
            </span>

            <h2>Your roadmaps</h2>
          </div>

          <span className="skill-roadmap-count">
            {roadmaps.length} total
          </span>
        </div>

        {roadmaps.length === 0 ? (
          <div className="skill-roadmap-empty">
            <span>01</span>

            <div>
              <h3>No roadmap generated yet</h3>

              <p>
                Choose an opportunity below and SkillBridge
                will convert its missing skills into a
                prioritized development plan.
              </p>
            </div>
          </div>
        ) : (
          <div className="skill-roadmap-list">
            {roadmaps.map((roadmap) => {
              const steps = Array.isArray(
                roadmap?.plan_data?.steps
              )
                ? roadmap.plan_data.steps
                : [];

              return (
                <article
                  className="skill-roadmap-card"
                  key={roadmap.id}
                >
                  <div className="skill-roadmap-card-top">
                    <span
                      className={`skill-roadmap-status ${roadmap.status}`}
                    >
                      {roadmap.status}
                    </span>

                    <span>
                      {Math.round(
                        Number(
                          roadmap.progress_percentage ||
                            0
                        )
                      )}
                      % complete
                    </span>
                  </div>

                  <h3>{roadmap.title}</h3>

                  <div className="skill-roadmap-score-row">
                    <div>
                      <span>Current match</span>

                      <strong>
                        {Math.round(
                          Number(
                            roadmap.current_match_score ||
                              0
                          )
                        )}
                        %
                      </strong>
                    </div>

                    <div className="skill-roadmap-score-arrow">
                      →
                    </div>

                    <div>
                      <span>Development target</span>

                      <strong>
                        {Math.round(
                          Number(
                            roadmap.target_match_score ||
                              0
                          )
                        )}
                        %
                      </strong>
                    </div>
                  </div>

                  <div className="skill-roadmap-progress">
                    <div
                      style={{
                        width: `${Math.min(
                          Number(
                            roadmap.progress_percentage ||
                              0
                          ),
                          100
                        )}%`,
                      }}
                    />
                  </div>

                  {steps.length > 0 && (
                    <div className="skill-roadmap-steps">
                      {steps.map((step) => (
                        <button
                          type="button"
                          className={`skill-roadmap-step ${
                            step.completed
                              ? "completed"
                              : ""
                          }`}
                          key={step.step}
                          onClick={() =>
                            toggleStep(
                              roadmap,
                              step.step
                            )
                          }
                        >
                          <span className="skill-roadmap-step-number">
                            {step.completed
                              ? "✓"
                              : step.step}
                          </span>

                          <span className="skill-roadmap-step-copy">
                            <strong>
                              {step.skill_name}
                            </strong>

                            <small>
                              {step.requirement_type} •
                              weight {step.weight}
                            </small>

                            <p>
                              {step.learning_goal}
                            </p>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="skill-roadmap-note">
                    Completing learning steps tracks your
                    development progress. Verify newly learned
                    skills through an assessment to update your
                    skill profile and opportunity matches.
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* OPPORTUNITY GAPS */}

      <section className="skill-roadmap-section">
        <div className="skill-roadmap-section-heading">
          <div>
            <span className="skill-roadmap-kicker">
              // industry skill gaps
            </span>

            <h2>Build from an opportunity</h2>
          </div>
        </div>

        {matches.length === 0 ? (
          <div className="skill-roadmap-empty">
            <span>02</span>

            <div>
              <h3>No opportunity matches yet</h3>

              <p>
                Visit Opportunities first so SkillBridge can
                compare your profile with industry
                requirements.
              </p>
            </div>
          </div>
        ) : (
          <div className="skill-roadmap-match-list">
            {matches.map((match) => {
              const opportunity =
                opportunities[match.opportunity_id];

              const missingSkills = Array.isArray(
                match.missing_skills
              )
                ? match.missing_skills
                : [];

              const matchedSkills = Array.isArray(
                match.matched_skills
              )
                ? match.matched_skills
                : [];

              const alreadyGenerated = roadmaps.some(
                (roadmap) =>
                  roadmap.opportunity_id ===
                    match.opportunity_id &&
                  roadmap.status === "active"
              );

              return (
                <article
                  className="skill-roadmap-match-card"
                  key={match.id}
                >
                  <div className="skill-roadmap-match-main">
                    <div className="skill-roadmap-match-top">
                      <div>
                        <span className="skill-roadmap-match-label">
                          {opportunity?.type ||
                            "Opportunity"}
                        </span>

                        <h3>
                          {opportunity?.title ||
                            "Opportunity"}
                        </h3>
                      </div>

                      <div className="skill-roadmap-match-score">
                        <strong>
                          {Math.round(
                            Number(
                              match.match_score || 0
                            )
                          )}
                          %
                        </strong>

                        <span>Current match</span>
                      </div>
                    </div>

                    <div className="skill-roadmap-match-metrics">
                      <div>
                        <span>Required</span>

                        <strong>
                          {Math.round(
                            Number(
                              match.required_skill_score ||
                                0
                            )
                          )}
                          %
                        </strong>
                      </div>

                      <div>
                        <span>Preferred</span>

                        <strong>
                          {Math.round(
                            Number(
                              match.preferred_skill_score ||
                                0
                            )
                          )}
                          %
                        </strong>
                      </div>

                      <div>
                        <span>Matched</span>
                        <strong>
                          {matchedSkills.length}
                        </strong>
                      </div>

                      <div>
                        <span>Skill gaps</span>
                        <strong>
                          {missingSkills.length}
                        </strong>
                      </div>
                    </div>

                    {missingSkills.length > 0 && (
                      <div className="skill-roadmap-gap-area">
                        <span className="skill-roadmap-gap-title">
                          Skills to improve
                        </span>

                        <div className="skill-roadmap-gap-list">
                          {[...missingSkills]
                            .sort((a, b) => {
                              const aRequired =
                                a?.requirement_type ===
                                "required"
                                  ? 1
                                  : 0;

                              const bRequired =
                                b?.requirement_type ===
                                "required"
                                  ? 1
                                  : 0;

                              if (
                                aRequired !== bRequired
                              ) {
                                return (
                                  bRequired -
                                  aRequired
                                );
                              }

                              return (
                                Number(
                                  b?.weight || 0
                                ) -
                                Number(
                                  a?.weight || 0
                                )
                              );
                            })
                            .map(
                              (
                                missingSkill,
                                index
                              ) => (
                                <div
                                  className="skill-roadmap-gap"
                                  key={
                                    missingSkill.skill_id ||
                                    index
                                  }
                                >
                                  <span>
                                    {index + 1}
                                  </span>

                                  <div>
                                    <strong>
                                      {missingSkill.name}
                                    </strong>

                                    <small>
                                      {missingSkill.requirement_type ||
                                        "preferred"}{" "}
                                      • weight{" "}
                                      {missingSkill.weight ||
                                        0}
                                    </small>
                                  </div>
                                </div>
                              )
                            )}
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    className="skill-roadmap-generate"
                    onClick={() =>
                      generateRoadmap(match)
                    }
                    disabled={
                      generatingId === match.id ||
                      alreadyGenerated ||
                      missingSkills.length === 0
                    }
                  >
                    {generatingId === match.id
                      ? "Generating..."
                      : alreadyGenerated
                        ? "Roadmap active ✓"
                        : missingSkills.length === 0
                          ? "No skill gaps"
                          : "Generate roadmap →"}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default SkillRoadmap;