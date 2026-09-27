import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { supabase } from "../../services/supabase";
import { useAuth } from "../../hooks/useAuth";
import "./RecruiterOnboarding.css";

const INDUSTRIES = [
  "Cloud Infrastructure",
  "Robotics & Hardware",
  "Data & Analytics",
  "E-commerce & Retail",
  "FinTech",
  "EdTech",
  "Healthcare & MedTech",
  "Manufacturing",
  "Consulting",
  "Software & IT Services",
  "Other",
];

  const COMPANY_SIZES = [
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "501-1000",
  "1000+",
];


const GSTIN_PATTERN =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

function RecruiterOnboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [fullName, setFullName] = useState("");
  const [designation, setDesignation] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [workEmail, setWorkEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [gstin, setGstin] = useState("");

  const [stage, setStage] = useState("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const normalizedGstin = gstin.trim().toUpperCase();
  const gstinValid = GSTIN_PATTERN.test(normalizedGstin);

  useEffect(() => {
    async function loadProfile() {
      if (!user) return;

      setWorkEmail(user.email || "");

      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();

      if (!profileError) {
        setFullName(
          data?.full_name ||
            user.user_metadata?.full_name ||
            ""
        );
      }
    }

    loadProfile();
  }, [user]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!user) {
      setError("You must be logged in.");
      return;
    }

    if (!fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (!companyName.trim()) {
      setError("Please enter your company name.");
      return;
    }

    if (!gstinValid) {
      setError("Enter a valid 15-character Indian GSTIN.");
      return;
    }

    if (!/^[6-9][0-9]{9}$/.test(phone)) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }

    setLoading(true);
    setStage("checking");

    // --------------------------------------------------
    // 1. Keep the profile name updated
    // --------------------------------------------------

    const { error: profileNameError } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
      })
      .eq("id", user.id);

    if (profileNameError) {
      setLoading(false);
      setStage("form");
      setError(profileNameError.message);
      return;
    }

    // --------------------------------------------------
    // 2. Check whether this recruiter already has a profile
    //    This makes onboarding safer if the page is retried.
    // --------------------------------------------------

    const { data: existingRecruiter, error: existingRecruiterError } =
      await supabase
        .from("recruiter_profiles")
        .select("company_id")
        .eq("user_id", user.id)
        .maybeSingle();

    if (existingRecruiterError) {
      setLoading(false);
      setStage("form");
      setError(existingRecruiterError.message);
      return;
    }

    let companyId = existingRecruiter?.company_id || null;

    // --------------------------------------------------
    // 3. Create or update company
    // --------------------------------------------------

    const companyPayload = {
      name: companyName.trim(),
      contact_email: workEmail.trim().toLowerCase(),
      company_size: companySize,
      industry,
      website: website.trim() || null,
      gstin: normalizedGstin,
      verification_status: "pending",
      verified_at: null,
    };

    if (companyId) {
      const { error: companyUpdateError } = await supabase
        .from("companies")
        .update(companyPayload)
        .eq("id", companyId);

      if (companyUpdateError) {
        setLoading(false);
        setStage("form");

        if (
          companyUpdateError.message
            ?.toLowerCase()
            .includes("companies_gstin_unique")
        ) {
          setError("That GSTIN is already registered to another company.");
        } else {
          setError(companyUpdateError.message);
        }

        return;
      }
    } else {
      const { data: company, error: companyError } = await supabase
        .from("companies")
        .insert({
          ...companyPayload,
          created_by: user.id,
        })
        .select("id")
        .single();

      if (companyError) {
        setLoading(false);
        setStage("form");

        if (
          companyError.message
            ?.toLowerCase()
            .includes("companies_gstin_unique")
        ) {
          setError("That GSTIN is already registered to another company.");
        } else {
          setError(companyError.message);
        }

        return;
      }

      companyId = company.id;
    }

    // --------------------------------------------------
    // 4. Create or update recruiter profile
    // --------------------------------------------------

    const recruiterPayload = {
      user_id: user.id,
      company_id: companyId,
      designation: designation.trim(),
      work_email: workEmail.trim().toLowerCase(),
      phone: `+91${phone}`,
    };

    let recruiterError;

    if (existingRecruiter) {
      const { error } = await supabase
        .from("recruiter_profiles")
        .update(recruiterPayload)
        .eq("user_id", user.id);

      recruiterError = error;
    } else {
      const { error } = await supabase
        .from("recruiter_profiles")
        .insert(recruiterPayload);

      recruiterError = error;
    }

    if (recruiterError) {
      setLoading(false);
      setStage("form");
      setError(recruiterError.message);
      return;
    }

    // --------------------------------------------------
    // 5. Mark onboarding complete
    // --------------------------------------------------

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        onboarding_completed: true,
      })
      .eq("id", user.id);

    if (profileError) {
      setLoading(false);
      setStage("form");
      setError(profileError.message);
      return;
    }

    setLoading(false);
    setStage("success");
  }

  return (
    <>
      <div className="top-accent"></div>
      <div className="glow"></div>
      <div className="glow-2"></div>
      <div className="grain"></div>

      <div className="recruiter-onboarding-page">
        <nav className="recruiter-onboarding-nav">
          <button
            type="button"
            className="recruiter-logo"
            onClick={() => navigate("/")}
            aria-label="Go to SkillBridge home"
          >
            <span className="mark">
              <svg
                viewBox="0 0 26 22"
                width="17"
                height="14"
                fill="none"
                stroke="#1a1a1a"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2 15 L2 9 M24 15 L24 9" />
                <path d="M2 9 C 9 -1 17 -1 24 9" />
                <line x1="0" y1="15" x2="26" y2="15" />
                <line x1="7" y1="10" x2="7" y2="15" />
                <line x1="13" y1="7.5" x2="13" y2="15" />
                <line x1="19" y1="10" x2="19" y2="15" />
              </svg>
            </span>

            <span>
              Skill<span className="accent">Bridge</span>
            </span>
          </button>

          <button
            type="button"
            className="recruiter-back-link"
            onClick={() => navigate("/")}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5M11 6l-6 6 6 6" />
            </svg>

            Back to home
          </button>
        </nav>

        <main className="recruiter-verify-wrap">
          <div className="recruiter-verify-head">
            <div className="recruiter-eyebrow">
              // recruiter onboarding
            </div>

            <h1>
              <span className="recruiter-accent-text">Set up</span> your
              recruiter account
            </h1>

            <p>
              Add your recruiter and company details before creating
              opportunities and reviewing SkillBridge candidates.
            </p>
          </div>

          <div className="recruiter-verify-card">
            {stage === "form" && (
              <div className="recruiter-verify-panel active">
                <form
                  className="recruiter-verify-form"
                  onSubmit={handleSubmit}
                >
                  <label>
                    <span className="recruiter-field-label">
                      Full name
                    </span>

                    <input
                      type="text"
                      value={fullName}
                      onChange={(event) =>
                        setFullName(event.target.value)
                      }
                      placeholder="Your name"
                      autoComplete="name"
                      required
                    />
                  </label>

                  <div className="recruiter-field-row">
                    <label className="recruiter-field">
                      <span className="recruiter-field-label">
                        Designation
                      </span>

                      <input
                        type="text"
                        value={designation}
                        onChange={(event) =>
                          setDesignation(event.target.value)
                        }
                        placeholder="e.g. HR Manager"
                        required
                      />
                    </label>

                    <label className="recruiter-field">
                      <span className="recruiter-field-label">
                        Company size
                      </span>

                      <select
                        value={companySize}
                        onChange={(event) =>
                          setCompanySize(event.target.value)
                        }
                        required
                      >
                        <option value="" disabled>
                          Select size
                        </option>

                        {COMPANY_SIZES.map((size) => (
                          <option key={size} value={size}>
                            {size}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <label>
                    <span className="recruiter-field-label">
                      Company name
                    </span>

                    <input
                      type="text"
                      value={companyName}
                      onChange={(event) =>
                        setCompanyName(event.target.value)
                      }
                      placeholder="e.g. Nimbus Systems"
                      autoComplete="organization"
                      required
                    />
                  </label>

                  <label>
                    <span className="recruiter-field-label">
                      Industry
                    </span>

                    <select
                      value={industry}
                      onChange={(event) =>
                        setIndustry(event.target.value)
                      }
                      required
                    >
                      <option value="" disabled>
                        Select industry
                      </option>

                      {INDUSTRIES.map((industryName) => (
                        <option
                          key={industryName}
                          value={industryName}
                        >
                          {industryName}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span className="recruiter-field-label">
                      Work email
                    </span>

                    <input
                      type="email"
                      value={workEmail}
                      onChange={(event) =>
                        setWorkEmail(event.target.value)
                      }
                      placeholder="you@company.com"
                      autoComplete="email"
                      required
                    />

                    <span className="recruiter-field-hint">
                      Prefer your official company email rather than a
                      personal Gmail/Yahoo account.
                    </span>
                  </label>

                  <label>
                    <span className="recruiter-field-label">
                      Phone number
                    </span>

                    <div className="recruiter-phone-field">
                      <span className="recruiter-phone-code">+91</span>

                      <input
                        type="tel"
                        value={phone}
                        onChange={(event) => {
                          const digits = event.target.value
                            .replace(/\D/g, "")
                            .slice(0, 10);

                          setPhone(digits);
                        }}
                        inputMode="numeric"
                        placeholder="9876543210"
                        required
                      />
                    </div>
                  </label>

                  <label>
                    <span className="recruiter-field-label">
                      Company website
                      <span className="recruiter-optional-field">
                        {" "}
                        optional
                      </span>
                    </span>

                    <input
                      type="url"
                      value={website}
                      onChange={(event) =>
                        setWebsite(event.target.value)
                      }
                      placeholder="https://yourcompany.com"
                    />
                  </label>

                  <label>
                    <span className="recruiter-field-label">
                      GSTIN
                    </span>

                    <div
                      className={`recruiter-field-wrap ${
                        gstinValid ? "valid" : ""
                      }`}
                    >
                      <input
                        type="text"
                        value={gstin}
                        onChange={(event) =>
                          setGstin(event.target.value.toUpperCase())
                        }
                        maxLength={15}
                        placeholder="e.g. 27ABCDE1234F1Z5"
                        autoComplete="off"
                        required
                      />

                      <span
                        className="recruiter-field-check"
                        aria-hidden="true"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                    </div>

                    <span className="recruiter-field-hint">
                      We currently validate GSTIN format and prevent duplicate
                      registrations. Company verification remains pending until
                      an authoritative verification service is connected.
                    </span>
                  </label>

                  {error && (
                    <p className="recruiter-verify-error">{error}</p>
                  )}

                  <button
                    type="submit"
                    className="recruiter-btn recruiter-btn-primary recruiter-verify-submit"
                    disabled={loading}
                  >
                    {loading ? "Saving..." : "Complete Profile"}

                    {!loading && (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                      >
                        <path d="M5 12h14M13 6l6 6-6 6" />
                      </svg>
                    )}
                  </button>
                </form>
              </div>
            )}

            {stage === "checking" && (
              <div className="recruiter-verify-panel active recruiter-checking-panel">
                <div className="recruiter-verify-spinner"></div>

                <p className="recruiter-verify-status-text">
                  Saving recruiter profile for{" "}
                  <strong>{companyName || "your company"}</strong>…
                </p>
              </div>
            )}

            {stage === "success" && (
              <div className="recruiter-verify-panel active recruiter-success-panel">
                <div className="recruiter-result-icon good">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                </div>

                <h3>Recruiter profile completed</h3>

                <p className="recruiter-result-sub">
                  Your recruiter and company details are saved. Company
                  verification is currently <strong>pending</strong>.
                </p>

                <div className="recruiter-detail-rows">
                  <div className="recruiter-detail-row">
                    <span>Recruiter</span>
                    <strong>{fullName}</strong>
                  </div>

                  <div className="recruiter-detail-row">
                    <span>Company</span>
                    <strong>{companyName}</strong>
                  </div>

                  <div className="recruiter-detail-row">
                    <span>Industry</span>
                    <strong>{industry}</strong>
                  </div>

                  <div className="recruiter-detail-row">
                    <span>GSTIN</span>
                    <strong>{normalizedGstin}</strong>
                  </div>
                </div>

                <button
                  type="button"
                  className="recruiter-btn recruiter-btn-primary recruiter-continue-button"
                  onClick={() => navigate("/recruiter")}
                >
                  Continue to SkillBridge
                </button>
              </div>
            )}
          </div>
        </main>

        <footer className="recruiter-onboarding-footer">
          <span>© 2026 SkillBridge</span>

          <span>
            Company details help protect student profiles and improve hiring
            trust.
          </span>
        </footer>
      </div>
    </>
  );
}

export default RecruiterOnboarding;
