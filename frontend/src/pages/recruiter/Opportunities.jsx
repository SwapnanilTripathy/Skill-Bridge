import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { supabase } from "../../services/supabase";
import { useAuth } from "../../hooks/useAuth";
import "./RecruiterOpportunities.css";

function RecruiterOpportunities() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [company, setCompany] = useState(null);
  const [opportunities, setOpportunities] = useState([]);

  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    async function loadOpportunities() {
      const { data: recruiter, error: recruiterError } = await supabase
        .from("recruiter_profiles")
        .select("id, company_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (recruiterError) {
        setError(recruiterError.message);
        setLoading(false);
        return;
      }

      if (!recruiter?.company_id) {
        setError("No company is linked to this recruiter account.");
        setLoading(false);
        return;
      }

      const [companyResult, opportunityResult] = await Promise.all([
        supabase
          .from("companies")
          .select("id, name")
          .eq("id", recruiter.company_id)
          .maybeSingle(),

        supabase
          .from("opportunities")
          .select(
            "id, title, type, description, location, work_mode, duration, stipend_min, stipend_max, salary_min, salary_max, minimum_cgpa, graduation_year, status, application_deadline, eligible_department_codes, created_at"
          )
          .eq("company_id", recruiter.company_id)
          .order("created_at", { ascending: false }),
      ]);

      if (cancelled) return;

      if (companyResult.error) {
        setError(companyResult.error.message);
        setLoading(false);
        return;
      }

      if (opportunityResult.error) {
        setError(opportunityResult.error.message);
        setLoading(false);
        return;
      }

      setCompany(companyResult.data || null);
      setOpportunities(opportunityResult.data || []);
      setError("");
      setLoading(false);
    }

    loadOpportunities();

    return () => {
      cancelled = true;
    };
  }, [user]);

  async function changeStatus(opportunity, nextStatus) {
    setError("");
    setActionLoadingId(opportunity.id);

    if (nextStatus === "open") {
      const { count, error: skillCheckError } = await supabase
        .from("opportunity_skills")
        .select("id", { count: "exact", head: true })
        .eq("opportunity_id", opportunity.id);

      if (skillCheckError) {
        setActionLoadingId("");
        setError(skillCheckError.message);
        return;
      }

      if (!count) {
        setActionLoadingId("");
        setError(
          `"${opportunity.title}" cannot be published because it has no saved skill requirements.`
        );
        return;
      }

      if (
        opportunity.application_deadline &&
        new Date(opportunity.application_deadline) < new Date()
      ) {
        setActionLoadingId("");
        setError(
          `"${opportunity.title}" cannot be published because its application deadline has already passed.`
        );
        return;
      }
    }

    const { error: updateError } = await supabase
      .from("opportunities")
      .update({
        status: nextStatus,
      })
      .eq("id", opportunity.id);

    if (updateError) {
      setActionLoadingId("");
      setError(updateError.message);
      return;
    }

    setOpportunities((current) =>
      current.map((item) =>
        item.id === opportunity.id
          ? {
              ...item,
              status: nextStatus,
            }
          : item
      )
    );

    setActionLoadingId("");
  }

  function formatMoney(value) {
    if (value === null || value === undefined || value === "") {
      return "Not specified";
    }

    return `₹${Number(value).toLocaleString("en-IN")}`;
  }

  function formatDeadline(value) {
    if (!value) return "No deadline";

    return new Date(value).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  if (loading) {
    return (
      <div className="recruiter-opportunity-state">
        Loading opportunities…
      </div>
    );
  }

  return (
    <div className="recruiter-opportunities-page">
      <section className="recruiter-opportunities-head">
        <div>
          <span className="recruiter-opportunities-kicker">
            // opportunities
          </span>

          <h1>Your hiring opportunities</h1>

          <p>
            Manage the roles posted by {company?.name || "your company"} and
            publish them when they are ready for student eligibility matching.
          </p>
        </div>

        <button
          type="button"
          className="recruiter-opportunities-create"
          onClick={() => navigate("/recruiter/opportunities/create")}
        >
          <span>+</span>
          Create opportunity
        </button>
      </section>

      {error && (
        <div className="create-opportunity-error">
          {error}
        </div>
      )}

      <section className="recruiter-opportunities-summary">
        <article>
          <span>Total opportunities</span>
          <strong>{opportunities.length}</strong>
        </article>

        <article>
          <span>Open</span>
          <strong>
            {
              opportunities.filter(
                (opportunity) =>
                  String(opportunity.status || "").toLowerCase() === "open"
              ).length
            }
          </strong>
        </article>

        <article>
          <span>Drafts</span>
          <strong>
            {
              opportunities.filter(
                (opportunity) =>
                  String(opportunity.status || "draft").toLowerCase() ===
                  "draft"
              ).length
            }
          </strong>
        </article>
      </section>

      {opportunities.length === 0 ? (
        <section className="recruiter-opportunities-empty">
          <div className="recruiter-opportunities-empty-icon">
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

          <h2>No opportunities yet</h2>

          <p>
            Create your first internship or job and define its eligibility
            rules, required skills and application deadline.
          </p>

          <button
            type="button"
            onClick={() => navigate("/recruiter/opportunities/create")}
          >
            Create first opportunity
          </button>
        </section>
      ) : (
        <section className="recruiter-opportunity-list">
          {opportunities.map((opportunity) => {
            const status = String(opportunity.status || "draft").toLowerCase();

            const compensation =
              String(opportunity.type || "").toLowerCase() === "internship"
                ? opportunity.stipend_min || opportunity.stipend_max
                  ? `${formatMoney(opportunity.stipend_min)} – ${formatMoney(
                      opportunity.stipend_max
                    )} / month`
                  : "Stipend not specified"
                : opportunity.salary_min || opportunity.salary_max
                  ? `${formatMoney(opportunity.salary_min)} – ${formatMoney(
                      opportunity.salary_max
                    )}`
                  : "Salary not specified";

            const isChanging = actionLoadingId === opportunity.id;

            return (
              <article
                key={opportunity.id}
                className="recruiter-opportunity-card"
              >
                <div className="recruiter-opportunity-card-top">
                  <div>
                    <div className="recruiter-opportunity-tags">
                      <span className="type">
                        {opportunity.type || "Opportunity"}
                      </span>

                      <span className={`status status-${status}`}>
                        {status}
                      </span>
                    </div>

                    <h2>{opportunity.title}</h2>
                  </div>

                  <span className="recruiter-opportunity-deadline">
                    Deadline {formatDeadline(opportunity.application_deadline)}
                  </span>
                </div>

                <div className="recruiter-opportunity-meta">
                  <span>{opportunity.work_mode || "Work mode not set"}</span>
                  <span>{opportunity.location || "Location not set"}</span>
                  <span>{opportunity.duration || "Duration not set"}</span>
                  <span>{compensation}</span>
                </div>

                <div className="recruiter-opportunity-rules">
                  <div>
                    <span>Minimum CGPA</span>
                    <strong>
                      {opportunity.minimum_cgpa ?? "Not specified"}
                    </strong>
                  </div>

                  <div>
                    <span>Graduation year</span>
                    <strong>
                      {opportunity.graduation_year ?? "Any"}
                    </strong>
                  </div>

                  <div className="departments">
                    <span>Eligible departments</span>
                    <strong>
                      {opportunity.eligible_department_codes?.length
                        ? opportunity.eligible_department_codes.join(", ")
                        : "All / not specified"}
                    </strong>
                  </div>
                </div>

                <div className="recruiter-opportunity-status-actions">
                  <div>
                    {status === "draft" && (
                      <>
                        <strong>Draft</strong>
                        <span>
                          Students cannot see this opportunity yet.
                        </span>
                      </>
                    )}

                    {status === "open" && (
                      <>
                        <strong>Published</strong>
                        <span>
                          Eligible students can now see this opportunity.
                        </span>
                      </>
                    )}

                    {status === "closed" && (
                      <>
                        <strong>Closed</strong>
                        <span>
                          This opportunity is hidden from the student feed.
                        </span>
                      </>
                    )}
                  </div>

                  {status === "draft" && (
                    <button
                      type="button"
                      className="publish"
                      disabled={isChanging}
                      onClick={() => changeStatus(opportunity, "open")}
                    >
                      {isChanging ? "Publishing…" : "Publish"}
                    </button>
                  )}

                  {status === "open" && (
                    <button
                      type="button"
                      className="close"
                      disabled={isChanging}
                      onClick={() => changeStatus(opportunity, "closed")}
                    >
                      {isChanging ? "Closing…" : "Close opportunity"}
                    </button>
                  )}

                  {status === "closed" && (
                    <button
                      type="button"
                      className="publish"
                      disabled={isChanging}
                      onClick={() => changeStatus(opportunity, "open")}
                    >
                      {isChanging ? "Reopening…" : "Reopen"}
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

export default RecruiterOpportunities;
