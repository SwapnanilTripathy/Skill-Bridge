import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../hooks/useAuth";
import { supabase } from "../../services/supabase";
import "./LearningHub.css";

const PROFICIENCY_RANK = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
  expert: 4,
};

function normalizeProficiency(value) {
  return String(value || "").trim().toLowerCase();
}

function formatType(value) {
  if (!value) return "Training";

  return String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value) {
  if (!value) return "Not specified";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getRequiredLevelName(rank) {
  const match = Object.entries(PROFICIENCY_RANK).find(
    ([, value]) => value === rank
  );

  if (!match) {
    return "Beginner";
  }

  return match[0].charAt(0).toUpperCase() + match[0].slice(1);
}

function LearningHub() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [skills, setSkills] = useState([]);
  const [studentSkills, setStudentSkills] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [opportunitySkills, setOpportunitySkills] = useState([]);
  const [trainingPrograms, setTrainingPrograms] = useState([]);

  /*
   * Contains the IDs of skills for which at least
   * one assessment question exists.
   */
  const [assessableSkillIds, setAssessableSkillIds] = useState([]);

  /* =====================================================
     LOAD DATA
  ===================================================== */

  useEffect(() => {
    let cancelled = false;

    async function loadLearningHub() {
      if (!user?.id) {
        if (!cancelled) {
          setLoading(false);
        }

        return;
      }

      try {
        if (!cancelled) {
          setLoading(true);
          setError("");
        }

        /* =================================================
           1. STUDENT PROFILE
        ================================================= */

        const { data: profileData, error: profileError } = await supabase
          .from("student_profiles")
          .select(
            `
            id,
            user_id,
            institution_id,
            department_id,
            degree,
            current_year,
            graduation_year
          `
          )
          .eq("user_id", user.id)
          .single();

        if (profileError) {
          throw profileError;
        }

        if (!profileData) {
          throw new Error("Student profile could not be found.");
        }

        /* =================================================
           2. LOAD LEARNING HUB DATA
        ================================================= */

        const [
          skillsResult,
          studentSkillsResult,
          opportunitiesResult,
          opportunitySkillsResult,
          trainingResult,
          assessmentQuestionsResult,
        ] = await Promise.all([
          /* ALL SKILLS */

          supabase
            .from("skills")
            .select("id, name, category, description"),

          /* STUDENT'S CURRENT SKILLS */

          supabase
            .from("student_skills")
            .select(
              `
              id,
              student_id,
              skill_id,
              proficiency,
              source,
              verified
            `
            )
            .eq("student_id", profileData.id),

          /* OPEN OPPORTUNITIES */

          supabase
            .from("opportunities")
            .select(
              `
              id,
              title,
              type,
              status
            `
            )
            .eq("status", "open"),

          /* OPPORTUNITY SKILL REQUIREMENTS */

          supabase
            .from("opportunity_skills")
            .select(
              `
              id,
              opportunity_id,
              skill_id,
              requirement_type,
              minimum_proficiency,
              weight
            `
            ),

          /* AVAILABLE TRAINING */

          supabase
            .from("training_programs")
            .select(
              `
              id,
              institution_id,
              department_id,
              skill_id,
              title,
              description,
              provider,
              training_type,
              start_date,
              end_date,
              status,
              created_at
            `
            )
            .in("status", ["planned", "active"])
            .order("created_at", {
              ascending: false,
            }),

          /* AVAILABLE ASSESSMENTS */

          supabase
            .from("assessment_questions")
            .select("skill_id"),
        ]);

        /* =================================================
           3. ERROR CHECKING
        ================================================= */

        if (skillsResult.error) {
          throw skillsResult.error;
        }

        if (studentSkillsResult.error) {
          throw studentSkillsResult.error;
        }

        if (opportunitiesResult.error) {
          throw opportunitiesResult.error;
        }

        if (opportunitySkillsResult.error) {
          throw opportunitySkillsResult.error;
        }

        if (trainingResult.error) {
          throw trainingResult.error;
        }

        if (assessmentQuestionsResult.error) {
          throw assessmentQuestionsResult.error;
        }

        if (cancelled) {
          return;
        }

        /* =================================================
           4. BUILD ASSESSABLE SKILL LIST
        ================================================= */

        const availableAssessmentSkills = [
          ...new Set(
            (assessmentQuestionsResult.data || [])
              .map((question) => question.skill_id)
              .filter(Boolean)
          ),
        ];

        /* =================================================
           5. SAVE DATA
        ================================================= */

        setSkills(skillsResult.data || []);

        setStudentSkills(studentSkillsResult.data || []);

        setOpportunities(opportunitiesResult.data || []);

        setOpportunitySkills(opportunitySkillsResult.data || []);

        setTrainingPrograms(trainingResult.data || []);

        setAssessableSkillIds(availableAssessmentSkills);
      } catch (loadError) {
        console.error("Learning Hub load error:", loadError);

        if (!cancelled) {
          setError(
            loadError?.message ||
              "We could not load your learning recommendations."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadLearningHub();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  /* =====================================================
     SKILL LOOKUP
  ===================================================== */

  const skillMap = useMemo(() => {
    const map = {};

    skills.forEach((skill) => {
      map[skill.id] = skill;
    });

    return map;
  }, [skills]);

  /* =====================================================
     STUDENT SKILL LOOKUP
  ===================================================== */

  const studentSkillMap = useMemo(() => {
    const map = {};

    studentSkills.forEach((skill) => {
      map[skill.skill_id] = skill;
    });

    return map;
  }, [studentSkills]);

  /* =====================================================
     ASSESSMENT LOOKUP
  ===================================================== */

  const assessableSkillSet = useMemo(() => {
    return new Set(assessableSkillIds);
  }, [assessableSkillIds]);

  /* =====================================================
     OPEN OPPORTUNITY IDS
  ===================================================== */

  const openOpportunityIds = useMemo(() => {
    return new Set(
      opportunities.map((opportunity) => opportunity.id)
    );
  }, [opportunities]);

  /* =====================================================
     CALCULATE CURRENT SKILL GAPS
  ===================================================== */

  const skillGaps = useMemo(() => {
    const gapMap = {};

    opportunitySkills.forEach((requirement) => {
      if (!openOpportunityIds.has(requirement.opportunity_id)) {
        return;
      }

      const skill = skillMap[requirement.skill_id];

      if (!skill) {
        return;
      }

      const studentSkill = studentSkillMap[requirement.skill_id];

      const studentLevel =
        PROFICIENCY_RANK[
          normalizeProficiency(studentSkill?.proficiency)
        ] || 0;

      const requiredLevel =
        PROFICIENCY_RANK[
          normalizeProficiency(requirement.minimum_proficiency)
        ] || 1;

      /*
       * Student already meets or exceeds the
       * requested proficiency.
       */
      if (studentLevel >= requiredLevel) {
        return;
      }

      const weight = Number(requirement.weight) || 1;

      if (!gapMap[requirement.skill_id]) {
        gapMap[requirement.skill_id] = {
          skillId: requirement.skill_id,
          name: skill.name,
          category: skill.category,

          demandWeight: 0,

          opportunityCount: 0,

          requiredCount: 0,
          preferredCount: 0,

          highestRequiredLevel: requiredLevel,

          currentLevel: studentLevel,

          currentProficiency: studentSkill?.proficiency || null,

          verified: Boolean(studentSkill?.verified),

          opportunityIds: new Set(),
        };
      }

      const gap = gapMap[requirement.skill_id];

      gap.demandWeight += weight;

      gap.highestRequiredLevel = Math.max(
        gap.highestRequiredLevel,
        requiredLevel
      );

      if (requirement.requirement_type === "required") {
        gap.requiredCount += 1;
      } else {
        gap.preferredCount += 1;
      }

      gap.opportunityIds.add(requirement.opportunity_id);
    });

    return Object.values(gapMap)
      .map((gap) => ({
        ...gap,
        opportunityCount: gap.opportunityIds.size,
      }))
      .sort((a, b) => {
        /*
         * Required skills first.
         */
        if (b.requiredCount !== a.requiredCount) {
          return b.requiredCount - a.requiredCount;
        }

        /*
         * Then higher platform demand.
         */
        if (b.demandWeight !== a.demandWeight) {
          return b.demandWeight - a.demandWeight;
        }

        return a.name.localeCompare(b.name);
      });
  }, [
    opportunitySkills,
    openOpportunityIds,
    skillMap,
    studentSkillMap,
  ]);

  /* =====================================================
     SKILL GAP LOOKUP
  ===================================================== */

  const skillGapMap = useMemo(() => {
    const map = {};

    skillGaps.forEach((gap) => {
      map[gap.skillId] = gap;
    });

    return map;
  }, [skillGaps]);

  /* =====================================================
     RECOMMENDED TRAINING
  ===================================================== */

  const recommendedPrograms = useMemo(() => {
    return trainingPrograms
      .filter((program) => {
        return Boolean(skillGapMap[program.skill_id]);
      })
      .map((program) => {
        const gap = skillGapMap[program.skill_id];

        return {
          ...program,

          skill: skillMap[program.skill_id],

          gap,

          hasAssessment: assessableSkillSet.has(program.skill_id),

          recommendationScore:
            gap.demandWeight +
            gap.requiredCount * 5 +
            (program.status === "active" ? 3 : 0),
        };
      })
      .sort((a, b) => {
        return b.recommendationScore - a.recommendationScore;
      });
  }, [
    trainingPrograms,
    skillGapMap,
    skillMap,
    assessableSkillSet,
  ]);

  /* =====================================================
     OTHER AVAILABLE TRAINING
  ===================================================== */

  const otherPrograms = useMemo(() => {
    return trainingPrograms
      .filter((program) => {
        return !skillGapMap[program.skill_id];
      })
      .map((program) => ({
        ...program,

        skill: skillMap[program.skill_id],

        hasAssessment: assessableSkillSet.has(program.skill_id),
      }));
  }, [
    trainingPrograms,
    skillGapMap,
    skillMap,
    assessableSkillSet,
  ]);

  /* =====================================================
     SUMMARY
  ===================================================== */

  const summary = useMemo(() => {
    const coveredGapIds = new Set(
      recommendedPrograms.map((program) => program.skill_id)
    );

    return {
      availablePrograms: trainingPrograms.length,

      currentGaps: skillGaps.length,

      recommendedPrograms: recommendedPrograms.length,

      gapsWithTraining: coveredGapIds.size,
    };
  }, [
    trainingPrograms,
    skillGaps,
    recommendedPrograms,
  ]);

  /* =====================================================
     NAVIGATION
  ===================================================== */

  function goToAssessment(skillId) {
    navigate(`/student/assessment/${skillId}`);
  }

  function goToRoadmap() {
    navigate("/student/roadmap");
  }

  function goToAssessmentCentre() {
    navigate("/student/assessment");
  }

  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {
    return (
      <div className="learning-page">
        <div className="learning-state-card">
          <span className="learning-kicker">
            // learning hub
          </span>

          <h1>
            Building your learning recommendations...
          </h1>

          <p>
            SkillBridge is comparing your current skills
            with open opportunity requirements and
            available institution training.
          </p>
        </div>
      </div>
    );
  }

  /* =====================================================
     ERROR
  ===================================================== */

  if (error) {
    return (
      <div className="learning-page">
        <div className="learning-state-card">
          <span className="learning-kicker">
            // learning hub
          </span>

          <h1>
            Learning recommendations unavailable
          </h1>

          <p>{error}</p>

          <button
            type="button"
            className="learning-primary-button"
            onClick={() => navigate(0)}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  /* =====================================================
     MAIN PAGE
  ===================================================== */

  return (
    <div className="learning-page">
      {/* =================================================
          HERO
      ================================================= */}

      <section className="learning-hero">
        <div>
          <span className="learning-kicker">
            // personalized development
          </span>

          <h1>Learning Hub</h1>

          <p>
            Turn your current skill gaps into actionable
            learning. Recommendations are based on open
            SkillBridge opportunities and training
            available through your institution.
          </p>
        </div>

        <div className="learning-hero-badge">
          <strong>
            {summary.recommendedPrograms}
          </strong>

          <span>
            recommended
          </span>
        </div>
      </section>

      {/* =================================================
          SUMMARY
      ================================================= */}

      <section className="learning-summary-grid">
        <article className="learning-summary-card">
          <span>
            AVAILABLE TRAINING
          </span>

          <strong>
            {summary.availablePrograms}
          </strong>

          <p>
            Programs currently available to you
          </p>
        </article>

        <article className="learning-summary-card">
          <span>
            CURRENT SKILL GAPS
          </span>

          <strong>
            {summary.currentGaps}
          </strong>

          <p>
            Skills below current opportunity requirements
          </p>
        </article>

        <article className="learning-summary-card">
          <span>
            RECOMMENDED FOR YOU
          </span>

          <strong>
            {summary.recommendedPrograms}
          </strong>

          <p>
            Programs directly addressing your gaps
          </p>
        </article>

        <article className="learning-summary-card">
          <span>
            GAPS WITH TRAINING
          </span>

          <strong>
            {summary.gapsWithTraining}
          </strong>

          <p>
            Missing skills with available learning support
          </p>
        </article>
      </section>

      {/* =================================================
          EXPLANATION
      ================================================= */}

      <section className="learning-explanation">
        <div>
          <span className="learning-kicker">
            // how recommendations work
          </span>

          <h2>
            From skill gap to skill development
          </h2>
        </div>

        <p>
          SkillBridge compares your recorded proficiency
          with skill requirements from currently open
          opportunities. If your institution offers
          training for a skill where you are below the
          requested level, that program is prioritized
          here.
        </p>
      </section>

      {/* =================================================
          RECOMMENDED TRAINING
      ================================================= */}

      <section className="learning-section">
        <div className="learning-section-heading">
          <div>
            <span className="learning-kicker">
              // recommended for you
            </span>

            <h2>
              Training connected to your skill gaps
            </h2>
          </div>

          <span className="learning-count">
            {recommendedPrograms.length}{" "}
            program
            {recommendedPrograms.length === 1 ? "" : "s"}
          </span>
        </div>

        {recommendedPrograms.length === 0 ? (
          <div className="learning-empty-card">
            <h3>
              No direct training recommendation yet
            </h3>

            <p>
              Your institution does not currently have
              an active or planned training program for
              the skill gaps detected from open
              SkillBridge opportunities.
            </p>

            <button
              type="button"
              className="learning-secondary-button"
              onClick={goToRoadmap}
            >
              View skill roadmap
            </button>
          </div>
        ) : (
          <div className="learning-program-grid">
            {recommendedPrograms.map((program, index) => {
              const gap = program.gap;

              return (
                <article
                  className="learning-program-card recommended"
                  key={program.id}
                >
                  <div className="learning-program-top">
                    <div className="learning-program-number">
                      {String(index + 1).padStart(2, "0")}
                    </div>

                    <span className="learning-recommended-pill">
                      RECOMMENDED
                    </span>
                  </div>

                  <div className="learning-program-content">
                    <span className="learning-program-type">
                      {formatType(program.training_type)}
                    </span>

                    <h3>
                      {program.title}
                    </h3>

                    <p className="learning-program-description">
                      {program.description ||
                        "Institution-led training designed to strengthen this skill."}
                    </p>

                    <div className="learning-skill-box">
                      <span>
                        TARGET SKILL
                      </span>

                      <strong>
                        {program.skill?.name || gap.name}
                      </strong>

                      <p>
                        {gap.currentProficiency
                          ? `Current: ${formatType(
                              gap.currentProficiency
                            )}`
                          : "Not currently recorded"}

                        {" → "}

                        Target:{" "}
                        {getRequiredLevelName(
                          gap.highestRequiredLevel
                        )}
                      </p>
                    </div>

                    <div className="learning-reason">
                      <span>
                        WHY THIS IS RECOMMENDED
                      </span>

                      <p>
                        This skill appears in{" "}
                        <strong>
                          {gap.opportunityCount}
                        </strong>{" "}
                        current{" "}
                        {gap.opportunityCount === 1
                          ? "opportunity"
                          : "opportunities"}{" "}
                        with a combined demand weight of{" "}
                        <strong>
                          {gap.demandWeight}
                        </strong>
                        .
                      </p>
                    </div>

                    <div className="learning-program-meta">
                      <div>
                        <span>
                          PROVIDER
                        </span>

                        <strong>
                          {program.provider ||
                            "Your institution"}
                        </strong>
                      </div>

                      <div>
                        <span>
                          STATUS
                        </span>

                        <strong>
                          {formatType(program.status)}
                        </strong>
                      </div>

                      <div>
                        <span>
                          START
                        </span>

                        <strong>
                          {formatDate(program.start_date)}
                        </strong>
                      </div>

                      <div>
                        <span>
                          END
                        </span>

                        <strong>
                          {formatDate(program.end_date)}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* =====================================
                      ACTIONS
                  ===================================== */}

                  <div className="learning-program-actions">
                    <button
                      type="button"
                      className="learning-secondary-button"
                      onClick={goToRoadmap}
                    >
                      View roadmap
                    </button>

                    {program.hasAssessment ? (
                      <button
                        type="button"
                        className="learning-primary-button"
                        onClick={() =>
                          goToAssessment(program.skill_id)
                        }
                      >
                        Take assessment →
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="learning-secondary-button"
                        onClick={goToAssessmentCentre}
                      >
                        Assessment not available
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* =================================================
          CURRENT SKILL GAPS
      ================================================= */}

      <section className="learning-section">
        <div className="learning-section-heading">
          <div>
            <span className="learning-kicker">
              // development priorities
            </span>

            <h2>
              Skills currently worth strengthening
            </h2>
          </div>
        </div>

        {skillGaps.length === 0 ? (
          <div className="learning-empty-card">
            <h3>
              No current opportunity skill gaps detected
            </h3>

            <p>
              Based on the open opportunities currently
              available on SkillBridge, your recorded
              proficiency meets the analysed requirements.
            </p>
          </div>
        ) : (
          <div className="learning-gap-list">
            {skillGaps.map((gap, index) => {
              const hasTraining = recommendedPrograms.some(
                (program) => program.skill_id === gap.skillId
              );

              const hasAssessment =
                assessableSkillSet.has(gap.skillId);

              return (
                <article
                  className="learning-gap-row"
                  key={gap.skillId}
                >
                  <div className="learning-gap-rank">
                    #{index + 1}
                  </div>

                  <div className="learning-gap-main">
                    <strong>
                      {gap.name}
                    </strong>

                    <span>
                      {gap.requiredCount > 0
                        ? `${gap.requiredCount} required requirement${
                            gap.requiredCount === 1 ? "" : "s"
                          }`
                        : "Preferred skill requirement"}
                    </span>
                  </div>

                  <div className="learning-gap-stat">
                    <span>
                      DEMAND WEIGHT
                    </span>

                    <strong>
                      {gap.demandWeight}
                    </strong>
                  </div>

                  <div className="learning-gap-stat">
                    <span>
                      OPPORTUNITIES
                    </span>

                    <strong>
                      {gap.opportunityCount}
                    </strong>
                  </div>

                  <div
                    className={`learning-training-status ${
                      hasTraining ? "available" : ""
                    }`}
                    title={
                      hasAssessment
                        ? "SkillBridge assessment available"
                        : "No SkillBridge assessment is currently available for this skill"
                    }
                  >
                    {hasTraining
                      ? "TRAINING AVAILABLE"
                      : hasAssessment
                        ? "ASSESSMENT AVAILABLE"
                        : "DEVELOPMENT GAP"}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* =================================================
          OTHER TRAINING
      ================================================= */}

      {otherPrograms.length > 0 && (
        <section className="learning-section">
          <div className="learning-section-heading">
            <div>
              <span className="learning-kicker">
                // explore more
              </span>

              <h2>
                Other available training
              </h2>
            </div>

            <span className="learning-count">
              {otherPrograms.length}
            </span>
          </div>

          <div className="learning-other-grid">
            {otherPrograms.map((program) => (
              <article
                className="learning-other-card"
                key={program.id}
              >
                <div>
                  <span className="learning-program-type">
                    {formatType(program.training_type)}
                  </span>

                  <h3>
                    {program.title}
                  </h3>

                  <p>
                    {program.description ||
                      "Additional learning opportunity available through your institution."}
                  </p>
                </div>

                <div className="learning-other-footer">
                  <span>
                    {program.skill?.name ||
                      "Skill development"}
                  </span>

                  <strong>
                    {formatType(program.status)}
                  </strong>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* =================================================
          DEVELOPMENT LOOP
      ================================================= */}

      <section className="learning-loop">
        <span className="learning-kicker">
          // skillbridge development loop
        </span>

        <h2>
          Learn. Demonstrate. Reassess. Improve.
        </h2>

        <div className="learning-loop-grid">
          <div>
            <span>
              01
            </span>

            <strong>
              Identify gap
            </strong>

            <p>
              SkillBridge compares your current
              proficiency with opportunity demand.
            </p>
          </div>

          <div>
            <span>
              02
            </span>

            <strong>
              Develop skill
            </strong>

            <p>
              Use relevant institution training and
              your personalized roadmap.
            </p>
          </div>

          <div>
            <span>
              03
            </span>

            <strong>
              Take assessment
            </strong>

            <p>
              Where an assessment is available,
              demonstrate your proficiency through
              SkillBridge.
            </p>
          </div>

          <div>
            <span>
              04
            </span>

            <strong>
              Improve readiness
            </strong>

            <p>
              Verified skill improvements can affect
              future opportunity matching.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default LearningHub;