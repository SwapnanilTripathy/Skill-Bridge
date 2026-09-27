import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { supabase } from "../../services/supabase";
import { useAuth } from "../../hooks/useAuth";
import "./CandidateDetails.css";

const PROFICIENCY_RANK = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
  expert: 4,
};

function normalizeProficiency(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function proficiencyFactor(studentLevel, requiredLevel) {
  const studentRank =
    PROFICIENCY_RANK[normalizeProficiency(studentLevel)] || 0;

  const requiredRank =
    PROFICIENCY_RANK[normalizeProficiency(requiredLevel)] || 1;

  if (studentRank === 0) return 0;

  if (studentRank >= requiredRank) return 1;

  const difference = requiredRank - studentRank;

  if (difference === 1) return 0.6;
  if (difference === 2) return 0.3;

  return 0;
}

function CandidateDetails() {
  const { user } = useAuth();
  const { applicationId } = useParams();
  const navigate = useNavigate();

  const [application, setApplication] = useState(null);
  const [opportunity, setOpportunity] = useState(null);
  const [student, setStudent] = useState(null);
  const [profile, setProfile] = useState(null);

  const [studentSkills, setStudentSkills] = useState([]);
  const [skills, setSkills] = useState([]);
  const [opportunitySkills, setOpportunitySkills] = useState([]);
  const [resume, setResume] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [statusSuccess, setStatusSuccess] = useState("");

  useEffect(() => {
    if (!user || !applicationId) return;

    let cancelled = false;

    async function loadCandidate() {
      try {
        setLoading(true);
        setError("");

        // --------------------------------------------------
        // 1. GET RECRUITER
        // --------------------------------------------------

        const { data: recruiter, error: recruiterError } = await supabase
          .from("recruiter_profiles")
          .select("id, company_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (recruiterError) throw recruiterError;

        if (!recruiter?.company_id) {
          throw new Error("No company is linked to this recruiter account.");
        }

        // --------------------------------------------------
        // 2. GET APPLICATION
        // --------------------------------------------------

        const { data: applicationData, error: applicationError } =
          await supabase
            .from("applications")
            .select(
              "id, student_id, opportunity_id, status, match_score_at_apply, applied_at, updated_at"
            )
            .eq("id", applicationId)
            .maybeSingle();

        if (applicationError) throw applicationError;

        if (!applicationData) {
          throw new Error("Application not found.");
        }

        // --------------------------------------------------
        // 3. GET OPPORTUNITY
        // --------------------------------------------------

        const { data: opportunityData, error: opportunityError } =
          await supabase
            .from("opportunities")
            .select(
              "id, company_id, recruiter_id, title, type, description, location, work_mode, duration, status"
            )
            .eq("id", applicationData.opportunity_id)
            .maybeSingle();

        if (opportunityError) throw opportunityError;

        if (!opportunityData) {
          throw new Error("Opportunity not found.");
        }

        if (opportunityData.company_id !== recruiter.company_id) {
          throw new Error(
            "You do not have permission to view this application."
          );
        }

        // --------------------------------------------------
        // 4. GET STUDENT PROFILE
        // --------------------------------------------------

        const { data: studentData, error: studentError } = await supabase
          .from("student_profiles")
          .select(
            "id, user_id, degree, current_year, current_semester, graduation_year, cgpa, college_email, student_id, verification_status"
          )
          .eq("id", applicationData.student_id)
          .maybeSingle();

        if (studentError) throw studentError;

        if (!studentData) {
          throw new Error("Student profile not found.");
        }

        // --------------------------------------------------
        // 5. GET ACCOUNT PROFILE
        // --------------------------------------------------

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .eq("id", studentData.user_id)
          .maybeSingle();

        if (profileError) throw profileError;

        // --------------------------------------------------
        // 6. GET STUDENT SKILLS
        // --------------------------------------------------

        const { data: studentSkillData, error: studentSkillError } =
          await supabase
            .from("student_skills")
            .select(
              "id, student_id, skill_id, proficiency, source, verified"
            )
            .eq("student_id", studentData.id);

        if (studentSkillError) throw studentSkillError;

        const studentSkillRows = studentSkillData || [];

        // --------------------------------------------------
        // 7. GET OPPORTUNITY SKILL REQUIREMENTS
        // --------------------------------------------------

        const {
          data: opportunitySkillData,
          error: opportunitySkillError,
        } = await supabase
          .from("opportunity_skills")
          .select(
            "id, opportunity_id, skill_id, requirement_type, minimum_proficiency, weight"
          )
          .eq("opportunity_id", opportunityData.id);

        if (opportunitySkillError) throw opportunitySkillError;

        const opportunitySkillRows = opportunitySkillData || [];

        // --------------------------------------------------
        // 8. GET ALL NEEDED SKILL NAMES
        // --------------------------------------------------

        const skillIds = [
          ...new Set(
            [
              ...studentSkillRows.map((row) => row.skill_id),
              ...opportunitySkillRows.map((row) => row.skill_id),
            ].filter(Boolean)
          ),
        ];

        let skillRows = [];

        if (skillIds.length > 0) {
          const { data: skillData, error: skillError } = await supabase
            .from("skills")
            .select("id, name, category, description")
            .in("id", skillIds);

          if (skillError) throw skillError;

          skillRows = skillData || [];
        }

        // --------------------------------------------------
        // 9. GET CURRENT RESUME
        // --------------------------------------------------

        const { data: resumeData, error: resumeError } = await supabase
          .from("resumes")
          .select(
            "id, student_id, file_url, file_name, parsed_text, parsed_data, is_current, uploaded_at"
          )
          .eq("student_id", studentData.id)
          .eq("is_current", true)
          .maybeSingle();

        if (resumeError) throw resumeError;

        if (cancelled) return;

        setApplication(applicationData);
        setOpportunity(opportunityData);
        setStudent(studentData);
        setProfile(profileData || null);

        setStudentSkills(studentSkillRows);
        setOpportunitySkills(opportunitySkillRows);
        setSkills(skillRows);

        setResume(resumeData || null);

        setLoading(false);
      } catch (loadError) {
        console.error("Candidate details loading error:", loadError);

        if (!cancelled) {
          setError(
            loadError?.message || "Unable to load candidate details."
          );

          setLoading(false);
        }
      }
    }

    loadCandidate();

    return () => {
      cancelled = true;
    };
  }, [user, applicationId]);

  // --------------------------------------------------
  // SKILL LOOKUPS
  // --------------------------------------------------

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

  const candidateSkills = useMemo(() => {
    return studentSkills
      .map((studentSkill) => {
        const skill = skillMap.get(studentSkill.skill_id);

        return {
          ...studentSkill,
          name: skill?.name || "Unknown skill",
          category: skill?.category || "other",
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [studentSkills, skillMap]);

  // --------------------------------------------------
  // CURRENT SKILL MATCH
  // --------------------------------------------------

  const currentMatch = useMemo(() => {
    const requiredRequirements = opportunitySkills.filter(
      (row) => row.requirement_type === "required"
    );

    const preferredRequirements = opportunitySkills.filter(
      (row) => row.requirement_type === "preferred"
    );

    function calculateGroupScore(requirements) {
      if (requirements.length === 0) {
        return {
          score: null,
          earnedWeight: 0,
          totalWeight: 0,
        };
      }

      let totalWeight = 0;
      let earnedWeight = 0;

      requirements.forEach((requirement) => {
        const weight = Number(requirement.weight || 1);

        const studentSkill = studentSkillMap.get(
          requirement.skill_id
        );

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
        earnedWeight,
        totalWeight,
      };
    }

    const requiredResult =
      calculateGroupScore(requiredRequirements);

    const preferredResult =
      calculateGroupScore(preferredRequirements);

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

    opportunitySkills.forEach((requirement) => {
      const skill = skillMap.get(requirement.skill_id);

      const studentSkill = studentSkillMap.get(
        requirement.skill_id
      );

      const skillName = skill?.name || "Unknown skill";

      if (!studentSkill) {
        missingSkills.push({
          id: requirement.id,
          skillId: requirement.skill_id,
          name: skillName,
          requirementType: requirement.requirement_type,
          requiredProficiency:
            requirement.minimum_proficiency,
          weight: requirement.weight,
        });

        return;
      }

      const factor = proficiencyFactor(
        studentSkill.proficiency,
        requirement.minimum_proficiency
      );

      const skillResult = {
        id: requirement.id,
        skillId: requirement.skill_id,
        name: skillName,
        requirementType: requirement.requirement_type,
        requiredProficiency:
          requirement.minimum_proficiency,
        studentProficiency: studentSkill.proficiency,
        weight: requirement.weight,
        factor,
      };

      if (factor >= 1) {
        matchedSkills.push(skillResult);
      } else {
        weakSkills.push(skillResult);
      }
    });

    return {
      score: overallScore,
      requiredScore: requiredResult.score,
      preferredScore: preferredResult.score,
      matchedSkills,
      weakSkills,
      missingSkills,
    };
  }, [opportunitySkills, skillMap, studentSkillMap]);

  // --------------------------------------------------
  // HELPERS
  // --------------------------------------------------

  function formatDate(value) {
    if (!value) return "Unknown";

    return new Date(value).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function formatProficiency(value) {
    if (!value) return "Not specified";

    return (
      value.charAt(0).toUpperCase() +
      value.slice(1).toLowerCase()
    );
  }

  function formatStatus(value) {
    if (!value) return "Applied";

    return (
      value.charAt(0).toUpperCase() +
      value.slice(1).replaceAll("_", " ")
    );
  }

  function formatSource(value) {
    if (!value) return "Student profile";

    if (value === "self_reported") {
      return "Self reported";
    }

    if (value === "resume") {
      return "Resume";
    }

    return value
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );
  }

  // --------------------------------------------------
  // RECRUITER APPLICATION ACTIONS
  // --------------------------------------------------

  async function updateApplicationStatus(nextStatus) {
    if (!application?.id || statusUpdating) return;

    try {
      setStatusUpdating(true);
      setStatusError("");
      setStatusSuccess("");

      const { data, error: updateError } = await supabase
        .from("applications")
        .update({
          status: nextStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", application.id)
        .select("id, status, updated_at")
        .single();

      if (updateError) throw updateError;

      setApplication((current) => ({
        ...current,
        status: data.status,
        updated_at: data.updated_at,
      }));

      setStatusSuccess(
        nextStatus === "shortlisted"
          ? "Candidate shortlisted successfully."
          : nextStatus === "selected"
            ? "Candidate selected successfully."
            : "Application rejected successfully."
      );
    } catch (updateError) {
      console.error("Application status update error:", updateError);
      setStatusError(
        updateError?.message || "Unable to update the application status."
      );
    } finally {
      setStatusUpdating(false);
    }
  }

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (loading) {
    return (
      <div className="candidate-details-state">
        <div className="candidate-details-loader"></div>
        <p>Loading candidate profile...</p>
      </div>
    );
  }

  // --------------------------------------------------
  // ERROR
  // --------------------------------------------------

  if (error) {
    return (
      <div className="candidate-details-state">
        <div className="candidate-details-error-card">
          <span className="candidate-details-error-code">
            // ERROR
          </span>

          <h2>Unable to load candidate</h2>

          <p>{error}</p>

          <button
            type="button"
            className="candidate-details-primary-button"
            onClick={() =>
              navigate("/recruiter/candidates")
            }
          >
            Back to candidates
          </button>
        </div>
      </div>
    );
  }

  // --------------------------------------------------
  // DISPLAY VALUES
  // --------------------------------------------------

  const candidateName =
    profile?.full_name ||
    student?.college_email ||
    "Student";

  const candidateEmail =
    profile?.email ||
    student?.college_email ||
    "Email unavailable";

  const candidateInitial =
    candidateName?.charAt(0)?.toUpperCase() || "S";

  const applicationMatchScore = Math.round(
    Number(application?.match_score_at_apply || 0)
  );

  const currentMatchScore = currentMatch.score || 0;

  const verificationStatus =
    student?.verification_status || "pending";

  // --------------------------------------------------
  // PAGE
  // --------------------------------------------------

  return (
    <div className="candidate-details-page">
      {/* HEADER */}

      <div className="candidate-details-page-header">
        <button
          type="button"
          className="candidate-details-back-button"
          onClick={() =>
            navigate("/recruiter/candidates")
          }
        >
          <span>←</span>
          Back to candidates
        </button>

        <span className="candidate-details-header-label">
          // candidate profile
        </span>
      </div>

      {/* HERO */}

      <section className="candidate-details-hero">
        <div className="candidate-details-identity">
          <div className="candidate-details-avatar">
            {candidateInitial}
          </div>

          <div className="candidate-details-identity-copy">
            <div className="candidate-details-name-row">
              <h1>{candidateName}</h1>

              <span className="candidate-details-status-badge">
                {formatStatus(application?.status)}
              </span>
            </div>

            <p className="candidate-details-email">
              {candidateEmail}
            </p>

            <p className="candidate-details-applied-role">
              Applied for{" "}
              <strong>
                {opportunity?.title || "Opportunity"}
              </strong>
            </p>
          </div>
        </div>

        <div className="candidate-details-match-card">
          <span>// CURRENT MATCH</span>

          <strong>{currentMatchScore}%</strong>

          <p>current skill match</p>
        </div>
      </section>

      {/* SUMMARY */}

      <section className="candidate-details-summary-grid">
        <div className="candidate-details-summary-box">
          <span>CGPA</span>
          <strong>{student?.cgpa ?? "—"}</strong>
        </div>

        <div className="candidate-details-summary-box">
          <span>DEGREE</span>
          <strong>{student?.degree || "—"}</strong>
        </div>

        <div className="candidate-details-summary-box">
          <span>YEAR</span>
          <strong>
            {student?.current_year
              ? `Year ${student.current_year}`
              : "—"}
          </strong>
        </div>

        <div className="candidate-details-summary-box">
          <span>SEMESTER</span>
          <strong>
            {student?.current_semester
              ? `Semester ${student.current_semester}`
              : "—"}
          </strong>
        </div>

        <div className="candidate-details-summary-box">
          <span>GRADUATION</span>
          <strong>
            {student?.graduation_year ?? "—"}
          </strong>
        </div>

        <div className="candidate-details-summary-box">
          <span>STUDENT ID</span>
          <strong>{student?.student_id || "—"}</strong>
        </div>
      </section>

      {/* MAIN CONTENT */}

      <div className="candidate-details-content-grid">
        {/* LEFT */}

        <div className="candidate-details-left-column">
          {/* CURRENT MATCH BREAKDOWN */}

          <section className="candidate-details-card">
            <div className="candidate-details-section-heading">
              <div>
                <span className="candidate-details-section-kicker">
                  // SKILL MATCH
                </span>

                <h2>Current match breakdown</h2>
              </div>
            </div>

            <div className="candidate-details-match-summary">
              <div>
                <span>CURRENT</span>
                <strong>{currentMatchScore}%</strong>
              </div>

              <div>
                <span>REQUIRED</span>
                <strong>
                  {currentMatch.requiredScore !== null
                    ? `${currentMatch.requiredScore}%`
                    : "—"}
                </strong>
              </div>

              <div>
                <span>PREFERRED</span>
                <strong>
                  {currentMatch.preferredScore !== null
                    ? `${currentMatch.preferredScore}%`
                    : "—"}
                </strong>
              </div>

              <div>
                <span>AT APPLICATION</span>
                <strong>
                  {applicationMatchScore}%
                </strong>
              </div>
            </div>

            <div className="candidate-details-match-groups">
              <div className="candidate-details-match-group">
                <span className="candidate-details-match-group-title">
                  MATCHED
                </span>

                {currentMatch.matchedSkills.length ===
                0 ? (
                  <p className="candidate-details-match-empty">
                    No fully matched skills.
                  </p>
                ) : (
                  <div className="candidate-details-match-items">
                    {currentMatch.matchedSkills.map(
                      (skill) => (
                        <div
                          className="candidate-details-match-item matched"
                          key={skill.id}
                        >
                          <strong>
                            ✓ {skill.name}
                          </strong>

                          <span>
                            {formatProficiency(
                              skill.studentProficiency
                            )}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>

              <div className="candidate-details-match-group">
                <span className="candidate-details-match-group-title">
                  NEEDS IMPROVEMENT
                </span>

                {currentMatch.weakSkills.length === 0 ? (
                  <p className="candidate-details-match-empty">
                    No weak skills.
                  </p>
                ) : (
                  <div className="candidate-details-match-items">
                    {currentMatch.weakSkills.map(
                      (skill) => (
                        <div
                          className="candidate-details-match-item weak"
                          key={skill.id}
                        >
                          <strong>
                            △ {skill.name}
                          </strong>

                          <span>
                            {formatProficiency(
                              skill.studentProficiency
                            )}{" "}
                            → Need{" "}
                            {formatProficiency(
                              skill.requiredProficiency
                            )}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>

              <div className="candidate-details-match-group">
                <span className="candidate-details-match-group-title">
                  MISSING
                </span>

                {currentMatch.missingSkills.length ===
                0 ? (
                  <p className="candidate-details-match-empty">
                    No missing skills.
                  </p>
                ) : (
                  <div className="candidate-details-match-items">
                    {currentMatch.missingSkills.map(
                      (skill) => (
                        <div
                          className="candidate-details-match-item missing"
                          key={skill.id}
                        >
                          <strong>
                            × {skill.name}
                          </strong>

                          <span>
                            Need{" "}
                            {formatProficiency(
                              skill.requiredProficiency
                            )}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* APPLICATION */}

          <section className="candidate-details-card">
            <div className="candidate-details-section-heading">
              <div>
                <span className="candidate-details-section-kicker">
                  // APPLICATION
                </span>

                <h2>Application details</h2>
              </div>
            </div>

            <div className="candidate-details-info-list">
              <div className="candidate-details-info-row">
                <span>Status</span>

                <strong>
                  {formatStatus(application?.status)}
                </strong>
              </div>

              <div className="candidate-details-info-row">
                <span>Applied on</span>

                <strong>
                  {formatDate(application?.applied_at)}
                </strong>
              </div>

              <div className="candidate-details-info-row">
                <span>Opportunity</span>

                <strong>
                  {opportunity?.title || "—"}
                </strong>
              </div>

              <div className="candidate-details-info-row">
                <span>Type</span>

                <strong>
                  {opportunity?.type
                    ? formatStatus(opportunity.type)
                    : "—"}
                </strong>
              </div>

              <div className="candidate-details-info-row">
                <span>Location</span>

                <strong>
                  {opportunity?.location || "—"}
                </strong>
              </div>

              <div className="candidate-details-info-row">
                <span>Work mode</span>

                <strong>
                  {opportunity?.work_mode
                    ? formatStatus(
                        opportunity.work_mode
                      )
                    : "—"}
                </strong>
              </div>

              <div className="candidate-details-info-row">
                <span>Duration</span>

                <strong>
                  {opportunity?.duration || "—"}
                </strong>
              </div>
            </div>
          </section>

          {/* ALL CANDIDATE SKILLS */}

          <section className="candidate-details-card">
            <div className="candidate-details-section-heading">
              <div>
                <span className="candidate-details-section-kicker">
                  // SKILL PROFILE
                </span>

                <h2>Candidate skills</h2>
              </div>

              <span className="candidate-details-count">
                {candidateSkills.length}{" "}
                {candidateSkills.length === 1
                  ? "skill"
                  : "skills"}
              </span>
            </div>

            {candidateSkills.length === 0 ? (
              <div className="candidate-details-empty">
                <p>No skills have been added yet.</p>
              </div>
            ) : (
              <div className="candidate-details-skills">
                {candidateSkills.map((skill) => (
                  <div
                    className="candidate-details-skill"
                    key={skill.id}
                  >
                    <div className="candidate-details-skill-top">
                      <strong>{skill.name}</strong>

                      {skill.verified && (
                        <span className="candidate-details-verified">
                          ✓ Verified
                        </span>
                      )}
                    </div>

                    <div className="candidate-details-skill-meta">
                      <span>
                        {formatProficiency(
                          skill.proficiency
                        )}
                      </span>

                      <span>•</span>

                      <span>
                        {formatSource(skill.source)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* RIGHT */}

        <div className="candidate-details-right-column">
          {/* SCORE */}

          <section className="candidate-details-card candidate-details-score-section">
            <span className="candidate-details-section-kicker">
              // CURRENT SKILL MATCH
            </span>

            <div className="candidate-details-big-score">
              {currentMatchScore}%
            </div>

            <p>
              Current compatibility based on the
              candidate&apos;s skills and this
              opportunity&apos;s requirements.
            </p>

            <div className="candidate-details-score-track">
              <div
                className="candidate-details-score-fill"
                style={{
                  width: `${Math.min(
                    Math.max(currentMatchScore, 0),
                    100
                  )}%`,
                }}
              ></div>
            </div>

            <div className="candidate-details-application-score">
              <span>Score at application</span>
              <strong>
                {applicationMatchScore}%
              </strong>
            </div>
          </section>

          {/* RECRUITER ACTIONS */}

          <section className="candidate-details-card candidate-details-actions-card">
            <div className="candidate-details-section-heading">
              <div>
                <span className="candidate-details-section-kicker">
                  // RECRUITER ACTION
                </span>

                <h2>Application decision</h2>
              </div>
            </div>

            <p className="candidate-details-actions-copy">
              Update this candidate&apos;s application status. The student will
              see the new status in their application record.
            </p>

            <div className="candidate-details-current-status">
              <span>Current status</span>
              <strong>{formatStatus(application?.status)}</strong>
            </div>

            {statusError && (
              <div className="candidate-details-action-message error">
                {statusError}
              </div>
            )}

            {statusSuccess && (
              <div className="candidate-details-action-message success">
                {statusSuccess}
              </div>
            )}

            <div className="candidate-details-action-buttons">
              <button
                type="button"
                className="candidate-details-shortlist-button"
                disabled={
                  statusUpdating || application?.status === "shortlisted"
                }
                onClick={() => updateApplicationStatus("shortlisted")}
              >
                {statusUpdating
                  ? "Updating..."
                  : application?.status === "shortlisted"
                    ? "Shortlisted ✓"
                    : "Shortlist candidate"}
              </button>

              <button
                type="button"
                className="candidate-details-shortlist-button"
                disabled={statusUpdating || application?.status === "selected"}
                onClick={() => updateApplicationStatus("selected")}
              >
                {statusUpdating
                  ? "Updating..."
                  : application?.status === "selected"
                    ? "Selected ✓"
                    : "Select candidate"}
              </button>

              <button
                type="button"
                className="candidate-details-reject-button"
                disabled={statusUpdating || application?.status === "rejected"}
                onClick={() => updateApplicationStatus("rejected")}
              >
                {statusUpdating
                  ? "Updating..."
                  : application?.status === "rejected"
                    ? "Rejected"
                    : "Reject application"}
              </button>
            </div>
          </section>

          {/* ACADEMIC */}

          <section className="candidate-details-card">
            <div className="candidate-details-section-heading">
              <div>
                <span className="candidate-details-section-kicker">
                  // ACADEMIC
                </span>

                <h2>Academic profile</h2>
              </div>
            </div>

            <div className="candidate-details-info-list">
              <div className="candidate-details-info-row">
                <span>Student ID</span>
                <strong>
                  {student?.student_id || "—"}
                </strong>
              </div>

              <div className="candidate-details-info-row">
                <span>Degree</span>
                <strong>
                  {student?.degree || "—"}
                </strong>
              </div>

              <div className="candidate-details-info-row">
                <span>Current year</span>
                <strong>
                  {student?.current_year ?? "—"}
                </strong>
              </div>

              <div className="candidate-details-info-row">
                <span>Semester</span>
                <strong>
                  {student?.current_semester ?? "—"}
                </strong>
              </div>

              <div className="candidate-details-info-row">
                <span>CGPA</span>
                <strong>
                  {student?.cgpa ?? "—"}
                </strong>
              </div>

              <div className="candidate-details-info-row">
                <span>Graduation</span>
                <strong>
                  {student?.graduation_year ?? "—"}
                </strong>
              </div>
            </div>

            <div
              className={`candidate-details-verification ${
                verificationStatus === "verified"
                  ? "verified"
                  : ""
              }`}
            >
              <span>Student verification</span>

              <strong>
                {formatStatus(verificationStatus)}
              </strong>
            </div>
          </section>

          {/* RESUME */}

          <section className="candidate-details-card">
            <div className="candidate-details-section-heading">
              <div>
                <span className="candidate-details-section-kicker">
                  // RESUME
                </span>

                <h2>Current resume</h2>
              </div>
            </div>

            {resume ? (
              <div className="candidate-details-resume">
                <div className="candidate-details-resume-icon">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M6 2h8l4 4v16H6z" />
                    <path d="M14 2v5h5" />
                    <path d="M9 12h6M9 16h6" />
                  </svg>
                </div>

                <div className="candidate-details-resume-copy">
                  <strong>
                    {resume.file_name || "Resume"}
                  </strong>

                  <span>
                    Uploaded{" "}
                    {formatDate(resume.uploaded_at)}
                  </span>
                </div>

                <span className="candidate-details-current">
                  Current
                </span>
              </div>
            ) : (
              <div className="candidate-details-empty">
                <p>No current resume available.</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default CandidateDetails;