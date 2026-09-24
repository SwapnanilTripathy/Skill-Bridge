import { useEffect, useMemo, useState } from "react";

import { supabase } from "../../services/supabase";
import { useAuth } from "../../hooks/useAuth";
import "./StudentOpportunities.css";

const PROFICIENCY_RANK = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
  expert: 4,
};

function normalizeProficiency(value) {
  return String(value || "").trim().toLowerCase();
}

function proficiencyFactor(studentLevel, requiredLevel) {
  const studentRank = PROFICIENCY_RANK[normalizeProficiency(studentLevel)] || 0;
  const requiredRank = PROFICIENCY_RANK[normalizeProficiency(requiredLevel)] || 0;

  // No saved proficiency or unknown level.
  if (!studentRank || !requiredRank) return 0;

  // Meets or exceeds the recruiter's minimum.
  if (studentRank >= requiredRank) return 1;

  const difference = requiredRank - studentRank;

  // One level below the requirement.
  if (difference === 1) return 0.6;

  // Two levels below the requirement.
  if (difference === 2) return 0.3;

  return 0;
}

function StudentOpportunities() {
  const { user } = useAuth();

  const [studentProfile, setStudentProfile] = useState(null);
  const [departmentCode, setDepartmentCode] = useState("");

  const [opportunities, setOpportunities] = useState([]);
  const [opportunitySkills, setOpportunitySkills] = useState([]);
  const [skills, setSkills] = useState([]);
  const [studentSkills, setStudentSkills] = useState([]);

  const [matchResults, setMatchResults] = useState({});
  const [matchSaveError, setMatchSaveError] = useState("");

  const [applications, setApplications] = useState({});
  const [applyingId, setApplyingId] = useState("");
  const [applicationError, setApplicationError] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadOpportunities() {
      if (!user) return;

      setLoading(true);
      setError("");
      setMatchSaveError("");

      // --------------------------------------------------
      // 1. Load the logged-in student's eligibility data
      // --------------------------------------------------

      const { data: profile, error: profileError } = await supabase
        .from("student_profiles")
        .select(
          "id, department_id, cgpa, graduation_year, verification_status"
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileError) {
        setError(profileError.message);
        setLoading(false);
        return;
      }

      if (!profile) {
        setError("Complete your student profile before viewing opportunities.");
        setLoading(false);
        return;
      }

      setStudentProfile(profile);

      // --------------------------------------------------
      // 2. Load the student's department code
      // --------------------------------------------------

      if (profile.department_id) {
        const { data: department, error: departmentError } = await supabase
          .from("departments")
          .select("code")
          .eq("id", profile.department_id)
          .maybeSingle();

        if (departmentError) {
          setError(departmentError.message);
          setLoading(false);
          return;
        }

        const currentDepartmentCode =
          department?.code?.trim().toUpperCase() || "";

        setDepartmentCode(currentDepartmentCode);
      }

      // --------------------------------------------------
      // 3. Load only published/open opportunities
      // --------------------------------------------------

      const { data: opportunityRows, error: opportunityError } = await supabase
        .from("opportunities")
        .select(
          "id, company_id, title, type, description, location, work_mode, duration, stipend_min, stipend_max, salary_min, salary_max, minimum_cgpa, graduation_year, eligible_department_codes, application_deadline, status, created_at"
        )
        .eq("status", "open")
        .order("created_at", { ascending: false });

      if (opportunityError) {
        setError(opportunityError.message);
        setLoading(false);
        return;
      }

      const openOpportunities = opportunityRows || [];
      setOpportunities(openOpportunities);

      // --------------------------------------------------
      // 4. Load opportunity skill requirements
      // --------------------------------------------------

      let skillRequirementRows = [];

      if (openOpportunities.length > 0) {
        const opportunityIds = openOpportunities.map(
          (opportunity) => opportunity.id
        );

        const { data, error: requirementError } = await supabase
          .from("opportunity_skills")
          .select(
            "opportunity_id, skill_id, requirement_type, minimum_proficiency, weight"
          )
          .in("opportunity_id", opportunityIds);

        if (requirementError) {
          setError(requirementError.message);
          setLoading(false);
          return;
        }

        skillRequirementRows = data || [];
      }

      setOpportunitySkills(skillRequirementRows);

      // --------------------------------------------------
      // 5. Load shared skill catalog + student's own skills
      // --------------------------------------------------

      const [skillResult, studentSkillResult, applicationResult] =
        await Promise.all([
          supabase
            .from("skills")
            .select("id, name, category"),

          supabase
            .from("student_skills")
            .select("skill_id, proficiency, source, verified")
            .eq("student_id", profile.id),

          supabase
            .from("applications")
            .select(
              "id, opportunity_id, status, match_score_at_apply, applied_at, updated_at"
            )
            .eq("student_id", profile.id),
        ]);

      if (skillResult.error) {
        setError(skillResult.error.message);
        setLoading(false);
        return;
      }

      if (studentSkillResult.error) {
        setError(studentSkillResult.error.message);
        setLoading(false);
        return;
      }

      if (applicationResult.error) {
        setError(applicationResult.error.message);
        setLoading(false);
        return;
      }

      setSkills(skillResult.data || []);
      setStudentSkills(studentSkillResult.data || []);

      const applicationMap = Object.fromEntries(
        (applicationResult.data || []).map((application) => [
          application.opportunity_id,
          application,
        ])
      );

      setApplications(applicationMap);

      setLoading(false);
    }

    loadOpportunities();
  }, [user]);

  const skillMap = useMemo(() => {
    return new Map(skills.map((skill) => [skill.id, skill]));
  }, [skills]);

  const studentSkillMap = useMemo(() => {
    return new Map(
      studentSkills.map((studentSkill) => [
        studentSkill.skill_id,
        studentSkill,
      ])
    );
  }, [studentSkills]);

  const eligibilityResults = useMemo(() => {
    if (!studentProfile) return [];

    const studentCgpa =
      studentProfile.cgpa === null || studentProfile.cgpa === undefined
        ? null
        : Number(studentProfile.cgpa);

    const studentGraduationYear = studentProfile.graduation_year
      ? Number(studentProfile.graduation_year)
      : null;

    return opportunities.map((opportunity) => {
      const eligibleDepartments = (
        opportunity.eligible_department_codes || []
      ).map((code) => String(code).trim().toUpperCase());

      const departmentEligible =
        eligibleDepartments.length === 0 ||
        (departmentCode &&
          eligibleDepartments.includes(departmentCode));

      const cgpaEligible =
        opportunity.minimum_cgpa === null ||
        opportunity.minimum_cgpa === undefined ||
        (studentCgpa !== null &&
          studentCgpa >= Number(opportunity.minimum_cgpa));

      const graduationEligible =
        opportunity.graduation_year === null ||
        opportunity.graduation_year === undefined ||
        (studentGraduationYear !== null &&
          studentGraduationYear === Number(opportunity.graduation_year));

      const eligible =
        departmentEligible && cgpaEligible && graduationEligible;

      const reasons = [];

      if (!departmentEligible) reasons.push("department");
      if (!cgpaEligible) reasons.push("CGPA");
      if (!graduationEligible) reasons.push("graduation year");

      return {
        ...opportunity,
        eligible,
        reasons,
      };
    });
  }, [opportunities, studentProfile, departmentCode]);

  const eligibleOpportunities = useMemo(
    () => eligibilityResults.filter((opportunity) => opportunity.eligible),
    [eligibilityResults]
  );

  function getOpportunitySkills(opportunityId) {
    return opportunitySkills
      .filter((row) => row.opportunity_id === opportunityId)
      .map((row) => ({
        ...row,
        skill: skillMap.get(row.skill_id),
      }))
      .filter((row) => row.skill);
  }

  function calculateGroupScore(requirements) {
    if (requirements.length === 0) {
      return {
        score: null,
        totalWeight: 0,
        earnedWeight: 0,
      };
    }

    let totalWeight = 0;
    let earnedWeight = 0;

    requirements.forEach((requirement) => {
      const weight = Number(requirement.weight) || 1;
      const studentSkill = studentSkillMap.get(requirement.skill_id);

      const factor = studentSkill
        ? proficiencyFactor(
            studentSkill.proficiency,
            requirement.minimum_proficiency
          )
        : 0;

      totalWeight += weight;
      earnedWeight += weight * factor;
    });

    const score =
      totalWeight > 0
        ? Math.round((earnedWeight / totalWeight) * 100)
        : 0;

    return {
      score,
      totalWeight,
      earnedWeight,
    };
  }

  function calculateOpportunityMatch(opportunityId) {
    const requirements = getOpportunitySkills(opportunityId);

    const required = requirements.filter(
      (item) => item.requirement_type === "required"
    );

    const preferred = requirements.filter(
      (item) => item.requirement_type === "preferred"
    );

    const requiredResult = calculateGroupScore(required);
    const preferredResult = calculateGroupScore(preferred);

    let overallScore = 0;

    if (
      requiredResult.score !== null &&
      preferredResult.score !== null
    ) {
      overallScore = Math.round(
        requiredResult.score * 0.7 +
          preferredResult.score * 0.3
      );
    } else if (requiredResult.score !== null) {
      overallScore = requiredResult.score;
    } else if (preferredResult.score !== null) {
      overallScore = preferredResult.score;
    }

    const matchedSkills = [];
    const weakSkills = [];
    const missingSkills = [];

    requirements.forEach((requirement) => {
      const catalogSkill = skillMap.get(requirement.skill_id);
      const studentSkill = studentSkillMap.get(requirement.skill_id);

      const factor = studentSkill
        ? proficiencyFactor(
            studentSkill.proficiency,
            requirement.minimum_proficiency
          )
        : 0;

      const item = {
        skill_id: requirement.skill_id,
        name: catalogSkill?.name || "Unknown skill",
        requirement_type: requirement.requirement_type,
        required_proficiency: requirement.minimum_proficiency,
        student_proficiency: studentSkill?.proficiency || null,
        weight: Number(requirement.weight) || 1,
        credit: factor,
      };

      if (!studentSkill) {
        missingSkills.push({
          ...item,
          status: "missing",
        });
      } else if (factor >= 1) {
        matchedSkills.push({
          ...item,
          status: "matched",
        });
      } else {
        weakSkills.push({
          ...item,
          status: "weak",
        });
      }
    });

    return {
      matchScore: overallScore,
      requiredSkillScore: requiredResult.score,
      preferredSkillScore: preferredResult.score,
      matchedSkills,
      weakSkills,
      missingSkills,
    };
  }

  // --------------------------------------------------
  // 6. Calculate and persist match scores
  // --------------------------------------------------

  useEffect(() => {
    async function calculateAndSaveMatches() {
      if (
        loading ||
        !studentProfile?.id ||
        eligibleOpportunities.length === 0
      ) {
        return;
      }

      const nextResults = {};

      eligibleOpportunities.forEach((opportunity) => {
        nextResults[opportunity.id] =
          calculateOpportunityMatch(opportunity.id);
      });

      setMatchResults(nextResults);

      const now = new Date().toISOString();

      const rows = eligibleOpportunities.map((opportunity) => {
        const result = nextResults[opportunity.id];

        return {
          student_id: studentProfile.id,
          opportunity_id: opportunity.id,
          match_score: result.matchScore,
          required_skill_score: result.requiredSkillScore,
          preferred_skill_score: result.preferredSkillScore,
          project_score: null,
          profile_score: null,

          matched_skills: result.matchedSkills,

          // Keep weak and completely missing skills together in the
          // database, while preserving their status in each JSON item.
          missing_skills: [
            ...result.weakSkills,
            ...result.missingSkills,
          ],

          calculated_at: now,
          updated_at: now,
        };
      });

      const { error: matchError } = await supabase
        .from("matches")
        .upsert(rows, {
          onConflict: "student_id,opportunity_id",
        });

      if (matchError) {
        setMatchSaveError(matchError.message);
      } else {
        setMatchSaveError("");
      }
    }

    calculateAndSaveMatches();
  }, [
    loading,
    studentProfile,
    eligibleOpportunities,
    opportunitySkills,
    studentSkills,
    skills,
  ]);

  async function handleApply(opportunity) {
    if (!studentProfile?.id) {
      setApplicationError("Student profile not found.");
      return;
    }

    const match = matchResults[opportunity.id];

    if (!match) {
      setApplicationError(
        "Your match score is still being calculated. Try again in a moment."
      );
      return;
    }

    if (applications[opportunity.id]) {
      setApplicationError("You have already applied to this opportunity.");
      return;
    }

    if (
      opportunity.application_deadline &&
      new Date(opportunity.application_deadline) < new Date()
    ) {
      setApplicationError(
        "The application deadline for this opportunity has passed."
      );
      return;
    }

    setApplicationError("");
    setApplyingId(opportunity.id);

    const { data: application, error: applyError } = await supabase
      .from("applications")
      .insert({
        student_id: studentProfile.id,
        opportunity_id: opportunity.id,
        status: "applied",
        match_score_at_apply: match.matchScore,
      })
      .select(
        "id, opportunity_id, status, match_score_at_apply, applied_at, updated_at"
      )
      .single();

    setApplyingId("");

    if (applyError) {
      // PostgreSQL unique-constraint violation.
      if (applyError.code === "23505") {
        const { data: existingApplication } = await supabase
          .from("applications")
          .select(
            "id, opportunity_id, status, match_score_at_apply, applied_at, updated_at"
          )
          .eq("student_id", studentProfile.id)
          .eq("opportunity_id", opportunity.id)
          .maybeSingle();

        if (existingApplication) {
          setApplications((current) => ({
            ...current,
            [opportunity.id]: existingApplication,
          }));

          return;
        }
      }

      setApplicationError(applyError.message);
      return;
    }

    setApplications((current) => ({
      ...current,
      [opportunity.id]: application,
    }));
  }

  function applicationStatusLabel(status) {
    const normalized = String(status || "applied").toLowerCase();

    const labels = {
      applied: "Applied ✓",
      shortlisted: "Shortlisted",
      interview: "Interview",
      selected: "Selected",
      rejected: "Rejected",
      withdrawn: "Withdrawn",
    };

    return labels[normalized] || formatProficiency(normalized);
  }

  function formatMoney(value) {
    if (value === null || value === undefined || value === "") {
      return null;
    }

    return `₹${Number(value).toLocaleString("en-IN")}`;
  }

  function formatDeadline(value) {
    if (!value) return "No deadline set";

    return new Date(value).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function formatProficiency(value) {
    if (!value) return "Not set";

    const normalized = String(value).toLowerCase();

    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }

  if (loading) {
    return (
      <div className="student-opportunity-state">
        Finding eligible opportunities…
      </div>
    );
  }

  if (error) {
    return (
      <div className="student-opportunity-state error">
        Could not load opportunities: {error}
      </div>
    );
  }

  return (
    <div className="student-opportunities-page">
      <section className="student-opportunities-head">
        <div>
          <span className="student-opportunities-kicker">
            // opportunity matching
          </span>

          <h1>Opportunities for you</h1>

          <p>
            SkillBridge first checks your eligibility, then compares your
            saved skills and proficiency levels with each recruiter&apos;s
            requirements.
          </p>
        </div>

        <div className="student-eligibility-summary">
          <strong>{eligibleOpportunities.length}</strong>
          <span>eligible now</span>
        </div>
      </section>

      <section className="student-eligibility-strip">
        <div>
          <span>Department</span>
          <strong>{departmentCode || "Not set"}</strong>
        </div>

        <div>
          <span>CGPA</span>
          <strong>
            {studentProfile?.cgpa !== null &&
            studentProfile?.cgpa !== undefined
              ? studentProfile.cgpa
              : "Not set"}
          </strong>
        </div>

        <div>
          <span>Graduation year</span>
          <strong>{studentProfile?.graduation_year || "Not set"}</strong>
        </div>

        <div>
          <span>Saved skills</span>
          <strong>{studentSkills.length}</strong>
        </div>
      </section>

      {matchSaveError && (
        <div className="student-match-warning">
          Match scores were calculated, but could not be saved:{" "}
          {matchSaveError}
        </div>
      )}

      {applicationError && (
        <div className="student-application-warning">
          {applicationError}
        </div>
      )}

      {eligibleOpportunities.length === 0 ? (
        <section className="student-opportunities-empty">
          <div className="student-opportunities-empty-icon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M4 7h16v12H4z" />
              <path d="M8 7V5h8v2M8 12h8" />
            </svg>
          </div>

          <h2>No eligible open opportunities yet</h2>

          <p>
            This can simply mean recruiters have not published an open role
            matching your department, CGPA and graduation year yet.
          </p>
        </section>
      ) : (
        <section className="student-opportunity-list">
          {eligibleOpportunities.map((opportunity) => {
            const requirements = getOpportunitySkills(opportunity.id);

            const requiredSkills = requirements.filter(
              (item) => item.requirement_type === "required"
            );

            const preferredSkills = requirements.filter(
              (item) => item.requirement_type === "preferred"
            );

            const match = matchResults[opportunity.id];
            const application = applications[opportunity.id];
            const isApplying = applyingId === opportunity.id;

            const isInternship =
              String(opportunity.type || "").toLowerCase() === "internship";

            const compensation = isInternship
              ? opportunity.stipend_min || opportunity.stipend_max
                ? `${formatMoney(opportunity.stipend_min) || "—"} – ${
                    formatMoney(opportunity.stipend_max) || "—"
                  } / month`
                : "Stipend not specified"
              : opportunity.salary_min || opportunity.salary_max
                ? `${formatMoney(opportunity.salary_min) || "—"} – ${
                    formatMoney(opportunity.salary_max) || "—"
                  }`
                : "Salary not specified";

            return (
              <article
                key={opportunity.id}
                className="student-opportunity-card"
              >
                <div className="student-opportunity-card-top">
                  <div>
                    <div className="student-opportunity-tags">
                      <span>{opportunity.type || "Opportunity"}</span>
                      <span>{opportunity.work_mode || "Work mode not set"}</span>
                    </div>

                    <h2>{opportunity.title}</h2>
                  </div>

                  <span className="student-eligible-badge">
                    ✓ Eligible
                  </span>
                </div>

                <p className="student-opportunity-description">
                  {opportunity.description}
                </p>

                <div className="student-opportunity-meta">
                  <span>{opportunity.location || "Location not specified"}</span>
                  <span>{opportunity.duration || "Duration not specified"}</span>
                  <span>{compensation}</span>
                  <span>
                    Apply by {formatDeadline(opportunity.application_deadline)}
                  </span>
                </div>

                <div className="student-opportunity-eligibility">
                  <div>
                    <span>Minimum CGPA</span>
                    <strong>{opportunity.minimum_cgpa ?? "Any"}</strong>
                  </div>

                  <div>
                    <span>Graduation year</span>
                    <strong>{opportunity.graduation_year ?? "Any"}</strong>
                  </div>

                  <div>
                    <span>Departments</span>
                    <strong>
                      {opportunity.eligible_department_codes?.length
                        ? opportunity.eligible_department_codes.join(", ")
                        : "All"}
                    </strong>
                  </div>
                </div>

                <div className="student-opportunity-skills">
                  <div>
                    <span className="student-skill-group-label">
                      Required skills
                    </span>

                    <div className="student-skill-chips">
                      {requiredSkills.length > 0 ? (
                        requiredSkills.map((item) => (
                          <span key={item.skill_id} className="required">
                            {item.skill.name}
                            <small>
                              {formatProficiency(item.minimum_proficiency)}
                            </small>
                          </span>
                        ))
                      ) : (
                        <span className="student-no-skills">
                          None specified
                        </span>
                      )}
                    </div>
                  </div>

                  {preferredSkills.length > 0 && (
                    <div>
                      <span className="student-skill-group-label">
                        Preferred skills
                      </span>

                      <div className="student-skill-chips">
                        {preferredSkills.map((item) => (
                          <span key={item.skill_id} className="preferred">
                            {item.skill.name}
                            <small>
                              {formatProficiency(item.minimum_proficiency)}
                            </small>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <section className="student-match-panel">
                  <div className="student-match-score-card">
                    <span>// skill match</span>

                    <strong>
                      {match ? `${match.matchScore}%` : "…"}
                    </strong>

                    <small>
                      Required{" "}
                      {match?.requiredSkillScore === null ||
                      match?.requiredSkillScore === undefined
                        ? "—"
                        : `${match.requiredSkillScore}%`}
                      {" · "}
                      Preferred{" "}
                      {match?.preferredSkillScore === null ||
                      match?.preferredSkillScore === undefined
                        ? "—"
                        : `${match.preferredSkillScore}%`}
                    </small>
                  </div>

                  <div className="student-match-breakdown">
                    <div>
                      <span className="student-match-section-label">
                        Matched
                      </span>

                      <div className="student-match-items">
                        {match?.matchedSkills?.length ? (
                          match.matchedSkills.map((item) => (
                            <span
                              key={`matched-${item.skill_id}`}
                              className="matched"
                            >
                              ✓ {item.name}
                              <small>
                                {formatProficiency(
                                  item.student_proficiency
                                )}
                              </small>
                            </span>
                          ))
                        ) : (
                          <span className="student-match-empty">
                            No full matches yet
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="student-match-section-label">
                        Needs improvement
                      </span>

                      <div className="student-match-items">
                        {match?.weakSkills?.length ? (
                          match.weakSkills.map((item) => (
                            <span
                              key={`weak-${item.skill_id}`}
                              className="weak"
                            >
                              △ {item.name}
                              <small>
                                {formatProficiency(
                                  item.student_proficiency
                                )}{" "}
                                →{" "}
                                {formatProficiency(
                                  item.required_proficiency
                                )}
                              </small>
                            </span>
                          ))
                        ) : (
                          <span className="student-match-empty">
                            No weak skills
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="student-match-section-label">
                        Missing
                      </span>

                      <div className="student-match-items">
                        {match?.missingSkills?.length ? (
                          match.missingSkills.map((item) => (
                            <span
                              key={`missing-${item.skill_id}`}
                              className="missing"
                            >
                              ✕ {item.name}
                              <small>
                                Need{" "}
                                {formatProficiency(
                                  item.required_proficiency
                                )}
                              </small>
                            </span>
                          ))
                        ) : (
                          <span className="student-match-empty">
                            No missing skills
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </section>

                <div className="student-opportunity-footer">
                  <span>
                    {application
                      ? `Match score at application: ${
                          application.match_score_at_apply ?? match?.matchScore ?? 0
                        }%`
                      : "Your current match score will be saved when you apply."}
                  </span>

                  {application ? (
                    <button
                      type="button"
                      className={`student-application-status status-${String(
                        application.status || "applied"
                      ).toLowerCase()}`}
                      disabled
                    >
                      {applicationStatusLabel(application.status)}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="student-apply-button"
                      disabled={isApplying || !match}
                      onClick={() => handleApply(opportunity)}
                    >
                      {isApplying ? "Applying…" : "Apply Now"}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}

export default StudentOpportunities;
