import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { supabase } from "../../services/supabase";
import "./Login.css";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [selectedRole, setSelectedRole] = useState("student");
  const [showPassword, setShowPassword] = useState(false);
  const [manualTheme, setManualTheme] = useState("");

  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleLogin(event) {
    event.preventDefault();

    setError("");
    setMessage("");
    setLoading(true);

    // ---------------------------------------------
    // 1. LOGIN USING SUPABASE AUTH
    // ---------------------------------------------

    const { data, error: loginError } =
      await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

    if (loginError) {
      setLoading(false);
      setError(loginError.message);
      return;
    }

    const user = data.user;

    // ---------------------------------------------
    // 2. CHECK SKILLBRIDGE PROFILE
    // ---------------------------------------------

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, onboarding_completed")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      setLoading(false);
      setError(profileError.message);
      return;
    }

    // ---------------------------------------------
    // 3. USER HAS NOT SELECTED ROLE YET
    // ---------------------------------------------

    if (!profile) {
      setLoading(false);
      navigate("/select-role");
      return;
    }

    // ---------------------------------------------
    // 4. ROLE CHIP CHECK
    // ---------------------------------------------
    // The database remains the source of truth
    // for the user's account role.

    if (profile.role !== selectedRole) {
      setLoading(false);

      const roleLabel =
        profile.role.charAt(0).toUpperCase() + profile.role.slice(1);

      setError(
        `This account is registered as ${roleLabel}. Select ${roleLabel} above and sign in again.`
      );

      await supabase.auth.signOut();
      return;
    }

    // ---------------------------------------------
    // 5. STUDENT
    // ---------------------------------------------

    if (profile.role === "student") {
      setLoading(false);

      if (profile.onboarding_completed) {
        navigate("/student");
      } else {
        navigate("/student/onboarding");
      }

      return;
    }

    // ---------------------------------------------
    // 6. RECRUITER
    // ---------------------------------------------

    if (profile.role === "recruiter") {
      setLoading(false);

      if (profile.onboarding_completed) {
        navigate("/recruiter");
      } else {
        navigate("/recruiter/onboarding");
      }

      return;
    }

    // ---------------------------------------------
    // 7. COLLEGE
    // ---------------------------------------------

    if (profile.role === "college") {
      setLoading(false);

      if (profile.onboarding_completed) {
        navigate("/college");
      } else {
        navigate("/college/onboarding");
      }

      return;
    }

    // ---------------------------------------------
    // 8. FACULTY
    // ---------------------------------------------

    if (profile.role === "faculty") {
      setLoading(false);

      if (profile.onboarding_completed) {
        navigate("/faculty");
      } else {
        navigate("/faculty/onboarding");
      }

      return;
    }

    setLoading(false);
    setError("Invalid account role.");
  }

  async function handleForgotPassword(event) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!email.trim()) {
      setError("Enter your email first, then click Forgot password.");
      return;
    }

    setResetLoading(true);

    const { error: resetError } =
      await supabase.auth.resetPasswordForEmail(email.trim());

    setResetLoading(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setMessage("Password reset email sent. Check your inbox.");
  }

  function toggleTheme() {
    setManualTheme((current) => {
      if (!current) {
        const prefersDark = window.matchMedia?.(
          "(prefers-color-scheme: dark)"
        ).matches;

        return prefersDark ? "light" : "dark";
      }

      return current === "dark" ? "light" : "dark";
    });
  }

  return (
    <div
      className="login-page"
      data-theme={manualTheme || undefined}
    >
      <div className="login-glow login-glow-one"></div>
      <div className="login-glow login-glow-two"></div>
      <div className="login-grain"></div>
      <div className="login-top-accent"></div>

      <nav className="login-nav">
        <button
          type="button"
          className="login-logo"
          onClick={() => navigate("/")}
          aria-label="Go to SkillBridge home"
        >
          <span className="login-logo-mark">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="#1a1a1a"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 18 12 4l9 14" />
              <line x1="2" y1="18" x2="22" y2="18" />
              <line x1="7" y1="10" x2="7" y2="18" />
              <line x1="12" y1="7" x2="12" y2="18" />
              <line x1="17" y1="10" x2="17" y2="18" />
            </svg>
          </span>

          <span>
            Skill<span className="login-brand-text">Bridge</span>
          </span>
        </button>

        <div className="login-nav-right">
          <button
            type="button"
            className="login-back-link"
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
            className="login-theme-button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            <svg
              className="login-icon-sun"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
            </svg>

            <svg
              className="login-icon-moon"
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

      <main className="login-main">
        <section className="login-card">
          <p className="login-eyebrow">// Welcome back</p>

          <h1>
            Sign in to <span>SkillBridge</span>
          </h1>

          <p className="login-subtitle">
            Access your dashboard, matches and opportunities.
          </p>

          {/* ROLE SELECTION */}

          <div className="login-role-row">
            <button
              type="button"
              className={`login-role-chip student ${
                selectedRole === "student" ? "active" : ""
              }`}
              onClick={() => setSelectedRole("student")}
            >
              <span className="dot"></span>
              Student
            </button>

            <button
              type="button"
              className={`login-role-chip college ${
                selectedRole === "college" ? "active" : ""
              }`}
              onClick={() => setSelectedRole("college")}
            >
              <span className="dot"></span>
              College
            </button>

            <button
              type="button"
              className={`login-role-chip recruiter ${
                selectedRole === "recruiter" ? "active" : ""
              }`}
              onClick={() => setSelectedRole("recruiter")}
            >
              <span className="dot"></span>
              Recruiter
            </button>

            <button
              type="button"
              className={`login-role-chip faculty ${
                selectedRole === "faculty" ? "active" : ""
              }`}
              onClick={() => setSelectedRole("faculty")}
            >
              <span className="dot"></span>
              Faculty
            </button>
          </div>

          <div className="login-social-row">
            <button
              type="button"
              className="login-social-button"
              disabled
              title="Google sign in can be connected later"
            >
              <svg viewBox="0 0 24 24" fill="none">
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
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Google
            </button>

            <button
              type="button"
              className="login-social-button"
              disabled
              title="LinkedIn sign in can be connected later"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
              LinkedIn
            </button>
          </div>

          <div className="login-divider">
            <span>or continue with email</span>
          </div>

          <form onSubmit={handleLogin}>
            <div className="login-form-group">
              <label>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>

            <div className="login-form-group">
              <label>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Password
              </label>

              <div className="login-password-wrap">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />

                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={
                    showPassword ? "Hide password" : "Show password"
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
                      <line x1="1" y1="1" x2="23" y2="23" />
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
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="login-forgot-row">
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={resetLoading}
              >
                {resetLoading ? "Sending…" : "Forgot password?"}
              </button>
            </div>

            {error && <div className="login-alert error">{error}</div>}
            {message && (
              <div className="login-alert success">{message}</div>
            )}

            <button
              type="submit"
              className="login-submit"
              disabled={loading}
            >
              {loading ? "Signing in…" : "Sign In"}

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

          <p className="login-footer">
            Don&apos;t have an account?{" "}
            <Link to="/signup">Create one →</Link>
          </p>
        </section>
      </main>
    </div>
  );
}

export default Login;