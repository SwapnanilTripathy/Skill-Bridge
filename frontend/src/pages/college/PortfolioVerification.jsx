import { useEffect, useState } from "react";

import { supabase } from "../../services/supabase";
import { useAuth } from "../../hooks/useAuth";

import "./PortfolioVerification.css";

function PortfolioVerification() {
  const { user } = useAuth();

  const [certifications, setCertifications] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [studentMap, setStudentMap] = useState({});

  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [filter, setFilter] = useState("all");

  /* =========================================================
     LOAD PORTFOLIO VERIFICATION DATA
  ========================================================= */

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    let cancelled = false;

    async function loadVerificationData() {
      try {
        setLoading(true);
        setError("");

        /* -----------------------------------------
           GET LOGGED-IN COLLEGE'S INSTITUTION
        ----------------------------------------- */

        const { data: memberData, error: memberError } =
          await supabase
            .from("institution_members")
            .select("institution_id")
            .eq("user_id", user.id)
            .maybeSingle();

        if (memberError) {
          throw memberError;
        }

        if (!memberData?.institution_id) {
          throw new Error(
            "Institution membership could not be found."
          );
        }

        /* -----------------------------------------
           LOAD STUDENTS FROM SAME INSTITUTION
        ----------------------------------------- */

        const { data: studentRows, error: studentsError } =
          await supabase
            .from("student_profiles")
            .select(
              `
                id,
                user_id,
                student_id,
                degree,
                current_year,
                department_id,
                verification_status
              `
            )
            .eq(
              "institution_id",
              memberData.institution_id
            );

        if (studentsError) {
          throw studentsError;
        }

        const students = studentRows || [];

        const studentIds = students.map(
          (student) => student.id
        );

        if (studentIds.length === 0) {
          if (!cancelled) {
            setStudentMap({});
            setCertifications([]);
            setAchievements([]);
          }

          return;
        }

        /* -----------------------------------------
           LOAD STUDENT PROFILE NAMES
        ----------------------------------------- */

        const userIds = students
          .map((student) => student.user_id)
          .filter(Boolean);

        let profileMap = {};

        if (userIds.length > 0) {
          const {
            data: profileRows,
            error: profileError,
          } = await supabase
            .from("profiles")
            .select("id, full_name, email")
            .in("id", userIds);

          if (profileError) {
            console.warn(
              "Could not load profile names:",
              profileError
            );
          } else {
            profileMap = Object.fromEntries(
              (profileRows || []).map((profile) => [
                profile.id,
                profile,
              ])
            );
          }
        }

        /* -----------------------------------------
           LOAD DEPARTMENTS
        ----------------------------------------- */

        const departmentIds = [
          ...new Set(
            students
              .map(
                (student) => student.department_id
              )
              .filter(Boolean)
          ),
        ];

        let departmentMap = {};

        if (departmentIds.length > 0) {
          const {
            data: departmentRows,
            error: departmentError,
          } = await supabase
            .from("departments")
            .select("id, name")
            .in("id", departmentIds);

          if (departmentError) {
            console.warn(
              "Could not load departments:",
              departmentError
            );
          } else {
            departmentMap = Object.fromEntries(
              (departmentRows || []).map(
                (department) => [
                  department.id,
                  department.name,
                ]
              )
            );
          }
        }

        /* -----------------------------------------
           CREATE STUDENT LOOKUP MAP
        ----------------------------------------- */

        const combinedStudentMap =
          Object.fromEntries(
            students.map((student) => {
              const profile =
                profileMap[student.user_id] || {};

              return [
                student.id,
                {
                  ...student,

                  name:
                    profile.full_name ||
                    profile.email ||
                    student.student_id ||
                    "Student",

                  email: profile.email || "",

                  department:
                    departmentMap[
                      student.department_id
                    ] || "Not specified",
                },
              ];
            })
          );

        /* -----------------------------------------
           LOAD CERTIFICATIONS
        ----------------------------------------- */

        const {
          data: certificationRows,
          error: certificationError,
        } = await supabase
          .from("certifications")
          .select("*")
          .in("student_id", studentIds)
          .order("created_at", {
            ascending: false,
          });

        if (certificationError) {
          throw certificationError;
        }

        /* -----------------------------------------
           LOAD ACHIEVEMENTS
        ----------------------------------------- */

        const {
          data: achievementRows,
          error: achievementError,
        } = await supabase
          .from("achievements")
          .select("*")
          .in("student_id", studentIds)
          .order("created_at", {
            ascending: false,
          });

        if (achievementError) {
          throw achievementError;
        }

        /* -----------------------------------------
           UPDATE STATE
        ----------------------------------------- */

        if (!cancelled) {
          setStudentMap(combinedStudentMap);
          setCertifications(
            certificationRows || []
          );
          setAchievements(
            achievementRows || []
          );
        }
      } catch (err) {
        console.error(
          "Portfolio verification loading error:",
          err
        );

        if (!cancelled) {
          setError(
            err?.message ||
              "Could not load student portfolio records."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadVerificationData();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  /* =========================================================
     SUCCESS MESSAGE
  ========================================================= */

  function showSuccess(message) {
    setSuccess(message);

    window.setTimeout(() => {
      setSuccess("");
    }, 3000);
  }

  /* =========================================================
     VERIFY / REMOVE VERIFICATION
  ========================================================= */

  async function updateVerification(
    table,
    recordId,
    verified
  ) {
    try {
      setUpdatingId(recordId);
      setError("");

      const { error: updateError } = await supabase
        .from(table)
        .update({
          verified,
        })
        .eq("id", recordId);

      if (updateError) {
        throw updateError;
      }

      if (table === "certifications") {
        setCertifications((current) =>
          current.map((item) =>
            item.id === recordId
              ? {
                  ...item,
                  verified,
                }
              : item
          )
        );
      }

      if (table === "achievements") {
        setAchievements((current) =>
          current.map((item) =>
            item.id === recordId
              ? {
                  ...item,
                  verified,
                }
              : item
          )
        );
      }

      showSuccess(
        verified
          ? "Portfolio record institution verified."
          : "Institution verification removed."
      );
    } catch (err) {
      console.error(
        "Portfolio verification update error:",
        err
      );

      setError(
        err?.message ||
          "Could not update verification status."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  /* =========================================================
     HELPERS
  ========================================================= */

  function formatDate(value) {
    if (!value) {
      return "Not specified";
    }

    const date = new Date(`${value}T00:00:00`);

    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function displayType(value) {
    if (!value) {
      return "Achievement";
    }

    return value
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );
  }

  /* =========================================================
     COUNTS
  ========================================================= */

  const allRecords = [
    ...certifications.map((item) => ({
      ...item,
      recordType: "certification",
    })),

    ...achievements.map((item) => ({
      ...item,
      recordType: "achievement",
    })),
  ];

  const verifiedCount = allRecords.filter(
    (item) => item.verified
  ).length;

  const selfReportedCount =
    allRecords.length - verifiedCount;

  /* =========================================================
     FILTERING
  ========================================================= */

  const displayedCertifications =
    filter === "verified"
      ? certifications.filter(
          (item) => item.verified
        )
      : filter === "self-reported"
        ? certifications.filter(
            (item) => !item.verified
          )
        : certifications;

  const displayedAchievements =
    filter === "verified"
      ? achievements.filter(
          (item) => item.verified
        )
      : filter === "self-reported"
        ? achievements.filter(
            (item) => !item.verified
          )
        : achievements;

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <div className="portfolio-verification-state">
        Loading student portfolio records...
      </div>
    );
  }

  /* =========================================================
     PAGE
  ========================================================= */

  return (
    <div className="portfolio-verification-page">
      {/* =========================
          HEADER
      ========================= */}

      <section className="portfolio-verification-hero">
        <div>
          <span className="verification-kicker">
            // PORTFOLIO TRUST LAYER
          </span>

          <h1>
            Portfolio
            <span> verification.</span>
          </h1>

          <p>
            Review evidence submitted by students and
            optionally add institutional verification.
            Self-reported credentials remain part of the
            student's portfolio even when they are not
            institution verified.
          </p>
        </div>
      </section>

      {/* =========================
          MESSAGES
      ========================= */}

      {error && (
        <div className="verification-alert error">
          {error}
        </div>
      )}

      {success && (
        <div className="verification-alert success">
          {success}
        </div>
      )}

      {/* =========================
          SUMMARY
      ========================= */}

      <section className="verification-stats">
        <article>
          <span>Total records</span>
          <strong>{allRecords.length}</strong>
          <p>Student portfolio credentials</p>
        </article>

        <article>
          <span>Self reported</span>
          <strong>{selfReportedCount}</strong>
          <p>Not institution verified</p>
        </article>

        <article>
          <span>Institution verified</span>
          <strong>{verifiedCount}</strong>
          <p>Evidence reviewed</p>
        </article>

        <article>
          <span>Students represented</span>

          <strong>
            {
              new Set(
                allRecords.map(
                  (item) => item.student_id
                )
              ).size
            }
          </strong>

          <p>With portfolio credentials</p>
        </article>
      </section>

      {/* =========================
          FILTER
      ========================= */}

      <section className="verification-toolbar">
        <div>
          <strong>Portfolio records</strong>

          <span>
            Verification adds trust — it does not
            control whether a student may list an
            achievement or certification.
          </span>
        </div>

        <select
          value={filter}
          onChange={(event) =>
            setFilter(event.target.value)
          }
        >
          <option value="all">
            All records
          </option>

          <option value="self-reported">
            Self reported
          </option>

          <option value="verified">
            Institution verified
          </option>
        </select>
      </section>

      {/* =========================
          CERTIFICATIONS
      ========================= */}

      <section className="verification-section">
        <div className="verification-section-heading">
          <div>
            <span className="verification-kicker">
              // CERTIFICATIONS
            </span>

            <h2>Student certifications</h2>
          </div>

          <span>
            {displayedCertifications.length} records
          </span>
        </div>

        {displayedCertifications.length === 0 ? (
          <div className="verification-empty">
            <strong>
              No certifications in this view
            </strong>

            <p>
              Student certifications will appear here
              when they are added to their portfolios.
            </p>
          </div>
        ) : (
          <div className="verification-grid">
            {displayedCertifications.map(
              (certification) => {
                const student =
                  studentMap[
                    certification.student_id
                  ] || {};

                return (
                  <article
                    className="verification-card"
                    key={certification.id}
                  >
                    <div className="verification-card-top">
                      <span
                        className={
                          certification.verified
                            ? "verification-badge verified"
                            : "verification-badge self"
                        }
                      >
                        {certification.verified
                          ? "INSTITUTION VERIFIED"
                          : "SELF REPORTED"}
                      </span>

                      <span className="verification-record-type">
                        CERTIFICATION
                      </span>
                    </div>

                    <h3>
                      {certification.title}
                    </h3>

                    <strong className="verification-provider">
                      {
                        certification.issuing_organization
                      }
                    </strong>

                    <div className="verification-student">
                      <span>Student</span>

                      <strong>
                        {student.name || "Student"}
                      </strong>

                      {student.student_id && (
                        <small>
                          ID: {student.student_id}
                        </small>
                      )}

                      <small>
                        {student.department ||
                          "Department not specified"}
                      </small>
                    </div>

                    <div className="verification-details">
                      <div>
                        <span>Issued</span>

                        <strong>
                          {formatDate(
                            certification.issue_date
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>Credential ID</span>

                        <strong>
                          {certification.credential_id ||
                            "Not provided"}
                        </strong>
                      </div>
                    </div>

                    <div className="verification-links">
                      {certification.credential_url && (
                        <a
                          href={
                            certification.credential_url
                          }
                          target="_blank"
                          rel="noreferrer"
                        >
                          Check credential ↗
                        </a>
                      )}

                      {certification.certificate_url && (
                        <a
                          href={
                            certification.certificate_url
                          }
                          target="_blank"
                          rel="noreferrer"
                        >
                          View proof ↗
                        </a>
                      )}
                    </div>

                    <div className="verification-actions">
                      {!certification.verified ? (
                        <button
                          type="button"
                          className="verify-button"
                          disabled={
                            updatingId ===
                            certification.id
                          }
                          onClick={() =>
                            updateVerification(
                              "certifications",
                              certification.id,
                              true
                            )
                          }
                        >
                          {updatingId ===
                          certification.id
                            ? "Verifying..."
                            : "✓ Institution verify"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="remove-verification-button"
                          disabled={
                            updatingId ===
                            certification.id
                          }
                          onClick={() =>
                            updateVerification(
                              "certifications",
                              certification.id,
                              false
                            )
                          }
                        >
                          {updatingId ===
                          certification.id
                            ? "Updating..."
                            : "Remove verification"}
                        </button>
                      )}
                    </div>
                  </article>
                );
              }
            )}
          </div>
        )}
      </section>

      {/* =========================
          ACHIEVEMENTS
      ========================= */}

      <section className="verification-section">
        <div className="verification-section-heading">
          <div>
            <span className="verification-kicker">
              // ACHIEVEMENTS
            </span>

            <h2>Student achievements</h2>
          </div>

          <span>
            {displayedAchievements.length} records
          </span>
        </div>

        {displayedAchievements.length === 0 ? (
          <div className="verification-empty">
            <strong>
              No achievements in this view
            </strong>

            <p>
              Student achievements will appear here
              when they are added to their portfolios.
            </p>
          </div>
        ) : (
          <div className="verification-grid">
            {displayedAchievements.map(
              (achievement) => {
                const student =
                  studentMap[
                    achievement.student_id
                  ] || {};

                return (
                  <article
                    className="verification-card"
                    key={achievement.id}
                  >
                    <div className="verification-card-top">
                      <span
                        className={
                          achievement.verified
                            ? "verification-badge verified"
                            : "verification-badge self"
                        }
                      >
                        {achievement.verified
                          ? "INSTITUTION VERIFIED"
                          : "SELF REPORTED"}
                      </span>

                      <span className="verification-record-type">
                        {displayType(
                          achievement.achievement_type
                        )}
                      </span>
                    </div>

                    <h3>
                      {achievement.title}
                    </h3>

                    {achievement.organization && (
                      <strong className="verification-provider">
                        {achievement.organization}
                      </strong>
                    )}

                    <div className="verification-student">
                      <span>Student</span>

                      <strong>
                        {student.name || "Student"}
                      </strong>

                      {student.student_id && (
                        <small>
                          ID: {student.student_id}
                        </small>
                      )}

                      <small>
                        {student.department ||
                          "Department not specified"}
                      </small>
                    </div>

                    {achievement.description && (
                      <p className="verification-description">
                        {achievement.description}
                      </p>
                    )}

                    <div className="verification-details">
                      <div>
                        <span>Date</span>

                        <strong>
                          {formatDate(
                            achievement.achievement_date
                          )}
                        </strong>
                      </div>
                    </div>

                    <div className="verification-links">
                      {achievement.proof_url && (
                        <a
                          href={
                            achievement.proof_url
                          }
                          target="_blank"
                          rel="noreferrer"
                        >
                          View proof ↗
                        </a>
                      )}
                    </div>

                    <div className="verification-actions">
                      {!achievement.verified ? (
                        <button
                          type="button"
                          className="verify-button"
                          disabled={
                            updatingId ===
                            achievement.id
                          }
                          onClick={() =>
                            updateVerification(
                              "achievements",
                              achievement.id,
                              true
                            )
                          }
                        >
                          {updatingId ===
                          achievement.id
                            ? "Verifying..."
                            : "✓ Institution verify"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="remove-verification-button"
                          disabled={
                            updatingId ===
                            achievement.id
                          }
                          onClick={() =>
                            updateVerification(
                              "achievements",
                              achievement.id,
                              false
                            )
                          }
                        >
                          {updatingId ===
                          achievement.id
                            ? "Updating..."
                            : "Remove verification"}
                        </button>
                      )}
                    </div>
                  </article>
                );
              }
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export default PortfolioVerification;