import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { supabase } from "../../services/supabase";
import { useAuth } from "../../hooks/useAuth";
import "./Onboarding.css";

const INDIAN_STATES = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi (NCT)",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

function CollegeOnboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [fullName, setFullName] = useState("");
  const [designation, setDesignation] = useState("");
  const [state, setState] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [collegeCode, setCollegeCode] = useState("");
  const [officialEmail, setOfficialEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [aisheCode, setAisheCode] = useState("");
  const [numberOfDepartments, setNumberOfDepartments] = useState("");

  const [stage, setStage] = useState("form");
  const [createdInstitutionId, setCreatedInstitutionId] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const normalizedAishe = aisheCode.trim().toUpperCase();
  const aisheValid = /^[CU]-[0-9]{4,5}$/.test(normalizedAishe);

  useEffect(() => {
    async function loadExistingProfile() {
      if (!user) return;

      if (user.email) {
        setOfficialEmail(user.email);
      }

      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();

      if (!profileError && data?.full_name) {
        setFullName(data.full_name);
      }
    }

    loadExistingProfile();
  }, [user]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!user) {
      setError("You must be logged in.");
      return;
    }

    if (!aisheValid) {
      setError("Enter a valid AISHE code, for example C-41522 or U-0642.");
      return;
    }

    if (!/^[6-9][0-9]{9}$/.test(phone)) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }

    if (Number(numberOfDepartments) < 1) {
      setError("Number of departments must be at least 1.");
      return;
    }

    setLoading(true);
    setStage("checking");

    // --------------------------------------------------
    // 1. Prevent the same AISHE code being registered twice
    // --------------------------------------------------
    const { data: existingInstitution, error: existingError } = await supabase
      .from("institutions")
      .select("id, name")
      .ilike("aishe_code", normalizedAishe)
      .maybeSingle();

    if (existingError) {
      setLoading(false);
      setStage("form");
      setError(existingError.message);
      return;
    }

    if (existingInstitution) {
      setLoading(false);
      setStage("form");
      setError(
        `An institution with AISHE code ${normalizedAishe} is already registered as ${existingInstitution.name}.`
      );
      return;
    }

    // --------------------------------------------------
    // 2. Keep the logged-in profile name updated
    // --------------------------------------------------
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
      })
      .eq("id", user.id);

    if (profileError) {
      setLoading(false);
      setStage("form");
      setError(profileError.message);
      return;
    }

    // --------------------------------------------------
    // 3. Create institution
    // --------------------------------------------------
    const { data: institution, error: institutionError } = await supabase
      .from("institutions")
      .insert({
        name: collegeName.trim(),
        institution_code: collegeCode.trim() || null,

        // Keep the existing field used by the old onboarding flow.
        contact_email: officialEmail.trim().toLowerCase(),

        // New verification/onboarding fields.
        official_email: officialEmail.trim().toLowerCase(),
        state,
        website: website.trim() || null,
        aishe_code: normalizedAishe,

        type: "college",
      })
      .select("id")
      .single();

    if (institutionError) {
      setLoading(false);
      setStage("form");

      if (
        institutionError.message
          ?.toLowerCase()
          .includes("institutions_aishe_code_unique")
      ) {
        setError("That AISHE code is already registered.");
      } else {
        setError(institutionError.message);
      }

      return;
    }

    // --------------------------------------------------
    // 4. Link logged-in user to institution
    // --------------------------------------------------
    const { error: memberError } = await supabase
      .from("institution_members")
      .insert({
        user_id: user.id,
        institution_id: institution.id,
        member_role: "placement_officer",
        designation: designation.trim(),
        phone: `+91${phone}`,
      });

    if (memberError) {
      setLoading(false);
      setStage("form");
      setError(memberError.message);
      return;
    }

    setCreatedInstitutionId(institution.id);
    setLoading(false);
    setStage("success");
  }

  function continueToDepartments() {
    if (!createdInstitutionId) return;

    navigate("/college/departments", {
      state: {
        institutionId: createdInstitutionId,
        numberOfDepartments: Number(numberOfDepartments),
      },
    });
  }

  return (
    <>
      <div className="top-accent"></div>
      <div className="glow"></div>
      <div className="glow-2"></div>
      <div className="grain"></div>

      <div className="college-onboarding-page">
        <nav className="college-onboarding-nav">
          <button
            type="button"
            className="college-logo"
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
            className="back-link"
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

        <main className="verify-wrap">
          <div className="verify-head">
            <div className="eyebrow">// college onboarding</div>

            <h1>
              <span className="accent-text">Set up</span> your college account
            </h1>

            <p>
              Add your institution and placement-cell details before setting
              up departments and opening the college dashboard.
            </p>
          </div>

          <div className="verify-card">
            {stage === "form" && (
              <div className="verify-panel active">
                <form className="verify-form" onSubmit={handleSubmit}>
                  <label>
                    <span className="field-label">Full name</span>

                    <input
                      type="text"
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      placeholder="Your name"
                      autoComplete="name"
                      required
                    />
                  </label>

                  <div className="field-row">
                    <label className="field">
                      <span className="field-label">Designation</span>

                      <input
                        type="text"
                        value={designation}
                        onChange={(event) =>
                          setDesignation(event.target.value)
                        }
                        placeholder="e.g. Placement Officer"
                        required
                      />
                    </label>

                    <label className="field">
                      <span className="field-label">State</span>

                      <select
                        value={state}
                        onChange={(event) => setState(event.target.value)}
                        required
                      >
                        <option value="" disabled>
                          Select state
                        </option>

                        {INDIAN_STATES.map((stateName) => (
                          <option key={stateName} value={stateName}>
                            {stateName}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <label>
                    <span className="field-label">College name</span>

                    <input
                      type="text"
                      value={collegeName}
                      onChange={(event) =>
                        setCollegeName(event.target.value)
                      }
                      placeholder="Enter official college name"
                      autoComplete="organization"
                      required
                    />
                  </label>

                  <label>
                    <span className="field-label">Official college email</span>

                    <input
                      type="email"
                      value={officialEmail}
                      onChange={(event) =>
                        setOfficialEmail(event.target.value)
                      }
                      placeholder="placement@college.edu"
                      autoComplete="email"
                      required
                    />

                    <span className="field-hint">
                      Prefer an official institutional email rather than a
                      personal Gmail/Yahoo account.
                    </span>
                  </label>

                  <label>
                    <span className="field-label">Phone number</span>

                    <div className="phone-field">
                      <span className="phone-code">+91</span>

                      <input
                        type="tel"
                        value={phone}
                        onChange={(event) => {
                          const digits = event.target.value
                            .replace(/\D/g, "")
                            .slice(0, 10);

                          setPhone(digits);
                        }}
                        placeholder="9876543210"
                        inputMode="numeric"
                        required
                      />
                    </div>
                  </label>

                  <label>
                    <span className="field-label">
                      College website
                      <span className="optional-field"> optional</span>
                    </span>

                    <input
                      type="url"
                      value={website}
                      onChange={(event) => setWebsite(event.target.value)}
                      placeholder="https://yourcollege.edu"
                    />
                  </label>

                  <label>
                    <span className="field-label">AISHE code</span>

                    <div
                      className={`field-wrap ${
                        aisheValid ? "valid" : ""
                      }`}
                    >
                      <input
                        type="text"
                        value={aisheCode}
                        onChange={(event) =>
                          setAisheCode(event.target.value.toUpperCase())
                        }
                        maxLength={8}
                        placeholder="e.g. C-41522"
                        required
                      />

                      <span className="field-check" aria-hidden="true">
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

                    <span className="field-hint">
                      Enter your institution&apos;s AISHE code. This step
                      validates the format and prevents duplicate registration.
                      Live AISHE directory verification can be connected later.
                    </span>
                  </label>

                  <div className="field-row">
                    <label className="field">
                      <span className="field-label">
                        College ID / Code
                        <span className="optional-field"> optional</span>
                      </span>

                      <input
                        type="text"
                        value={collegeCode}
                        onChange={(event) =>
                          setCollegeCode(event.target.value.toUpperCase())
                        }
                        placeholder="e.g. HITK"
                      />
                    </label>

                    <label className="field">
                      <span className="field-label">
                        Number of departments
                      </span>

                      <input
                        type="number"
                        value={numberOfDepartments}
                        onChange={(event) =>
                          setNumberOfDepartments(event.target.value)
                        }
                        min="1"
                        max="30"
                        placeholder="e.g. 6"
                        required
                      />
                    </label>
                  </div>

                  {error && <p className="verify-error">{error}</p>}

                  <button
                    type="submit"
                    className="btn btn-primary verify-submit"
                    disabled={loading}
                  >
                    {loading ? "Saving..." : "Save & Continue"}

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
              <div className="verify-panel active checking-panel">
                <div className="verify-spinner"></div>

                <p className="verify-status-text">
                  Saving institution details for{" "}
                  <strong>{collegeName || "your college"}</strong>…
                </p>
              </div>
            )}

            {stage === "success" && (
              <div className="verify-panel active success-panel">
                <div className="verify-result-icon good">
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

                <h3>College details saved</h3>

                <p className="verify-result-sub">
                  Your institution account has been created. Set up the
                  departments next.
                </p>

                <div className="verify-detail-rows">
                  <div className="verify-detail-row">
                    <span>Placement officer</span>
                    <strong>{fullName}</strong>
                  </div>

                  <div className="verify-detail-row">
                    <span>College</span>
                    <strong>{collegeName}</strong>
                  </div>

                  <div className="verify-detail-row">
                    <span>State</span>
                    <strong>{state}</strong>
                  </div>

                  <div className="verify-detail-row">
                    <span>AISHE code</span>
                    <strong>{normalizedAishe}</strong>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-primary continue-button"
                  onClick={continueToDepartments}
                >
                  Continue to Department Setup
                </button>
              </div>
            )}
          </div>
        </main>

        <footer className="college-onboarding-footer">
          <span>© 2026 SkillBridge</span>

          <span>
            Institution details are stored securely in your SkillBridge
            workspace.
          </span>
        </footer>
      </div>
    </>
  );
}

export default CollegeOnboarding;
