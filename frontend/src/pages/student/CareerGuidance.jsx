import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { supabase } from "../../services/supabase";
import { useAuth } from "../../hooks/useAuth";
import CareerInterests from "../../components/CareerInterests";

import "./CareerGuidance.css";

const PROFICIENCY_RANK = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
  expert: 4,
};

/* =========================================================
   CAREER INTEREST MATCHING

   We do NOT change skill readiness using interests.

   Interests are used separately to identify and prioritize
   relevant career directions.
========================================================= */

const INTEREST_RULES = {
  "Artificial Intelligence & Machine Learning": [
    "machine learning",
    "artificial intelligence",
    " ai ",
    " ai/",
    "deep learning",
    "neural",
    "computer vision",
    "nlp",
    "natural language",
    "tensorflow",
    "pytorch",
  ],

  "Software Development": [
    "software",
    "developer",
    "development",
    "programmer",
    "programming",
    "backend",
    "frontend",
    "full stack",
    "fullstack",
    "java",
    "python",
    "c++",
  ],

  "Data Science & Analytics": [
    "data science",
    "data scientist",
    "data analyst",
    "analytics",
    "data analysis",
    "business intelligence",
    "sql",
    "statistics",
  ],

  Cybersecurity: [
    "cybersecurity",
    "cyber security",
    "security",
    "ethical hacking",
    "penetration",
    "network security",
    "soc",
  ],

  "Cloud & DevOps": [
    "cloud",
    "devops",
    "aws",
    "azure",
    "gcp",
    "docker",
    "kubernetes",
    "ci/cd",
    "deployment",
  ],

  "Web Development": [
    "web development",
    "web developer",
    "frontend",
    "backend",
    "full stack",
    "fullstack",
    "react",
    "javascript",
    "html",
    "css",
  ],

  "Mobile Development": [
    "mobile",
    "android",
    "ios",
    "flutter",
    "react native",
    "mobile application",
    "app developer",
  ],

  "IoT & Embedded Systems": [
    "iot",
    "internet of things",
    "embedded",
    "arduino",
    "esp32",
    "microcontroller",
    "sensor",
    "firmware",
  ],

  "Robotics & Automation": [
    "robotics",
    "robot",
    "automation",
    "mechatronics",
    "control system",
    "autonomous",
  ],

  "Business & Product Technology": [
    "product",
    "business analyst",
    "business technology",
    "product management",
    "product manager",
    "business systems",
    "technology consulting",
  ],
};

function CareerGuidance() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [guidance, setGuidance] = useState([]);
  const [careerInterests, setCareerInterests] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* =========================================================
     RECEIVE SAVED INTERESTS FROM CHILD COMPONENT
  ========================================================= */

  const handleInterestsChange = useCallback((interests) => {
    setCareerInterests(
      Array.isArray(interests)
        ? interests
        : []
    );
  }, []);

  /* =========================================================
     LOAD CAREER GUIDANCE DATA
  ========================================================= */

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    let cancelled = false;

    async function loadCareerGuidance() {
      try {
        setLoading(true);
        setError("");

        /* -----------------------------------------------------
           1. STUDENT PROFILE
        ----------------------------------------------------- */

        const {
          data: studentProfile,
          error: studentError,
        } = await supabase
          .from("student_profiles")
          .select(`
            id,
            degree,
            current_year,
            graduation_year,
            department_id,
            career_interests
          `)
          .eq("user_id", user.id)
          .single();

        if (studentError) {
          throw studentError;
        }

        if (!cancelled) {
          setCareerInterests(
            Array.isArray(
              studentProfile?.career_interests
            )
              ? studentProfile.career_interests
              : []
          );
        }

        /* -----------------------------------------------------
           2. STUDENT SKILLS
        ----------------------------------------------------- */

        const {
          data: studentSkillRows,
          error: studentSkillError,
        } = await supabase
          .from("student_skills")
          .select(`
            skill_id,
            proficiency,
            verified,
            skills (
              id,
              name,
              category
            )
          `)
          .eq("student_id", studentProfile.id);

        if (studentSkillError) {
          throw studentSkillError;
        }

        /* -----------------------------------------------------
           3. OPEN OPPORTUNITIES
        ----------------------------------------------------- */

        const {
          data: opportunityRows,
          error: opportunityError,
        } = await supabase
          .from("opportunities")
          .select(`
            id,
            title,
            type,
            description,
            location,
            work_mode,
            status
          `)
          .eq("status", "open");

        if (opportunityError) {
          throw opportunityError;
        }

        const opportunities =
          opportunityRows || [];

        if (opportunities.length === 0) {
          if (!cancelled) {
            setGuidance([]);
          }

          return;
        }

        const opportunityIds =
          opportunities.map(
            (opportunity) =>
              opportunity.id
          );

        /* -----------------------------------------------------
           4. OPPORTUNITY SKILL REQUIREMENTS
        ----------------------------------------------------- */

        const {
          data: requirementRows,
          error: requirementError,
        } = await supabase
          .from("opportunity_skills")
          .select(`
            id,
            opportunity_id,
            skill_id,
            requirement_type,
            minimum_proficiency,
            weight,
            skills (
              id,
              name,
              category
            )
          `)
          .in(
            "opportunity_id",
            opportunityIds
          );

        if (requirementError) {
          throw requirementError;
        }

        /* -----------------------------------------------------
           5. CREATE STUDENT SKILL MAP
        ----------------------------------------------------- */

        const studentSkillMap = {};

        (studentSkillRows || []).forEach(
          (row) => {
            studentSkillMap[
              row.skill_id
            ] = {
              skillId:
                row.skill_id,

              name:
                row.skills?.name ||
                "Skill",

              category:
                row.skills?.category ||
                "",

              proficiency:
                row.proficiency ||
                "beginner",

              verified:
                Boolean(
                  row.verified
                ),
            };
          }
        );

        /* -----------------------------------------------------
           6. GROUP REQUIREMENTS BY OPPORTUNITY
        ----------------------------------------------------- */

        const requirementsByOpportunity = {};

        (requirementRows || []).forEach(
          (requirement) => {
            if (
              !requirementsByOpportunity[
                requirement.opportunity_id
              ]
            ) {
              requirementsByOpportunity[
                requirement.opportunity_id
              ] = [];
            }

            requirementsByOpportunity[
              requirement.opportunity_id
            ].push(requirement);
          }
        );

        /* -----------------------------------------------------
           7. CALCULATE SKILL READINESS

           IMPORTANT:
           Interest does NOT affect this percentage.
        ----------------------------------------------------- */

        const calculatedGuidance =
          opportunities.map(
            (opportunity) => {
              const requirements =
                requirementsByOpportunity[
                  opportunity.id
                ] || [];

              let earnedWeight = 0;
              let totalWeight = 0;

              const strengths = [];
              const developmentSkills = [];

              requirements.forEach(
                (requirement) => {
                  const requirementWeight =
                    Number(
                      requirement.weight
                    ) || 1;

                  totalWeight +=
                    requirementWeight;

                  const studentSkill =
                    studentSkillMap[
                      requirement.skill_id
                    ];

                  const requiredRank =
                    PROFICIENCY_RANK[
                      requirement.minimum_proficiency
                    ] || 1;

                  const studentRank =
                    studentSkill
                      ? PROFICIENCY_RANK[
                          studentSkill.proficiency
                        ] || 1
                      : 0;

                  let factor = 0;

                  if (
                    studentRank >=
                    requiredRank
                  ) {
                    factor = 1;
                  } else if (
                    studentRank ===
                    requiredRank - 1
                  ) {
                    factor = 0.6;
                  } else if (
                    studentRank ===
                    requiredRank - 2
                  ) {
                    factor = 0.3;
                  }

                  earnedWeight +=
                    requirementWeight *
                    factor;

                  const skillName =
                    requirement.skills
                      ?.name ||
                    "Skill";

                  if (factor === 1) {
                    strengths.push({
                      id:
                        requirement.skill_id,

                      name:
                        skillName,

                      proficiency:
                        studentSkill
                          ?.proficiency,

                      verified:
                        studentSkill
                          ?.verified ||
                        false,

                      requirementType:
                        requirement.requirement_type,
                    });
                  } else {
                    developmentSkills.push({
                      id:
                        requirement.skill_id,

                      name:
                        skillName,

                      currentProficiency:
                        studentSkill
                          ?.proficiency ||
                        null,

                      targetProficiency:
                        requirement.minimum_proficiency ||
                        "beginner",

                      requirementType:
                        requirement.requirement_type,

                      weight:
                        requirementWeight,

                      gap:
                        requiredRank -
                        studentRank,
                    });
                  }
                }
              );

              const readiness =
                totalWeight > 0
                  ? Math.round(
                      (earnedWeight /
                        totalWeight) *
                        100
                    )
                  : 0;

              /* ---------------------------------------------
                 REQUIRED SKILLS FIRST,
                 THEN BIGGER GAPS,
                 THEN HIGHER WEIGHT
              --------------------------------------------- */

              developmentSkills.sort(
                (a, b) => {
                  if (
                    a.requirementType !==
                    b.requirementType
                  ) {
                    if (
                      a.requirementType ===
                      "required"
                    ) {
                      return -1;
                    }

                    if (
                      b.requirementType ===
                      "required"
                    ) {
                      return 1;
                    }
                  }

                  if (
                    b.gap !==
                    a.gap
                  ) {
                    return (
                      b.gap -
                      a.gap
                    );
                  }

                  return (
                    b.weight -
                    a.weight
                  );
                }
              );

              let readinessLabel =
                "Build foundation";

              if (readiness >= 80) {
                readinessLabel =
                  "Strong alignment";
              } else if (
                readiness >= 60
              ) {
                readinessLabel =
                  "Developing alignment";
              } else if (
                readiness >= 40
              ) {
                readinessLabel =
                  "Moderate skill gap";
              }

              return {
                opportunityId:
                  opportunity.id,

                title:
                  opportunity.title,

                type:
                  opportunity.type,

                description:
                  opportunity.description,

                location:
                  opportunity.location,

                workMode:
                  opportunity.work_mode,

                readiness,

                readinessLabel,

                strengths,

                developmentSkills,

                requirementCount:
                  requirements.length,

                demandSkills:
                  requirements.map(
                    (requirement) => ({
                      id:
                        requirement.skill_id,

                      name:
                        requirement.skills
                          ?.name ||
                        "Skill",

                      requirementType:
                        requirement.requirement_type,

                      weight:
                        Number(
                          requirement.weight
                        ) || 1,
                    })
                  ),
              };
            }
          );

        if (!cancelled) {
          setGuidance(
            calculatedGuidance
          );
        }
      } catch (err) {
        console.error(
          "Career guidance loading error:",
          err
        );

        if (!cancelled) {
          setError(
            err?.message ||
              "Unable to generate career guidance."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadCareerGuidance();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  /* =========================================================
     HELPERS
  ========================================================= */

  function displayText(value) {
    if (!value) {
      return "Not specified";
    }

    return value
      .replaceAll("_", " ")
      .replace(
        /\b\w/g,
        (letter) =>
          letter.toUpperCase()
      );
  }

  function proficiencyText(value) {
    if (!value) {
      return "Not recorded";
    }

    return displayText(value);
  }

  /* =========================================================
     FIND WHICH INTERESTS MATCH AN OPPORTUNITY
  ========================================================= */
const findMatchingInterests = useCallback(
    (direction) => {
      if (careerInterests.length === 0) {
        return [];
      }

      const searchableText = [
        direction.title,
        direction.type,
        direction.description,
        ...direction.demandSkills.map(
          (skill) => skill.name
        ),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return careerInterests.filter(
        (interest) => {
          const keywords =
            INTEREST_RULES[interest] || [];

          return keywords.some(
            (keyword) =>
              searchableText.includes(
                keyword.toLowerCase()
              )
          );
        }
      );
    },
    [careerInterests]
  );
  /* =========================================================
     PERSONALIZED GUIDANCE

     Priority:
     1. Matches selected interests
     2. Higher skill readiness

     We keep readiness and interest separate.
  ========================================================= */

  const personalizedGuidance =
    useMemo(() => {
      return guidance
        .map((direction) => {
          const matchingInterests =
            findMatchingInterests(
              direction
            );

          return {
            ...direction,

            matchingInterests,

            interestMatch:
              matchingInterests.length >
              0,
          };
        })
        .sort((a, b) => {
          if (
            a.interestMatch !==
            b.interestMatch
          ) {
            return a.interestMatch
              ? -1
              : 1;
          }

          return (
            b.readiness -
            a.readiness
          );
        });
    }, [guidance, findMatchingInterests]);

  /* =========================================================
     SUMMARY DATA
  ========================================================= */

  const strongestDirection =
    personalizedGuidance.length >
    0
      ? [...personalizedGuidance].sort(
          (a, b) =>
            b.readiness -
            a.readiness
        )[0]
      : null;

  const interestMatchedDirections =
    personalizedGuidance.filter(
      (direction) =>
        direction.interestMatch
    ).length;

  const demandedSkillMap = {};

  guidance.forEach((item) => {
    item.demandSkills.forEach(
      (skill) => {
        if (
          !demandedSkillMap[
            skill.id
          ]
        ) {
          demandedSkillMap[
            skill.id
          ] = {
            id: skill.id,
            name: skill.name,
            demandPoints: 0,
            opportunities:
              new Set(),
          };
        }

        demandedSkillMap[
          skill.id
        ].demandPoints +=
          skill.weight;

        demandedSkillMap[
          skill.id
        ].opportunities.add(
          item.opportunityId
        );
      }
    );
  });

  const highDemandSkills =
    Object.values(
      demandedSkillMap
    )
      .map((skill) => ({
        ...skill,

        opportunityCount:
          skill.opportunities
            .size,
      }))
      .sort(
        (a, b) =>
          b.demandPoints -
          a.demandPoints
      )
      .slice(0, 5);

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <div className="career-guidance-page">
        <div className="career-guidance-state">
          Building your career guidance...
        </div>
      </div>
    );
  }

  /* =========================================================
     ERROR
  ========================================================= */

  if (error) {
    return (
      <div className="career-guidance-page">
        <div className="career-guidance-state">
          <h3>
            Career guidance unavailable
          </h3>

          <p>{error}</p>
        </div>
      </div>
    );
  }

  /* =========================================================
     PAGE
  ========================================================= */

  return (
    <div className="career-guidance-page">
      {/* =========================
          HERO
      ========================= */}

      <section className="career-guidance-hero">
        <span className="career-guidance-kicker">
          // SKILLS × INTERESTS × INDUSTRY DEMAND
        </span>

        <h1>
          Career
          <span> guidance.</span>
        </h1>

        <p>
          Explore career directions based on your
          current skills, career interests and the
          requirements of opportunities currently
          available on SkillBridge.
        </p>
      </section>

      {/* =========================
          CAREER INTERESTS
      ========================= */}

      <CareerInterests
        onInterestsChange={
          handleInterestsChange
        }
      />

      {/* =========================
          EMPTY STATE
      ========================= */}

      {guidance.length === 0 ? (
        <section className="career-guidance-empty">
          <h2>
            No career directions available yet
          </h2>

          <p>
            Career guidance will appear when
            recruiters publish open opportunities
            with skill requirements.
          </p>

          <button
            type="button"
            onClick={() =>
              navigate(
                "/student/opportunities"
              )
            }
          >
            Explore opportunities →
          </button>
        </section>
      ) : (
        <>
          {/* =========================
              OVERVIEW
          ========================= */}

          <section className="career-guidance-summary">
            <article>
              <span>
                Current directions
              </span>

              <strong>
                {
                  personalizedGuidance.length
                }
              </strong>

              <p>
                Based on open SkillBridge
                opportunities
              </p>
            </article>

            <article>
              <span>
                Strongest skill alignment
              </span>

              <strong>
                {strongestDirection
                  ?.readiness || 0}
                %
              </strong>

              <p>
                {strongestDirection?.title}
              </p>
            </article>

            <article>
              <span>
                Interest matches
              </span>

              <strong>
                {
                  interestMatchedDirections
                }
              </strong>

              <p>
                Current directions matching
                your saved interests
              </p>
            </article>
          </section>

          {/* =========================
              EXPLANATION
          ========================= */}

          <section className="career-guidance-explainer">
            <div>
              <span className="career-guidance-kicker">
                // HOW THIS IS CALCULATED
              </span>

              <h2>
                Personalized from skills,
                interests and current demand
              </h2>
            </div>

            <p>
              Skill readiness compares your
              recorded proficiency with the
              required and preferred skill
              levels published by recruiters.
              Career interests are kept
              separate from readiness and are
              used to prioritize relevant
              directions. Demand refers only
              to opportunities currently
              available on SkillBridge.
            </p>
          </section>

          {/* =========================
              HIGH DEMAND SKILLS
          ========================= */}

          <section className="career-demand-section">
            <div className="career-section-heading">
              <div>
                <span className="career-guidance-kicker">
                  // CURRENT PLATFORM DEMAND
                </span>

                <h2>
                  Skills appearing in industry
                  requirements
                </h2>
              </div>
            </div>

            <div className="career-demand-grid">
              {highDemandSkills.map(
                (skill, index) => (
                  <article
                    key={skill.id}
                    className="career-demand-card"
                  >
                    <span>
                      #{index + 1}
                    </span>

                    <strong>
                      {skill.name}
                    </strong>

                    <p>
                      {
                        skill.opportunityCount
                      }{" "}
                      {skill.opportunityCount ===
                      1
                        ? "opportunity"
                        : "opportunities"}
                    </p>

                    <small>
                      Demand weight:{" "}
                      {skill.demandPoints}
                    </small>
                  </article>
                )
              )}
            </div>
          </section>

          {/* =========================
              CAREER DIRECTIONS
          ========================= */}

          <section className="career-directions-section">
            <div className="career-section-heading">
              <div>
                <span className="career-guidance-kicker">
                  // PERSONALIZED DIRECTIONS
                </span>

                <h2>
                  Career recommendations
                </h2>
              </div>

              <span>
                {
                  personalizedGuidance.length
                }{" "}
                current directions
              </span>
            </div>

            <div className="career-direction-list">
              {personalizedGuidance.map(
                (
                  direction,
                  index
                ) => (
                  <article
                    className={`career-direction-card ${
                      direction.interestMatch
                        ? "career-direction-interest-match"
                        : ""
                    }`}
                    key={
                      direction.opportunityId
                    }
                  >
                    {/* TOP */}

                    <div className="career-direction-top">
                      <div>
                        <span className="career-direction-number">
                          {String(
                            index + 1
                          ).padStart(
                            2,
                            "0"
                          )}
                        </span>

                        <span className="career-direction-type">
                          {displayText(
                            direction.type
                          )}
                        </span>

                        {direction.interestMatch && (
                          <span className="career-interest-match-badge">
                            ✓ Matches your
                            interest
                          </span>
                        )}
                      </div>

                      <span className="career-readiness-label">
                        {
                          direction.readinessLabel
                        }
                      </span>
                    </div>

                    {/* MATCHED INTERESTS */}

                    {direction.interestMatch && (
                      <div className="career-matched-interests">
                        <span>
                          Recommended from your
                          interests:
                        </span>

                        <div>
                          {direction.matchingInterests.map(
                            (
                              interest
                            ) => (
                              <span
                                key={
                                  interest
                                }
                              >
                                {
                                  interest
                                }
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    )}

                    {/* TITLE */}

                    <div className="career-direction-title">
                      <div>
                        <h3>
                          {direction.title}
                        </h3>

                        <p>
                          {
                            direction.description
                          }
                        </p>
                      </div>

                      <div className="career-readiness-score">
                        <strong>
                          {
                            direction.readiness
                          }
                          %
                        </strong>

                        <span>
                          skill readiness
                        </span>
                      </div>
                    </div>

                    {/* PROGRESS */}

                    <div className="career-readiness-track">
                      <div
                        style={{
                          width: `${direction.readiness}%`,
                        }}
                      />
                    </div>

                    {/* META */}

                    <div className="career-direction-meta">
                      <span>
                        {direction.location ||
                          "Location flexible"}
                      </span>

                      <span>
                        {displayText(
                          direction.workMode
                        )}
                      </span>

                      <span>
                        {
                          direction.requirementCount
                        }{" "}
                        skill requirements
                      </span>
                    </div>

                    {/* SKILL ANALYSIS */}

                    <div className="career-skill-analysis">
                      {/* STRENGTHS */}

                      <div className="career-skill-column">
                        <span className="career-skill-heading">
                          Current strengths
                        </span>

                        {direction
                          .strengths
                          .length === 0 ? (
                          <p className="career-no-skills">
                            No requirements
                            fully met yet.
                          </p>
                        ) : (
                          <div className="career-skill-list">
                            {direction.strengths.map(
                              (
                                skill
                              ) => (
                                <div
                                  className="career-strength-row"
                                  key={
                                    skill.id
                                  }
                                >
                                  <div>
                                    <strong>
                                      {
                                        skill.name
                                      }
                                    </strong>

                                    <span>
                                      {proficiencyText(
                                        skill.proficiency
                                      )}
                                    </span>
                                  </div>

                                  <small>
                                    {skill.verified
                                      ? "Verified"
                                      : "Recorded"}
                                  </small>
                                </div>
                              )
                            )}
                          </div>
                        )}
                      </div>

                      {/* DEVELOPMENT */}

                      <div className="career-skill-column">
                        <span className="career-skill-heading">
                          Skills to strengthen
                        </span>

                        {direction
                          .developmentSkills
                          .length === 0 ? (
                          <p className="career-no-skills">
                            You currently meet
                            all recorded skill
                            requirements.
                          </p>
                        ) : (
                          <div className="career-skill-list">
                            {direction.developmentSkills
                              .slice(
                                0,
                                4
                              )
                              .map(
                                (
                                  skill
                                ) => (
                                  <div
                                    className="career-gap-row"
                                    key={
                                      skill.id
                                    }
                                  >
                                    <div>
                                      <strong>
                                        {
                                          skill.name
                                        }
                                      </strong>

                                      <span>
                                        {proficiencyText(
                                          skill.currentProficiency
                                        )}
                                        {
                                          " → "
                                        }
                                        {proficiencyText(
                                          skill.targetProficiency
                                        )}
                                      </span>
                                    </div>

                                    <small>
                                      {displayText(
                                        skill.requirementType
                                      )}
                                    </small>
                                  </div>
                                )
                              )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* NEXT STEP */}

                    <div className="career-next-step">
                      <div>
                        <span>
                          Recommended next step
                        </span>

                        <strong>
                          {direction
                            .developmentSkills
                            .length >
                          0
                            ? `Strengthen ${direction.developmentSkills[0].name}`
                            : "Explore this opportunity"}
                        </strong>
                      </div>

                      <div className="career-direction-actions">
                        <button
                          type="button"
                          className="career-secondary-button"
                          onClick={() =>
                            navigate(
                              "/student/roadmap"
                            )
                          }
                        >
                          Skill roadmap
                        </button>

                        <button
                          type="button"
                          className="career-primary-button"
                          onClick={() =>
                            navigate(
                              "/student/opportunities"
                            )
                          }
                        >
                          View opportunity →
                        </button>
                      </div>
                    </div>
                  </article>
                )
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default CareerGuidance;