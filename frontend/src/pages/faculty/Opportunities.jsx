import { useEffect, useMemo, useState } from "react";

import { supabase } from "../../services/supabase";
import { useAuth } from "../../hooks/useAuth";

import "./Opportunities.css";

const TYPE_LABELS = {
  faculty_internship: "Faculty Internship",
  fdp: "Faculty Development Programme",
  industrial_training: "Industrial Training",
  research_collaboration: "Research Collaboration",
  consultancy: "Consultancy",
  mentorship: "Mentorship",
  guest_lecture: "Guest Lecture",
  live_industry_project: "Live Industry Project",
};

function Opportunities() {
  const { user } = useAuth();

  const [faculty, setFaculty] = useState(null);
  const [opportunities, setOpportunities] = useState([]);
  const [applications, setApplications] = useState([]);

  const [typeFilter, setTypeFilter] = useState("all");

  const [selectedOpportunity, setSelectedOpportunity] =
    useState(null);

  const [statement, setStatement] = useState("");

  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* =========================
     LOAD DATA
  ========================= */

  useEffect(() => {
    if (!user?.id) return;

    async function loadData() {
      try {
        setLoading(true);
        setError("");

        /* FACULTY PROFILE */

        const {
          data: facultyData,
          error: facultyError,
        } = await supabase
          .from("faculty_profiles")
          .select(`
            id,
            user_id,
            institution_id,
            department_id,
            designation,
            specialization
          `)
          .eq("user_id", user.id)
          .single();

        if (facultyError) {
          throw facultyError;
        }

        setFaculty(facultyData);

        /* OPEN FACULTY OPPORTUNITIES */

        const {
          data: opportunityData,
          error: opportunityError,
        } = await supabase
          .from("faculty_opportunities")
          .select(`
            id,
            company_id,
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
            created_at,
            companies (
              id,
              name
            )
          `)
          .eq("status", "open")
          .order("created_at", {
            ascending: false,
          });

        if (opportunityError) {
          throw opportunityError;
        }

        setOpportunities(opportunityData || []);

        /* EXISTING APPLICATIONS */

        const {
          data: applicationData,
          error: applicationError,
        } = await supabase
          .from("faculty_applications")
          .select(`
            id,
            opportunity_id,
            status,
            applied_at
          `)
          .eq("faculty_id", facultyData.id);

        if (applicationError) {
          throw applicationError;
        }

        setApplications(applicationData || []);
      } catch (err) {
        console.error(
          "Faculty opportunities error:",
          err
        );

        setError(
          err?.message ||
            "Unable to load faculty opportunities."
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user?.id]);

  /* =========================
     FILTERING
  ========================= */

  const filteredOpportunities = useMemo(() => {
    if (typeFilter === "all") {
      return opportunities;
    }

    return opportunities.filter(
      (opportunity) =>
        opportunity.opportunity_type === typeFilter
    );
  }, [opportunities, typeFilter]);

  /* =========================
     HELPERS
  ========================= */

  function formatDate(date) {
    if (!date) {
      return "Not specified";
    }

    return new Date(
      `${date}T00:00:00`
    ).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function formatMode(mode) {
    if (!mode) return "Not specified";

    return (
      mode.charAt(0).toUpperCase() +
      mode.slice(1)
    );
  }

  function getApplication(opportunityId) {
    return applications.find(
      (application) =>
        application.opportunity_id ===
        opportunityId
    );
  }

  function openApply(opportunity) {
    setError("");
    setSuccess("");
    setStatement("");
    setSelectedOpportunity(opportunity);
  }

  function closeApply() {
    if (applying) return;

    setSelectedOpportunity(null);
    setStatement("");
  }

  /* =========================
     APPLY
  ========================= */

  async function handleApply(event) {
    event.preventDefault();

    if (!faculty?.id) {
      setError(
        "Your faculty profile could not be found."
      );
      return;
    }

    if (!selectedOpportunity?.id) {
      return;
    }

    if (!statement.trim()) {
      setError(
        "Please add a short statement explaining your interest."
      );
      return;
    }

    try {
      setApplying(true);
      setError("");
      setSuccess("");

      const {
        data: newApplication,
        error: applicationError,
      } = await supabase
        .from("faculty_applications")
        .insert({
          faculty_id: faculty.id,
          opportunity_id:
            selectedOpportunity.id,
          statement: statement.trim(),
          status: "applied",
        })
        .select(`
          id,
          opportunity_id,
          status,
          applied_at
        `)
        .single();

      if (applicationError) {
        throw applicationError;
      }

      setApplications((current) => [
        newApplication,
        ...current,
      ]);

      setSuccess(
        `Application submitted for "${selectedOpportunity.title}".`
      );

      setSelectedOpportunity(null);
      setStatement("");
    } catch (err) {
      console.error(
        "Faculty application error:",
        err
      );

      if (err?.code === "23505") {
        setError(
          "You have already applied to this opportunity."
        );
      } else {
        setError(
          err?.message ||
            "Unable to submit your application."
        );
      }
    } finally {
      setApplying(false);
    }
  }

  /* =========================
     LOADING
  ========================= */

  if (loading) {
    return (
      <div className="faculty-opportunities-state">
        Loading industry collaborations...
      </div>
    );
  }

  return (
    <div className="faculty-opportunities-page">
      {/* HEADER */}

      <section className="faculty-opportunities-hero">
        <span className="faculty-opportunities-eyebrow">
          // industry × academia
        </span>

        <h1>
          Explore <span>Opportunities</span>
        </h1>

        <p>
          Discover faculty development programmes,
          industrial training, research collaborations
          and other industry opportunities aligned with
          your academic expertise.
        </p>
      </section>

      {/* MESSAGES */}

      {error && (
        <div className="faculty-opportunities-error">
          {error}
        </div>
      )}

      {success && (
        <div className="faculty-opportunities-success">
          {success}
        </div>
      )}

      {/* PROFILE STRIP */}

      {faculty && (
        <section className="faculty-opportunities-profile">
          <div>
            <span>Your specialization</span>

            <strong>
              {faculty.specialization ||
                "Not specified"}
            </strong>
          </div>

          <div>
            <span>Designation</span>

            <strong>
              {faculty.designation ||
                "Faculty member"}
            </strong>
          </div>

          <div>
            <span>Open opportunities</span>

            <strong>
              {opportunities.length}
            </strong>
          </div>
        </section>
      )}

      {/* FILTER */}

      <section className="faculty-opportunities-toolbar">
        <div>
          <span className="faculty-opportunities-section-label">
            AVAILABLE PROGRAMMES
          </span>

          <h2>Industry collaborations</h2>
        </div>

        <div className="faculty-opportunities-filter">
          <label htmlFor="faculty-type-filter">
            Type
          </label>

          <select
            id="faculty-type-filter"
            value={typeFilter}
            onChange={(event) =>
              setTypeFilter(event.target.value)
            }
          >
            <option value="all">
              All opportunities
            </option>

            <option value="faculty_internship">
              Faculty Internship
            </option>

            <option value="fdp">
              Faculty Development Programme
            </option>

            <option value="industrial_training">
              Industrial Training
            </option>

            <option value="research_collaboration">
              Research Collaboration
            </option>

            <option value="consultancy">
              Consultancy
            </option>

            <option value="mentorship">
              Mentorship
            </option>

            <option value="guest_lecture">
              Guest Lecture
            </option>

            <option value="live_industry_project">
              Live Industry Project
            </option>
          </select>
        </div>
      </section>

      {/* OPPORTUNITIES */}

      {filteredOpportunities.length === 0 ? (
        <section className="faculty-opportunities-empty">
          <div>◎</div>

          <h3>No open opportunities</h3>

          <p>
            There are currently no open industry
            collaborations matching this filter.
          </p>
        </section>
      ) : (
        <section className="faculty-opportunities-list">
          {filteredOpportunities.map(
            (opportunity) => {
              const existingApplication =
                getApplication(opportunity.id);

              return (
                <article
                  key={opportunity.id}
                  className="faculty-opportunity-card"
                >
                  <div className="faculty-opportunity-card-header">
                    <div>
                      <span className="faculty-opportunity-type">
                        {TYPE_LABELS[
                          opportunity
                            .opportunity_type
                        ] ||
                          opportunity.opportunity_type}
                      </span>

                      <h3>
                        {opportunity.title}
                      </h3>

                      <span className="faculty-opportunity-company">
                        {opportunity.companies
                          ?.name ||
                          "Industry partner"}
                      </span>
                    </div>

                    <span className="faculty-opportunity-open">
                      OPEN
                    </span>
                  </div>

                  <p className="faculty-opportunity-description">
                    {opportunity.description ||
                      "No description provided."}
                  </p>

                  <div className="faculty-opportunity-details">
                    <div>
                      <span>Specialization</span>

                      <strong>
                        {opportunity.specialization ||
                          "Open specialization"}
                      </strong>
                    </div>

                    <div>
                      <span>Mode</span>

                      <strong>
                        {formatMode(
                          opportunity.mode
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>Location</span>

                      <strong>
                        {opportunity.location ||
                          "Not specified"}
                      </strong>
                    </div>

                    <div>
                      <span>Apply by</span>

                      <strong>
                        {formatDate(
                          opportunity.application_deadline
                        )}
                      </strong>
                    </div>
                  </div>

                  <div className="faculty-opportunity-footer">
                    <div>
                      <span>Programme</span>

                      <strong>
                        {formatDate(
                          opportunity.start_date
                        )}

                        {opportunity.end_date &&
                          ` — ${formatDate(
                            opportunity.end_date
                          )}`}
                      </strong>
                    </div>

                    {existingApplication ? (
                      <div className="faculty-opportunity-applied">
                        ✓ Applied
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          openApply(opportunity)
                        }
                      >
                        Apply now →
                      </button>
                    )}
                  </div>
                </article>
              );
            }
          )}
        </section>
      )}

      {/* APPLICATION MODAL */}

      {selectedOpportunity && (
        <div
          className="faculty-apply-overlay"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              closeApply();
            }
          }}
        >
          <div className="faculty-apply-modal">
            <button
              type="button"
              className="faculty-apply-close"
              onClick={closeApply}
              disabled={applying}
            >
              ×
            </button>

            <span className="faculty-apply-eyebrow">
              APPLICATION
            </span>

            <h2>
              {selectedOpportunity.title}
            </h2>

            <p className="faculty-apply-company">
              {selectedOpportunity.companies
                ?.name || "Industry partner"}
            </p>

            <form onSubmit={handleApply}>
              <label htmlFor="faculty-statement">
                Statement of interest *
              </label>

              <textarea
                id="faculty-statement"
                value={statement}
                onChange={(event) =>
                  setStatement(
                    event.target.value
                  )
                }
                rows="7"
                placeholder="Briefly explain your academic background, interest in this programme and how you hope to contribute or benefit..."
              />

              <div className="faculty-apply-actions">
                <button
                  type="button"
                  className="faculty-apply-cancel"
                  onClick={closeApply}
                  disabled={applying}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="faculty-apply-submit"
                  disabled={applying}
                >
                  {applying
                    ? "Submitting..."
                    : "Submit application →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Opportunities;