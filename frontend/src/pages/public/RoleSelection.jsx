import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabase";
import "./RoleSelection.css";

const ROLES = [
  {
    id: "student",
    icon: "🎓",
    title: "Student",
    label: "Student",
    desc: "Build your skills, discover opportunities and prepare for your career.",
    bullets: [
      "Build your skill profile",
      "Discover matching opportunities",
      "Identify missing skills"
    ]
  },
  {
    id: "faculty",
    icon: "📚",
    title: "Faculty",
    label: "Faculty",
    desc: "Connect with industry for professional development, research and academic collaboration.",
    bullets: [
      "Discover faculty development programs",
      "Explore research and consultancy",
      "Join industry collaborations"
    ]
  },
  {
    id: "college",
    icon: "🏛️",
    title: "College / Placement Cell",
    label: "College",
    desc: "Understand student readiness and bridge the gap between academia and industry.",
    bullets: [
      "Monitor student readiness",
      "Analyze industry skill demand",
      "Discover institutional skill gaps"
    ]
  },
  {
    id: "recruiter",
    icon: "💼",
    title: "Recruiter / Industry",
    label: "Recruiter",
    desc: "Find skilled candidates and connect your opportunities with the right talent.",
    bullets: [
      "Post jobs and internships",
      "Find eligible candidates",
      "Rank candidates by skills"
    ]
  }
];

function RoleSelection() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [manualTheme, setManualTheme] = useState("");

  /* =========================
     THEME
  ========================= */

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

  /* =========================
     REDIRECT BY ROLE
  ========================= */

  function redirectUser(role, onboardingCompleted) {
    if (role === "student") {
      navigate(
        onboardingCompleted
          ? "/student"
          : "/student/onboarding"
      );
    } else if (role === "recruiter") {
      navigate(
        onboardingCompleted
          ? "/recruiter"
          : "/recruiter/onboarding"
      );
    } else if (role === "college") {
      navigate(
        onboardingCompleted
          ? "/college"
          : "/college/onboarding"
      );
    } else if (role === "faculty") {
      navigate(
        onboardingCompleted
          ? "/faculty"
          : "/faculty/onboarding"
      );
    }
  }

  /* =========================
     SELECT ROLE
  ========================= */

  async function selectRole(role) {
    setLoading(true);
    setError("");

    /* =========================
       GET AUTH USER
    ========================= */

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setLoading(false);
      setError(
        "You must be logged in to choose a role."
      );
      return;
    }

    /* =========================
       CHECK EXISTING PROFILE
    ========================= */

    const {
      data: existingProfile,
      error: checkError,
    } = await supabase
      .from("profiles")
      .select("role, onboarding_completed")
      .eq("id", user.id)
      .maybeSingle();

    if (checkError) {
      setLoading(false);
      setError(checkError.message);
      return;
    }

    /* =========================
       EXISTING USER
    ========================= */

    if (existingProfile) {
      setLoading(false);

      redirectUser(
        existingProfile.role,
        existingProfile.onboarding_completed
      );

      return;
    }

    /* =========================
       CREATE SKILLBRIDGE PROFILE
    ========================= */

    const { error: profileError } =
      await supabase
        .from("profiles")
        .insert({
          id: user.id,

          full_name:
            user.user_metadata?.full_name ||
            "SkillBridge User",

          email: user.email,

          role: role,

          onboarding_completed: false,
        });

    if (profileError) {
      setLoading(false);
      setError(profileError.message);
      return;
    }

    /* =========================
       SEND TO ONBOARDING
    ========================= */

    redirectUser(role, false);

    setLoading(false);
  }

  return (
    <div className="role-page" data-theme={manualTheme || undefined}>
      <div className="role-glow role-glow-one"></div>
      <div className="role-glow role-glow-two"></div>
      <div className="role-grain"></div>
      <div className="role-top-accent"></div>

      {/* =========================
          NAVBAR
      ========================== */}

      <nav className="role-nav">
        <button
          type="button"
          className="role-logo"
          onClick={() => navigate("/")}
          aria-label="Go to SkillBridge home"
        >
          <span className="role-logo-mark">
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
            Skill<span className="role-brand-text">Bridge</span>
          </span>
        </button>

        <div className="role-nav-right">
          <button
            type="button"
            className="role-back-link"
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
            className="role-theme-button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            <svg
              className="role-icon-sun"
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
              className="role-icon-moon"
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

      <main className="role-main">
        <div className="role-container">
          {/* =========================
              HEADING
          ========================== */}

          <div className="role-heading">
            <div className="role-eyebrow">// choose your role</div>

            <h1>
              How will you use{" "}
              <span className="role-brand-text">SkillBridge</span>?
            </h1>

            <p>
              Choose your role so we can personalize your SkillBridge
              experience.
            </p>
          </div>

          {/* =========================
              ROLE CARDS
          ========================== */}

          <div className="role-cards">
            {ROLES.map((role) => (
              <button
                key={role.id}
                type="button"
                className={`role-card ${role.id}`}
                onClick={() => selectRole(role.id)}
                disabled={loading}
              >
                <span className="role-card-icon">{role.icon}</span>

                <h2>{role.title}</h2>

                <p>{role.desc}</p>

                <ul>
                  {role.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>

                <span className="role-continue">
                  Continue as {role.label} →
                </span>
              </button>
            ))}
          </div>

          {/* =========================
              LOADING
          ========================== */}

          {loading && (
            <div className="role-message">
              <div className="role-spinner"></div>

              <p>Setting up your account...</p>
            </div>
          )}

          {/* =========================
              ERROR
          ========================== */}

          {error && <p className="role-error">{error}</p>}
        </div>
      </main>
    </div>
  );
}

export default RoleSelection;
