import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { supabase } from "../../services/supabase";
import { useAuth } from "../../hooks/useAuth";
import "./StudentOnboarding.css";

function StudentOnboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // --------------------------------------------------
  // Supabase data
  // --------------------------------------------------

  const [institutions, setInstitutions] = useState([]);
  const [departments, setDepartments] = useState([]);

  // --------------------------------------------------
  // Student form fields
  // --------------------------------------------------

  const [state, setState] = useState("");
  const [institutionId, setInstitutionId] = useState("");
  const [departmentId, setDepartmentId] = useState("");

  const [studentId, setStudentId] = useState("");
  const [collegeEmail, setCollegeEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [degree, setDegree] = useState("");
  const [currentYear, setCurrentYear] = useState("");
  const [currentSemester, setCurrentSemester] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [cgpa, setCgpa] = useState("");

  // --------------------------------------------------
  // Page states
  // --------------------------------------------------

  const [stage, setStage] = useState("form");
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState("");

  // --------------------------------------------------
  // Load institutions
  // --------------------------------------------------

  useEffect(() => {
    async function loadInstitutions() {
      const { data, error: institutionError } = await supabase
        .from("institutions")
        .select("id, name, state")
        .eq("type", "college")
        .order("name");

      if (institutionError) {
        setError(institutionError.message);
        setPageLoading(false);
        return;
      }

      setInstitutions(data || []);
      setPageLoading(false);
    }

    loadInstitutions();
  }, []);

  // --------------------------------------------------
  // Available states from real institutions
  // --------------------------------------------------

  const availableStates = useMemo(() => {
    return [
      ...new Set(
        institutions
          .map((institution) => institution.state)
          .filter(Boolean)
      ),
    ].sort((a, b) => a.localeCompare(b));
  }, [institutions]);

  const filteredInstitutions = useMemo(() => {
    if (!state) return [];

    return institutions.filter(
      (institution) => institution.state === state
    );
  }, [institutions, state]);

  // --------------------------------------------------
  // Load departments when college changes
  // --------------------------------------------------

  useEffect(() => {
    async function loadDepartments() {
      if (!institutionId) {
        setDepartments([]);
        setDepartmentId("");
        return;
      }

      const { data, error: departmentError } = await supabase
        .from("departments")
        .select("id, name, code")
        .eq("institution_id", institutionId)
        .order("name");

      if (departmentError) {
        setError(departmentError.message);
        return;
      }

      setDepartments(data || []);
      setDepartmentId("");
    }

    loadDepartments();
  }, [institutionId]);

  // --------------------------------------------------
  // Helpers
  // --------------------------------------------------

  const selectedInstitution = institutions.find(
    (institution) => institution.id === institutionId
  );

  const selectedDepartment = departments.find(
    (department) => department.id === departmentId
  );

  function handleStateChange(event) {
    setState(event.target.value);
    setInstitutionId("");
    setDepartmentId("");
    setDepartments([]);
  }

  // --------------------------------------------------
  // Submit onboarding
  // --------------------------------------------------

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");

    if (!user) {
      setError("You must be logged in.");
      return;
    }

    if (!state) {
      setError("Please select your state.");
      return;
    }

    if (!institutionId) {
      setError("Please select your college.");
      return;
    }

    if (!departmentId) {
      setError("Please select your department.");
      return;
    }

    if (!studentId.trim()) {
      setError("Please enter your roll number / student ID.");
      return;
    }

    if (!/^[6-9][0-9]{9}$/.test(phone)) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }

    if (cgpa && (Number(cgpa) < 0 || Number(cgpa) > 10)) {
      setError("CGPA must be between 0 and 10.");
      return;
    }

    setLoading(true);
    setStage("checking");

    const normalizedStudentId = studentId.trim().toUpperCase();

    // --------------------------------------------------
    // 1. Check if student ID is already used
    //    inside this institution
    // --------------------------------------------------

    const { data: duplicateStudent, error: duplicateError } = await supabase
      .from("student_profiles")
      .select("user_id")
      .eq("institution_id", institutionId)
      .ilike("student_id", normalizedStudentId)
      .maybeSingle();

    if (duplicateError) {
      setLoading(false);
      setStage("form");
      setError(duplicateError.message);
      return;
    }

    if (duplicateStudent && duplicateStudent.user_id !== user.id) {
      setLoading(false);
      setStage("form");
      setError(
        "That student ID is already registered under this institution."
      );
      return;
    }

    // --------------------------------------------------
    // 2. Create/update student profile
    // --------------------------------------------------

    const { error: studentError } = await supabase
      .from("student_profiles")
      .upsert(
        {
          user_id: user.id,

          phone: `+91${phone}`,

          institution_id: institutionId,
          department_id: departmentId,

          student_id: normalizedStudentId,
          college_email: collegeEmail.trim().toLowerCase(),

          degree: degree.trim(),

          current_year: Number(currentYear),
          current_semester: Number(currentSemester),
          graduation_year: Number(graduationYear),

          cgpa: cgpa ? Number(cgpa) : null,

          verification_status: "pending",
          verified_at: null,

          profile_completion: 60,
        },
        {
          onConflict: "user_id",
        }
      );

    if (studentError) {
      setLoading(false);
      setStage("form");
      setError(studentError.message);
      return;
    }

    // --------------------------------------------------
    // 3. Mark onboarding completed
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

  // --------------------------------------------------
  // Loading
  // --------------------------------------------------

  if (pageLoading) {
    return (
      <div className="student-onboarding-loading">
        Loading SkillBridge…
      </div>
    );
  }

  return (
    <>
      <div className="top-accent"></div>
      <div className="glow"></div>
      <div className="glow-2"></div>
      <div className="grain"></div>

      <div className="student-onboarding-page">
        {/* =========================
            NAVBAR
        ========================== */}

        <nav className="student-onboarding-nav">
          <button
            type="button"
            className="student-logo"
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
            className="student-back-link"
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

        {/* =========================
            CONTENT
        ========================== */}

        <main className="student-verify-wrap">
          <div className="student-verify-head">
            <div className="eyebrow">// student onboarding</div>

            <h1>
              <span className="student-accent-text">Complete</span> your
              student profile
            </h1>

            <p>
              Add your college and academic details so SkillBridge can build
              your profile and match you with relevant opportunities.
            </p>
          </div>

          <div className="student-verify-card">
            {/* =========================
                FORM
            ========================== */}

            {stage === "form" && (
              <div className="student-verify-panel active">
                <form
                  className="student-verify-form"
                  onSubmit={handleSubmit}
                >
                  <label>
                    <span className="student-field-label">Full name</span>

                    <input
                      type="text"
                      value={user?.user_metadata?.full_name || ""}
                      readOnly
                    />
                  </label>

                  <label>
                    <span className="student-field-label">
                      Login email
                    </span>

                    <input
                      type="email"
                      value={user?.email || ""}
                      readOnly
                    />
                  </label>

                  <div className="student-field-row">
                    <label className="student-field">
                      <span className="student-field-label">State</span>

                      <select
                        value={state}
                        onChange={handleStateChange}
                        required
                      >
                        <option value="" disabled>
                          Select your state
                        </option>

                        {availableStates.map((stateName) => (
                          <option key={stateName} value={stateName}>
                            {stateName}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="student-field">
                      <span className="student-field-label">College</span>

                      <select
                        value={institutionId}
                        onChange={(event) =>
                          setInstitutionId(event.target.value)
                        }
                        disabled={!state}
                        required
                      >
                        <option value="" disabled>
                          {state
                            ? "Select your college"
                            : "Select a state first"}
                        </option>

                        {filteredInstitutions.map((institution) => (
                          <option
                            key={institution.id}
                            value={institution.id}
                          >
                            {institution.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  {state && filteredInstitutions.length === 0 && (
                    <p className="student-field-notice">
                      No SkillBridge colleges are registered for this state
                      yet.
                    </p>
                  )}

                  <label>
                    <span className="student-field-label">Department</span>

                    <select
                      value={departmentId}
                      onChange={(event) =>
                        setDepartmentId(event.target.value)
                      }
                      disabled={!institutionId}
                      required
                    >
                      <option value="" disabled>
                        {institutionId
                          ? "Select your department"
                          : "Select a college first"}
                      </option>

                      {departments.map((department) => (
                        <option
                          key={department.id}
                          value={department.id}
                        >
                          {department.name} ({department.code})
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span className="student-field-label">
                      Roll number / Student ID
                    </span>

                    <input
                      type="text"
                      value={studentId}
                      onChange={(event) =>
                        setStudentId(event.target.value.toUpperCase())
                      }
                      placeholder="e.g. HITK23CSE104"
                      autoComplete="off"
                      required
                    />

                    <span className="student-field-hint">
                      Use the ID issued by your college.
                    </span>
                  </label>

                  <label>
                    <span className="student-field-label">
                      College email
                    </span>

                    <input
                      type="email"
                      value={collegeEmail}
                      onChange={(event) =>
                        setCollegeEmail(event.target.value)
                      }
                      placeholder="you@college.edu"
                      required
                    />

                    <span className="student-field-hint">
                      Prefer your official institutional/student email.
                    </span>
                  </label>

                  <label>
                    <span className="student-field-label">
                      Phone number
                    </span>

                    <div className="student-phone-field">
                      <span className="student-phone-code">+91</span>

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

                  <div className="student-field-row">
                    <label className="student-field">
                      <span className="student-field-label">Degree</span>

                      <input
                        type="text"
                        value={degree}
                        onChange={(event) => setDegree(event.target.value)}
                        placeholder="e.g. B.Tech"
                        required
                      />
                    </label>

                    <label className="student-field">
                      <span className="student-field-label">
                        Current year
                      </span>

                      <select
                        value={currentYear}
                        onChange={(event) =>
                          setCurrentYear(event.target.value)
                        }
                        required
                      >
                        <option value="" disabled>
                          Select year
                        </option>
                        <option value="1">1st Year</option>
                        <option value="2">2nd Year</option>
                        <option value="3">3rd Year</option>
                        <option value="4">4th Year</option>
                        <option value="5">5th Year</option>
                      </select>
                    </label>
                  </div>

                  <div className="student-field-row">
                    <label className="student-field">
                      <span className="student-field-label">
                        Current semester
                      </span>

                      <select
                        value={currentSemester}
                        onChange={(event) =>
                          setCurrentSemester(event.target.value)
                        }
                        required
                      >
                        <option value="" disabled>
                          Select semester
                        </option>

                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(
                          (semester) => (
                            <option
                              key={semester}
                              value={semester}
                            >
                              Semester {semester}
                            </option>
                          )
                        )}
                      </select>
                    </label>

                    <label className="student-field">
                      <span className="student-field-label">
                        Graduation year
                      </span>

                      <input
                        type="number"
                        value={graduationYear}
                        onChange={(event) =>
                          setGraduationYear(event.target.value)
                        }
                        min="2026"
                        max="2040"
                        placeholder="2029"
                        required
                      />
                    </label>
                  </div>

                  <label>
                    <span className="student-field-label">
                      CGPA
                      <span className="student-optional-field">
                        {" "}
                        optional
                      </span>
                    </span>

                    <input
                      type="number"
                      value={cgpa}
                      onChange={(event) => setCgpa(event.target.value)}
                      min="0"
                      max="10"
                      step="0.01"
                      placeholder="e.g. 8.25"
                    />
                  </label>

                  {error && (
                    <p className="student-verify-error">{error}</p>
                  )}

                  <button
                    type="submit"
                    className="student-btn student-btn-primary student-verify-submit"
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

            {/* =========================
                CHECKING
            ========================== */}

            {stage === "checking" && (
              <div className="student-verify-panel active student-checking-panel">
                <div className="student-verify-spinner"></div>

                <p className="student-verify-status-text">
                  Saving your SkillBridge profile for{" "}
                  <strong>
                    {selectedInstitution?.name || "your college"}
                  </strong>
                  …
                </p>
              </div>
            )}

            {/* =========================
                SUCCESS
            ========================== */}

            {stage === "success" && (
              <div className="student-verify-panel active student-success-panel">
                <div className="student-result-icon good">
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

                <h3>Student profile completed</h3>

                <p className="student-result-sub">
                  Your profile has been saved. Your student verification status
                  is currently <strong>pending</strong> until your institution
                  verification flow is connected.
                </p>

                <div className="student-detail-rows">
                  <div className="student-detail-row">
                    <span>Name</span>
                    <strong>
                      {user?.user_metadata?.full_name || "Student"}
                    </strong>
                  </div>

                  <div className="student-detail-row">
                    <span>College</span>
                    <strong>{selectedInstitution?.name || "—"}</strong>
                  </div>

                  <div className="student-detail-row">
                    <span>Department</span>
                    <strong>{selectedDepartment?.name || "—"}</strong>
                  </div>

                  <div className="student-detail-row">
                    <span>Student ID</span>
                    <strong>{studentId.trim().toUpperCase()}</strong>
                  </div>
                </div>

                <button
                  type="button"
                  className="student-btn student-btn-primary student-continue-button"
                  onClick={() => navigate("/student")}
                >
                  Continue to SkillBridge
                </button>
              </div>
            )}
          </div>
        </main>

        {/* =========================
            FOOTER
        ========================== */}

        <footer className="student-onboarding-footer">
          <span>© 2026 SkillBridge</span>

          <span>
            Your academic profile powers opportunity matching and skill-gap
            insights.
          </span>
        </footer>
      </div>
    </>
  );
}

export default StudentOnboarding;
