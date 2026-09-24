import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { supabase } from "../../services/supabase";
import { useAuth } from "../../hooks/useAuth";

import "./MyApplications.css";

function MyApplications() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [applications, setApplications] = useState([]);

  useEffect(() => {
    if (!user?.id) return;

    loadApplications();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function loadApplications() {
    try {
      setLoading(true);
      setError("");

      /* =========================
         1. GET FACULTY PROFILE
      ========================= */

      const { data: facultyData, error: facultyError } = await supabase
        .from("faculty_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (facultyError) {
        throw facultyError;
      }

      if (!facultyData) {
        navigate("/faculty/onboarding");
        return;
      }

      /* =========================
         2. GET APPLICATIONS
      ========================= */

      const { data: applicationData, error: applicationError } =
        await supabase
          .from("faculty_applications")
          .select(`
            id,
            faculty_id,
            opportunity_id,
            statement,
            status,
            applied_at,
            updated_at,
            faculty_opportunities (
              id,
              title,
              description,
              opportunity_type,
              specialization,
              location,
              mode,
              start_date,
              end_date,
              application_deadline,
              status,
              company_id,
              companies (
                id,
                name
              )
            )
          `)
          .eq("faculty_id", facultyData.id)
          .order("applied_at", { ascending: false });

      if (applicationError) {
        throw applicationError;
      }

      setApplications(applicationData || []);
    } catch (err) {
      console.error("Error loading faculty applications:", err);

      setError(
        err?.message ||
          "Something went wrong while loading your applications."
      );
    } finally {
      setLoading(false);
    }
  }

  function formatDate(date) {
    if (!date) return "Not specified";

    return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function formatDateTime(date) {
    if (!date) return "Not specified";

    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function formatType(type) {
    const labels = {
      faculty_internship: "Faculty Internship",
      fdp: "Faculty Development Programme",
      industrial_training: "Industrial Training",
      research_collaboration: "Research Collaboration",
      consultancy: "Consultancy",
      mentorship: "Mentorship",
      guest_lecture: "Guest Lecture",
      live_industry_project: "Live Industry Project",
    };

    return labels[type] || type || "Faculty Collaboration";
  }

  function formatMode(mode) {
    if (!mode) return "Not specified";

    return mode.charAt(0).toUpperCase() + mode.slice(1);
  }

  function getStatusLabel(status) {
    const labels = {
      applied: "Applied",
      shortlisted: "Shortlisted",
      selected: "Selected",
      rejected: "Rejected",
      withdrawn: "Withdrawn",
    };

    return labels[status] || status;
  }

  function getStatusDescription(status) {
    const descriptions = {
      applied:
        "Your application has been submitted and is awaiting recruiter review.",

      shortlisted:
        "You have been shortlisted by the industry partner for this collaboration.",

      selected:
        "You have been selected for this industry-academia collaboration.",

      rejected:
        "Your application was not selected for this collaboration.",

      withdrawn:
        "You withdrew your application from this collaboration.",
    };

    return descriptions[status] || "";
  }

  const totalApplications = applications.length;

  const activeApplications = applications.filter((application) =>
    ["applied", "shortlisted"].includes(application.status)
  ).length;

  const shortlistedApplications = applications.filter(
    (application) => application.status === "shortlisted"
  ).length;

  const selectedApplications = applications.filter(
    (application) => application.status === "selected"
  ).length;

  if (loading) {
    return (
      <div className="faculty-applications-page">
        <div className="faculty-applications-state">
          <div className="faculty-applications-loader"></div>

          <h2>Loading applications...</h2>

          <p>Fetching your industry collaboration activity.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="faculty-applications-page">
        <div className="faculty-applications-state error">
          <span className="faculty-applications-state-icon">!</span>

          <h2>Unable to load applications</h2>

          <p>{error}</p>

          <button type="button" onClick={loadApplications}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="faculty-applications-page">
      {/* =========================
          HERO
      ========================= */}

      <section className="faculty-applications-hero">
        <span className="faculty-applications-kicker">
          // YOUR ACTIVITY
        </span>

        <h1>
          My <span>Applications</span>
        </h1>

        <p>
          Track your faculty development, research, training and
          industry-academia collaboration applications.
        </p>
      </section>

      {/* =========================
          SUMMARY
      ========================= */}

      <section className="faculty-applications-summary">
        <article>
          <span>Total applications</span>

          <strong>{totalApplications}</strong>

          <p>Programmes you have applied to.</p>
        </article>

        <article>
          <span>Active</span>

          <strong>{activeApplications}</strong>

          <p>Applications currently under consideration.</p>
        </article>

        <article>
          <span>Shortlisted</span>

          <strong>{shortlistedApplications}</strong>

          <p>Applications shortlisted by industry.</p>
        </article>

        <article>
          <span>Selected</span>

          <strong>{selectedApplications}</strong>

          <p>Industry collaborations you were selected for.</p>
        </article>
      </section>

      {/* =========================
          APPLICATION HISTORY
      ========================= */}

      <section className="faculty-applications-section">
        <div className="faculty-applications-section-header">
          <div>
            <span className="faculty-applications-section-kicker">
              APPLICATION HISTORY
            </span>

            <h2>Your collaboration applications</h2>
          </div>

          <button
            type="button"
            className="faculty-applications-explore"
            onClick={() => navigate("/faculty/opportunities")}
          >
            Explore opportunities →
          </button>
        </div>

        {/* =========================
            EMPTY STATE
        ========================= */}

        {applications.length === 0 ? (
          <div className="faculty-applications-empty">
            <div className="faculty-applications-empty-icon">
              ◎
            </div>

            <h3>No applications yet</h3>

            <p>
              Explore industry programmes and apply to opportunities
              aligned with your academic expertise.
            </p>

            <button
              type="button"
              onClick={() => navigate("/faculty/opportunities")}
            >
              Explore opportunities →
            </button>
          </div>
        ) : (
          /* =========================
             APPLICATION CARDS
          ========================= */

          <div className="faculty-applications-list">
            {applications.map((application) => {
              const opportunity =
                application.faculty_opportunities;

              const company =
                opportunity?.companies;

              return (
                <article
                  className="faculty-application-card"
                  key={application.id}
                >
                  {/* CARD HEADER */}

                  <div className="faculty-application-card-top">
                    <div>
                      <span className="faculty-application-type">
                        {formatType(
                          opportunity?.opportunity_type
                        )}
                      </span>

                      <h3>
                        {opportunity?.title ||
                          "Faculty Collaboration"}
                      </h3>

                      <p className="faculty-application-company">
                        {company?.name ||
                          "Industry Partner"}
                      </p>
                    </div>

                    <span
                      className={`faculty-application-status ${application.status}`}
                    >
                      {application.status === "selected" &&
                        "✓ "}

                      {getStatusLabel(
                        application.status
                      )}
                    </span>
                  </div>

                  {/* DESCRIPTION */}

                  {opportunity?.description && (
                    <p className="faculty-application-description">
                      {opportunity.description}
                    </p>
                  )}

                  {/* DETAILS */}

                  <div className="faculty-application-details">
                    <div>
                      <span>Specialization</span>

                      <strong>
                        {opportunity?.specialization ||
                          "Not specified"}
                      </strong>
                    </div>

                    <div>
                      <span>Mode</span>

                      <strong>
                        {formatMode(
                          opportunity?.mode
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>Location</span>

                      <strong>
                        {opportunity?.location ||
                          "Not specified"}
                      </strong>
                    </div>

                    <div>
                      <span>Applied</span>

                      <strong>
                        {formatDateTime(
                          application.applied_at
                        )}
                      </strong>
                    </div>
                  </div>

                  {/* PROGRAMME DATES */}

                  {(opportunity?.start_date ||
                    opportunity?.end_date) && (
                    <div className="faculty-application-programme">
                      <span>Programme</span>

                      <strong>
                        {formatDate(
                          opportunity?.start_date
                        )}

                        {" — "}

                        {formatDate(
                          opportunity?.end_date
                        )}
                      </strong>
                    </div>
                  )}

                  {/* CURRENT STATUS */}

                  <div
                    className={`faculty-application-status-message ${application.status}`}
                  >
                    <div className="faculty-application-status-symbol">
                      {application.status === "selected"
                        ? "✓"
                        : application.status ===
                          "rejected"
                        ? "×"
                        : application.status ===
                          "shortlisted"
                        ? "★"
                        : application.status ===
                          "withdrawn"
                        ? "−"
                        : "↗"}
                    </div>

                    <div>
                      <span>Current status</span>

                      <strong>
                        {getStatusLabel(
                          application.status
                        )}
                      </strong>

                      <p>
                        {getStatusDescription(
                          application.status
                        )}
                      </p>
                    </div>
                  </div>

                  {/* STATEMENT */}

                  {application.statement && (
                    <div className="faculty-application-statement">
                      <span>
                        Your statement of interest
                      </span>

                      <p>
                        {application.statement}
                      </p>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default MyApplications;