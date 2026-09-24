import { useEffect, useMemo, useState } from "react";

import { supabase } from "../../services/supabase";
import { useAuth } from "../../hooks/useAuth";
import "./InternshipTracking.css";

function InternshipTracking() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [company, setCompany] = useState(null);
  const [records, setRecords] = useState([]);

  /* =========================
     LOAD INTERNSHIPS
  ========================= */

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    let cancelled = false;

    async function loadInternships() {
      try {
        setLoading(true);
        setError("");

        /* =========================
           1. FIND RECRUITER COMPANY
        ========================= */

        const {
          data: recruiterProfile,
          error: recruiterError,
        } = await supabase
          .from("recruiter_profiles")
          .select("company_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (recruiterError) {
          throw recruiterError;
        }

        if (!recruiterProfile?.company_id) {
          if (!cancelled) {
            setError(
              "Your recruiter account is not connected to a company."
            );
            setRecords([]);
          }

          return;
        }

        const companyId = recruiterProfile.company_id;

        /* =========================
           2. LOAD COMPANY
        ========================= */

        const {
          data: companyData,
          error: companyError,
        } = await supabase
          .from("companies")
          .select("*")
          .eq("id", companyId)
          .maybeSingle();

        if (companyError) {
          throw companyError;
        }

        if (!cancelled) {
          setCompany(companyData);
        }

        /* =========================
           3. LOAD COMPANY OPPORTUNITIES
        ========================= */

        const {
          data: opportunityData,
          error: opportunityError,
        } = await supabase
          .from("opportunities")
          .select("id, title, status, company_id")
          .eq("company_id", companyId);

        if (opportunityError) {
          throw opportunityError;
        }

        const opportunities = opportunityData || [];

        if (opportunities.length === 0) {
          if (!cancelled) {
            setRecords([]);
          }

          return;
        }

        const opportunityIds = opportunities.map(
          (opportunity) => opportunity.id
        );

        /* =========================
           4. LOAD SELECTED APPLICATIONS
        ========================= */

        const {
          data: applicationData,
          error: applicationError,
        } = await supabase
          .from("applications")
          .select(
            `
            id,
            student_id,
            opportunity_id,
            status,
            match_score_at_apply,
            applied_at,
            updated_at
          `
          )
          .in("opportunity_id", opportunityIds)
          .eq("status", "selected");

        if (applicationError) {
          throw applicationError;
        }

        const selectedApplications =
          applicationData || [];

        if (selectedApplications.length === 0) {
          if (!cancelled) {
            setRecords([]);
          }

          return;
        }

        const applicationIds =
          selectedApplications.map(
            (application) => application.id
          );

        /*
         * applications.student_id points to student_profiles.id,
         * not directly to profiles.id / auth user id.
         */
        const studentProfileIds = [
          ...new Set(
            selectedApplications
              .map(
                (application) =>
                  application.student_id
              )
              .filter(Boolean)
          ),
        ];

        /* =========================
           5. LOAD PROGRESS RECORDS
        ========================= */

        const {
          data: progressData,
          error: progressError,
        } = await supabase
          .from("internship_progress")
          .select("*")
          .in("application_id", applicationIds);

        if (progressError) {
          throw progressError;
        }

        /* =========================
           6. LOAD STUDENT PROFILES
        ========================= */

        let studentProfiles = [];

        if (studentProfileIds.length > 0) {
          const {
            data: studentData,
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
            .in("id", studentProfileIds);

          if (studentError) {
            throw studentError;
          }

          studentProfiles = studentData || [];
        }

        /* =========================
           7. LOAD PUBLIC PROFILE DATA
        ========================= */

        const profileUserIds = [
          ...new Set(
            studentProfiles
              .map((studentProfile) => studentProfile.user_id)
              .filter(Boolean)
          ),
        ];

        let profileRows = [];

        if (profileUserIds.length > 0) {
          const {
            data: profileData,
            error: profileError,
          } = await supabase
            .from("profiles")
            .select("id, full_name, email")
            .in("id", profileUserIds);

          if (profileError) {
            console.warn(
              "Could not load profile names:",
              profileError
            );
          } else {
            profileRows = profileData || [];
          }
        }

        /* =========================
           8. COMBINE EVERYTHING
        ========================= */

        const combinedRecords =
          selectedApplications.map((application) => {
            const opportunity =
              opportunities.find(
                (item) =>
                  item.id ===
                  application.opportunity_id
              ) || null;

            const progress =
              (progressData || []).find(
                (item) =>
                  item.application_id ===
                  application.id
              ) || null;

            const studentProfile =
              studentProfiles.find(
                (item) =>
                  item.id ===
                  application.student_id
              ) || null;

            const profile =
              profileRows.find(
                (item) =>
                  item.id ===
                  studentProfile?.user_id
              ) || null;

            return {
              application,
              opportunity,
              studentProfile,
              profile,
              progress,
            };
          });

        if (!cancelled) {
          setRecords(combinedRecords);
        }
      } catch (err) {
        console.error(
          "Internship tracking error:",
          err
        );

        if (!cancelled) {
          setError(
            err?.message ||
              "Could not load internship tracking."
          );
        }
      } finally {
        if (!cancelled) {
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
     SUMMARY
  ========================= */

  const summary = useMemo(() => {
    const total = records.length;

    const ongoing = records.filter(
      ({ progress }) =>
        progress?.current_status === "ongoing"
    ).length;

    const completed = records.filter(
      ({ progress }) =>
        progress?.current_status === "completed"
    ).length;

    const averageProgress =
      total > 0
        ? Math.round(
            records.reduce(
              (sum, item) =>
                sum +
                Number(
                  item.progress
                    ?.progress_percentage || 0
                ),
              0
            ) / total
          )
        : 0;

    return {
      total,
      ongoing,
      completed,
      averageProgress,
    };
  }, [records]);

  /* =========================
     LOCAL FORM UPDATE
  ========================= */

  function updateLocalProgress(
    applicationId,
    field,
    value
  ) {
    setSuccess("");

    setRecords((current) =>
      current.map((item) => {
        if (
          item.application.id !== applicationId
        ) {
          return item;
        }

        return {
          ...item,
          progress: {
            ...(item.progress || {}),
            application_id: applicationId,
            [field]: value,
          },
        };
      })
    );
  }

  /* =========================
     HELPERS
  ========================= */

  function getStudentName(item) {
    return (
      item.profile?.full_name?.trim() ||
      item.profile?.email ||
      item.application.student_id ||
      "Student"
    );
  }

  function getStudentEmail(item) {
    return item.profile?.email || "";
  }

  function formatDate(value) {
    if (!value) {
      return "Not recorded";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Not recorded";
    }

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function formatStatus(value) {
    if (!value) {
      return "Not started";
    }

    return value
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );
  }

  function companyName() {
    return (
      company?.name ||
      company?.company_name ||
      "Your company"
    );
  }

  /* =========================
     SAVE PROGRESS
  ========================= */

  async function saveProgress(item) {
    const applicationId = item.application.id;

    try {
      setSavingId(applicationId);
      setError("");
      setSuccess("");

      let progressPercentage = Math.max(
        0,
        Math.min(
          100,
          Number(
            item.progress?.progress_percentage || 0
          )
        )
      );

      const currentStatus =
        item.progress?.current_status ||
        "not_started";

      const completionStatus =
        item.progress?.completion_status ||
        "pending";

      let startedAt =
        item.progress?.started_at || null;

      let completedAt =
        item.progress?.completed_at || null;

      if (
        currentStatus === "ongoing" &&
        !startedAt
      ) {
        startedAt = new Date().toISOString();
      }

      if (currentStatus === "completed") {
        progressPercentage = 100;

        if (!startedAt) {
          startedAt = new Date().toISOString();
        }

        if (!completedAt) {
          completedAt = new Date().toISOString();
        }
      } else {
        completedAt = null;
      }

      const payload = {
        application_id: applicationId,
        progress_percentage:
          progressPercentage,
        current_status: currentStatus,
        mentor_name:
          item.progress?.mentor_name?.trim() ||
          null,
        mentor_feedback:
          item.progress?.mentor_feedback?.trim() ||
          null,
        completion_status:
          completionStatus,
        started_at: startedAt,
        completed_at: completedAt,
        updated_at: new Date().toISOString(),
      };

      let result;

      if (item.progress?.id) {
        result = await supabase
          .from("internship_progress")
          .update(payload)
          .eq("id", item.progress.id)
          .select()
          .single();
      } else {
        result = await supabase
          .from("internship_progress")
          .insert(payload)
          .select()
          .single();
      }

      if (result.error) {
        throw result.error;
      }

      const savedProgress = result.data;

      setRecords((current) =>
        current.map((record) =>
          record.application.id ===
          applicationId
            ? {
                ...record,
                progress: savedProgress,
              }
            : record
        )
      );

      setSuccess(
        `Progress for ${getStudentName(
          item
        )} saved successfully.`
      );
    } catch (err) {
      console.error(
        "Save internship progress error:",
        err
      );

      setError(
        err?.message ||
          "Could not save internship progress."
      );
    } finally {
      setSavingId(null);
    }
  }

  /* =========================
     LOADING
  ========================= */

  if (loading) {
    return (
      <div className="internship-state">
        Loading internship records...
      </div>
    );
  }

  return (
    <div className="internship-page">
      {/* =========================
          HERO
      ========================= */}

      <section className="internship-hero">
        <p className="internship-kicker">
          // POST-SELECTION TRACKING
        </p>

        <h1>
          Internship <span>Progress</span>
        </h1>

        <p>
          Track selected students, monitor
          internship progress and maintain mentor
          feedback and completion records.
        </p>

        <div className="internship-company">
          <span>COMPANY</span>
          <strong>{companyName()}</strong>
        </div>
      </section>

      {/* =========================
          MESSAGES
      ========================= */}

      {error && (
        <div className="internship-message error">
          {error}
        </div>
      )}

      {success && (
        <div className="internship-message success">
          {success}
        </div>
      )}

      {/* =========================
          SUMMARY
      ========================= */}

      <section className="internship-summary">
        <article>
          <span>Selected students</span>
          <strong>{summary.total}</strong>
          <p>Students currently being tracked</p>
        </article>

        <article>
          <span>Ongoing</span>
          <strong>{summary.ongoing}</strong>
          <p>Active internship records</p>
        </article>

        <article>
          <span>Completed</span>
          <strong>{summary.completed}</strong>
          <p>Completed internships</p>
        </article>

        <article>
          <span>Average progress</span>
          <strong>
            {summary.averageProgress}%
          </strong>
          <p>Across selected students</p>
        </article>
      </section>

      {/* =========================
          RECORDS
      ========================= */}

      {records.length === 0 ? (
        <section className="internship-empty">
          <div className="internship-empty-icon">
            ◇
          </div>

          <h2>No selected students yet</h2>

          <p>
            Once a candidate is selected, their
            internship can be tracked here.
          </p>
        </section>
      ) : (
        <section className="internship-record-list">
          {records.map((item) => {
            const progress = item.progress || {};

            const percentage = Math.max(
              0,
              Math.min(
                100,
                Number(
                  progress.progress_percentage ||
                    0
                )
              )
            );

            return (
              <article
                className="internship-record"
                key={item.application.id}
              >
                {/* HEADER */}

                <div className="internship-record-header">
                  <div className="internship-student">
                    <div className="internship-avatar">
                      {getStudentName(item)
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div>
                      <div className="internship-student-top">
                        <h2>
                          {getStudentName(item)}
                        </h2>

                        <span
                          className={`internship-status-pill ${
                            progress.current_status ||
                            "not_started"
                          }`}
                        >
                          {formatStatus(
                            progress.current_status
                          )}
                        </span>
                      </div>

                      {getStudentEmail(item) && (
                        <p>
                          {getStudentEmail(item)}
                        </p>
                      )}

                      <span className="internship-opportunity">
                        {item.opportunity?.title ||
                          "Opportunity"}
                      </span>
                    </div>
                  </div>

                  <div className="internship-progress-number">
                    <span>// PROGRESS</span>
                    <strong>{percentage}%</strong>
                  </div>
                </div>

                {/* PROGRESS BAR */}

                <div className="internship-progress-track">
                  <div
                    className="internship-progress-fill"
                    style={{
                      width: `${percentage}%`,
                    }}
                  />
                </div>

                {/* STUDENT DETAILS */}

                <div className="internship-student-meta">
                  <div>
                    <span>Degree</span>
                    <strong>
                      {item.studentProfile?.degree ||
                        "—"}
                    </strong>
                  </div>

                  <div>
                    <span>Year</span>
                    <strong>
                      {item.studentProfile
                        ?.current_year
                        ? `Year ${item.studentProfile.current_year}`
                        : "—"}
                    </strong>
                  </div>

                  <div>
                    <span>Semester</span>
                    <strong>
                      {item.studentProfile
                        ?.current_semester
                        ? `Semester ${item.studentProfile.current_semester}`
                        : "—"}
                    </strong>
                  </div>

                  <div>
                    <span>Started</span>
                    <strong>
                      {formatDate(
                        progress.started_at
                      )}
                    </strong>
                  </div>
                </div>

                {/* EDITING AREA */}

                <div className="internship-edit-grid">
                  <div className="internship-field">
                    <label>
                      Progress percentage
                    </label>

                    <div className="internship-progress-input">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={percentage}
                        onChange={(event) =>
                          updateLocalProgress(
                            item.application.id,
                            "progress_percentage",
                            Number(
                              event.target.value
                            )
                          )
                        }
                      />

                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={percentage}
                        onChange={(event) =>
                          updateLocalProgress(
                            item.application.id,
                            "progress_percentage",
                            Number(
                              event.target.value
                            )
                          )
                        }
                      />

                      <span>%</span>
                    </div>
                  </div>

                  <div className="internship-field">
                    <label>
                      Internship status
                    </label>

                    <select
                      value={
                        progress.current_status ||
                        "not_started"
                      }
                      onChange={(event) =>
                        updateLocalProgress(
                          item.application.id,
                          "current_status",
                          event.target.value
                        )
                      }
                    >
                      <option value="not_started">
                        Not started
                      </option>

                      <option value="ongoing">
                        Ongoing
                      </option>

                      <option value="paused">
                        Paused
                      </option>

                      <option value="completed">
                        Completed
                      </option>
                    </select>
                  </div>

                  <div className="internship-field">
                    <label>Mentor name</label>

                    <input
                      type="text"
                      placeholder="Enter mentor name"
                      value={
                        progress.mentor_name || ""
                      }
                      onChange={(event) =>
                        updateLocalProgress(
                          item.application.id,
                          "mentor_name",
                          event.target.value
                        )
                      }
                    />
                  </div>

                  <div className="internship-field">
                    <label>
                      Completion status
                    </label>

                    <select
                      value={
                        progress.completion_status ||
                        "pending"
                      }
                      onChange={(event) =>
                        updateLocalProgress(
                          item.application.id,
                          "completion_status",
                          event.target.value
                        )
                      }
                    >
                      <option value="pending">
                        Pending
                      </option>

                      <option value="successful">
                        Successful
                      </option>

                      <option value="incomplete">
                        Incomplete
                      </option>
                    </select>
                  </div>

                  <div className="internship-field internship-wide-field">
                    <label>Mentor feedback</label>

                    <textarea
                      rows="4"
                      placeholder="Add mentor feedback, performance notes or areas for improvement..."
                      value={
                        progress.mentor_feedback ||
                        ""
                      }
                      onChange={(event) =>
                        updateLocalProgress(
                          item.application.id,
                          "mentor_feedback",
                          event.target.value
                        )
                      }
                    />
                  </div>

                  <div className="internship-field internship-wide-field">
                    <label>
                      Latest student update
                    </label>

                    <div className="internship-student-update">
                      {progress.student_update?.trim()
                        ? progress.student_update
                        : "The student has not submitted a progress update yet."}
                    </div>
                  </div>
                </div>

                {/* FOOTER */}

                <div className="internship-record-footer">
                  <div>
                    <span>
                      Completion:{" "}
                      <strong>
                        {formatStatus(
                          progress.completion_status ||
                            "pending"
                        )}
                      </strong>
                    </span>

                    <span>
                      Completed:{" "}
                      <strong>
                        {formatDate(
                          progress.completed_at
                        )}
                      </strong>
                    </span>
                  </div>

                  <button
                    type="button"
                    className="internship-save-button"
                    disabled={
                      savingId ===
                      item.application.id
                    }
                    onClick={() =>
                      saveProgress(item)
                    }
                  >
                    {savingId ===
                    item.application.id
                      ? "Saving..."
                      : "Save progress"}
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}

export default InternshipTracking;