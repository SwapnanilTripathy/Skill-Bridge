import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { supabase } from "../../services/supabase";
import { useAuth } from "../../hooks/useAuth";
import "./RecruiterCandidates.css";

function RecruiterCandidates() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [company, setCompany] = useState(null);
  const [applications, setApplications] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [studentProfiles, setStudentProfiles] = useState([]);
  const [profiles, setProfiles] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    async function loadCandidates() {
      try {
        setLoading(true);
        setError("");

        // --------------------------------------------------
        // 1. GET RECRUITER
        // --------------------------------------------------

        const { data: recruiter, error: recruiterError } =
          await supabase
            .from("recruiter_profiles")
            .select("id, company_id")
            .eq("user_id", user.id)
            .maybeSingle();

        if (recruiterError) {
          throw recruiterError;
        }

        if (!recruiter?.company_id) {
          throw new Error(
            "No company is linked to this recruiter account."
          );
        }

        // --------------------------------------------------
        // 2. GET COMPANY
        // --------------------------------------------------

        const { data: companyData, error: companyError } =
          await supabase
            .from("companies")
            .select("id, name")
            .eq("id", recruiter.company_id)
            .maybeSingle();

        if (companyError) {
          throw companyError;
        }

        // --------------------------------------------------
        // 3. GET THIS COMPANY'S OPPORTUNITIES
        // --------------------------------------------------

        const {
          data: opportunityData,
          error: opportunityError,
        } = await supabase
          .from("opportunities")
          .select("id, title, type, status")
          .eq("company_id", recruiter.company_id);

        if (opportunityError) {
          throw opportunityError;
        }

        const companyOpportunities = opportunityData || [];

        const opportunityIds = companyOpportunities.map(
          (opportunity) => opportunity.id
        );

        if (cancelled) return;

        setCompany(companyData || null);
        setOpportunities(companyOpportunities);

        // No opportunities means there cannot be applicants yet.
        if (opportunityIds.length === 0) {
          setApplications([]);
          setStudentProfiles([]);
          setProfiles([]);
          setLoading(false);
          return;
        }

        // --------------------------------------------------
        // 4. GET APPLICATIONS
        // --------------------------------------------------

        const {
          data: applicationData,
          error: applicationError,
        } = await supabase
          .from("applications")
          .select(
            "id, student_id, opportunity_id, status, match_score_at_apply, applied_at, updated_at"
          )
          .in("opportunity_id", opportunityIds)
          .order("applied_at", { ascending: false });

        if (applicationError) {
          throw applicationError;
        }

        const applicationRows = applicationData || [];

        if (cancelled) return;

        setApplications(applicationRows);

        if (applicationRows.length === 0) {
          setStudentProfiles([]);
          setProfiles([]);
          setLoading(false);
          return;
        }

        // --------------------------------------------------
        // 5. GET STUDENT PROFILES
        // --------------------------------------------------

        const studentIds = [
          ...new Set(
            applicationRows
              .map((application) => application.student_id)
              .filter(Boolean)
          ),
        ];

        const {
          data: studentProfileData,
          error: studentProfileError,
        } = await supabase
          .from("student_profiles")
          .select(
            "id, user_id, degree, current_year, current_semester, graduation_year, cgpa, college_email, student_id, verification_status"
          )
          .in("id", studentIds);

        if (studentProfileError) {
          throw studentProfileError;
        }

        const studentRows = studentProfileData || [];

        if (cancelled) return;

        setStudentProfiles(studentRows);

        // --------------------------------------------------
        // 6. GET ACCOUNT PROFILE FOR NAME + EMAIL
        // --------------------------------------------------

        const userIds = [
          ...new Set(
            studentRows
              .map((student) => student.user_id)
              .filter(Boolean)
          ),
        ];

        if (userIds.length === 0) {
          setProfiles([]);
          setLoading(false);
          return;
        }

        const { data: profileData, error: profileError } =
          await supabase
            .from("profiles")
            .select("id, full_name, email")
            .in("id", userIds);

        if (profileError) {
          throw profileError;
        }

        if (cancelled) return;

        setProfiles(profileData || []);
        setLoading(false);
      } catch (loadError) {
        console.error("Candidate loading error:", loadError);

        if (!cancelled) {
          setError(
            loadError?.message ||
              "Unable to load recruiter candidates."
          );

          setLoading(false);
        }
      }
    }

    loadCandidates();

    return () => {
      cancelled = true;
    };
  }, [user]);

  // --------------------------------------------------
  // LOOKUP MAPS
  // --------------------------------------------------

  const opportunityMap = useMemo(() => {
    return new Map(
      opportunities.map((opportunity) => [
        opportunity.id,
        opportunity,
      ])
    );
  }, [opportunities]);

  const studentMap = useMemo(() => {
    return new Map(
      studentProfiles.map((student) => [
        student.id,
        student,
      ])
    );
  }, [studentProfiles]);

  const profileMap = useMemo(() => {
    return new Map(
      profiles.map((profile) => [profile.id, profile])
    );
  }, [profiles]);

  // --------------------------------------------------
  // FORMAT DATE
  // --------------------------------------------------

  function formatDate(value) {
    if (!value) return "Unknown";

    return new Date(value).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (loading) {
    return (
      <div className="recruiter-candidates-state">
        Loading candidates…
      </div>
    );
  }

  // --------------------------------------------------
  // PAGE
  // --------------------------------------------------

  return (
    <div className="recruiter-candidates-page">
      <section className="recruiter-candidates-head">
        <span className="recruiter-candidates-kicker">
          // candidate matching
        </span>

        <h1>Your candidates</h1>

        <p>
          Review students who applied to opportunities posted by{" "}
          {company?.name || "your company"}.
        </p>
      </section>

      {error && (
        <div className="recruiter-candidates-error">
          <strong>Could not load candidates</strong>
          <span>{error}</span>
        </div>
      )}

      {!error && (
        <>
          <section className="recruiter-candidates-summary">
            <article>
              <span>Total applicants</span>
              <strong>{applications.length}</strong>
            </article>

            <article>
              <span>Applied</span>

              <strong>
                {
                  applications.filter(
                    (application) =>
                      String(
                        application.status || ""
                      ).toLowerCase() === "applied"
                  ).length
                }
              </strong>
            </article>

            <article>
              <span>Opportunities</span>
              <strong>{opportunities.length}</strong>
            </article>
          </section>

          {applications.length === 0 ? (
            <section className="recruiter-candidates-empty">
              <div className="recruiter-candidates-empty-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="9" cy="8" r="3" />
                  <circle cx="17" cy="10" r="2" />

                  <path d="M3 20c.6-4 2.8-6 6-6s5.4 2 6 6" />
                  <path d="M15 15c3 0 5 1.7 6 5" />
                </svg>
              </div>

              <h2>No candidates yet</h2>

              <p>
                Applications from eligible students will appear
                here after they apply to one of your
                opportunities.
              </p>
            </section>
          ) : (
            <section className="recruiter-candidates-list">
              {applications.map((application) => {
                const student = studentMap.get(
                  application.student_id
                );

                const profile = student
                  ? profileMap.get(student.user_id)
                  : null;

                const opportunity = opportunityMap.get(
                  application.opportunity_id
                );

                const candidateName =
                  profile?.full_name ||
                  student?.college_email ||
                  "Student";

                const candidateEmail =
                  profile?.email ||
                  student?.college_email ||
                  "Email unavailable";

                const matchScore = Math.round(
                  Number(
                    application.match_score_at_apply || 0
                  )
                );

                const applicationStatus = String(
                  application.status || "applied"
                ).toLowerCase();

                return (
                  <article
                    key={application.id}
                    className="recruiter-candidate-card"
                  >
                    <div className="recruiter-candidate-main">
                      <div className="recruiter-candidate-avatar">
                        {candidateName
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div className="recruiter-candidate-identity">
                        <div className="recruiter-candidate-name-row">
                          <h2>{candidateName}</h2>

                          <span
                            className={`recruiter-candidate-status status-${applicationStatus}`}
                          >
                            {applicationStatus}
                          </span>
                        </div>

                        <p>{candidateEmail}</p>

                        <span className="recruiter-candidate-role">
                          Applied for{" "}
                          <strong>
                            {opportunity?.title ||
                              "Opportunity"}
                          </strong>
                        </span>
                      </div>

                      <div className="recruiter-candidate-match">
                        <span>// match</span>

                        <strong>{matchScore}%</strong>

                        <small>
                          score at application
                        </small>
                      </div>
                    </div>

                    <div className="recruiter-candidate-details">
                      <div>
                        <span>CGPA</span>
                        <strong>
                          {student?.cgpa ?? "—"}
                        </strong>
                      </div>

                      <div>
                        <span>Degree</span>
                        <strong>
                          {student?.degree || "—"}
                        </strong>
                      </div>

                      <div>
                        <span>Semester</span>
                        <strong>
                          {student?.current_semester
                            ? `Semester ${student.current_semester}`
                            : "—"}
                        </strong>
                      </div>

                      <div>
                        <span>Graduation</span>
                        <strong>
                          {student?.graduation_year ?? "—"}
                        </strong>
                      </div>

                      <div>
                        <span>Student ID</span>
                        <strong>
                          {student?.student_id || "—"}
                        </strong>
                      </div>
                    </div>

                    <div className="recruiter-candidate-footer">
                      <div>
                        <span>
                          Applied{" "}
                          {formatDate(
                            application.applied_at
                          )}
                        </span>

                        {student?.verification_status && (
                          <span className="recruiter-candidate-verification">
                            Student verification:{" "}
                            {student.verification_status}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `/recruiter/candidates/${application.id}`
                          )
                        }
                      >
                        View candidate
                      </button>
                    </div>
                  </article>
                );
              })}
            </section>
          )}
        </>
      )}
    </div>
  );
}

export default RecruiterCandidates;