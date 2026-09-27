import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { supabase } from "../../services/supabase";
import { useAuth } from "../../hooks/useAuth";

import "./FacultyOpportunities.css";

const TYPE_LABELS = {
  faculty_internship: "Faculty Internship",
  fdp: "Faculty Development Programme",
  industrial_training: "Industrial Training",
  research_collaboration: "Research Collaboration",
  consultancy: "Consultancy",
  mentorship: "Mentorship",
  guest_lecture: "Guest Lecture",
  live_industry_project: "Live Industry Project",
};

function FacultyOpportunities() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [company, setCompany] = useState(null);
  const [opportunities, setOpportunities] = useState([]);

  const [applications, setApplications] = useState([]);
  const [facultyProfiles, setFacultyProfiles] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [statusFilter, setStatusFilter] = useState("all");

  const [updatingApplicationId, setUpdatingApplicationId] =
    useState("");

  const [applicationError, setApplicationError] =
    useState("");

  /* =========================
     LOAD DATA
  ========================= */

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    let cancelled = false;

    async function loadFacultyOpportunities() {
      try {
        setLoading(true);
        setError("");
        setApplicationError("");

        /* =========================
           1. RECRUITER PROFILE
        ========================= */

        const {
          data: recruiterProfile,
          error: recruiterError,
        } = await supabase
          .from("recruiter_profiles")
          .select("company_id")
          .eq("user_id", user.id)
          .single();

        if (recruiterError) {
          throw recruiterError;
        }

        if (!recruiterProfile?.company_id) {
          throw new Error(
            "Complete your recruiter profile before managing faculty collaborations."
          );
        }

        /* =========================
           2. COMPANY
        ========================= */

        const {
          data: companyData,
          error: companyError,
        } = await supabase
          .from("companies")
          .select("id, name")
          .eq("id", recruiterProfile.company_id)
          .single();

        if (companyError) {
          throw companyError;
        }

        if (cancelled) return;

        setCompany(companyData);

        /* =========================
           3. FACULTY OPPORTUNITIES
        ========================= */

        const {
          data: opportunityData,
          error: opportunityError,
        } = await supabase
          .from("faculty_opportunities")
          .select(`
            id,
            company_id,
            title,
            description,
            opportunity_type,
            specialization,
            location,
            mode,
            start_date,
            end_date,
            application_deadline,
            status,
            created_at
          `)
          .eq(
            "company_id",
            recruiterProfile.company_id
          )
          .order("created_at", {
            ascending: false,
          });

        if (opportunityError) {
          throw opportunityError;
        }

        const opportunityRows =
          opportunityData || [];

        if (cancelled) return;

        setOpportunities(opportunityRows);

        const opportunityIds =
          opportunityRows.map(
            (opportunity) => opportunity.id
          );

        if (opportunityIds.length === 0) {
          setApplications([]);
          setFacultyProfiles([]);
          setProfiles([]);
          setInstitutions([]);
          setDepartments([]);
          return;
        }

        /* =========================
           4. FACULTY APPLICATIONS
        ========================= */

        const {
          data: applicationData,
          error: applicationLoadError,
        } = await supabase
          .from("faculty_applications")
          .select(`
            id,
            faculty_id,
            opportunity_id,
            statement,
            status,
            applied_at,
            updated_at
          `)
          .in(
            "opportunity_id",
            opportunityIds
          )
          .order("applied_at", {
            ascending: false,
          });

        if (applicationLoadError) {
          throw applicationLoadError;
        }

        const applicationRows =
          applicationData || [];

        if (cancelled) return;

        setApplications(applicationRows);

        if (applicationRows.length === 0) {
          setFacultyProfiles([]);
          setProfiles([]);
          setInstitutions([]);
          setDepartments([]);
          return;
        }

        /* =========================
           5. FACULTY PROFILES
        ========================= */

        const facultyIds = [
          ...new Set(
            applicationRows.map(
              (application) =>
                application.faculty_id
            )
          ),
        ];

        const {
          data: facultyData,
          error: facultyError,
        } = await supabase
          .from("faculty_profiles")
          .select(`
            id,
            user_id,
            institution_id,
            department_id,
            designation,
            specialization,
            years_experience,
            bio,
            linkedin_url,
            research_interests
          `)
          .in("id", facultyIds);

        if (facultyError) {
          throw facultyError;
        }

        const facultyRows =
          facultyData || [];

        console.log("FACULTY IDS:", facultyIds);
        console.log("FACULTY ROWS:", facultyRows);
        console.log("FACULTY ERROR:", facultyError);

        if (cancelled) return;

        setFacultyProfiles(facultyRows);

        /* =========================
           6. GENERAL PROFILES
        ========================= */

        const facultyUserIds = [
          ...new Set(
            facultyRows
              .map((faculty) => faculty.user_id)
              .filter(Boolean)
          ),
        ];

        if (facultyUserIds.length > 0) {
          const {
            data: profileData,
            error: profileError,
          } = await supabase
            .from("profiles")
            .select(`
              id,
              full_name,
              email,
              role,
              avatar_url
            `)
            .in("id", facultyUserIds);

          console.log("PROFILE ROWS:", profileData || []);
          console.log("PROFILE ERROR:", profileError);

          if (profileError) {
            throw profileError;
          }

          if (cancelled) return;

          setProfiles(profileData || []);
        } else {
          setProfiles([]);
        }

        /* =========================
           7. INSTITUTIONS
        ========================= */

        const institutionIds = [
          ...new Set(
            facultyRows
              .map(
                (faculty) =>
                  faculty.institution_id
              )
              .filter(Boolean)
          ),
        ];

        if (institutionIds.length > 0) {
          const {
            data: institutionData,
            error: institutionError,
          } = await supabase
            .from("institutions")
            .select("id, name")
            .in("id", institutionIds);

          if (institutionError) {
            throw institutionError;
          }

          if (cancelled) return;

          setInstitutions(
            institutionData || []
          );
        } else {
          setInstitutions([]);
        }

        /* =========================
           8. DEPARTMENTS
        ========================= */

        const departmentIds = [
          ...new Set(
            facultyRows
              .map(
                (faculty) =>
                  faculty.department_id
              )
              .filter(Boolean)
          ),
        ];

        if (departmentIds.length > 0) {
          const {
            data: departmentData,
            error: departmentError,
          } = await supabase
            .from("departments")
            .select(
              "id, institution_id, name, code"
            )
            .in("id", departmentIds);

          if (departmentError) {
            throw departmentError;
          }

          if (cancelled) return;

          setDepartments(
            departmentData || []
          );
        } else {
          setDepartments([]);
        }
      } catch (err) {
        console.error(
          "Faculty opportunities error:",
          err
        );

        if (!cancelled) {
          setError(
            err?.message ||
              "Unable to load faculty collaborations."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadFacultyOpportunities();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  /* =========================
     FILTERED OPPORTUNITIES
  ========================= */

  const filteredOpportunities = useMemo(() => {
    if (statusFilter === "all") {
      return opportunities;
    }

    return opportunities.filter(
      (opportunity) =>
        opportunity.status === statusFilter
    );
  }, [opportunities, statusFilter]);

  /* =========================
     STATISTICS
  ========================= */

  const stats = useMemo(() => {
    const total = opportunities.length;

    const open = opportunities.filter(
      (item) => item.status === "open"
    ).length;

    const draft = opportunities.filter(
      (item) => item.status === "draft"
    ).length;

    const inactive = opportunities.filter(
      (item) =>
        [
          "closed",
          "completed",
          "cancelled",
        ].includes(item.status)
    ).length;

    return {
      total,
      open,
      draft,
      inactive,
    };
  }, [opportunities]);

  /* =========================
     HELPERS
  ========================= */

  function formatDate(date) {
    if (!date) {
      return "Not specified";
    }

    return new Date(
      `${date}T00:00:00`
    ).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function formatDateTime(date) {
    if (!date) {
      return "Not specified";
    }

    return new Date(date).toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  }

  function formatStatus(status) {
    if (!status) {
      return "";
    }

    return (
      status.charAt(0).toUpperCase() +
      status.slice(1)
    );
  }

  function getApplicationsForOpportunity(
    opportunityId
  ) {
    return applications.filter(
      (application) =>
        application.opportunity_id ===
        opportunityId
    );
  }

  function getFaculty(facultyId) {
    return facultyProfiles.find(
      (faculty) => faculty.id === facultyId
    );
  }

  function getProfile(userId) {
    return profiles.find(
      (profile) => profile.id === userId
    );
  }

  function getInstitution(institutionId) {
    return institutions.find(
      (institution) =>
        institution.id === institutionId
    );
  }

  function getDepartment(departmentId) {
    return departments.find(
      (department) =>
        department.id === departmentId
    );
  }

  /* =========================
     UPDATE APPLICATION STATUS
  ========================= */

  async function updateApplicationStatus(
    applicationId,
    newStatus
  ) {
    try {
      setUpdatingApplicationId(
        applicationId
      );

      setApplicationError("");

      const {
        data: updatedApplication,
        error: updateError,
      } = await supabase
        .from("faculty_applications")
        .update({
          status: newStatus,
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", applicationId)
        .select(`
          id,
          faculty_id,
          opportunity_id,
          statement,
          status,
          applied_at,
          updated_at
        `)
        .single();

      if (updateError) {
        throw updateError;
      }

      setApplications((current) =>
        current.map((application) =>
          application.id ===
          applicationId
            ? updatedApplication
            : application
        )
      );
    } catch (err) {
      console.error(
        "Faculty application update error:",
        err
      );

      setApplicationError(
        err?.message ||
          "Unable to update application status."
      );
    } finally {
      setUpdatingApplicationId("");
    }
  }

  /* =========================
     LOADING
  ========================= */

  if (loading) {
    return (
      <div className="faculty-opps-state">
        Loading faculty collaborations...
      </div>
    );
  }

  /* =========================
     PAGE
  ========================= */

  return (
    <div className="faculty-opps-page">
      {/* =========================
          HEADER
      ========================= */}

      <section className="faculty-opps-hero">
        <div>
          <span className="faculty-opps-eyebrow">
            // industry × academia
          </span>

          <h1>
            Faculty <span>Collaborations</span>
          </h1>

          <p>
            Create industry programmes for
            academicians, faculty members and
            institutional partners.
          </p>

          {company?.name && (
            <div className="faculty-opps-company">
              Publishing as{" "}
              <strong>
                {company.name}
              </strong>
            </div>
          )}
        </div>

        <button
          type="button"
          className="faculty-opps-create"
          onClick={() =>
            navigate(
              "/recruiter/faculty-opportunities/create"
            )
          }
        >
          <span>+</span>
          Create collaboration
        </button>
      </section>

      {/* =========================
          ERRORS
      ========================= */}

      {error && (
        <div className="faculty-opps-error">
          {error}
        </div>
      )}

      {applicationError && (
        <div className="faculty-opps-error">
          {applicationError}
        </div>
      )}

      {/* =========================
          STATISTICS
      ========================= */}

      <section className="faculty-opps-stats">
        <div className="faculty-opps-stat">
          <span>Total programmes</span>

          <strong>
            {stats.total}
          </strong>

          <small>
            All faculty collaborations
          </small>
        </div>

        <div className="faculty-opps-stat">
          <span>Open</span>

          <strong>
            {stats.open}
          </strong>

          <small>
            Visible to faculty
          </small>
        </div>

        <div className="faculty-opps-stat">
          <span>Draft</span>

          <strong>
            {stats.draft}
          </strong>

          <small>
            Not published yet
          </small>
        </div>

        <div className="faculty-opps-stat">
          <span>Inactive</span>

          <strong>
            {stats.inactive}
          </strong>

          <small>
            Closed, completed or cancelled
          </small>
        </div>
      </section>

      {/* =========================
          PROGRAMMES PANEL
      ========================= */}

      <section className="faculty-opps-panel">
        <div className="faculty-opps-panel-header">
          <div>
            <span className="faculty-opps-panel-kicker">
              YOUR PROGRAMMES
            </span>

            <h2>
              Published collaborations
            </h2>
          </div>

          <div className="faculty-opps-filter">
            <label
              htmlFor="faculty-status-filter"
            >
              Status
            </label>

            <select
              id="faculty-status-filter"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value
                )
              }
            >
              <option value="all">
                All statuses
              </option>

              <option value="open">
                Open
              </option>

              <option value="draft">
                Draft
              </option>

              <option value="closed">
                Closed
              </option>

              <option value="completed">
                Completed
              </option>

              <option value="cancelled">
                Cancelled
              </option>
            </select>
          </div>
        </div>

        {/* =========================
            EMPTY STATE
        ========================= */}

        {filteredOpportunities.length === 0 ? (
          <div className="faculty-opps-empty">
            <div className="faculty-opps-empty-icon">
              ◎
            </div>

            <h3>
              {opportunities.length === 0
                ? "No faculty collaborations yet"
                : "No collaborations match this filter"}
            </h3>

            <p>
              {opportunities.length === 0
                ? "Create your first programme for faculty internships, FDPs, research collaborations or industrial training."
                : "Choose another status to view your other programmes."}
            </p>

            {opportunities.length === 0 && (
              <button
                type="button"
                onClick={() =>
                  navigate(
                    "/recruiter/faculty-opportunities/create"
                  )
                }
              >
                Create first collaboration →
              </button>
            )}
          </div>
        ) : (
          /* =========================
             OPPORTUNITY LIST
          ========================= */

          <div className="faculty-opps-list">
            {filteredOpportunities.map(
              (opportunity) => {
                const opportunityApplications =
                  getApplicationsForOpportunity(
                    opportunity.id
                  );

                return (
                  <article
                    className="faculty-opps-card"
                    key={opportunity.id}
                  >
                    {/* CARD HEADER */}

                    <div className="faculty-opps-card-top">
                      <div>
                        <span className="faculty-opps-type">
                          {TYPE_LABELS[
                            opportunity
                              .opportunity_type
                          ] ||
                            opportunity.opportunity_type}
                        </span>

                        <h3>
                          {opportunity.title}
                        </h3>
                      </div>

                      <span
                        className={`faculty-opps-status ${opportunity.status}`}
                      >
                        {formatStatus(
                          opportunity.status
                        )}
                      </span>
                    </div>

                    {/* DESCRIPTION */}

                    <p className="faculty-opps-description">
                      {opportunity.description ||
                        "No programme description provided."}
                    </p>

                    {/* DETAILS */}

                    <div className="faculty-opps-meta">
                      <div>
                        <span>
                          Specialization
                        </span>

                        <strong>
                          {opportunity.specialization ||
                            "Open specialization"}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Mode
                        </span>

                        <strong>
                          {opportunity.mode
                            ? formatStatus(
                                opportunity.mode
                              )
                            : "Not specified"}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Location
                        </span>

                        <strong>
                          {opportunity.location ||
                            "Not specified"}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Deadline
                        </span>

                        <strong>
                          {formatDate(
                            opportunity
                              .application_deadline
                          )}
                        </strong>
                      </div>
                    </div>

                    {/* FOOTER */}

                    <div className="faculty-opps-card-footer">
                      <div>
                        {opportunity.start_date ? (
                          <>
                            Programme:{" "}
                            <strong>
                              {formatDate(
                                opportunity.start_date
                              )}
                            </strong>

                            {opportunity.end_date && (
                              <>
                                {" "}
                                —{" "}
                                <strong>
                                  {formatDate(
                                    opportunity.end_date
                                  )}
                                </strong>
                              </>
                            )}
                          </>
                        ) : (
                          "Programme dates not specified"
                        )}
                      </div>

                      <span>
                        {opportunity.status ===
                        "open"
                          ? "Accepting applications"
                          : formatStatus(
                              opportunity.status
                            )}
                      </span>
                    </div>

                    {/* =========================
                        FACULTY APPLICANTS
                    ========================= */}

                    <div className="faculty-applicants-section">
                      <div className="faculty-applicants-header">
                        <div>
                          <span className="faculty-applicants-kicker">
                            FACULTY APPLICANTS
                          </span>

                          <h4>
                            Applications
                          </h4>
                        </div>

                        <span className="faculty-applicant-count">
                          {
                            opportunityApplications.length
                          }{" "}
                          {opportunityApplications.length ===
                          1
                            ? "applicant"
                            : "applicants"}
                        </span>
                      </div>

                      {opportunityApplications.length ===
                      0 ? (
                        <div className="faculty-applicants-empty">
                          <span>◎</span>

                          <div>
                            <strong>
                              No applications yet
                            </strong>

                            <p>
                              Faculty applications
                              for this programme will
                              appear here.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="faculty-applicants-list">
                          {opportunityApplications.map(
                            (application) => {
                              const faculty =
                                getFaculty(
                                  application.faculty_id
                                );

                              const profile =
                                getProfile(
                                  faculty?.user_id
                                );

                              const institution =
                                getInstitution(
                                  faculty?.institution_id
                                );

                              const department =
                                getDepartment(
                                  faculty?.department_id
                                );

                              const isUpdating =
                                updatingApplicationId ===
                                application.id;

                              return (
                                <div
                                  className="faculty-applicant-card"
                                  key={
                                    application.id
                                  }
                                >
                                  <div className="faculty-applicant-top">
                                    <div className="faculty-applicant-person">
                                      <div className="faculty-applicant-avatar">
                                        {(
                                          profile?.full_name ||
                                          "F"
                                        )
                                          .charAt(0)
                                          .toUpperCase()}
                                      </div>

                                      <div>
                                        <h5>
                                          {profile?.full_name ||
                                            "Faculty applicant"}
                                        </h5>

                                        <p>
                                          {faculty?.designation ||
                                            "Faculty member"}
                                        </p>
                                      </div>
                                    </div>

                                    <span
                                      className={`faculty-application-status ${application.status}`}
                                    >
                                      {formatStatus(
                                        application.status
                                      )}
                                    </span>
                                  </div>

                                  <div className="faculty-applicant-details">
                                    <div>
                                      <span>
                                        Specialization
                                      </span>

                                      <strong>
                                        {faculty?.specialization ||
                                          "Not specified"}
                                      </strong>
                                    </div>

                                    <div>
                                      <span>
                                        Institution
                                      </span>

                                      <strong>
                                        {institution?.name ||
                                          "Not specified"}
                                      </strong>
                                    </div>

                                    <div>
                                      <span>
                                        Department
                                      </span>

                                      <strong>
                                        {department?.name ||
                                          "Not specified"}
                                      </strong>
                                    </div>

                                    <div>
                                      <span>
                                        Experience
                                      </span>

                                      <strong>
                                        {faculty?.years_experience !==
                                          null &&
                                        faculty?.years_experience !==
                                          undefined
                                          ? `${faculty.years_experience} years`
                                          : "Not specified"}
                                      </strong>
                                    </div>
                                  </div>

                                  {faculty?.research_interests && (
                                    <div className="faculty-applicant-research">
                                      <span>
                                        Research interests
                                      </span>

                                      <p>
                                        {
                                          faculty.research_interests
                                        }
                                      </p>
                                    </div>
                                  )}

                                  <div className="faculty-applicant-statement">
                                    <span>
                                      Statement of interest
                                    </span>

                                    <p>
                                      {application.statement ||
                                        "No statement provided."}
                                    </p>
                                  </div>

                                  <div className="faculty-applicant-bottom">
                                    <div className="faculty-applicant-meta-copy">
                                      <span>
                                        Applied{" "}
                                        {formatDateTime(
                                          application.applied_at
                                        )}
                                      </span>

                                      {profile?.email && (
                                        <span>
                                          {
                                            profile.email
                                          }
                                        </span>
                                      )}
                                    </div>

                                    <div className="faculty-applicant-actions">
                                      {application.status ===
                                        "applied" && (
                                        <button
                                          type="button"
                                          className="faculty-action-button shortlist"
                                          disabled={
                                            isUpdating
                                          }
                                          onClick={() =>
                                            updateApplicationStatus(
                                              application.id,
                                              "shortlisted"
                                            )
                                          }
                                        >
                                          {isUpdating
                                            ? "Updating..."
                                            : "Shortlist"}
                                        </button>
                                      )}

                                      {[
                                        "applied",
                                        "shortlisted",
                                      ].includes(
                                        application.status
                                      ) && (
                                        <button
                                          type="button"
                                          className="faculty-action-button select"
                                          disabled={
                                            isUpdating
                                          }
                                          onClick={() =>
                                            updateApplicationStatus(
                                              application.id,
                                              "selected"
                                            )
                                          }
                                        >
                                          {isUpdating
                                            ? "Updating..."
                                            : "Select"}
                                        </button>
                                      )}

                                      {[
                                        "applied",
                                        "shortlisted",
                                      ].includes(
                                        application.status
                                      ) && (
                                        <button
                                          type="button"
                                          className="faculty-action-button reject"
                                          disabled={
                                            isUpdating
                                          }
                                          onClick={() =>
                                            updateApplicationStatus(
                                              application.id,
                                              "rejected"
                                            )
                                          }
                                        >
                                          {isUpdating
                                            ? "Updating..."
                                            : "Reject"}
                                        </button>
                                      )}

                                      {application.status ===
                                        "selected" && (
                                        <span className="faculty-final-status selected">
                                          ✓ Selected
                                        </span>
                                      )}

                                      {application.status ===
                                        "rejected" && (
                                        <span className="faculty-final-status rejected">
                                          Rejected
                                        </span>
                                      )}

                                      {application.status ===
                                        "withdrawn" && (
                                        <span className="faculty-final-status withdrawn">
                                          Withdrawn
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                          )}
                        </div>
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

export default FacultyOpportunities;