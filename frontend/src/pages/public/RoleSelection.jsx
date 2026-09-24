import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabase";
import "./RoleSelection.css";

function RoleSelection() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
    <div className="role-page">
      <div className="role-container">
        {/* =========================
            BRAND
        ========================= */}

        <div className="role-brand">
          <div className="role-logo">
            SB
          </div>

          <span>SkillBridge</span>
        </div>

        {/* =========================
            HEADING
        ========================= */}

        <div className="role-heading">
          <h1>
            How will you use SkillBridge?
          </h1>

          <p>
            Choose your role so we can personalize your
            SkillBridge experience.
          </p>
        </div>

        {/* =========================
            ROLE CARDS
        ========================= */}

        <div className="role-cards">
          {/* STUDENT */}

          <button
            type="button"
            className="role-card"
            onClick={() =>
              selectRole("student")
            }
            disabled={loading}
          >
            <div className="role-icon">
              🎓
            </div>

            <h2>Student</h2>

            <p>
              Build your skills, discover opportunities
              and prepare for your career.
            </p>

            <ul>
              <li>
                Build your skill profile
              </li>

              <li>
                Discover matching opportunities
              </li>

              <li>
                Identify missing skills
              </li>
            </ul>

            <span className="role-continue">
              Continue as Student →
            </span>
          </button>

          {/* RECRUITER */}

          <button
            type="button"
            className="role-card"
            onClick={() =>
              selectRole("recruiter")
            }
            disabled={loading}
          >
            <div className="role-icon">
              💼
            </div>

            <h2>
              Recruiter / Industry
            </h2>

            <p>
              Find skilled candidates and connect your
              opportunities with the right talent.
            </p>

            <ul>
              <li>
                Post jobs and internships
              </li>

              <li>
                Find eligible candidates
              </li>

              <li>
                Rank candidates by skills
              </li>
            </ul>

            <span className="role-continue">
              Continue as Recruiter →
            </span>
          </button>

          {/* COLLEGE */}

          <button
            type="button"
            className="role-card"
            onClick={() =>
              selectRole("college")
            }
            disabled={loading}
          >
            <div className="role-icon">
              🏫
            </div>

            <h2>
              College / Placement Cell
            </h2>

            <p>
              Understand student readiness and bridge the
              gap between academia and industry.
            </p>

            <ul>
              <li>
                Monitor student readiness
              </li>

              <li>
                Analyze industry skill demand
              </li>

              <li>
                Discover institutional skill gaps
              </li>
            </ul>

            <span className="role-continue">
              Continue as College →
            </span>
          </button>

          {/* FACULTY */}

          <button
            type="button"
            className="role-card"
            onClick={() =>
              selectRole("faculty")
            }
            disabled={loading}
          >
            <div className="role-icon">
              👩‍🏫
            </div>

            <h2>
              Academician / Faculty
            </h2>

            <p>
              Connect with industry for professional
              development, research and academic
              collaboration.
            </p>

            <ul>
              <li>
                Discover faculty development programs
              </li>

              <li>
                Explore research and consultancy
              </li>

              <li>
                Join industry collaborations
              </li>
            </ul>

            <span className="role-continue">
              Continue as Faculty →
            </span>
          </button>
        </div>

        {/* =========================
            LOADING
        ========================= */}

        {loading && (
          <div className="role-message">
            <div className="role-spinner"></div>

            <p>
              Setting up your account...
            </p>
          </div>
        )}

        {/* =========================
            ERROR
        ========================= */}

        {error && (
          <p className="role-error">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

export default RoleSelection;