import { useEffect, useMemo, useState } from "react";

import { supabase } from "../../services/supabase";
import { useAuth } from "../../hooks/useAuth";
import "./Students.css";

function Students() {
  const { user } = useAuth();

  const [students, setStudents] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [verifyingId, setVerifyingId] = useState(null);
  const [actionMessage, setActionMessage] = useState("");

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    async function loadStudents() {
      try {
        setLoading(true);
        setError("");

        /* =========================
           1. FIND LOGGED-IN
              INSTITUTION MEMBER
        ========================= */

        const { data: memberData, error: memberError } =
          await supabase
            .from("institution_members")
            .select("institution_id")
            .eq("user_id", user.id)
            .single();

        if (memberError) {
          throw memberError;
        }

        const currentInstitutionId = memberData.institution_id;

        /* =========================
           2. LOAD DEPARTMENTS
        ========================= */

        const { data: departmentData, error: departmentError } =
          await supabase
            .from("departments")
            .select("id, name, code")
            .eq("institution_id", currentInstitutionId)
            .order("name", {
              ascending: true,
            });

        if (departmentError) {
          throw departmentError;
        }

        /* =========================
           3. LOAD STUDENT PROFILES
        ========================= */

        const { data: studentData, error: studentError } =
          await supabase
            .from("student_profiles")
            .select(
              `
                id,
                user_id,
                institution_id,
                department_id,
                degree,
                current_year,
                current_semester,
                graduation_year,
                location,
                profile_completion,
                phone,
                cgpa,
                college_email,
                student_id,
                verification_status,
                verified_at,
                created_at
              `
            )
            .eq("institution_id", currentInstitutionId)
            .order("created_at", {
              ascending: false,
            });

        if (studentError) {
          throw studentError;
        }

        const loadedStudents = studentData || [];

        /* =========================
           4. LOAD GENERAL PROFILES
        ========================= */

        const userIds = loadedStudents
          .map((student) => student.user_id)
          .filter(Boolean);

        let profileMap = {};

        if (userIds.length > 0) {
          const { data: profileData, error: profileError } =
            await supabase
              .from("profiles")
              .select("*")
              .in("id", userIds);

          if (profileError) {
            throw profileError;
          }

          profileMap = (profileData || []).reduce(
            (map, profile) => {
              map[profile.id] = profile;
              return map;
            },
            {}
          );
        }

        /* =========================
           5. BUILD DEPARTMENT MAP
        ========================= */

        const departmentMap = (departmentData || []).reduce(
          (map, department) => {
            map[department.id] = department;
            return map;
          },
          {}
        );

        /* =========================
           6. COMBINE DATA
        ========================= */

        const combinedStudents = loadedStudents.map((student) => ({
          ...student,
          profile: profileMap[student.user_id] || null,
          department:
            departmentMap[student.department_id] || null,
        }));

        if (!cancelled) {
          setDepartments(departmentData || []);
          setStudents(combinedStudents);
        }
      } catch (err) {
        console.error("College students loading error:", err);

        if (!cancelled) {
          setError(
            err?.message ||
              "Unable to load institution students."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadStudents();

    return () => {
      cancelled = true;
    };
  }, [user]);

  /* =========================
     VERIFY STUDENT
  ========================= */

  async function verifyStudent(student) {
    if (!student?.id) return;

    const confirmed = window.confirm(
      `Verify ${getStudentName(student)} as a student of your institution?`
    );

    if (!confirmed) return;

    try {
      setVerifyingId(student.id);
      setActionMessage("");

      const verifiedTime = new Date().toISOString();

      const { data, error: updateError } = await supabase
        .from("student_profiles")
        .update({
          verification_status: "verified",
          verified_at: verifiedTime,
        })
        .eq("id", student.id)
        .select("id, verification_status, verified_at")
        .single();

      if (updateError) {
        throw updateError;
      }

      setStudents((currentStudents) =>
        currentStudents.map((currentStudent) =>
          currentStudent.id === student.id
            ? {
                ...currentStudent,
                verification_status:
                  data.verification_status,
                verified_at: data.verified_at,
              }
            : currentStudent
        )
      );

      setActionMessage(
        `${getStudentName(student)} has been verified successfully.`
      );
    } catch (err) {
      console.error("Student verification error:", err);

      setActionMessage(
        err?.message || "Unable to verify student."
      );
    } finally {
      setVerifyingId(null);
    }
  }

  /* =========================
     HELPERS
  ========================= */

  function getStudentName(student) {
    const profile = student.profile || {};

    return (
      profile.full_name ||
      profile.name ||
      student.college_email ||
      `Student ${student.student_id || ""}`.trim() ||
      "Student"
    );
  }

  function getStudentEmail(student) {
    const profile = student.profile || {};

    return (
      student.college_email ||
      profile.email ||
      "No college email"
    );
  }

  function formatStatus(status) {
    if (!status) return "Pending";

    return (
      status.charAt(0).toUpperCase() +
      status.slice(1).toLowerCase()
    );
  }

  function formatVerifiedDate(date) {
    if (!date) return "";

    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  /* =========================
     FILTERED STUDENTS
  ========================= */

  const filteredStudents = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return students.filter((student) => {
      const name = getStudentName(student).toLowerCase();
      const email = getStudentEmail(student).toLowerCase();

      const studentId = String(
        student.student_id || ""
      ).toLowerCase();

      const departmentName = String(
        student.department?.name || ""
      ).toLowerCase();

      const departmentCode = String(
        student.department?.code || ""
      ).toLowerCase();

      const matchesSearch =
        !search ||
        name.includes(search) ||
        email.includes(search) ||
        studentId.includes(search) ||
        departmentName.includes(search) ||
        departmentCode.includes(search);

      const matchesDepartment =
        departmentFilter === "all" ||
        student.department_id === departmentFilter;

      return matchesSearch && matchesDepartment;
    });
  }, [students, searchTerm, departmentFilter]);

  /* =========================
     STATS
  ========================= */

  const verifiedCount = students.filter(
    (student) =>
      student.verification_status?.toLowerCase() ===
      "verified"
  ).length;

  const pendingCount = students.filter(
    (student) =>
      !student.verification_status ||
      student.verification_status.toLowerCase() ===
        "pending"
  ).length;

  const averageCgpaStudents = students.filter(
    (student) =>
      student.cgpa !== null &&
      student.cgpa !== undefined &&
      !Number.isNaN(Number(student.cgpa))
  );

  const averageCgpa =
    averageCgpaStudents.length > 0
      ? (
          averageCgpaStudents.reduce(
            (total, student) =>
              total + Number(student.cgpa),
            0
          ) / averageCgpaStudents.length
        ).toFixed(2)
      : "—";

  /* =========================
     LOADING
  ========================= */

  if (loading) {
    return (
      <div className="college-students-page">
        <div className="college-students-state">
          Loading institution students...
        </div>
      </div>
    );
  }

  /* =========================
     ERROR
  ========================= */

  if (error) {
    return (
      <div className="college-students-page">
        <div className="college-students-state">
          <h3>Unable to load students</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="college-students-page">
      {/* =========================
          HEADER
      ========================= */}

      <section className="college-students-header">
        <span className="college-students-kicker">
          // institution monitoring
        </span>

        <h1>Students</h1>

        <p>
          Monitor student academic profiles, verification
          status and institutional readiness from one
          workspace.
        </p>
      </section>

      {/* =========================
          OVERVIEW
      ========================= */}

      <section className="college-students-overview">
        <article className="college-students-stat">
          <span>Total students</span>
          <strong>{students.length}</strong>
          <p>
            Students currently linked to your institution.
          </p>
        </article>

        <article className="college-students-stat">
          <span>Verified</span>
          <strong>{verifiedCount}</strong>
          <p>
            Student profiles verified by the institution.
          </p>
        </article>

        <article className="college-students-stat">
          <span>Pending verification</span>
          <strong>{pendingCount}</strong>
          <p>
            Student records still awaiting verification.
          </p>
        </article>

        <article className="college-students-stat">
          <span>Average CGPA</span>
          <strong>{averageCgpa}</strong>
          <p>
            Average across students with CGPA information.
          </p>
        </article>
      </section>

      {/* =========================
          ACTION MESSAGE
      ========================= */}

      {actionMessage && (
        <div
          style={{
            marginBottom: "20px",
            padding: "13px 16px",
            border: "1px solid #d9ccec",
            borderRadius: "9px",
            background: "#f7f3fc",
            color: "#62408d",
            fontSize: "13px",
          }}
        >
          {actionMessage}
        </div>
      )}

      {/* =========================
          DIRECTORY
      ========================= */}

      <section className="college-students-directory">
        <div className="college-students-section-heading">
          <div>
            <span className="college-students-kicker">
              // student directory
            </span>

            <h2>Institution students</h2>
          </div>

          <span className="college-students-count">
            {filteredStudents.length} shown
          </span>
        </div>

        {/* FILTERS */}

        <div className="college-students-filters">
          <div className="college-students-search">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-4-4" />
            </svg>

            <input
              type="text"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
              placeholder="Search student, email, ID or department..."
            />
          </div>

          <select
            value={departmentFilter}
            onChange={(event) =>
              setDepartmentFilter(event.target.value)
            }
          >
            <option value="all">All departments</option>

            {departments.map((department) => (
              <option
                key={department.id}
                value={department.id}
              >
                {department.code
                  ? `${department.code} — ${department.name}`
                  : department.name}
              </option>
            ))}
          </select>
        </div>

        {/* =========================
            EMPTY STATE
        ========================= */}

        {students.length === 0 ? (
          <div className="college-students-empty">
            <span>01</span>

            <div>
              <h3>No students linked yet</h3>

              <p>
                Students will appear here when their
                SkillBridge profile is associated with this
                institution.
              </p>
            </div>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="college-students-empty">
            <span>02</span>

            <div>
              <h3>No matching students</h3>

              <p>
                Try changing your search term or department
                filter.
              </p>
            </div>
          </div>
        ) : (
          <div className="college-students-list">
            {filteredStudents.map((student) => {
              const name = getStudentName(student);

              const verificationStatus =
                student.verification_status || "pending";

              const isVerified =
                verificationStatus.toLowerCase() ===
                "verified";

              const isVerifying =
                verifyingId === student.id;

              return (
                <article
                  className="college-student-card"
                  key={student.id}
                >
                  {/* STUDENT HEADER */}

                  <div className="college-student-card-main">
                    <div className="college-student-avatar">
                      {name.charAt(0).toUpperCase()}
                    </div>

                    <div className="college-student-identity">
                      <div className="college-student-name-row">
                        <h3>{name}</h3>

                        <span
                          className={`college-student-status ${verificationStatus.toLowerCase()}`}
                        >
                          {formatStatus(
                            verificationStatus
                          )}
                        </span>
                      </div>

                      <p>{getStudentEmail(student)}</p>

                      <div className="college-student-tags">
                        {student.department && (
                          <span>
                            {student.department.code ||
                              student.department.name}
                          </span>
                        )}

                        {student.degree && (
                          <span>{student.degree}</span>
                        )}

                        {student.current_semester && (
                          <span>
                            Semester{" "}
                            {student.current_semester}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* VERIFICATION ACTION */}

                    <div
                      style={{
                        marginLeft: "auto",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-end",
                        gap: "7px",
                      }}
                    >
                      {!isVerified ? (
                        <button
                          type="button"
                          onClick={() =>
                            verifyStudent(student)
                          }
                          disabled={isVerifying}
                          style={{
                            border: "none",
                            borderRadius: "8px",
                            padding: "10px 16px",
                            background: isVerifying
                              ? "#aaa"
                              : "#171717",
                            color: "#fff",
                            fontSize: "12px",
                            fontWeight: "600",
                            cursor: isVerifying
                              ? "not-allowed"
                              : "pointer",
                          }}
                        >
                          {isVerifying
                            ? "Verifying..."
                            : "Verify student"}
                        </button>
                      ) : (
                        <>
                          <span
                            style={{
                              fontSize: "12px",
                              fontWeight: "600",
                              color: "#2f7657",
                            }}
                          >
                            ✓ Institution verified
                          </span>

                          {student.verified_at && (
                            <span
                              style={{
                                fontSize: "10px",
                                color: "#888",
                              }}
                            >
                              {formatVerifiedDate(
                                student.verified_at
                              )}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* STUDENT INFORMATION */}

                  <div className="college-student-details">
                    <div>
                      <span>Student ID</span>
                      <strong>
                        {student.student_id || "—"}
                      </strong>
                    </div>

                    <div>
                      <span>CGPA</span>
                      <strong>
                        {student.cgpa !== null &&
                        student.cgpa !== undefined
                          ? Number(
                              student.cgpa
                            ).toFixed(2)
                          : "—"}
                      </strong>
                    </div>

                    <div>
                      <span>Year</span>
                      <strong>
                        {student.current_year || "—"}
                      </strong>
                    </div>

                    <div>
                      <span>Graduation</span>
                      <strong>
                        {student.graduation_year || "—"}
                      </strong>
                    </div>

                    <div>
                      <span>Profile</span>
                      <strong>
                        {Number(
                          student.profile_completion || 0
                        )}
                        %
                      </strong>
                    </div>
                  </div>

                  {/* PROFILE COMPLETION */}

                  <div className="college-student-progress">
                    <div
                      style={{
                        width: `${Math.min(
                          Math.max(
                            Number(
                              student.profile_completion ||
                                0
                            ),
                            0
                          ),
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default Students;