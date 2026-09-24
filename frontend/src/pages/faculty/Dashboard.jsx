import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { supabase } from "../../services/supabase";
import { useAuth } from "../../hooks/useAuth";

import "./Dashboard.css";

function FacultyDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [faculty, setFaculty] = useState(null);
  const [institutionName, setInstitutionName] = useState("");
  const [departmentName, setDepartmentName] = useState("");

  const [opportunities, setOpportunities] = useState([]);
  const [applications, setApplications] = useState([]);

  useEffect(() => {
    if (!user) return;

    loadDashboard();
  }, [user]);

  async function loadDashboard() {
    setLoading(true);
    setError("");

    try {
      /* =========================
         1. FACULTY PROFILE
      ========================= */

      const { data: facultyData, error: facultyError } =
        await supabase
          .from("faculty_profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

      if (facultyError) {
        throw facultyError;
      }

      if (!facultyData) {
        setLoading(false);
        navigate("/faculty/onboarding");
        return;
      }

      setFaculty(facultyData);

      /* =========================
         2. INSTITUTION
      ========================= */

      if (facultyData.institution_id) {
        const { data: institutionData, error: institutionError } =
          await supabase
            .from("institutions")
            .select("name")
            .eq("id", facultyData.institution_id)
            .maybeSingle();

        if (institutionError) {
          throw institutionError;
        }

        setInstitutionName(institutionData?.name || "");
      }

      /* =========================
         3. DEPARTMENT
      ========================= */

      if (facultyData.department_id) {
        const { data: departmentData, error: departmentError } =
          await supabase
            .from("departments")
            .select("name")
            .eq("id", facultyData.department_id)
            .maybeSingle();

        if (departmentError) {
          throw departmentError;
        }

        setDepartmentName(departmentData?.name || "");
      }

      /* =========================
         4. OPEN FACULTY
            OPPORTUNITIES
      ========================= */

      const { data: opportunityData, error: opportunityError } =
        await supabase
          .from("faculty_opportunities")
          .select("*")
          .eq("status", "open")
          .order("created_at", {
            ascending: false,
          });

      if (opportunityError) {
        throw opportunityError;
      }

      const openOpportunities = opportunityData || [];

      /* =========================
         5. LOAD COMPANY NAMES
      ========================= */

      const companyIds = [
        ...new Set(
          openOpportunities
            .map((item) => item.company_id)
            .filter(Boolean)
        ),
      ];

      let companyMap = {};

      if (companyIds.length > 0) {
        const { data: companyData, error: companyError } =
          await supabase
            .from("companies")
            .select("id, name")
            .in("id", companyIds);

        if (companyError) {
          throw companyError;
        }

        companyMap = (companyData || []).reduce(
          (map, company) => {
            map[company.id] = company.name;
            return map;
          },
          {}
        );
      }

      const enrichedOpportunities = openOpportunities.map(
        (opportunity) => ({
          ...opportunity,
          company_name:
            companyMap[opportunity.company_id] ||
            "Industry partner",
        })
      );

      setOpportunities(enrichedOpportunities);

      /* =========================
         6. FACULTY APPLICATIONS
      ========================= */

      const { data: applicationData, error: applicationError } =
        await supabase
          .from("faculty_applications")
          .select("*")
          .eq("faculty_id", facultyData.id)
          .order("applied_at", {
            ascending: false,
          });

      if (applicationError) {
        throw applicationError;
      }

      setApplications(applicationData || []);
    } catch (err) {
      console.error("Faculty dashboard error:", err);

      setError(
        err?.message ||
          "Could not load the faculty dashboard."
      );
    } finally {
      setLoading(false);
    }
  }

  /* =========================
     HELPERS
  ========================= */

  function formatOpportunityType(type) {
    const labels = {
      faculty_internship: "Faculty Internship",
      fdp: "Faculty Development Program",
      industrial_training: "Industrial Training",
      research_collaboration: "Research Collaboration",
      consultancy: "Consultancy",
      mentorship: "Mentorship",
      guest_lecture: "Guest Lecture",
      live_industry_project: "Live Industry Project",
    };

    return labels[type] || type || "Opportunity";
  }

  function formatDate(date) {
    if (!date) return "Not specified";

    return new Date(`${date}T00:00:00`).toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  }

  function getStatusCount(status) {
    return applications.filter(
      (application) => application.status === status
    ).length;
  }

  const activeApplicationCount = applications.filter(
    (application) =>
      !["rejected", "withdrawn"].includes(
        application.status
      )
  ).length;

  const recentOpportunities = opportunities.slice(0, 3);

  /* =========================
     LOADING
  ========================= */

  if (loading) {
    return (
      <div className="faculty-dashboard-state">
        <div className="faculty-dashboard-loader"></div>

        <p>Loading your faculty workspace...</p>
      </div>
    );
  }

  /* =========================
     ERROR
  ========================= */

  if (error) {
    return (
      <div className="faculty-dashboard-state">
        <div className="faculty-dashboard-error-card">
          <span className="faculty-dashboard-error-icon">
            !
          </span>

          <h2>Could not load dashboard</h2>

          <p>{error}</p>

          <button
            type="button"
            onClick={loadDashboard}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="faculty-dashboard">
      {/* =========================
          HEADER
      ========================= */}

      <section className="faculty-dashboard-header">
        <div>
          <p className="faculty-dashboard-eyebrow">
            // Faculty workspace
          </p>

          <h1>
            Welcome back
            {user?.user_metadata?.full_name
              ? `, ${user.user_metadata.full_name}`
              : ""}
          </h1>

          <p className="faculty-dashboard-intro">
            Discover industry collaboration,
            development and research opportunities
            aligned with your academic expertise.
          </p>
        </div>

        <button
          type="button"
          className="faculty-dashboard-primary-button"
          onClick={() =>
            navigate("/faculty/opportunities")
          }
        >
          Explore opportunities
          <span>→</span>
        </button>
      </section>

      {/* =========================
          PROFILE STRIP
      ========================= */}

      <section className="faculty-profile-strip">
        <div className="faculty-profile-avatar">
          {user?.user_metadata?.full_name
            ?.charAt(0)
            ?.toUpperCase() || "F"}
        </div>

        <div className="faculty-profile-strip-main">
          <span className="faculty-profile-strip-label">
            Academic profile
          </span>

          <h2>
            {faculty?.designation ||
              "Faculty Member"}
          </h2>

          <p>
            {institutionName ||
              "Institution not available"}

            {departmentName
              ? ` · ${departmentName}`
              : ""}
          </p>
        </div>

        <div className="faculty-profile-specialization">
          <span>Primary specialization</span>

          <strong>
            {faculty?.specialization ||
              "Not specified"}
          </strong>
        </div>

        <button
          type="button"
          className="faculty-profile-view-button"
          onClick={() =>
            navigate("/faculty/profile")
          }
        >
          View profile
        </button>
      </section>

      {/* =========================
          STATS
      ========================= */}

      <section className="faculty-dashboard-stats">
        <article className="faculty-stat-card">
          <div className="faculty-stat-top">
            <span className="faculty-stat-icon purple">
              ◎
            </span>

            <span className="faculty-stat-tag">
              LIVE
            </span>
          </div>

          <strong>{opportunities.length}</strong>

          <span>Open opportunities</span>

          <p>
            Industry programmes currently available
            for faculty.
          </p>
        </article>

        <article className="faculty-stat-card">
          <div className="faculty-stat-top">
            <span className="faculty-stat-icon blue">
              ◫
            </span>
          </div>

          <strong>{applications.length}</strong>

          <span>Total applications</span>

          <p>
            Collaboration opportunities you have
            applied to.
          </p>
        </article>

        <article className="faculty-stat-card">
          <div className="faculty-stat-top">
            <span className="faculty-stat-icon orange">
              ↗
            </span>
          </div>

          <strong>{activeApplicationCount}</strong>

          <span>Active applications</span>

          <p>
            Applications still moving through the
            selection process.
          </p>
        </article>

        <article className="faculty-stat-card">
          <div className="faculty-stat-top">
            <span className="faculty-stat-icon green">
              ✓
            </span>
          </div>

          <strong>
            {getStatusCount("selected")}
          </strong>

          <span>Selected</span>

          <p>
            Industry collaborations where you have
            been selected.
          </p>
        </article>
      </section>

      {/* =========================
          MAIN GRID
      ========================= */}

      <section className="faculty-dashboard-grid">
        {/* RECENT OPPORTUNITIES */}

        <div className="faculty-dashboard-panel faculty-opportunity-panel">
          <div className="faculty-panel-heading">
            <div>
              <p className="faculty-panel-eyebrow">
                Industry × Academia
              </p>

              <h2>Latest opportunities</h2>
            </div>

            <button
              type="button"
              onClick={() =>
                navigate("/faculty/opportunities")
              }
            >
              View all →
            </button>
          </div>

          {recentOpportunities.length === 0 ? (
            <div className="faculty-dashboard-empty">
              <span>◎</span>

              <h3>No open opportunities yet</h3>

              <p>
                Industry collaboration programmes
                will appear here when recruiters
                publish them.
              </p>
            </div>
          ) : (
            <div className="faculty-opportunity-list">
              {recentOpportunities.map(
                (opportunity) => (
                  <article
                    key={opportunity.id}
                    className="faculty-opportunity-item"
                  >
                    <div className="faculty-opportunity-item-top">
                      <span className="faculty-opportunity-type">
                        {formatOpportunityType(
                          opportunity.opportunity_type
                        )}
                      </span>

                      <span className="faculty-opportunity-open">
                        Open
                      </span>
                    </div>

                    <h3>{opportunity.title}</h3>

                    <p className="faculty-opportunity-company">
                      {opportunity.company_name}
                    </p>

                    <div className="faculty-opportunity-meta">
                      {opportunity.mode && (
                        <span>
                          ◇{" "}
                          {opportunity.mode
                            .charAt(0)
                            .toUpperCase() +
                            opportunity.mode.slice(1)}
                        </span>
                      )}

                      {opportunity.location && (
                        <span>
                          ⌖ {opportunity.location}
                        </span>
                      )}

                      <span>
                        Deadline:{" "}
                        {formatDate(
                          opportunity.application_deadline
                        )}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          "/faculty/opportunities"
                        )
                      }
                    >
                      View opportunity →
                    </button>
                  </article>
                )
              )}
            </div>
          )}
        </div>

        {/* APPLICATION SUMMARY */}

        <div className="faculty-dashboard-panel faculty-application-panel">
          <div className="faculty-panel-heading">
            <div>
              <p className="faculty-panel-eyebrow">
                Your activity
              </p>

              <h2>Application status</h2>
            </div>

            <button
              type="button"
              onClick={() =>
                navigate("/faculty/applications")
              }
            >
              Track →
            </button>
          </div>

          <div className="faculty-status-list">
            <div className="faculty-status-row">
              <div>
                <span className="faculty-status-dot applied"></span>
                Applied
              </div>

              <strong>
                {getStatusCount("applied")}
              </strong>
            </div>

            <div className="faculty-status-row">
              <div>
                <span className="faculty-status-dot shortlisted"></span>
                Shortlisted
              </div>

              <strong>
                {getStatusCount("shortlisted")}
              </strong>
            </div>

            <div className="faculty-status-row">
              <div>
                <span className="faculty-status-dot selected"></span>
                Selected
              </div>

              <strong>
                {getStatusCount("selected")}
              </strong>
            </div>

            <div className="faculty-status-row">
              <div>
                <span className="faculty-status-dot rejected"></span>
                Rejected
              </div>

              <strong>
                {getStatusCount("rejected")}
              </strong>
            </div>
          </div>

          <div className="faculty-dashboard-tip">
            <span>✦</span>

            <div>
              <strong>
                Build industry exposure
              </strong>

              <p>
                Explore FDPs, research
                collaborations, industrial training
                and live industry projects.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default FacultyDashboard;