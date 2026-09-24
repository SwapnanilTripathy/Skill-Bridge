import { useEffect, useMemo, useState } from "react";

import { useAuth } from "../../hooks/useAuth";
import { supabase } from "../../services/supabase";
import "./PlacementMonitoring.css";

function formatStatus(value) {
  if (!value) {
    return "Not available";
  }

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getStatusClass(status) {
  const normalized = status?.toLowerCase();

  if (normalized === "selected") {
    return "selected";
  }

  if (normalized === "shortlisted") {
    return "shortlisted";
  }

  if (normalized === "interview") {
    return "interview";
  }

  if (normalized === "rejected") {
    return "rejected";
  }

  if (normalized === "withdrawn") {
    return "withdrawn";
  }

  return "applied";
}

function getInternshipStatusClass(status) {
  const normalized = status?.toLowerCase();

  if (normalized === "completed") {
    return "completed";
  }

  if (normalized === "ongoing") {
    return "ongoing";
  }

  if (normalized === "paused") {
    return "paused";
  }

  return "not-started";
}

function PlacementMonitoring() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [institution, setInstitution] = useState(null);
  const [students, setStudents] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [applications, setApplications] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [internships, setInternships] = useState([]);

  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [applicationFilter, setApplicationFilter] = useState("all");

  useEffect(() => {
    async function loadPlacementMonitoring() {
      if (!user?.id) {
        return;
      }

      try {
        setLoading(true);
        setError("");

        /*
        ============================================================
        1. FIND THE COLLEGE USER'S INSTITUTION
        ============================================================
        */

        const { data: membershipData, error: membershipError } =
          await supabase
            .from("institution_members")
            .select("institution_id")
            .eq("user_id", user.id)
            .eq("is_verified", true)
            .limit(1)
            .maybeSingle();

        if (membershipError) {
          throw membershipError;
        }

        if (!membershipData?.institution_id) {
          throw new Error(
            "No verified institution membership was found for this account."
          );
        }

        const institutionId = membershipData.institution_id;

        /*
        ============================================================
        2. LOAD INSTITUTION
        ============================================================
        */

        const { data: institutionData, error: institutionError } =
          await supabase
            .from("institutions")
            .select("id, name")
            .eq("id", institutionId)
            .maybeSingle();

        if (institutionError) {
          throw institutionError;
        }

        setInstitution(institutionData || null);

        /*
        ============================================================
        3. LOAD DEPARTMENTS
        ============================================================
        */

        const { data: departmentData, error: departmentError } =
          await supabase
            .from("departments")
            .select("id, name")
            .eq("institution_id", institutionId)
            .order("name", { ascending: true });

        if (departmentError) {
          throw departmentError;
        }

        const safeDepartments = departmentData || [];
        setDepartments(safeDepartments);

        /*
        ============================================================
        4. LOAD STUDENTS FROM THIS INSTITUTION
        ============================================================
        */

        const { data: studentData, error: studentError } =
          await supabase
            .from("student_profiles")
            .select(
              `
              id,
              user_id,
              department_id,
              degree,
              current_year,
              graduation_year,
              cgpa,
              verification_status
            `
            )
            .eq("institution_id", institutionId);

        if (studentError) {
          throw studentError;
        }

        const safeStudents = studentData || [];
        setStudents(safeStudents);

        if (safeStudents.length === 0) {
          setProfiles([]);
          setApplications([]);
          setOpportunities([]);
          setCompanies([]);
          setInternships([]);
          return;
        }

        /*
        ============================================================
        5. LOAD PROFILE NAMES / EMAILS
        ============================================================
        */

        const userIds = [
          ...new Set(
            safeStudents
              .map((student) => student.user_id)
              .filter(Boolean)
          ),
        ];

        let profileData = [];

        if (userIds.length > 0) {
          const { data, error: profileError } = await supabase
            .from("profiles")
            .select("id, full_name, email")
            .in("id", userIds);

          if (profileError) {
            throw profileError;
          }

          profileData = data || [];
        }

        setProfiles(profileData);

        /*
        ============================================================
        6. LOAD APPLICATIONS
        College RLS restricts this to students from this institution.
        ============================================================
        */

        const studentIds = safeStudents.map((student) => student.id);

        const { data: applicationData, error: applicationError } =
          await supabase
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
            .in("student_id", studentIds)
            .order("applied_at", { ascending: false });

        if (applicationError) {
          throw applicationError;
        }

        const safeApplications = applicationData || [];
        setApplications(safeApplications);

        /*
        ============================================================
        7. LOAD OPPORTUNITIES USED BY THOSE APPLICATIONS
        ============================================================
        */

        const opportunityIds = [
          ...new Set(
            safeApplications
              .map((application) => application.opportunity_id)
              .filter(Boolean)
          ),
        ];

        let opportunityData = [];

        if (opportunityIds.length > 0) {
          const { data, error: opportunityError } = await supabase
            .from("opportunities")
            .select(
              `
              id,
              company_id,
              title,
              type,
              location,
              work_mode,
              status
            `
            )
            .in("id", opportunityIds);

          if (opportunityError) {
            throw opportunityError;
          }

          opportunityData = data || [];
        }

        setOpportunities(opportunityData);

        /*
        ============================================================
        8. LOAD COMPANIES
        ============================================================
        */

        const companyIds = [
          ...new Set(
            opportunityData
              .map((opportunity) => opportunity.company_id)
              .filter(Boolean)
          ),
        ];

        let companyData = [];

        if (companyIds.length > 0) {
          const { data, error: companyError } = await supabase
            .from("companies")
            .select("id, name")
            .in("id", companyIds);

          if (companyError) {
            throw companyError;
          }

          companyData = data || [];
        }

        setCompanies(companyData);

        /*
        ============================================================
        9. LOAD INTERNSHIP PROGRESS
        internship_progress connects through application_id.
        ============================================================
        */

        const applicationIds = safeApplications.map(
          (application) => application.id
        );

        let internshipData = [];

        if (applicationIds.length > 0) {
          const { data, error: internshipError } = await supabase
            .from("internship_progress")
            .select(
              `
              id,
              application_id,
              progress_percentage,
              current_status,
              student_update,
              mentor_name,
              mentor_feedback,
              completion_status,
              started_at,
              completed_at,
              created_at
            `
            )
            .in("application_id", applicationIds)
            .order("created_at", { ascending: false });

          if (internshipError) {
            throw internshipError;
          }

          internshipData = data || [];
        }

        setInternships(internshipData);
      } catch (loadError) {
        console.error(
          "Unable to load placement monitoring:",
          loadError
        );

        setError(
          loadError?.message ||
            "Unable to load placement and internship monitoring."
        );
      } finally {
        setLoading(false);
      }
    }

    loadPlacementMonitoring();
  }, [user?.id]);

  /*
  ============================================================
  LOOKUP MAPS
  ============================================================
  */

  const profileMap = useMemo(() => {
    return new Map(
      profiles.map((profile) => [profile.id, profile])
    );
  }, [profiles]);

  const departmentMap = useMemo(() => {
    return new Map(
      departments.map((department) => [
        department.id,
        department,
      ])
    );
  }, [departments]);

  const studentMap = useMemo(() => {
    return new Map(
      students.map((student) => [student.id, student])
    );
  }, [students]);

  const opportunityMap = useMemo(() => {
    return new Map(
      opportunities.map((opportunity) => [
        opportunity.id,
        opportunity,
      ])
    );
  }, [opportunities]);

  const companyMap = useMemo(() => {
    return new Map(
      companies.map((company) => [company.id, company])
    );
  }, [companies]);

  const applicationMap = useMemo(() => {
    return new Map(
      applications.map((application) => [
        application.id,
        application,
      ])
    );
  }, [applications]);

  /*
  ============================================================
  FILTERED STUDENTS
  ============================================================
  */

  const filteredStudentIds = useMemo(() => {
    if (departmentFilter === "all") {
      return new Set(students.map((student) => student.id));
    }

    return new Set(
      students
        .filter(
          (student) =>
            student.department_id === departmentFilter
        )
        .map((student) => student.id)
    );
  }, [students, departmentFilter]);

  /*
  ============================================================
  FILTERED APPLICATIONS
  ============================================================
  */

  const filteredApplications = useMemo(() => {
    return applications.filter((application) => {
      const belongsToDepartment =
        filteredStudentIds.has(application.student_id);

      const matchesStatus =
        applicationFilter === "all" ||
        application.status === applicationFilter;

      return belongsToDepartment && matchesStatus;
    });
  }, [
    applications,
    filteredStudentIds,
    applicationFilter,
  ]);

  /*
  ============================================================
  FILTERED INTERNSHIPS
  ============================================================
  */

  const filteredInternships = useMemo(() => {
    return internships.filter((internship) => {
      const application = applicationMap.get(
        internship.application_id
      );

      if (!application) {
        return false;
      }

      return filteredStudentIds.has(application.student_id);
    });
  }, [
    internships,
    applicationMap,
    filteredStudentIds,
  ]);

  /*
  ============================================================
  SUMMARY METRICS
  ============================================================
  */

  const summary = useMemo(() => {
    const departmentStudents = students.filter((student) =>
      filteredStudentIds.has(student.id)
    );

    const departmentApplications = applications.filter(
      (application) =>
        filteredStudentIds.has(application.student_id)
    );

    const selectedApplications =
      departmentApplications.filter(
        (application) =>
          application.status === "selected"
      );

    const activeInternships = filteredInternships.filter(
      (internship) =>
        internship.current_status === "ongoing"
    );

    const completedInternships = filteredInternships.filter(
      (internship) =>
        internship.current_status === "completed" ||
        internship.completion_status === "successful"
    );

    const participatingStudentIds = new Set(
      departmentApplications.map(
        (application) => application.student_id
      )
    );

    const participationRate =
      departmentStudents.length > 0
        ? Math.round(
            (participatingStudentIds.size /
              departmentStudents.length) *
              100
          )
        : 0;

    return {
      students: departmentStudents.length,
      applications: departmentApplications.length,
      selected: selectedApplications.length,
      activeInternships: activeInternships.length,
      completedInternships: completedInternships.length,
      participationRate,
    };
  }, [
    students,
    applications,
    filteredStudentIds,
    filteredInternships,
  ]);

  /*
  ============================================================
  PIPELINE
  ============================================================
  */

  const pipeline = useMemo(() => {
    const departmentApplications = applications.filter(
      (application) =>
        filteredStudentIds.has(application.student_id)
    );

    return {
      applied: departmentApplications.filter(
        (application) =>
          application.status === "applied"
      ).length,

      shortlisted: departmentApplications.filter(
        (application) =>
          application.status === "shortlisted"
      ).length,

      interview: departmentApplications.filter(
        (application) =>
          application.status === "interview"
      ).length,

      selected: departmentApplications.filter(
        (application) =>
          application.status === "selected"
      ).length,

      rejected: departmentApplications.filter(
        (application) =>
          application.status === "rejected"
      ).length,
    };
  }, [
    applications,
    filteredStudentIds,
  ]);

  /*
  ============================================================
  DEPARTMENT PERFORMANCE
  ============================================================
  */

  const departmentPerformance = useMemo(() => {
    return departments.map((department) => {
      const departmentStudents = students.filter(
        (student) =>
          student.department_id === department.id
      );

      const departmentStudentIds = new Set(
        departmentStudents.map((student) => student.id)
      );

      const departmentApplications = applications.filter(
        (application) =>
          departmentStudentIds.has(application.student_id)
      );

      const selectedApplications =
        departmentApplications.filter(
          (application) =>
            application.status === "selected"
        );

      const participatingStudents = new Set(
        departmentApplications.map(
          (application) => application.student_id
        )
      );

      const participationRate =
        departmentStudents.length > 0
          ? Math.round(
              (participatingStudents.size /
                departmentStudents.length) *
                100
            )
          : 0;

      return {
        id: department.id,
        name: department.name,
        students: departmentStudents.length,
        applications: departmentApplications.length,
        selected: selectedApplications.length,
        participationRate,
      };
    });
  }, [
    departments,
    students,
    applications,
  ]);

  /*
  ============================================================
  APPLICATION DISPLAY RECORDS
  ============================================================
  */

  const applicationRecords = useMemo(() => {
    return filteredApplications.map((application) => {
      const student = studentMap.get(
        application.student_id
      );

      const profile = student
        ? profileMap.get(student.user_id)
        : null;

      const department = student
        ? departmentMap.get(student.department_id)
        : null;

      const opportunity = opportunityMap.get(
        application.opportunity_id
      );

      const company = opportunity
        ? companyMap.get(opportunity.company_id)
        : null;

      return {
        ...application,
        studentName:
          profile?.full_name || "Student",
        studentEmail:
          profile?.email || "—",
        departmentName:
          department?.name || "Not assigned",
        opportunityTitle:
          opportunity?.title || "Opportunity",
        opportunityType:
          opportunity?.type || "—",
        companyName:
          company?.name || "Company",
        location:
          opportunity?.location || "—",
        workMode:
          opportunity?.work_mode || "—",
      };
    });
  }, [
    filteredApplications,
    studentMap,
    profileMap,
    departmentMap,
    opportunityMap,
    companyMap,
  ]);

  /*
  ============================================================
  INTERNSHIP DISPLAY RECORDS
  ============================================================
  */

  const internshipRecords = useMemo(() => {
    return filteredInternships.map((internship) => {
      const application = applicationMap.get(
        internship.application_id
      );

      const student = application
        ? studentMap.get(application.student_id)
        : null;

      const profile = student
        ? profileMap.get(student.user_id)
        : null;

      const department = student
        ? departmentMap.get(student.department_id)
        : null;

      const opportunity = application
        ? opportunityMap.get(
            application.opportunity_id
          )
        : null;

      const company = opportunity
        ? companyMap.get(opportunity.company_id)
        : null;

      return {
        ...internship,
        studentName:
          profile?.full_name || "Student",
        departmentName:
          department?.name || "Not assigned",
        opportunityTitle:
          opportunity?.title || "Internship",
        companyName:
          company?.name || "Company",
      };
    });
  }, [
    filteredInternships,
    applicationMap,
    studentMap,
    profileMap,
    departmentMap,
    opportunityMap,
    companyMap,
  ]);

  /*
  ============================================================
  LOADING
  ============================================================
  */

  if (loading) {
    return (
      <section className="placement-monitoring-page">
        <div className="placement-state-card">
          <span className="placement-state-kicker">
            // placement intelligence
          </span>

          <h2>Loading placement monitoring...</h2>

          <p>
            SkillBridge is collecting application and
            internship activity for your institution.
          </p>
        </div>
      </section>
    );
  }

  /*
  ============================================================
  ERROR
  ============================================================
  */

  if (error) {
    return (
      <section className="placement-monitoring-page">
        <div className="placement-state-card placement-error-card">
          <span className="placement-state-kicker">
            // unable to load
          </span>

          <h2>
            Placement monitoring could not be loaded
          </h2>

          <p>{error}</p>
        </div>
      </section>
    );
  }

  /*
  ============================================================
  PAGE
  ============================================================
  */

  return (
    <section className="placement-monitoring-page">
      {/* =====================================================
          HERO
      ===================================================== */}

      <div className="placement-hero">
        <div className="placement-hero-copy">
          <span className="placement-eyebrow">
            // institution outcomes
          </span>

          <h1>
            Placement & Internship
            <br />
            Monitoring
          </h1>

          <p>
            Track student participation, recruitment
            progress and internship outcomes across your
            institution using live SkillBridge activity.
          </p>
        </div>

        <div className="placement-hero-stat">
          <strong>
            {summary.participationRate}%
          </strong>

          <span>
            PARTICIPATION
          </span>
        </div>
      </div>

      {/* =====================================================
          INSTITUTION / FILTER
      ===================================================== */}

      <div className="placement-toolbar">
        <div>
          <span className="placement-toolbar-label">
            Institution
          </span>

          <strong>
            {institution?.name ||
              "Your institution"}
          </strong>
        </div>

        <label className="placement-filter">
          <span>Department</span>

          <select
            value={departmentFilter}
            onChange={(event) =>
              setDepartmentFilter(
                event.target.value
              )
            }
          >
            <option value="all">
              All departments
            </option>

            {departments.map((department) => (
              <option
                key={department.id}
                value={department.id}
              >
                {department.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* =====================================================
          SUMMARY
      ===================================================== */}

      <div className="placement-summary-grid">
        <div className="placement-summary-card">
          <span>REGISTERED STUDENTS</span>

          <strong>{summary.students}</strong>

          <p>
            Students in the selected institution scope
          </p>
        </div>

        <div className="placement-summary-card">
          <span>APPLICATIONS</span>

          <strong>
            {summary.applications}
          </strong>

          <p>
            Recruitment applications submitted
          </p>
        </div>

        <div className="placement-summary-card placement-summary-highlight">
          <span>SELECTED</span>

          <strong>
            {summary.selected}
          </strong>

          <p>
            Successful recruitment outcomes
          </p>
        </div>

        <div className="placement-summary-card">
          <span>ACTIVE INTERNSHIPS</span>

          <strong>
            {summary.activeInternships}
          </strong>

          <p>
            Internships currently in progress
          </p>
        </div>

        <div className="placement-summary-card">
          <span>COMPLETED</span>

          <strong>
            {summary.completedInternships}
          </strong>

          <p>
            Internship completion records
          </p>
        </div>
      </div>

      {/* =====================================================
          PIPELINE
      ===================================================== */}

      <div className="placement-section">
        <div className="placement-section-heading">
          <div>
            <span className="placement-eyebrow">
              // recruitment pipeline
            </span>

            <h2>
              Student recruitment progress
            </h2>
          </div>

          <span className="placement-section-count">
            {summary.applications} APPLICATIONS
          </span>
        </div>

        <div className="placement-pipeline">
          <div className="placement-pipeline-stage">
            <span>01</span>
            <strong>{pipeline.applied}</strong>
            <p>Applied</p>
          </div>

          <div className="placement-pipeline-line"></div>

          <div className="placement-pipeline-stage">
            <span>02</span>
            <strong>
              {pipeline.shortlisted}
            </strong>
            <p>Shortlisted</p>
          </div>

          <div className="placement-pipeline-line"></div>

          <div className="placement-pipeline-stage">
            <span>03</span>
            <strong>{pipeline.interview}</strong>
            <p>Interview</p>
          </div>

          <div className="placement-pipeline-line"></div>

          <div className="placement-pipeline-stage placement-pipeline-selected">
            <span>04</span>
            <strong>{pipeline.selected}</strong>
            <p>Selected</p>
          </div>
        </div>

        {pipeline.rejected > 0 && (
          <p className="placement-pipeline-note">
            {pipeline.rejected} application
            {pipeline.rejected === 1 ? "" : "s"} currently
            marked as rejected.
          </p>
        )}
      </div>

      {/* =====================================================
          DEPARTMENT PERFORMANCE
      ===================================================== */}

      <div className="placement-section">
        <div className="placement-section-heading">
          <div>
            <span className="placement-eyebrow">
              // department performance
            </span>

            <h2>
              Participation by department
            </h2>
          </div>
        </div>

        {departmentPerformance.length === 0 ? (
          <div className="placement-empty">
            No departments are currently available.
          </div>
        ) : (
          <div className="placement-table-wrap">
            <table className="placement-table">
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Students</th>
                  <th>Applications</th>
                  <th>Selected</th>
                  <th>Participation</th>
                </tr>
              </thead>

              <tbody>
                {departmentPerformance.map(
                  (department) => (
                    <tr key={department.id}>
                      <td>
                        <strong>
                          {department.name}
                        </strong>
                      </td>

                      <td>
                        {department.students}
                      </td>

                      <td>
                        {department.applications}
                      </td>

                      <td>
                        {department.selected}
                      </td>

                      <td>
                        <div className="placement-participation">
                          <div className="placement-participation-track">
                            <div
                              className="placement-participation-fill"
                              style={{
                                width: `${Math.min(
                                  100,
                                  department.participationRate
                                )}%`,
                              }}
                            ></div>
                          </div>

                          <strong>
                            {
                              department.participationRate
                            }
                            %
                          </strong>
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =====================================================
          APPLICATION ACTIVITY
      ===================================================== */}

      <div className="placement-section">
        <div className="placement-section-heading placement-activity-heading">
          <div>
            <span className="placement-eyebrow">
              // student activity
            </span>

            <h2>
              Recruitment applications
            </h2>
          </div>

          <label className="placement-filter placement-status-filter">
            <span>Status</span>

            <select
              value={applicationFilter}
              onChange={(event) =>
                setApplicationFilter(
                  event.target.value
                )
              }
            >
              <option value="all">
                All statuses
              </option>

              <option value="applied">
                Applied
              </option>

              <option value="shortlisted">
                Shortlisted
              </option>

              <option value="interview">
                Interview
              </option>

              <option value="selected">
                Selected
              </option>

              <option value="rejected">
                Rejected
              </option>

              <option value="withdrawn">
                Withdrawn
              </option>
            </select>
          </label>
        </div>

        {applicationRecords.length === 0 ? (
          <div className="placement-empty">
            No applications match the selected filters.
          </div>
        ) : (
          <div className="placement-application-list">
            {applicationRecords.map(
              (application, index) => (
                <article
                  key={application.id}
                  className="placement-application-card"
                >
                  <div className="placement-application-number">
                    {String(index + 1).padStart(
                      2,
                      "0"
                    )}
                  </div>

                  <div className="placement-application-main">
                    <div className="placement-application-top">
                      <div>
                        <span className="placement-card-label">
                          {
                            application.departmentName
                          }
                        </span>

                        <h3>
                          {application.studentName}
                        </h3>

                        <p>
                          {application.studentEmail}
                        </p>
                      </div>

                      <span
                        className={`placement-status-badge ${getStatusClass(
                          application.status
                        )}`}
                      >
                        {formatStatus(
                          application.status
                        )}
                      </span>
                    </div>

                    <div className="placement-application-opportunity">
                      <div>
                        <span>
                          OPPORTUNITY
                        </span>

                        <strong>
                          {
                            application.opportunityTitle
                          }
                        </strong>
                      </div>

                      <div>
                        <span>COMPANY</span>

                        <strong>
                          {application.companyName}
                        </strong>
                      </div>

                      <div>
                        <span>TYPE</span>

                        <strong>
                          {formatStatus(
                            application.opportunityType
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>APPLIED</span>

                        <strong>
                          {formatDate(
                            application.applied_at
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>MATCH AT APPLY</span>

                        <strong>
                          {application.match_score_at_apply ??
                            0}
                          %
                        </strong>
                      </div>
                    </div>
                  </div>
                </article>
              )
            )}
          </div>
        )}
      </div>

      {/* =====================================================
          INTERNSHIP MONITORING
      ===================================================== */}

      <div className="placement-section">
        <div className="placement-section-heading">
          <div>
            <span className="placement-eyebrow">
              // internship monitoring
            </span>

            <h2>
              Active & completed internships
            </h2>
          </div>

          <span className="placement-section-count">
            {internshipRecords.length} RECORD
            {internshipRecords.length === 1
              ? ""
              : "S"}
          </span>
        </div>

        {internshipRecords.length === 0 ? (
          <div className="placement-empty">
            No internship progress records are available
            for the selected department.
          </div>
        ) : (
          <div className="placement-internship-grid">
            {internshipRecords.map(
              (internship) => (
                <article
                  key={internship.id}
                  className="placement-internship-card"
                >
                  <div className="placement-internship-header">
                    <div>
                      <span className="placement-card-label">
                        {internship.departmentName}
                      </span>

                      <h3>
                        {internship.studentName}
                      </h3>

                      <p>
                        {
                          internship.opportunityTitle
                        }
                        {" · "}
                        {internship.companyName}
                      </p>
                    </div>

                    <span
                      className={`placement-internship-badge ${getInternshipStatusClass(
                        internship.current_status
                      )}`}
                    >
                      {formatStatus(
                        internship.current_status
                      )}
                    </span>
                  </div>

                  <div className="placement-progress-row">
                    <div>
                      <span>PROGRESS</span>

                      <strong>
                        {
                          internship.progress_percentage
                        }
                        %
                      </strong>
                    </div>

                    <div className="placement-progress-track">
                      <div
                        className="placement-progress-fill"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(
                              0,
                              internship.progress_percentage ||
                                0
                            )
                          )}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  <div className="placement-internship-details">
                    <div>
                      <span>MENTOR</span>

                      <strong>
                        {internship.mentor_name ||
                          "Not assigned"}
                      </strong>
                    </div>

                    <div>
                      <span>COMPLETION</span>

                      <strong>
                        {formatStatus(
                          internship.completion_status
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>STARTED</span>

                      <strong>
                        {formatDate(
                          internship.started_at
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>COMPLETED</span>

                      <strong>
                        {formatDate(
                          internship.completed_at
                        )}
                      </strong>
                    </div>
                  </div>

                  {(internship.student_update ||
                    internship.mentor_feedback) && (
                    <div className="placement-feedback-grid">
                      <div>
                        <span>
                          STUDENT UPDATE
                        </span>

                        <p>
                          {internship.student_update ||
                            "No update submitted yet."}
                        </p>
                      </div>

                      <div>
                        <span>
                          MENTOR FEEDBACK
                        </span>

                        <p>
                          {internship.mentor_feedback ||
                            "No mentor feedback yet."}
                        </p>
                      </div>
                    </div>
                  )}
                </article>
              )
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export default PlacementMonitoring;