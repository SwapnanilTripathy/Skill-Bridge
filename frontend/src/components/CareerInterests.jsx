import { useEffect, useState } from "react";

import { supabase } from "../services/supabase";
import { useAuth } from "../hooks/useAuth";

const CAREER_INTEREST_OPTIONS = [
  "Artificial Intelligence & Machine Learning",
  "Software Development",
  "Data Science & Analytics",
  "Cybersecurity",
  "Cloud & DevOps",
  "Web Development",
  "Mobile Development",
  "IoT & Embedded Systems",
  "Robotics & Automation",
  "Business & Product Technology",
];

function CareerInterests({ onInterestsChange }) {
  const { user } = useAuth();

  const [selectedInterests, setSelectedInterests] = useState([]);
  const [savedInterests, setSavedInterests] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  /* =========================================================
     LOAD EXISTING INTERESTS
  ========================================================= */

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    let cancelled = false;

    async function loadInterests() {
      try {
        setLoading(true);
        setError("");

        const {
          data,
          error: profileError,
        } = await supabase
          .from("student_profiles")
          .select("career_interests")
          .eq("user_id", user.id)
          .single();

        if (profileError) {
          throw profileError;
        }

        const interests =
          Array.isArray(data?.career_interests)
            ? data.career_interests
            : [];

        if (!cancelled) {
          setSelectedInterests(interests);
          setSavedInterests(interests);

          if (onInterestsChange) {
            onInterestsChange(interests);
          }
        }
      } catch (err) {
        console.error(
          "Career interests loading error:",
          err
        );

        if (!cancelled) {
          setError(
            err?.message ||
              "Unable to load your career interests."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadInterests();

    return () => {
      cancelled = true;
    };
  }, [user?.id, onInterestsChange]);

  /* =========================================================
     TOGGLE INTEREST
  ========================================================= */

  function toggleInterest(interest) {
    setMessage("");
    setError("");

    setSelectedInterests((current) => {
      if (current.includes(interest)) {
        return current.filter(
          (item) => item !== interest
        );
      }

      return [...current, interest];
    });
  }

  /* =========================================================
     CHECK WHETHER SELECTION HAS CHANGED
  ========================================================= */

  const hasChanges =
    JSON.stringify(
      [...selectedInterests].sort()
    ) !==
    JSON.stringify(
      [...savedInterests].sort()
    );

  /* =========================================================
     SAVE INTERESTS
  ========================================================= */

  async function saveInterests() {
    if (!user?.id) {
      return;
    }

    try {
      setSaving(true);
      setMessage("");
      setError("");

      const {
        error: updateError,
      } = await supabase
        .from("student_profiles")
        .update({
          career_interests: selectedInterests,
        })
        .eq("user_id", user.id);

      if (updateError) {
        throw updateError;
      }

      setSavedInterests(
        selectedInterests
      );

      setMessage(
        "Career interests saved. Your guidance has been personalized."
      );

      /*
       * IMPORTANT:
       * Tell CareerGuidance.jsx about the newly
       * saved interests.
       */
      if (onInterestsChange) {
        onInterestsChange(
          selectedInterests
        );
      }
    } catch (err) {
      console.error(
        "Career interests saving error:",
        err
      );

      setError(
        err?.message ||
          "Unable to save your career interests."
      );
    } finally {
      setSaving(false);
    }
  }

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <section className="career-interests-section">
        <span className="career-guidance-kicker">
          // YOUR INTERESTS
        </span>

        <p className="career-interests-loading">
          Loading your career interests...
        </p>
      </section>
    );
  }

  /* =========================================================
     PAGE
  ========================================================= */

  return (
    <section className="career-interests-section">
      <div className="career-interests-header">
        <div>
          <span className="career-guidance-kicker">
            // YOUR INTERESTS
          </span>

          <h2>
            What career areas interest you?
          </h2>

          <p>
            Select the areas you would like
            SkillBridge to consider while
            personalizing your career guidance.
          </p>
        </div>

        <div className="career-interests-count">
          <strong>
            {selectedInterests.length}
          </strong>

          <span>
            selected
          </span>
        </div>
      </div>

      {/* =====================================================
          INTEREST OPTIONS
      ===================================================== */}

      <div className="career-interest-options">
        {CAREER_INTEREST_OPTIONS.map(
          (interest) => {
            const selected =
              selectedInterests.includes(
                interest
              );

            return (
              <button
                type="button"
                key={interest}
                className={`career-interest-option ${
                  selected
                    ? "selected"
                    : ""
                }`}
                onClick={() =>
                  toggleInterest(
                    interest
                  )
                }
              >
                <span className="career-interest-check">
                  {selected
                    ? "✓"
                    : "+"}
                </span>

                <span>
                  {interest}
                </span>
              </button>
            );
          }
        )}
      </div>

      {/* =====================================================
          SAVE AREA
      ===================================================== */}

      <div className="career-interests-footer">
        <div className="career-interests-feedback">
          {message && (
            <span className="career-interests-success">
              {message}
            </span>
          )}

          {error && (
            <span className="career-interests-error">
              {error}
            </span>
          )}

          {!message &&
            !error &&
            hasChanges && (
              <span className="career-interests-pending">
                You have unsaved changes.
              </span>
            )}
        </div>

        <button
          type="button"
          className="career-save-interests-button"
          onClick={saveInterests}
          disabled={
            saving ||
            !hasChanges
          }
        >
          {saving
            ? "Saving..."
            : hasChanges
              ? "Save interests"
              : "Interests saved"}
        </button>
      </div>
    </section>
  );
}

export default CareerInterests;