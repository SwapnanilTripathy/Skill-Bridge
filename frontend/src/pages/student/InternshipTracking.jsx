import { useEffect, useState } from "react";

import { supabase } from "../../services/supabase";
import { useAuth } from "../../hooks/useAuth";

import "./InternshipTracking.css";

function InternshipTracking() {
  const { user } = useAuth();

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* =========================
     LOAD INTERNSHIP DATA
  ========================= */

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    let cancelled = false;

    async function loadInternships() {
      try {
        setLoading(true);

        /* =========================
           STUDENT PROFILE
        ========================= */

        const {
          data: studentProfile,
          error: studentError,
        } = await supabase
          .from("student_profiles")
          .select(
            `
            id,
            user_id,
            degree,
            current_year,
            current_semester,
            graduation_year,
            student_id
          `
          )
          .eq("user_id", user.id)
          .maybeSingle();

        if (studentError) {
          throw studentError;
        }

        if (!studentProfile) {
          if (!cancelled) {
            setRecords([]);
            setLoading(false);
          }

          return;
        }

        /* =========================
           SELECTED APPLICATIONS
        ========================= */

        const {
          data: applications,
          error: applicationError,
        } = await supabase
          .from("applications")
          .select(
            `
            id,
            student_id,
            opportunity_id,
            status,
            applied_at
          `
          )
          .eq("student_id", studentProfile.id)
          .eq("status", "selected");

        if (applicationError) {
          throw applicationError;
        }

        const selectedApplications =
          applications || [];

        if (selectedApplications.length === 0) {
          if (!cancelled) {
            setRecords([]);
            setError("");
            setLoading(false);
          }

          return;
        }

        const applicationIds =
          selectedApplications.map(
            (application) => application.id
          );

        const opportunityIds = [
          ...new Set(
            selectedApplications
              .map(
                (application) =>
                  application.opportunity_id
              )
              .filter(Boolean)
          ),
        ];

        /* =========================
           INTERNSHIP PROGRESS
        ========================= */

        const {
          data: progressRows,
          error: progressError,
        } = await supabase
          .from("internship_progress")
          .select("*")
          .in("application_id", applicationIds);

        if (progressError) {
          throw progressError;
        }

        /* =========================
           OPPORTUNITIES

           IMPORTANT:
           opportunity_type was removed
           because that column does not
           exist in the opportunities table.
        ========================= */

        let opportunities = [];

        if (opportunityIds.length > 0) {
          const {
            data: opportunityData,
            error: opportunityError,
          } = await supabase
            .from("opportunities")
            .select(
              `
              id,
              company_id,
              title,
              description,
              location
            `
            )
            .in("id", opportunityIds);

          if (opportunityError) {
            throw opportunityError;
          }

          opportunities =
            opportunityData || [];
        }

        /* =========================
           COMPANIES
        ========================= */

        const companyIds = [
          ...new Set(
            opportunities
              .map(
                (opportunity) =>
                  opportunity.company_id
              )
              .filter(Boolean)
          ),
        ];

        let companies = [];

        if (companyIds.length > 0) {
          const {
            data: companyData,
            error: companyError,
          } = await supabase
            .from("companies")
            .select("id, name")
            .in("id", companyIds);

          if (companyError) {
            console.warn(
              "Could not load company names:",
              companyError
            );
          } else {
            companies =
              companyData || [];
          }
        }

        /* =========================
           COMBINE EVERYTHING
        ========================= */

        const combinedRecords =
          selectedApplications
            .map((application) => {
              const progress = (
                progressRows || []
              ).find(
                (item) =>
                  item.application_id ===
                  application.id
              );

              /*
               Only show selected applications
               that actually have an
               internship_progress record.
              */

              if (!progress) {
                return null;
              }

              const opportunity =
                opportunities.find(
                  (item) =>
                    item.id ===
                    application.opportunity_id
                ) || null;

              const company =
                companies.find(
                  (item) =>
                    item.id ===
                    opportunity?.company_id
                ) || null;

              return {
                ...progress,

                application,

                opportunity,

                company,

                studentProfile,

                draftStudentUpdate:
                  progress.student_update || "",
              };
            })
            .filter(Boolean);

        if (!cancelled) {
          setRecords(combinedRecords);
          setError("");
          setLoading(false);
        }
      } catch (err) {
        console.error(
          "Student internship tracking error:",
          err
        );

        if (!cancelled) {
          setError(
            err?.message ||
              "Could not load your internship records."
          );

          setLoading(false);
        }
      }
    }

    loadInternships();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  /* =========================
     STUDENT UPDATE INPUT
  ========================= */

  function handleUpdateChange(
    recordId,
    value
  ) {
    setRecords((currentRecords) =>
      currentRecords.map((record) =>
        record.id === recordId
          ? {
              ...record,
              draftStudentUpdate: value,
            }
          : record
      )
    );

    if (success) {
      setSuccess("");
    }
  }

  /* =========================
     SAVE STUDENT UPDATE
  ========================= */

  async function saveStudentUpdate(record) {
    try {
      setSavingId(record.id);
      setError("");
      setSuccess("");

      const updateText =
        record.draftStudentUpdate?.trim() ||
        null;

      const { error: updateError } =
        await supabase
          .from("internship_progress")
          .update({
            student_update: updateText,
          })
          .eq("id", record.id);

      if (updateError) {
        throw updateError;
      }

      setRecords((currentRecords) =>
        currentRecords.map((currentRecord) =>
          currentRecord.id === record.id
            ? {
                ...currentRecord,

                student_update:
                  updateText,

                draftStudentUpdate:
                  updateText || "",
              }
            : currentRecord
        )
      );

      setSuccess(
        "Your internship update was saved successfully."
      );
    } catch (err) {
      console.error(
        "Student progress update error:",
        err
      );

      setError(
        err?.message ||
          "Could not save your internship update."
      );
    } finally {
      setSavingId(null);
    }
  }

  /* =========================
     HELPERS
  ========================= */

  function formatStatus(value) {
    if (!value) {
      return "Not specified";
    }

    return value
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );
  }

  function formatDate(value) {
    if (!value) {
      return "—";
    }

    return new Date(
      value
    ).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function getProgress(record) {
    const value = Number(
      record.progress_percentage || 0
    );

    return Math.min(
      100,
      Math.max(0, value)
    );
  }

  /* =========================
     AUTH LOADING
  ========================= */

  if (!user?.id) {
    return (
      <div className="student-internship-page">
        <div className="student-internship-state">
          Loading your account...
        </div>
      </div>
    );
  }

  /* =========================
     DATA LOADING
  ========================= */

  if (loading) {
    return (
      <div className="student-internship-page">
        <div className="student-internship-state">
          Loading your internship progress...
        </div>
      </div>
    );
  }

  /* =========================
     CALCULATIONS
  ========================= */

  const ongoingCount = records.filter(
    (record) =>
      record.current_status === "ongoing"
  ).length;

  const completedCount = records.filter(
    (record) =>
      record.current_status ===
        "completed" ||
      record.completion_status ===
        "completed"
  ).length;

  const averageProgress =
    records.length > 0
      ? Math.round(
          records.reduce(
            (sum, record) =>
              sum + getProgress(record),
            0
          ) / records.length
        )
      : 0;

  return (
    <div className="student-internship-page">
      {/* =========================
          HEADER
      ========================= */}

      <section className="student-internship-hero">
        <p className="student-internship-kicker">
          // INDUSTRY EXPERIENCE
        </p>

        <h1>
          My Internship{" "}
          <span>Progress</span>
        </h1>

        <p className="student-internship-subtitle">
          Follow your internship journey,
          review mentor feedback and keep
          your industry mentor updated on
          your progress.
        </p>
      </section>

      {/* =========================
          MESSAGES
      ========================= */}

      {error && (
        <div className="student-internship-message error">
          {error}
        </div>
      )}

      {success && (
        <div className="student-internship-message success">
          {success}
        </div>
      )}

      {/* =========================
          SUMMARY
      ========================= */}

      <section className="student-internship-summary">
        <div className="student-internship-stat">
          <span>Internships</span>

          <strong>
            {records.length}
          </strong>

          <small>
            Selected internship records
          </small>
        </div>

        <div className="student-internship-stat">
          <span>Ongoing</span>

          <strong>
            {ongoingCount}
          </strong>

          <small>
            Currently active
          </small>
        </div>

        <div className="student-internship-stat">
          <span>Completed</span>

          <strong>
            {completedCount}
          </strong>

          <small>
            Completed internships
          </small>
        </div>

        <div className="student-internship-stat">
          <span>
            Average progress
          </span>

          <strong>
            {averageProgress}%
          </strong>

          <small>
            Across your internships
          </small>
        </div>
      </section>

      {/* =========================
          EMPTY STATE
      ========================= */}

      {records.length === 0 &&
        !error && (
          <section className="student-internship-empty">
            <span>◎</span>

            <h2>
              No internship tracking yet
            </h2>

            <p>
              Once you are selected for an
              internship and your recruiter
              starts tracking it, the
              progress record will appear
              here.
            </p>
          </section>
        )}

      {/* =========================
          INTERNSHIP CARDS
      ========================= */}

      <section className="student-internship-list">
        {records.map((record) => {
          const progress =
            getProgress(record);

          return (
            <article
              className="student-internship-card"
              key={record.id}
            >
              {/* CARD HEADER */}

              <div className="student-internship-card-head">
                <div>
                  <p className="student-internship-label">
                    // CURRENT INTERNSHIP
                  </p>

                  <h2>
                    {record.opportunity
                      ?.title ||
                      "Internship"}
                  </h2>

                  <p className="student-internship-company">
                    {record.company
                      ?.name ||
                      "Industry partner"}
                  </p>
                </div>

                <div className="student-internship-progress-number">
                  <span>
                    // PROGRESS
                  </span>

                  <strong>
                    {progress}%
                  </strong>
                </div>
              </div>

              {/* PROGRESS BAR */}

              <div className="student-internship-progress-track">
                <div
                  className="student-internship-progress-fill"
                  style={{
                    width: `${progress}%`,
                  }}
                />
              </div>

              {/* META INFORMATION */}

              <div className="student-internship-meta">
                <div>
                  <span>Status</span>

                  <strong>
                    {formatStatus(
                      record.current_status
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Completion
                  </span>

                  <strong>
                    {formatStatus(
                      record.completion_status
                    )}
                  </strong>
                </div>

                <div>
                  <span>Mentor</span>

                  <strong>
                    {record.mentor_name ||
                      "Not assigned"}
                  </strong>
                </div>

                <div>
                  <span>Started</span>

                  <strong>
                    {formatDate(
                      record.started_at ||
                        record.created_at
                    )}
                  </strong>
                </div>
              </div>

              {/* =========================
                  DETAILS
              ========================= */}

              <div className="student-internship-body">
                {/* MENTOR FEEDBACK */}

                <section className="student-internship-panel">
                  <p className="student-internship-label">
                    // MENTOR FEEDBACK
                  </p>

                  <h3>
                    Feedback from industry
                  </h3>

                  {record.mentor_feedback ? (
                    <p className="student-internship-feedback">
                      {
                        record.mentor_feedback
                      }
                    </p>
                  ) : (
                    <p className="student-internship-muted">
                      Your mentor has not
                      added feedback yet.
                    </p>
                  )}
                </section>

                {/* STUDENT UPDATE */}

                <section className="student-internship-panel">
                  <p className="student-internship-label">
                    // YOUR UPDATE
                  </p>

                  <h3>
                    Progress update
                  </h3>

                  <p className="student-internship-help">
                    Share what you have
                    worked on, learned or
                    completed during your
                    internship.
                  </p>

                  <textarea
                    value={
                      record.draftStudentUpdate
                    }
                    onChange={(event) =>
                      handleUpdateChange(
                        record.id,
                        event.target.value
                      )
                    }
                    placeholder="Example: Completed onboarding and started working on the assigned frontend module..."
                    rows="6"
                  />

                  <button
                    type="button"
                    className="student-internship-save"
                    disabled={
                      savingId ===
                      record.id
                    }
                    onClick={() =>
                      saveStudentUpdate(
                        record
                      )
                    }
                  >
                    {savingId ===
                    record.id
                      ? "Saving..."
                      : "Save progress update"}
                  </button>
                </section>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}

export default InternshipTracking;