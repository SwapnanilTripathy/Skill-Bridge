import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { supabase } from "../../services/supabase";
import { useAuth } from "../../hooks/useAuth";
import "./Analytics.css";

function Analytics() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [company, setCompany] = useState(null);
  const [opportunities, setOpportunities] = useState([]);
  const [applications, setApplications] = useState([]);
  const [opportunitySkills, setOpportunitySkills] = useState([]);
  const [skills, setSkills] = useState([]);

  useEffect(() => {
    if (!user?.id) return;

    async function loadAnalytics() {
      try {
        setLoading(true);
        setError("");

        /* =========================
           1. RECRUITER PROFILE
        ========================= */

        const {
          data: recruiterData,
          error: recruiterError,
        } = await supabase
          .from("recruiter_profiles")
          .select("company_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (recruiterError) throw recruiterError;

        if (!recruiterData?.company_id) {
          setError(
            "Your recruiter account is not connected to a company."
          );
          return;
        }

        const companyId = recruiterData.company_id;

        /* =========================
           2. COMPANY
        ========================= */

        const {
          data: companyData,
          error: companyError,
        } = await supabase
          .from("companies")
          .select("*")
          .eq("id", companyId)
          .maybeSingle();

        if (companyError) throw companyError;

        setCompany(companyData);

        /* =========================
           3. COMPANY OPPORTUNITIES
        ========================= */

        const {
          data: opportunityData,
          error: opportunityError,
        } = await supabase
          .from("opportunities")
          .select("*")
          .eq("company_id", companyId);

        if (opportunityError) throw opportunityError;

        const companyOpportunities =
          opportunityData || [];

        setOpportunities(companyOpportunities);

        const opportunityIds =
          companyOpportunities.map((item) => item.id);

        if (opportunityIds.length === 0) {
          setApplications([]);
          setOpportunitySkills([]);
          setSkills([]);
          return;
        }

        /* =========================
           4. APPLICATIONS
        ========================= */

        const {
          data: applicationData,
          error: applicationError,
        } = await supabase
          .from("applications")
          .select("*")
          .in("opportunity_id", opportunityIds);

        if (applicationError) throw applicationError;

        setApplications(applicationData || []);

        /* =========================
           5. OPPORTUNITY SKILLS
        ========================= */

        const {
          data: opportunitySkillData,
          error: opportunitySkillError,
        } = await supabase
          .from("opportunity_skills")
          .select("*")
          .in("opportunity_id", opportunityIds);

        if (opportunitySkillError) {
          throw opportunitySkillError;
        }

        const requirementRows =
          opportunitySkillData || [];

        setOpportunitySkills(requirementRows);

        const skillIds = [
          ...new Set(
            requirementRows
              .map((item) => item.skill_id)
              .filter(Boolean)
          ),
        ];

        if (skillIds.length === 0) {
          setSkills([]);
          return;
        }

        /* =========================
           6. SKILLS
        ========================= */

        const {
          data: skillData,
          error: skillError,
        } = await supabase
          .from("skills")
          .select("id, name, category")
          .in("id", skillIds);

        if (skillError) throw skillError;

        setSkills(skillData || []);
      } catch (err) {
        console.error(
          "Recruiter analytics error:",
          err
        );

        setError(
          err?.message ||
            "Could not load recruiter analytics."
        );
      } finally {
        setLoading(false);
      }
    }

    loadAnalytics();
  }, [user?.id]);

  /* =========================
     BASIC METRICS
  ========================= */

  const totalOpportunities = opportunities.length;

  const openOpportunities = opportunities.filter(
    (item) => item.status === "open"
  ).length;

  const totalApplications = applications.length;

  const appliedCount = applications.filter(
    (item) => item.status === "applied"
  ).length;

  const shortlistedCount = applications.filter(
    (item) => item.status === "shortlisted"
  ).length;

  const interviewCount = applications.filter(
    (item) => item.status === "interview"
  ).length;

  const selectedCount = applications.filter(
    (item) => item.status === "selected"
  ).length;

  const rejectedCount = applications.filter(
    (item) => item.status === "rejected"
  ).length;

  const withdrawnCount = applications.filter(
    (item) => item.status === "withdrawn"
  ).length;

  const selectionRate =
    totalApplications > 0
      ? Math.round(
          (selectedCount / totalApplications) * 100
        )
      : 0;

  const shortlistRate =
    totalApplications > 0
      ? Math.round(
          ((shortlistedCount +
            interviewCount +
            selectedCount) /
            totalApplications) *
            100
        )
      : 0;

  /* =========================
     SKILL DEMAND
  ========================= */

  const demandedSkills = useMemo(() => {
    const skillMap = new Map();

    skills.forEach((skill) => {
      skillMap.set(skill.id, {
        id: skill.id,
        name: skill.name,
        category: skill.category,
        demandPoints: 0,
        opportunities: new Set(),
        requiredCount: 0,
        preferredCount: 0,
      });
    });

    opportunitySkills.forEach((row) => {
      const skill = skillMap.get(row.skill_id);

      if (!skill) return;

      const weight = Number(row.weight) || 0;

      skill.demandPoints += weight;

      skill.opportunities.add(
        row.opportunity_id
      );

      if (row.requirement_type === "required") {
        skill.requiredCount += 1;
      }

      if (row.requirement_type === "preferred") {
        skill.preferredCount += 1;
      }
    });

    return [...skillMap.values()]
      .map((skill) => ({
        ...skill,
        opportunityCount:
          skill.opportunities.size,
      }))
      .sort((a, b) => {
        if (b.demandPoints !== a.demandPoints) {
          return b.demandPoints - a.demandPoints;
        }

        return (
          b.opportunityCount -
          a.opportunityCount
        );
      });
  }, [skills, opportunitySkills]);

  /* =========================
     OPPORTUNITY PERFORMANCE
  ========================= */

  const opportunityPerformance = useMemo(() => {
    return opportunities
      .map((opportunity) => {
        const relatedApplications =
          applications.filter(
            (application) =>
              application.opportunity_id ===
              opportunity.id
          );

        const selected =
          relatedApplications.filter(
            (application) =>
              application.status === "selected"
          ).length;

        const shortlisted =
          relatedApplications.filter(
            (application) =>
              application.status === "shortlisted"
          ).length;

        const interview =
          relatedApplications.filter(
            (application) =>
              application.status === "interview"
          ).length;

        return {
          ...opportunity,
          applicationCount:
            relatedApplications.length,
          selectedCount: selected,
          shortlistedCount: shortlisted,
          interviewCount: interview,
        };
      })
      .sort(
        (a, b) =>
          b.applicationCount -
          a.applicationCount
      );
  }, [opportunities, applications]);

  /* =========================
     HELPERS
  ========================= */

  function formatOpportunityType(type) {
    if (!type) return "Opportunity";

    return type
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );
  }

  function getCompanyName() {
    return (
      company?.name ||
      company?.company_name ||
      "Your company"
    );
  }

  if (loading) {
    return (
      <div className="ra-state">
        Loading industry analytics...
      </div>
    );
  }

  if (error) {
    return (
      <div className="ra-state ra-error">
        <h2>Could not load analytics</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="ra-page">
      {/* =========================
          HERO
      ========================= */}

      <section className="ra-hero">
        <p className="ra-kicker">
          // INDUSTRY INTELLIGENCE
        </p>

        <h1>
          Recruitment <span>Analytics</span>
        </h1>

        <p className="ra-hero-copy">
          Understand recruitment activity,
          candidate movement and the skills your
          organisation is currently demanding.
        </p>

        <div className="ra-company-pill">
          <span>COMPANY</span>
          <strong>{getCompanyName()}</strong>
        </div>
      </section>

      {/* =========================
          SUMMARY METRICS
      ========================= */}

      <section className="ra-summary-grid">
        <article className="ra-summary-card">
          <div className="ra-card-icon purple">
            ▣
          </div>

          <span className="ra-card-label">
            Opportunities
          </span>

          <strong>{totalOpportunities}</strong>

          <p>
            {openOpportunities} currently open
          </p>
        </article>

        <article className="ra-summary-card">
          <div className="ra-card-icon blue">
            ↗
          </div>

          <span className="ra-card-label">
            Applications
          </span>

          <strong>{totalApplications}</strong>

          <p>
            Candidate applications received
          </p>
        </article>

        <article className="ra-summary-card">
          <div className="ra-card-icon orange">
            ◇
          </div>

          <span className="ra-card-label">
            Shortlist progress
          </span>

          <strong>{shortlistRate}%</strong>

          <p>
            Reached shortlist or later stage
          </p>
        </article>

        <article className="ra-summary-card">
          <div className="ra-card-icon green">
            ✓
          </div>

          <span className="ra-card-label">
            Selected
          </span>

          <strong>{selectedCount}</strong>

          <p>
            {selectionRate}% overall selection rate
          </p>
        </article>
      </section>

      {/* =========================
          PIPELINE
      ========================= */}

      <section className="ra-panel">
        <div className="ra-section-heading">
          <div>
            <p className="ra-kicker">
              // RECRUITMENT PIPELINE
            </p>

            <h2>
              Candidate movement
            </h2>
          </div>

          <button
            type="button"
            className="ra-link-button"
            onClick={() =>
              navigate("/recruiter/candidates")
            }
          >
            View candidates →
          </button>
        </div>

        <div className="ra-pipeline-grid">
          <div className="ra-pipeline-item">
            <span>Applied</span>
            <strong>{appliedCount}</strong>
          </div>

          <div className="ra-pipeline-arrow">
            →
          </div>

          <div className="ra-pipeline-item">
            <span>Shortlisted</span>
            <strong>{shortlistedCount}</strong>
          </div>

          <div className="ra-pipeline-arrow">
            →
          </div>

          <div className="ra-pipeline-item">
            <span>Interview</span>
            <strong>{interviewCount}</strong>
          </div>

          <div className="ra-pipeline-arrow">
            →
          </div>

          <div className="ra-pipeline-item selected">
            <span>Selected</span>
            <strong>{selectedCount}</strong>
          </div>
        </div>

        {(rejectedCount > 0 ||
          withdrawnCount > 0) && (
          <div className="ra-pipeline-secondary">
            <span>
              Rejected{" "}
              <strong>{rejectedCount}</strong>
            </span>

            <span>
              Withdrawn{" "}
              <strong>{withdrawnCount}</strong>
            </span>
          </div>
        )}
      </section>

      {/* =========================
          DEMAND + PERFORMANCE
      ========================= */}

      <section className="ra-two-column">
        {/* SKILL DEMAND */}

        <article className="ra-panel">
          <div className="ra-section-heading">
            <div>
              <p className="ra-kicker">
                // SKILL DEMAND
              </p>

              <h2>
                Most demanded skills
              </h2>
            </div>
          </div>

          {demandedSkills.length === 0 ? (
            <div className="ra-empty">
              Add skill requirements to your
              opportunities to generate demand
              analytics.
            </div>
          ) : (
            <div className="ra-skill-list">
              {demandedSkills
                .slice(0, 6)
                .map((skill, index) => (
                  <div
                    className="ra-skill-row"
                    key={skill.id}
                  >
                    <span className="ra-rank">
                      {String(index + 1).padStart(
                        2,
                        "0"
                      )}
                    </span>

                    <div className="ra-skill-main">
                      <strong>
                        {skill.name}
                      </strong>

                      <span>
                        {skill.opportunityCount}{" "}
                        {skill.opportunityCount === 1
                          ? "opportunity"
                          : "opportunities"}
                      </span>
                    </div>

                    <div className="ra-skill-demand">
                      <strong>
                        {skill.demandPoints}
                      </strong>
                      <span>pts</span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </article>

        {/* HIRING OUTCOMES */}

        <article className="ra-panel">
          <div className="ra-section-heading">
            <div>
              <p className="ra-kicker">
                // HIRING OUTCOMES
              </p>

              <h2>
                Recruitment conversion
              </h2>
            </div>
          </div>

          <div className="ra-conversion">
            <div className="ra-conversion-number">
              {selectionRate}%
            </div>

            <p>
              of tracked applications have reached
              the selected stage.
            </p>
          </div>

          <div className="ra-conversion-bar">
            <div
              className="ra-conversion-fill"
              style={{
                width: `${selectionRate}%`,
              }}
            />
          </div>

          <div className="ra-outcome-grid">
            <div>
              <span>Total applications</span>
              <strong>
                {totalApplications}
              </strong>
            </div>

            <div>
              <span>Selected</span>
              <strong>{selectedCount}</strong>
            </div>

            <div>
              <span>Rejected</span>
              <strong>{rejectedCount}</strong>
            </div>

            <div>
              <span>Still active</span>
              <strong>
                {appliedCount +
                  shortlistedCount +
                  interviewCount}
              </strong>
            </div>
          </div>
        </article>
      </section>

      {/* =========================
          OPPORTUNITY PERFORMANCE
      ========================= */}

      <section className="ra-panel">
        <div className="ra-section-heading">
          <div>
            <p className="ra-kicker">
              // OPPORTUNITY PERFORMANCE
            </p>

            <h2>
              Recruitment activity
            </h2>
          </div>

          <button
            type="button"
            className="ra-link-button"
            onClick={() =>
              navigate("/recruiter/opportunities")
            }
          >
            Manage opportunities →
          </button>
        </div>

        {opportunityPerformance.length === 0 ? (
          <div className="ra-empty">
            No opportunities have been created yet.
          </div>
        ) : (
          <div className="ra-opportunity-list">
            {opportunityPerformance.map(
              (opportunity) => (
                <article
                  className="ra-opportunity-row"
                  key={opportunity.id}
                >
                  <div className="ra-opportunity-title">
                    <span>
                      {formatOpportunityType(
                        opportunity.opportunity_type ||
                          opportunity.type
                      )}
                    </span>

                    <strong>
                      {opportunity.title}
                    </strong>
                  </div>

                  <div className="ra-opportunity-stat">
                    <span>Applications</span>
                    <strong>
                      {
                        opportunity.applicationCount
                      }
                    </strong>
                  </div>

                  <div className="ra-opportunity-stat">
                    <span>Shortlisted</span>
                    <strong>
                      {
                        opportunity.shortlistedCount
                      }
                    </strong>
                  </div>

                  <div className="ra-opportunity-stat">
                    <span>Selected</span>
                    <strong>
                      {
                        opportunity.selectedCount
                      }
                    </strong>
                  </div>

                  <div
                    className={`ra-status ${
                      opportunity.status || ""
                    }`}
                  >
                    {opportunity.status ||
                      "unknown"}
                  </div>
                </article>
              )
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export default Analytics;