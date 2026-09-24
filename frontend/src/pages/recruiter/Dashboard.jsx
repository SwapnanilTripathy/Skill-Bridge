import { useEffect, useMemo, useState } from "react";

import { supabase } from "../../services/supabase";
import { useAuth } from "../../hooks/useAuth";

function RecruiterDashboard() {
  const { user } = useAuth();

  const [recruiter, setRecruiter] = useState(null);
  const [company, setCompany] = useState(null);

  const [opportunityCount, setOpportunityCount] = useState(0);
  const [applicationCount, setApplicationCount] = useState(0);
  const [matchCount, setMatchCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      if (!user) return;

      setLoading(true);
      setError("");

      // --------------------------------------------------
      // 1. Recruiter profile
      // --------------------------------------------------

      const { data: recruiterData, error: recruiterError } =
        await supabase
          .from("recruiter_profiles")
          .select(
            "company_id, designation, work_email, phone"
          )
          .eq("user_id", user.id)
          .maybeSingle();

      if (recruiterError) {
        setError(recruiterError.message);
        setLoading(false);
        return;
      }

      if (!recruiterData?.company_id) {
        setError("No company is linked to this recruiter account yet.");
        setLoading(false);
        return;
      }

      setRecruiter(recruiterData);

      const companyId = recruiterData.company_id;

      // --------------------------------------------------
      // 2. Company details
      // --------------------------------------------------

      const { data: companyData, error: companyError } =
        await supabase
          .from("companies")
          .select(
            "id, name, contact_email, company_size, industry, website, gstin, verification_status"
          )
          .eq("id", companyId)
          .maybeSingle();

      if (companyError) {
        setError(companyError.message);
        setLoading(false);
        return;
      }

      setCompany(companyData || null);

      // --------------------------------------------------
      // 3. Real hiring statistics
      //    These are non-blocking so the dashboard still
      //    works even before every hiring feature is built.
      // --------------------------------------------------

      const { data: opportunityRows, error: opportunityError } =
        await supabase
          .from("opportunities")
          .select("id")
          .eq("company_id", companyId);

      if (!opportunityError) {
        const opportunityIds = (opportunityRows || []).map(
          (opportunity) => opportunity.id
        );

        setOpportunityCount(opportunityIds.length);

        if (opportunityIds.length > 0) {
          const [applicationsResult, matchesResult] =
            await Promise.all([
              supabase
                .from("applications")
                .select("id", { count: "exact", head: true })
                .in("opportunity_id", opportunityIds),

              supabase
                .from("matches")
                .select("id", { count: "exact", head: true })
                .in("opportunity_id", opportunityIds),
            ]);

          if (!applicationsResult.error) {
            setApplicationCount(applicationsResult.count || 0);
          }

          if (!matchesResult.error) {
            setMatchCount(matchesResult.count || 0);
          }
        }
      }

      setLoading(false);
    }

    loadDashboard();
  }, [user]);

  const verificationStatus =
    company?.verification_status || "pending";

  const companyProfileScore = useMemo(() => {
    if (!company) return 0;

    const fields = [
      company.name,
      company.contact_email,
      company.company_size,
      company.industry,
      company.website,
      company.gstin,
      recruiter?.designation,
      recruiter?.work_email,
      recruiter?.phone,
    ];

    const completed = fields.filter(Boolean).length;

    return Math.round((completed / fields.length) * 100);
  }, [company, recruiter]);

  if (loading) {
    return <div className="recruiter-dashboard-state">Loading dashboard…</div>;
  }

  if (error) {
    return (
      <div className="recruiter-dashboard-state error">
        Could not load dashboard: {error}
      </div>
    );
  }

  const recruiterName =
    user?.user_metadata?.full_name?.trim() ||
    user?.email?.split("@")[0] ||
    "Recruiter";

  return (
    <div className="recruiter-dashboard">
      <section className="recruiter-dashboard-hero">
        <div>
          <div className="recruiter-dashboard-eyebrow">
            // hiring overview
          </div>

          <h1>
            Welcome, <span>{recruiterName}</span>.
          </h1>

          <p>
            Create opportunities, discover eligible candidates and build
            stronger college hiring pipelines with SkillBridge.
          </p>
        </div>

        <div
          className={`recruiter-verification-pill ${verificationStatus}`}
        >
          <span></span>
          Company verification: {verificationStatus}
        </div>
      </section>

      <section className="recruiter-stat-grid">
        <article className="recruiter-stat-card">
          <span className="recruiter-stat-label">
            Opportunities posted
          </span>
          <strong>{opportunityCount}</strong>
          <span className="recruiter-stat-foot">
            Company opportunities
          </span>
        </article>

        <article className="recruiter-stat-card">
          <span className="recruiter-stat-label">
            Candidate matches
          </span>
          <strong>{matchCount}</strong>
          <span className="recruiter-stat-foot">
            Eligibility + matching results
          </span>
        </article>

        <article className="recruiter-stat-card">
          <span className="recruiter-stat-label">
            Applications
          </span>
          <strong>{applicationCount}</strong>
          <span className="recruiter-stat-foot">
            Across your opportunities
          </span>
        </article>

        <article className="recruiter-stat-card">
          <span className="recruiter-stat-label">
            Company profile
          </span>
          <strong>{companyProfileScore}%</strong>

          <div className="recruiter-progress-track">
            <div
              className="recruiter-progress-fill"
              style={{
                width: `${Math.min(companyProfileScore, 100)}%`,
              }}
            ></div>
          </div>
        </article>
      </section>

      <section className="recruiter-dashboard-grid">
        <article className="recruiter-dashboard-card recruiter-company-card">
          <div className="recruiter-card-heading">
            <div>
              <span className="recruiter-card-kicker">
                // company profile
              </span>
              <h2>Company details</h2>
            </div>
          </div>

          <div className="recruiter-detail-grid">
            <div>
              <span>Company</span>
              <strong>{company?.name || "Not set"}</strong>
            </div>

            <div>
              <span>Industry</span>
              <strong>{company?.industry || "Not set"}</strong>
            </div>

            <div>
              <span>Company size</span>
              <strong>{company?.company_size || "Not set"}</strong>
            </div>

            <div>
              <span>GSTIN</span>
              <strong>{company?.gstin || "Not set"}</strong>
            </div>

            <div>
              <span>Work email</span>
              <strong>
                {recruiter?.work_email ||
                  company?.contact_email ||
                  "Not set"}
              </strong>
            </div>

            <div>
              <span>Designation</span>
              <strong>{recruiter?.designation || "Not set"}</strong>
            </div>
          </div>
        </article>

        <article className="recruiter-dashboard-card recruiter-next-step-card">
          <span className="recruiter-card-kicker">
            // next best action
          </span>

          <h2>
            {opportunityCount > 0
              ? "Start reviewing candidates"
              : "Create your first opportunity"}
          </h2>

          <p>
            {opportunityCount > 0
              ? "Your hiring pipeline has started. Next, rank eligible students and shortlist the strongest matches."
              : "Define role requirements, eligible departments, minimum CGPA and required skills to begin candidate matching."}
          </p>

          <button
            type="button"
            className="recruiter-primary-action"
            disabled
            title="Opportunity creation is the next feature"
          >
            {opportunityCount > 0
              ? "Candidate ranking coming next"
              : "Opportunity builder coming next"}
            <span>→</span>
          </button>
        </article>
      </section>

      <section className="recruiter-dashboard-card recruiter-pipeline-card">
        <div className="recruiter-card-heading">
          <div>
            <span className="recruiter-card-kicker">
              // hiring pipeline
            </span>
            <h2>Recruiter workflow</h2>
          </div>
        </div>

        <div className="recruiter-journey">
          <div className="recruiter-journey-item done">
            <span className="recruiter-journey-index">01</span>
            <div>
              <strong>Company setup</strong>
              <p>Recruiter and company details added.</p>
            </div>
          </div>

          <div
            className={`recruiter-journey-item ${
              opportunityCount > 0 ? "done" : ""
            }`}
          >
            <span className="recruiter-journey-index">02</span>
            <div>
              <strong>Create opportunities</strong>
              <p>
                Define eligibility, role requirements and skills.
              </p>
            </div>
          </div>

          <div
            className={`recruiter-journey-item ${
              matchCount > 0 ? "done" : ""
            }`}
          >
            <span className="recruiter-journey-index">03</span>
            <div>
              <strong>Rank candidates</strong>
              <p>
                Compare eligible students using SkillBridge match scores.
              </p>
            </div>
          </div>

          <div
            className={`recruiter-journey-item ${
              applicationCount > 0 ? "done" : ""
            }`}
          >
            <span className="recruiter-journey-index">04</span>
            <div>
              <strong>Shortlist & hire</strong>
              <p>
                Review applications and move the best candidates forward.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default RecruiterDashboard;
