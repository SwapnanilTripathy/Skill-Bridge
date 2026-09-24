import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { supabase } from "../../services/supabase";
import "./Signup.css";

function Signup() {
  const navigate = useNavigate();

  const [selectedRole, setSelectedRole] = useState("student");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [manualTheme, setManualTheme] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const fullName =
    `${firstName.trim()} ${lastName.trim()}`.trim();

  /* =========================
     PASSWORD STRENGTH
  ========================= */

  const passwordStrength = useMemo(() => {
    if (!password) {
      return {
        score: 0,
        label: "",
      };
    }

    let score = 0;

    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    const labels = ["Weak", "Fair", "Good", "Strong"];

    return {
      score,
      label: labels[Math.max(score - 1, 0)],
    };
  }, [password]);

  const passwordsMatch =
    confirmPassword.length > 0 &&
    password === confirmPassword;

  /* =========================
     SIGN UP
  ========================= */

  async function handleSignup(event) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!firstName.trim() || !lastName.trim()) {
      setError(
        "Please enter your first and last name."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError(
        "Password must be at least 6 characters."
      );
      return;
    }

    if (!acceptedTerms) {
      setError(
        "Please accept the Terms of Service and Privacy Policy."
      );
      return;
    }

    setLoading(true);

    const {
      data,
      error: signupError,
    } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,

      options: {
        emailRedirectTo:
          "http://localhost:5173/login",

        data: {
          full_name: fullName,
          selected_role: selectedRole,
        },
      },
    });

    setLoading(false);

    if (signupError) {
      setError(signupError.message);
      return;
    }

    if (data.user) {
      setMessage(
        "Account created! Please check your email and confirm your account."
      );

      setFirstName("");
      setLastName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setAcceptedTerms(false);
      setSelectedRole("student");
    }
  }

  /* =========================
     THEME
  ========================= */

  function toggleTheme() {
    setManualTheme((current) => {
      if (!current) {
        const prefersDark =
          window.matchMedia?.(
            "(prefers-color-scheme: dark)"
          ).matches;

        return prefersDark
          ? "light"
          : "dark";
      }

      return current === "dark"
        ? "light"
        : "dark";
    });
  }

  return (
    <div
      className="signup-page"
      data-theme={manualTheme || undefined}
    >
      <div className="signup-glow signup-glow-one"></div>
      <div className="signup-glow signup-glow-two"></div>
      <div className="signup-grain"></div>
      <div className="signup-top-accent"></div>

      {/* =========================
          NAVBAR
      ========================= */}

      <nav className="signup-nav">
        <button
          type="button"
          className="signup-logo"
          onClick={() => navigate("/")}
          aria-label="Go to SkillBridge home"
        >
          <span className="signup-logo-mark">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="#1a1a1a"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 18 12 4l9 14" />
              <line
                x1="2"
                y1="18"
                x2="22"
                y2="18"
              />
              <line
                x1="7"
                y1="10"
                x2="7"
                y2="18"
              />
              <line
                x1="12"
                y1="7"
                x2="12"
                y2="18"
              />
              <line
                x1="17"
                y1="10"
                x2="17"
                y2="18"
              />
            </svg>
          </span>

          <span>
            Skill
            <span className="signup-brand-text">
              Bridge
            </span>
          </span>
        </button>

        <div className="signup-nav-right">
          <button
            type="button"
            className="signup-back-link"
            onClick={() => navigate("/")}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>

            Back to home
          </button>

          <button
            type="button"
            className="signup-theme-button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            <svg
              className="signup-icon-sun"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <circle
                cx="12"
                cy="12"
                r="4"
              />

              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
            </svg>

            <svg
              className="signup-icon-moon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          </button>
        </div>
      </nav>

      {/* =========================
          MAIN
      ========================= */}

      <main className="signup-main">
        <section className="signup-card">
          <p className="signup-eyebrow">
            // Join the network
          </p>

          <h1>
            Create your{" "}
            <span>SkillBridge</span> account
          </h1>

          <p className="signup-subtitle">
            Connect your skills with opportunities,
            recruiters and institutions.
          </p>

          {/* =========================
              PERKS
          ========================= */}

          <div className="signup-perks">
            <div className="signup-perk">
              <span className="signup-perk-icon green">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </span>

              Verified student &amp; college
              profiles
            </div>

            <div className="signup-perk">
              <span className="signup-perk-icon yellow">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </span>

              Direct recruiter shortlisting
            </div>

            <div className="signup-perk">
              <span className="signup-perk-icon purple">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </span>

              Smart skill-based opportunity
              matching
            </div>
          </div>

          {/* =========================
              ROLE SELECTION
          ========================= */}

          <div className="signup-role-section">
            <div className="signup-role-label">
              I am joining as
            </div>

            <div className="signup-role-grid">
              {/* STUDENT */}

              <button
                type="button"
                className={`signup-role-card student ${
                  selectedRole === "student"
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setSelectedRole("student")
                }
              >
                <span className="signup-role-icon">
                  🎓
                </span>

                <span className="signup-role-name">
                  Student
                </span>
              </button>

              {/* COLLEGE */}

              <button
                type="button"
                className={`signup-role-card college ${
                  selectedRole === "college"
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setSelectedRole("college")
                }
              >
                <span className="signup-role-icon">
                  🏛️
                </span>

                <span className="signup-role-name">
                  College
                </span>
              </button>

              {/* RECRUITER */}

              <button
                type="button"
                className={`signup-role-card recruiter ${
                  selectedRole === "recruiter"
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setSelectedRole("recruiter")
                }
              >
                <span className="signup-role-icon">
                  💼
                </span>

                <span className="signup-role-name">
                  Recruiter
                </span>
              </button>

              {/* FACULTY */}

              <button
                type="button"
                className={`signup-role-card faculty ${
                  selectedRole === "faculty"
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setSelectedRole("faculty")
                }
              >
                <span className="signup-role-icon">
                  👩‍🏫
                </span>

                <span className="signup-role-name">
                  Faculty
                </span>
              </button>
            </div>
          </div>

          {/* =========================
              SOCIAL BUTTONS
          ========================= */}

          <div className="signup-social-row">
            <button
              type="button"
              className="signup-social-button"
              disabled
              title="Google sign up can be connected later"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />

                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />

                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                  fill="#FBBC05"
                />

                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 0 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>

              Google
            </button>

            <button
              type="button"
              className="signup-social-button"
              disabled
              title="LinkedIn sign up can be connected later"
            >
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>

              LinkedIn
            </button>
          </div>

          <div className="signup-divider">
            <span>
              or fill in your details
            </span>
          </div>

          {/* =========================
              SIGNUP FORM
          ========================= */}

          <form onSubmit={handleSignup}>
            <div className="signup-form-row">
              {/* FIRST NAME */}

              <div className="signup-form-group">
                <label>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <circle
                      cx="12"
                      cy="8"
                      r="4"
                    />

                    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                  </svg>

                  First Name
                </label>

                <input
                  type="text"
                  value={firstName}
                  onChange={(event) =>
                    setFirstName(
                      event.target.value
                    )
                  }
                  placeholder="Aarav"
                  autoComplete="given-name"
                  required
                />
              </div>

              {/* LAST NAME */}

              <div className="signup-form-group">
                <label>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <circle
                      cx="12"
                      cy="8"
                      r="4"
                    />

                    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                  </svg>

                  Last Name
                </label>

                <input
                  type="text"
                  value={lastName}
                  onChange={(event) =>
                    setLastName(
                      event.target.value
                    )
                  }
                  placeholder="Menon"
                  autoComplete="family-name"
                  required
                />
              </div>
            </div>

            {/* EMAIL */}

            <div className="signup-form-group">
              <label>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <rect
                    x="2"
                    y="4"
                    width="20"
                    height="16"
                    rx="2"
                  />

                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>

                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder="you@college.edu"
                autoComplete="email"
                required
              />
            </div>

            {/* PASSWORD */}

            <div className="signup-form-group">
              <label>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <rect
                    x="3"
                    y="11"
                    width="18"
                    height="11"
                    rx="2"
                  />

                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>

                Password
              </label>

              <div className="signup-password-wrap">
                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={password}
                  onChange={(event) =>
                    setPassword(
                      event.target.value
                    )
                  }
                  placeholder="Create a strong password"
                  autoComplete="new-password"
                  required
                />

                <button
                  type="button"
                  className="signup-password-toggle"
                  onClick={() =>
                    setShowPassword(
                      (current) => !current
                    )
                  }
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  {showPassword ? (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />

                      <line
                        x1="1"
                        y1="1"
                        x2="23"
                        y2="23"
                      />
                    </svg>
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />

                      <circle
                        cx="12"
                        cy="12"
                        r="3"
                      />
                    </svg>
                  )}
                </button>
              </div>

              <div className="signup-strength-bar">
                {[1, 2, 3, 4].map(
                  (segment) => (
                    <span
                      key={segment}
                      className={`signup-strength-segment ${
                        segment <=
                        passwordStrength.score
                          ? `filled level-${passwordStrength.score}`
                          : ""
                      }`}
                    ></span>
                  )
                )}
              </div>

              <div
                className={`signup-strength-hint ${
                  passwordStrength.score
                    ? `level-${passwordStrength.score}`
                    : ""
                }`}
              >
                {passwordStrength.label}
              </div>
            </div>

            {/* CONFIRM PASSWORD */}

            <div className="signup-form-group">
              <label>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <rect
                    x="3"
                    y="11"
                    width="18"
                    height="11"
                    rx="2"
                  />

                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>

                Confirm Password
              </label>

              <div className="signup-password-wrap">
                <input
                  className={
                    confirmPassword
                      ? passwordsMatch
                        ? "valid"
                        : "error"
                      : ""
                  }
                  type={
                    showConfirmPassword
                      ? "text"
                      : "password"
                  }
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(
                      event.target.value
                    )
                  }
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                  required
                />

                <button
                  type="button"
                  className="signup-password-toggle"
                  onClick={() =>
                    setShowConfirmPassword(
                      (current) => !current
                    )
                  }
                  aria-label={
                    showConfirmPassword
                      ? "Hide confirm password"
                      : "Show confirm password"
                  }
                >
                  {showConfirmPassword ? (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />

                      <line
                        x1="1"
                        y1="1"
                        x2="23"
                        y2="23"
                      />
                    </svg>
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />

                      <circle
                        cx="12"
                        cy="12"
                        r="3"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* TERMS */}

            <div className="signup-check-row">
              <input
                id="signup-terms"
                type="checkbox"
                checked={acceptedTerms}
                onChange={(event) =>
                  setAcceptedTerms(
                    event.target.checked
                  )
                }
                required
              />

              <label htmlFor="signup-terms">
                I agree to the{" "}
                <button
                  type="button"
                  onClick={() =>
                    setMessage(
                      "Terms of Service page has not been published yet."
                    )
                  }
                >
                  Terms of Service
                </button>{" "}
                and{" "}
                <button
                  type="button"
                  onClick={() =>
                    setMessage(
                      "Privacy Policy page has not been published yet."
                    )
                  }
                >
                  Privacy Policy
                </button>{" "}
                of SkillBridge.
              </label>
            </div>

            {/* ALERTS */}

            {error && (
              <div className="signup-alert error">
                {error}
              </div>
            )}

            {message && (
              <div className="signup-alert success">
                {message}
              </div>
            )}

            {/* SUBMIT */}

            <button
              type="submit"
              className="signup-submit"
              disabled={loading}
            >
              {loading
                ? "Creating account…"
                : "Create Account"}

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

          <p className="signup-footer">
            Already have an account?{" "}
            <Link to="/login">
              Sign in →
            </Link>
          </p>
        </section>
      </main>
    </div>
  );
}

export default Signup;