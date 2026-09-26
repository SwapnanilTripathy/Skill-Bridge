import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../hooks/useAuth";
import { supabase } from "../../services/supabase";
import "./Applications.css";

const ACTIVE_STAGES = [
  "applied",
  "shortlisted",
  "interview",
  "selected",
];

function formatStatus(status) {
  if (!status) return "Unknown";

  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatOpportunityType(type) {
  if (!type) return "Opportunity";

  return type
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function Applications() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [applications, setApplications] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [companies, setCompanies] = useState([]);

  const [statusFilter, setStatusFilter] = useState("all");

  /* =====================================================
     LOAD APPLICATION DATA
  ===================================================== */

  useEffect(() => {
    let cancelled = false;

    async function loadApplications() {
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
           1. FIND STUDENT PROFILE
        ================================================= */

        const {
          data: studentProfile,
          error: studentProfileError,
        } = await supabase
          .from("student_profiles")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (studentProfileError) {
          throw studentProfileError;
        }

        if (!studentProfile) {
          throw new Error("Student profile could not be found.");
        }

        /* =================================================
           2. LOAD STUDENT APPLICATIONS
        ================================================= */

        const {
          data: applicationData,
          error: applicationError,
        } = await supabase
          .from("applications")
          .select(
            `
            id,
            student_id,
            opportunity_id,
            status,
            match_score_at_apply,
            applied_at,
            updated_at
          `
          )
          .eq("student_id", studentProfile.id)
          .order("applied_at", {
            ascending: false,
          });

        if (applicationError) {
          throw applicationError;
        }

        const loadedApplications = applicationData || [];

        /*
         * Student has not applied anywhere yet.
         * We can stop here instead of making unnecessary
         * opportunity/company queries.
         */
        if (loadedApplications.length === 0) {
          if (!cancelled) {
            setApplications([]);
            setOpportunities([]);
            setCompanies([]);
          }

          return;
        }

        /* =================================================
           3. LOAD RELATED OPPORTUNITIES
        ================================================= */

        const opportunityIds = [
          ...new Set(
            loadedApplications
              .map((application) => application.opportunity_id)
              .filter(Boolean)
          ),
        ];

        const {
          data: opportunityData,
          error: opportunityError,
        } = await supabase
          .from("opportunities")
          .select(
            `
            id,
            company_id,
            title,
            type,
            description,
            location,
            work_mode,
            duration,
            stipend_min,
            stipend_max,
            salary_min,
            salary_max,
            status,
            application_deadline
          `
          )
          .in("id", opportunityIds);

        if (opportunityError) {
          throw opportunityError;
        }

        const loadedOpportunities = opportunityData || [];

        /* =================================================
           4. LOAD RELATED COMPANIES
        ================================================= */

        const companyIds = [
          ...new Set(
            loadedOpportunities
              .map((opportunity) => opportunity.company_id)
              .filter(Boolean)
          ),
        ];

        let companyData = [];

        if (companyIds.length > 0) {
          const {
            data: loadedCompanyData,
            error: companyError,
          } = await supabase
            .from("companies")
            .select(
              `
              id,
              name,
              industry,
              location,
              logo_url,
              verification_status
            `
            )
            .in("id", companyIds);

          if (companyError) {
            throw companyError;
          }

          companyData = loadedCompanyData || [];
        }

        if (cancelled) {
          return;
        }

        setApplications(loadedApplications);
        setOpportunities(loadedOpportunities);
        setCompanies(companyData);
      } catch (loadError) {
        console.error(
          "Student application tracker load error:",
          loadError
        );

        if (!cancelled) {
          setError(
            loadError?.message ||
              "We could not load your applications."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadApplications();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  /* =====================================================
     OPPORTUNITY LOOKUP
  ===================================================== */

  const opportunityMap = useMemo(() => {
    const map = {};

    opportunities.forEach((opportunity) => {
      map[opportunity.id] = opportunity;
    });

    return map;
  }, [opportunities]);

  /* =====================================================
     COMPANY LOOKUP
  ===================================================== */

  const companyMap = useMemo(() => {
    const map = {};

    companies.forEach((company) => {
      map[company.id] = company;
    });

    return map;
  }, [companies]);

  /* =====================================================
     COMBINED APPLICATION DATA
  ===================================================== */

  const applicationRecords = useMemo(() => {
    return applications.map((application) => {
      const opportunity =
        opportunityMap[application.opportunity_id] || null;

      const company = opportunity?.company_id
        ? companyMap[opportunity.company_id] || null
        : null;

      return {
        ...application,
        opportunity,
        company,
      };
    });
  }, [applications, opportunityMap, companyMap]);

  /* =====================================================
     SUMMARY DATA
  ===================================================== */

  const summary = useMemo(() => {
    return {
      total: applicationRecords.length,

      applied: applicationRecords.filter(
        (application) => application.status === "applied"
      ).length,

      shortlisted: applicationRecords.filter(
        (application) => application.status === "shortlisted"
      ).length,

      interview: applicationRecords.filter(
        (application) => application.status === "interview"
      ).length,

      selected: applicationRecords.filter(
        (application) => application.status === "selected"
      ).length,
    };
  }, [applicationRecords]);

  /* =====================================================
     FILTERED APPLICATIONS
  ===================================================== */

  const filteredApplications = useMemo(() => {
    if (statusFilter === "all") {
      return applicationRecords;
    }

    return applicationRecords.filter(
      (application) => application.status === statusFilter
    );
  }, [applicationRecords, statusFilter]);

  /* =====================================================
     PIPELINE HELPERS
  ===================================================== */

  function getStageState(applicationStatus, stage) {
    if (
      applicationStatus === "rejected" ||
      applicationStatus === "withdrawn"
    ) {
      return "inactive";
    }

    const currentIndex = ACTIVE_STAGES.indexOf(applicationStatus);
    const stageIndex = ACTIVE_STAGES.indexOf(stage);

    if (currentIndex === -1 || stageIndex === -1) {
      return "inactive";
    }

    if (stageIndex < currentIndex) {
      return "completed";
    }

    if (stageIndex === currentIndex) {
      return "current";
    }

    return "upcoming";
  }

  function getApplicationMessage(status) {
    switch (status) {
      case "applied":
        return "Your application has been submitted and is awaiting recruiter review.";

      case "shortlisted":
        return "You have been shortlisted by the recruiter.";

      case "interview":
        return "Your application has progressed to the interview stage.";

      case "selected":
        return "You have been selected for this opportunity.";

      case "rejected":
        return "This application was not selected for further progression.";

      case "withdrawn":
        return "You withdrew this application.";

      default:
        return "Application status is being tracked by SkillBridge.";
    }
  }

  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {
    return (
      <div className="applications-page">
        <div className="applications-state-card">
          <span className="applications-kicker">
            // application tracker
          </span>

          <h1>Loading your applications...</h1>

          <p>
            SkillBridge is collecting your current application
            statuses and recruitment progress.
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
      <div className="applications-page">
        <div className="applications-state-card">
          <span className="applications-kicker">
            // application tracker
          </span>

          <h1>Unable to load applications</h1>

          <p>{error}</p>

          <button
            type="button"
            className="applications-primary-button"
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
    <div className="applications-page">
      {/* =================================================
          HERO
      ================================================= */}

      <section className="applications-hero">
        <div>
          <span className="applications-kicker">
            // recruitment journey
          </span>

          <h1>My Applications</h1>

          <p>
            Track every internship and job application from
            submission to final recruiter decision.
          </p>
        </div>

        <div className="applications-hero-count">
          <strong>{summary.total}</strong>
          <span>TOTAL APPLICATIONS</span>
        </div>
      </section>

      {/* =================================================
          SUMMARY
      ================================================= */}

      <section className="applications-summary-grid">
        <article className="applications-summary-card">
          <span>APPLIED</span>
          <strong>{summary.applied}</strong>
          <p>Awaiting recruiter review</p>
        </article>

        <article className="applications-summary-card">
          <span>SHORTLISTED</span>
          <strong>{summary.shortlisted}</strong>
          <p>Moved forward by recruiters</p>
        </article>

        <article className="applications-summary-card">
          <span>INTERVIEWS</span>
          <strong>{summary.interview}</strong>
          <p>Reached interview stage</p>
        </article>

        <article className="applications-summary-card selected">
          <span>SELECTED</span>
          <strong>{summary.selected}</strong>
          <p>Successful applications</p>
        </article>
      </section>

      {/* =================================================
          FILTERS
      ================================================= */}

      <section className="applications-toolbar">
        <div>
          <span className="applications-kicker">
            // your applications
          </span>

          <h2>Recruitment activity</h2>
        </div>

        <div className="applications-filters">
          {[
            ["all", "All"],
            ["applied", "Applied"],
            ["shortlisted", "Shortlisted"],
            ["interview", "Interview"],
            ["selected", "Selected"],
            ["rejected", "Rejected"],
            ["withdrawn", "Withdrawn"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={
                statusFilter === value
                  ? "applications-filter active"
                  : "applications-filter"
              }
              onClick={() => setStatusFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* =================================================
          EMPTY STATE
      ================================================= */}

      {applicationRecords.length === 0 ? (
        <section className="applications-empty">
          <span className="applications-kicker">
            // no applications yet
          </span>

          <h2>Start your recruitment journey</h2>

          <p>
            You have not applied to any SkillBridge
            opportunities yet. Explore available roles and use
            your skill match information before applying.
          </p>

          <button
            type="button"
            className="applications-primary-button"
            onClick={() => navigate("/student/opportunities")}
          >
            Explore opportunities →
          </button>
        </section>
      ) : filteredApplications.length === 0 ? (
        <section className="applications-empty">
          <h2>No applications in this category</h2>

          <p>
            None of your current applications have this status.
          </p>

          <button
            type="button"
            className="applications-secondary-button"
            onClick={() => setStatusFilter("all")}
          >
            Show all applications
          </button>
        </section>
      ) : (
        /* =================================================
           APPLICATION LIST
        ================================================= */

        <section className="applications-list">
          {filteredApplications.map((application, index) => {
            const opportunity = application.opportunity;
            const company = application.company;

            const isRejected =
              application.status === "rejected";

            const isWithdrawn =
              application.status === "withdrawn";

            const isClosed =
              isRejected || isWithdrawn;

            return (
              <article
                key={application.id}
                className={`application-card ${
                  isClosed ? "closed" : ""
                }`}
              >
                {/* =========================================
                    CARD HEADER
                ========================================= */}

                <div className="application-card-header">
                  <div className="application-card-number">
                    {String(index + 1).padStart(2, "0")}
                  </div>

                  <div className="application-title-area">
                    <div className="application-type-row">
                      <span className="application-type">
                        {formatOpportunityType(
                          opportunity?.type
                        )}
                      </span>

                      {company?.verification_status ===
                        "verified" && (
                        <span className="application-company-verified">
                          VERIFIED COMPANY
                        </span>
                      )}
                    </div>

                    <h2>
                      {opportunity?.title ||
                        "SkillBridge Opportunity"}
                    </h2>

                    <p>
                      {company?.name || "Company unavailable"}
                    </p>
                  </div>

                  <div
                    className={`application-status application-status-${application.status}`}
                  >
                    {formatStatus(application.status)}
                  </div>
                </div>

                {/* =========================================
                    BASIC INFORMATION
                ========================================= */}

                <div className="application-info-grid">
                  <div>
                    <span>APPLIED ON</span>

                    <strong>
                      {formatDate(application.applied_at)}
                    </strong>
                  </div>

                  <div>
                    <span>MATCH AT APPLICATION</span>

                    <strong>
                      {application.match_score_at_apply !==
                        null &&
                      application.match_score_at_apply !==
                        undefined
                        ? `${Math.round(
                            Number(
                              application.match_score_at_apply
                            )
                          )}%`
                        : "Not recorded"}
                    </strong>
                  </div>

                  <div>
                    <span>LOCATION</span>

                    <strong>
                      {opportunity?.location ||
                        company?.location ||
                        "Not specified"}
                    </strong>
                  </div>

                  <div>
                    <span>WORK MODE</span>

                    <strong>
                      {opportunity?.work_mode
                        ? formatStatus(
                            opportunity.work_mode
                          )
                        : "Not specified"}
                    </strong>
                  </div>
                </div>

                {/* =========================================
                    PIPELINE
                ========================================= */}

                {!isClosed && (
                  <div className="application-pipeline">
                    {ACTIVE_STAGES.map((stage, stageIndex) => {
                      const stageState = getStageState(
                        application.status,
                        stage
                      );

                      return (
                        <div
                          className="application-stage-wrapper"
                          key={stage}
                        >
                          <div
                            className={`application-stage ${stageState}`}
                          >
                            <div className="application-stage-marker">
                              {stageState === "completed"
                                ? "✓"
                                : stageIndex + 1}
                            </div>

                            <span>
                              {formatStatus(stage)}
                            </span>
                          </div>

                          {stageIndex <
                            ACTIVE_STAGES.length - 1 && (
                            <div
                              className={`application-stage-line ${
                                stageState === "completed"
                                  ? "completed"
                                  : ""
                              }`}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* =========================================
                    REJECTED / WITHDRAWN STATE
                ========================================= */}

                {isClosed && (
                  <div
                    className={`application-closed-state ${
                      isRejected ? "rejected" : "withdrawn"
                    }`}
                  >
                    <span>
                      {isRejected
                        ? "APPLICATION CLOSED"
                        : "APPLICATION WITHDRAWN"}
                    </span>

                    <strong>
                      {isRejected
                        ? "Recruitment did not progress further"
                        : "You withdrew from this opportunity"}
                    </strong>
                  </div>
                )}

                {/* =========================================
                    STATUS MESSAGE
                ========================================= */}

                <div className="application-card-footer">
                  <div>
                    <span>CURRENT STATUS</span>

                    <p>
                      {getApplicationMessage(
                        application.status
                      )}
                    </p>
                  </div>

                  <button
                    type="button"
                    className="applications-secondary-button"
                    onClick={() =>
                      navigate("/student/opportunities")
                    }
                  >
                    View opportunities
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}

export default Applications;