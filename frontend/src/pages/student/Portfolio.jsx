import { useEffect, useState } from "react";

import { supabase } from "../../services/supabase";
import { useAuth } from "../../hooks/useAuth";

import "./Portfolio.css";

function Portfolio() {
  const { user } = useAuth();

  const [student, setStudent] = useState(null);
  const [institutionName, setInstitutionName] = useState("");
  const [departmentName, setDepartmentName] = useState("");

  const [skills, setSkills] = useState([]);
  const [projects, setProjects] = useState([]);
  const [certifications, setCertifications] = useState([]);
  const [achievements, setAchievements] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showCertificationForm, setShowCertificationForm] =
    useState(false);
  const [showAchievementForm, setShowAchievementForm] =
    useState(false);

  const [projectForm, setProjectForm] = useState({
    title: "",
    description: "",
    project_url: "",
    github_url: "",
  });

  const [certificationForm, setCertificationForm] = useState({
    title: "",
    issuing_organization: "",
    issue_date: "",
    expiry_date: "",
    credential_id: "",
    credential_url: "",
    certificate_url: "",
  });

  const [achievementForm, setAchievementForm] = useState({
    title: "",
    achievement_type: "competition",
    organization: "",
    description: "",
    achievement_date: "",
    proof_url: "",
  });

  const [savingProject, setSavingProject] = useState(false);
  const [savingCertification, setSavingCertification] =
    useState(false);
  const [savingAchievement, setSavingAchievement] =
    useState(false);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    let cancelled = false;

    async function loadInitialPortfolio() {
      try {
        setLoading(true);
        setError("");

        const { data: studentData, error: studentError } =
          await supabase
            .from("student_profiles")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle();

        if (studentError) {
          throw studentError;
        }

        if (!studentData) {
          throw new Error(
            "Student profile not found. Complete your student profile first."
          );
        }

        let loadedInstitutionName = "";
        let loadedDepartmentName = "";

        if (studentData.institution_id) {
          const {
            data: institutionData,
            error: institutionError,
          } = await supabase
            .from("institutions")
            .select("name")
            .eq("id", studentData.institution_id)
            .maybeSingle();

          if (institutionError) {
            throw institutionError;
          }

          loadedInstitutionName =
            institutionData?.name || "";
        }

        if (studentData.department_id) {
          const {
            data: departmentData,
            error: departmentError,
          } = await supabase
            .from("departments")
            .select("name")
            .eq("id", studentData.department_id)
            .maybeSingle();

          if (departmentError) {
            throw departmentError;
          }

          loadedDepartmentName =
            departmentData?.name || "";
        }

        const {
          data: studentSkillRows,
          error: studentSkillsError,
        } = await supabase
          .from("student_skills")
          .select(
            `
              id,
              proficiency,
              source,
              verified,
              skill_id,
              created_at
            `
          )
          .eq("student_id", studentData.id)
          .order("created_at", {
            ascending: false,
          });

        if (studentSkillsError) {
          throw studentSkillsError;
        }

        const skillIds = [
          ...new Set(
            (studentSkillRows || [])
              .map((item) => item.skill_id)
              .filter(Boolean)
          ),
        ];

        let skillMap = {};

        if (skillIds.length > 0) {
          const { data: skillRows, error: skillsError } =
            await supabase
              .from("skills")
              .select("id, name, category")
              .in("id", skillIds);

          if (skillsError) {
            throw skillsError;
          }

          skillMap = Object.fromEntries(
            (skillRows || []).map((skill) => [
              skill.id,
              skill,
            ])
          );
        }

        const combinedSkills = (
          studentSkillRows || []
        ).map((studentSkill) => ({
          ...studentSkill,
          skill:
            skillMap[studentSkill.skill_id] || null,
        }));

        const {
          data: projectRows,
          error: projectsError,
        } = await supabase
          .from("projects")
          .select("*")
          .eq("student_id", studentData.id)
          .order("created_at", {
            ascending: false,
          });

        if (projectsError) {
          throw projectsError;
        }

        const {
          data: certificationRows,
          error: certificationsError,
        } = await supabase
          .from("certifications")
          .select("*")
          .eq("student_id", studentData.id)
          .order("created_at", {
            ascending: false,
          });

        if (certificationsError) {
          throw certificationsError;
        }

        const {
          data: achievementRows,
          error: achievementsError,
        } = await supabase
          .from("achievements")
          .select("*")
          .eq("student_id", studentData.id)
          .order("created_at", {
            ascending: false,
          });

        if (achievementsError) {
          throw achievementsError;
        }

        if (cancelled) {
          return;
        }

        setStudent(studentData);
        setInstitutionName(loadedInstitutionName);
        setDepartmentName(loadedDepartmentName);
        setSkills(combinedSkills);
        setProjects(projectRows || []);
        setCertifications(certificationRows || []);
        setAchievements(achievementRows || []);
      } catch (err) {
        console.error("Portfolio loading error:", err);

        if (!cancelled) {
          setError(
            err?.message ||
              "Could not load your digital portfolio."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadInitialPortfolio();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  async function refreshPortfolioSections() {
    if (!student?.id) {
      return;
    }

    try {
      const [
        projectResult,
        certificationResult,
        achievementResult,
      ] = await Promise.all([
        supabase
          .from("projects")
          .select("*")
          .eq("student_id", student.id)
          .order("created_at", {
            ascending: false,
          }),

        supabase
          .from("certifications")
          .select("*")
          .eq("student_id", student.id)
          .order("created_at", {
            ascending: false,
          }),

        supabase
          .from("achievements")
          .select("*")
          .eq("student_id", student.id)
          .order("created_at", {
            ascending: false,
          }),
      ]);

      if (projectResult.error) {
        throw projectResult.error;
      }

      if (certificationResult.error) {
        throw certificationResult.error;
      }

      if (achievementResult.error) {
        throw achievementResult.error;
      }

      setProjects(projectResult.data || []);
      setCertifications(certificationResult.data || []);
      setAchievements(achievementResult.data || []);
    } catch (err) {
      console.error(
        "Portfolio refresh error:",
        err
      );

      setError(
        err?.message ||
          "Could not refresh portfolio."
      );
    }
  }

  function showMessage(message) {
    setSuccess(message);

    window.setTimeout(() => {
      setSuccess("");
    }, 3000);
  }

  async function addProject(event) {
    event.preventDefault();

    if (!student?.id) {
      return;
    }

    if (!projectForm.title.trim()) {
      setError("Project title is required.");
      return;
    }

    try {
      setSavingProject(true);
      setError("");

      const { error: insertError } = await supabase
        .from("projects")
        .insert({
          student_id: student.id,
          title: projectForm.title.trim(),
          description:
            projectForm.description.trim() || null,
          project_url:
            projectForm.project_url.trim() || null,
          github_url:
            projectForm.github_url.trim() || null,
          source: "manual",
        });

      if (insertError) {
        throw insertError;
      }

      setProjectForm({
        title: "",
        description: "",
        project_url: "",
        github_url: "",
      });

      setShowProjectForm(false);

      await refreshPortfolioSections();

      showMessage(
        "Project added to your portfolio."
      );
    } catch (err) {
      console.error("Add project error:", err);

      setError(
        err?.message || "Could not add project."
      );
    } finally {
      setSavingProject(false);
    }
  }

  async function deleteProject(projectId) {
    const confirmed = window.confirm(
      "Remove this project from your portfolio?"
    );

    if (!confirmed || !student?.id) {
      return;
    }

    try {
      setError("");

      const { error: deleteError } = await supabase
        .from("projects")
        .delete()
        .eq("id", projectId)
        .eq("student_id", student.id);

      if (deleteError) {
        throw deleteError;
      }

      setProjects((current) =>
        current.filter(
          (project) => project.id !== projectId
        )
      );

      showMessage("Project removed.");
    } catch (err) {
      console.error("Delete project error:", err);

      setError(
        err?.message || "Could not remove project."
      );
    }
  }

  async function addCertification(event) {
    event.preventDefault();

    if (!student?.id) {
      return;
    }

    if (
      !certificationForm.title.trim() ||
      !certificationForm.issuing_organization.trim()
    ) {
      setError(
        "Certification title and issuing organization are required."
      );
      return;
    }

    try {
      setSavingCertification(true);
      setError("");

      const { error: insertError } = await supabase
        .from("certifications")
        .insert({
          student_id: student.id,
          title: certificationForm.title.trim(),
          issuing_organization:
            certificationForm.issuing_organization.trim(),
          issue_date:
            certificationForm.issue_date || null,
          expiry_date:
            certificationForm.expiry_date || null,
          credential_id:
            certificationForm.credential_id.trim() ||
            null,
          credential_url:
            certificationForm.credential_url.trim() ||
            null,
          certificate_url:
            certificationForm.certificate_url.trim() ||
            null,
          verified: false,
        });

      if (insertError) {
        throw insertError;
      }

      setCertificationForm({
        title: "",
        issuing_organization: "",
        issue_date: "",
        expiry_date: "",
        credential_id: "",
        credential_url: "",
        certificate_url: "",
      });

      setShowCertificationForm(false);

      await refreshPortfolioSections();

      showMessage(
        "Certification added as self reported."
      );
    } catch (err) {
      console.error(
        "Add certification error:",
        err
      );

      setError(
        err?.message ||
          "Could not add certification."
      );
    } finally {
      setSavingCertification(false);
    }
  }

  async function deleteCertification(
    certificationId
  ) {
    const confirmed = window.confirm(
      "Remove this certification?"
    );

    if (!confirmed || !student?.id) {
      return;
    }

    try {
      setError("");

      const { error: deleteError } = await supabase
        .from("certifications")
        .delete()
        .eq("id", certificationId)
        .eq("student_id", student.id);

      if (deleteError) {
        throw deleteError;
      }

      setCertifications((current) =>
        current.filter(
          (certification) =>
            certification.id !== certificationId
        )
      );

      showMessage("Certification removed.");
    } catch (err) {
      console.error(
        "Delete certification error:",
        err
      );

      setError(
        err?.message ||
          "Could not remove certification."
      );
    }
  }

  async function addAchievement(event) {
    event.preventDefault();

    if (!student?.id) {
      return;
    }

    if (!achievementForm.title.trim()) {
      setError("Achievement title is required.");
      return;
    }

    try {
      setSavingAchievement(true);
      setError("");

      const { error: insertError } = await supabase
        .from("achievements")
        .insert({
          student_id: student.id,
          title: achievementForm.title.trim(),
          achievement_type:
            achievementForm.achievement_type,
          organization:
            achievementForm.organization.trim() ||
            null,
          description:
            achievementForm.description.trim() ||
            null,
          achievement_date:
            achievementForm.achievement_date || null,
          proof_url:
            achievementForm.proof_url.trim() || null,
          verified: false,
        });

      if (insertError) {
        throw insertError;
      }

      setAchievementForm({
        title: "",
        achievement_type: "competition",
        organization: "",
        description: "",
        achievement_date: "",
        proof_url: "",
      });

      setShowAchievementForm(false);

      await refreshPortfolioSections();

      showMessage(
        "Achievement added as self reported."
      );
    } catch (err) {
      console.error(
        "Add achievement error:",
        err
      );

      setError(
        err?.message ||
          "Could not add achievement."
      );
    } finally {
      setSavingAchievement(false);
    }
  }

  async function deleteAchievement(
    achievementId
  ) {
    const confirmed = window.confirm(
      "Remove this achievement?"
    );

    if (!confirmed || !student?.id) {
      return;
    }

    try {
      setError("");

      const { error: deleteError } = await supabase
        .from("achievements")
        .delete()
        .eq("id", achievementId)
        .eq("student_id", student.id);

      if (deleteError) {
        throw deleteError;
      }

      setAchievements((current) =>
        current.filter(
          (achievement) =>
            achievement.id !== achievementId
        )
      );

      showMessage("Achievement removed.");
    } catch (err) {
      console.error(
        "Delete achievement error:",
        err
      );

      setError(
        err?.message ||
          "Could not remove achievement."
      );
    }
  }

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

  function displaySource(source) {
    if (!source) {
      return "Student profile";
    }

    return source
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );
  }

  if (loading) {
    return (
      <div className="portfolio-state">
        Loading your digital portfolio...
      </div>
    );
  }

  if (!student) {
    return (
      <div className="portfolio-state error">
        {error || "Student profile not found."}
      </div>
    );
  }

  const verifiedSkillCount = skills.filter(
    (skill) => skill.verified
  ).length;

  const verifiedCertificationCount =
    certifications.filter(
      (certification) =>
        certification.verified
    ).length;

  const verifiedAchievementCount =
    achievements.filter(
      (achievement) => achievement.verified
    ).length;

  return (
    <div className="portfolio-page">
      <section className="portfolio-hero">
        <div>
          <span className="portfolio-kicker">
            // DIGITAL STUDENT PORTFOLIO
          </span>

          <h1>
            Your professional
            <span> story.</span>
          </h1>

          <p>
            Bring your academic profile, verified
            skills, projects, certifications and
            achievements together in one
            industry-ready portfolio.
          </p>
        </div>

        <div className="portfolio-identity-card">
          <div className="portfolio-avatar">
            {(user?.user_metadata?.full_name ||
              user?.email ||
              "S")
              .charAt(0)
              .toUpperCase()}
          </div>

          <div>
            <span>// STUDENT</span>

            <strong>
              {user?.user_metadata?.full_name ||
                user?.email?.split("@")[0] ||
                "Student"}
            </strong>

            <p>{user?.email}</p>
          </div>
        </div>
      </section>

      {error && (
        <div className="portfolio-alert error">
          {error}
        </div>
      )}

      {success && (
        <div className="portfolio-alert success">
          {success}
        </div>
      )}

      <section className="portfolio-stat-grid">
        <article>
          <span>Skills</span>
          <strong>{skills.length}</strong>
          <p>{verifiedSkillCount} verified</p>
        </article>

        <article>
          <span>Projects</span>
          <strong>{projects.length}</strong>
          <p>Portfolio projects</p>
        </article>

        <article>
          <span>Certifications</span>
          <strong>{certifications.length}</strong>
          <p>
            {verifiedCertificationCount} verified
          </p>
        </article>

        <article>
          <span>Achievements</span>
          <strong>{achievements.length}</strong>
          <p>
            {verifiedAchievementCount} verified
          </p>
        </article>
      </section>

      <section className="portfolio-card">
        <div className="portfolio-section-heading">
          <div>
            <span className="portfolio-kicker">
              // ACADEMIC IDENTITY
            </span>
            <h2>Academic profile</h2>
          </div>
        </div>

        <div className="portfolio-academic-grid">
          <div>
            <span>Institution</span>
            <strong>
              {institutionName ||
                "Not specified"}
            </strong>
          </div>

          <div>
            <span>Department</span>
            <strong>
              {departmentName ||
                "Not specified"}
            </strong>
          </div>

          <div>
            <span>Degree</span>
            <strong>
              {student.degree ||
                "Not specified"}
            </strong>
          </div>

          <div>
            <span>Current year</span>
            <strong>
              {student.current_year
                ? `Year ${student.current_year}`
                : "Not specified"}
            </strong>
          </div>

          <div>
            <span>Semester</span>
            <strong>
              {student.current_semester
                ? `Semester ${student.current_semester}`
                : "Not specified"}
            </strong>
          </div>

          <div>
            <span>CGPA</span>
            <strong>
              {student.cgpa ??
                "Not specified"}
            </strong>
          </div>

          <div>
            <span>Graduation</span>
            <strong>
              {student.graduation_year ||
                "Not specified"}
            </strong>
          </div>

          <div>
            <span>Verification</span>

            <strong
              className={
                student.verification_status ===
                "verified"
                  ? "portfolio-verified-text"
                  : ""
              }
            >
              {student.verification_status ||
                "pending"}
            </strong>
          </div>
        </div>

        {student.bio && (
          <div className="portfolio-bio">
            <span>About</span>
            <p>{student.bio}</p>
          </div>
        )}

        <div className="portfolio-link-row">
          {student.linkedin_url && (
            <a
              href={student.linkedin_url}
              target="_blank"
              rel="noreferrer"
            >
              LinkedIn ↗
            </a>
          )}

          {student.github_url && (
            <a
              href={student.github_url}
              target="_blank"
              rel="noreferrer"
            >
              GitHub ↗
            </a>
          )}

          {student.portfolio_url && (
            <a
              href={student.portfolio_url}
              target="_blank"
              rel="noreferrer"
            >
              Personal portfolio ↗
            </a>
          )}
        </div>
      </section>

      <section className="portfolio-card">
        <div className="portfolio-section-heading">
          <div>
            <span className="portfolio-kicker">
              // SKILL PROFILE
            </span>
            <h2>Skills & verification</h2>
          </div>

          <div className="portfolio-section-count">
            {verifiedSkillCount}/{skills.length} verified
          </div>
        </div>

        {skills.length === 0 ? (
          <div className="portfolio-empty">
            <strong>No skills added yet</strong>
            <p>
              Add skills from your Profile or
              complete Skill Assessments to build
              your verified skill profile.
            </p>
          </div>
        ) : (
          <div className="portfolio-skill-grid">
            {skills.map((item) => (
              <article key={item.id}>
                <div className="portfolio-skill-top">
                  <strong>
                    {item.skill?.name ||
                      "Unknown skill"}
                  </strong>

                  <span
                    className={
                      item.verified
                        ? "portfolio-badge verified"
                        : "portfolio-badge pending"
                    }
                  >
                    {item.verified
                      ? "Institution Verified"
                      : "Recorded"}
                  </span>
                </div>

                <p>
                  {item.skill?.category ||
                    "General skill"}
                </p>

                <div className="portfolio-skill-meta">
                  <span>
                    {displaySource(
                      item.proficiency
                    )}
                  </span>

                  <span>
                    {displaySource(item.source)}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="portfolio-card">
        <div className="portfolio-section-heading">
          <div>
            <span className="portfolio-kicker">
              // PROJECT EXPERIENCE
            </span>
            <h2>Projects</h2>
          </div>

          <button
            type="button"
            className="portfolio-add-button"
            onClick={() =>
              setShowProjectForm(
                (current) => !current
              )
            }
          >
            {showProjectForm
              ? "Cancel"
              : "+ Add project"}
          </button>
        </div>

        {showProjectForm && (
          <form
            className="portfolio-form"
            onSubmit={addProject}
          >
            <div className="portfolio-form-grid">
              <label>
                <span>Project title *</span>
                <input
                  value={projectForm.title}
                  onChange={(event) =>
                    setProjectForm(
                      (current) => ({
                        ...current,
                        title:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="Smart cold storage system"
                />
              </label>

              <label>
                <span>GitHub URL</span>
                <input
                  value={projectForm.github_url}
                  onChange={(event) =>
                    setProjectForm(
                      (current) => ({
                        ...current,
                        github_url:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="https://github.com/..."
                />
              </label>

              <label className="portfolio-form-wide">
                <span>Project URL</span>
                <input
                  value={projectForm.project_url}
                  onChange={(event) =>
                    setProjectForm(
                      (current) => ({
                        ...current,
                        project_url:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="https://..."
                />
              </label>

              <label className="portfolio-form-wide">
                <span>Description</span>
                <textarea
                  value={projectForm.description}
                  onChange={(event) =>
                    setProjectForm(
                      (current) => ({
                        ...current,
                        description:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="What did you build and what problem does it solve?"
                  rows="4"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={savingProject}
            >
              {savingProject
                ? "Adding..."
                : "Add project"}
            </button>
          </form>
        )}

        {projects.length === 0 ? (
          <div className="portfolio-empty">
            <strong>No projects yet</strong>
            <p>
              Add academic, personal, hackathon or
              industry projects to demonstrate
              applied skills.
            </p>
          </div>
        ) : (
          <div className="portfolio-entry-grid">
            {projects.map((project) => (
              <article
                className="portfolio-entry"
                key={project.id}
              >
                <div className="portfolio-entry-top">
                  <span className="portfolio-entry-type">
                    PROJECT
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      deleteProject(project.id)
                    }
                  >
                    Remove
                  </button>
                </div>

                <h3>{project.title}</h3>

                {project.description && (
                  <p>{project.description}</p>
                )}

                <div className="portfolio-entry-links">
                  {project.github_url && (
                    <a
                      href={project.github_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      GitHub ↗
                    </a>
                  )}

                  {project.project_url && (
                    <a
                      href={project.project_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Project ↗
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="portfolio-card">
        <div className="portfolio-section-heading">
          <div>
            <span className="portfolio-kicker">
              // CREDENTIALS
            </span>
            <h2>Certifications</h2>
          </div>

          <button
            type="button"
            className="portfolio-add-button"
            onClick={() =>
              setShowCertificationForm(
                (current) => !current
              )
            }
          >
            {showCertificationForm
              ? "Cancel"
              : "+ Add certification"}
          </button>
        </div>

        {showCertificationForm && (
          <form
            className="portfolio-form"
            onSubmit={addCertification}
          >
            <div className="portfolio-form-grid">
              <label>
                <span>
                  Certification title *
                </span>
                <input
                  value={
                    certificationForm.title
                  }
                  onChange={(event) =>
                    setCertificationForm(
                      (current) => ({
                        ...current,
                        title:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="Python Certification"
                />
              </label>

              <label>
                <span>
                  Issuing organization *
                </span>
                <input
                  value={
                    certificationForm.issuing_organization
                  }
                  onChange={(event) =>
                    setCertificationForm(
                      (current) => ({
                        ...current,
                        issuing_organization:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="Coursera / NPTEL / Company"
                />
              </label>

              <label>
                <span>Issue date</span>
                <input
                  type="date"
                  value={
                    certificationForm.issue_date
                  }
                  onChange={(event) =>
                    setCertificationForm(
                      (current) => ({
                        ...current,
                        issue_date:
                          event.target.value,
                      })
                    )
                  }
                />
              </label>

              <label>
                <span>Expiry date</span>
                <input
                  type="date"
                  value={
                    certificationForm.expiry_date
                  }
                  onChange={(event) =>
                    setCertificationForm(
                      (current) => ({
                        ...current,
                        expiry_date:
                          event.target.value,
                      })
                    )
                  }
                />
              </label>

              <label>
                <span>Credential ID</span>
                <input
                  value={
                    certificationForm.credential_id
                  }
                  onChange={(event) =>
                    setCertificationForm(
                      (current) => ({
                        ...current,
                        credential_id:
                          event.target.value,
                      })
                    )
                  }
                />
              </label>

              <label>
                <span>Credential URL</span>
                <input
                  value={
                    certificationForm.credential_url
                  }
                  onChange={(event) =>
                    setCertificationForm(
                      (current) => ({
                        ...current,
                        credential_url:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="https://..."
                />
              </label>

              <label className="portfolio-form-wide">
                <span>
                  Certificate / proof URL
                </span>
                <input
                  value={
                    certificationForm.certificate_url
                  }
                  onChange={(event) =>
                    setCertificationForm(
                      (current) => ({
                        ...current,
                        certificate_url:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="https://..."
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={savingCertification}
            >
              {savingCertification
                ? "Adding..."
                : "Add certification"}
            </button>
          </form>
        )}

        {certifications.length === 0 ? (
          <div className="portfolio-empty">
            <strong>
              No certifications yet
            </strong>
            <p>
              Add professional or academic
              certifications and their credential
              information.
            </p>
          </div>
        ) : (
          <div className="portfolio-entry-grid">
            {certifications.map(
              (certification) => (
                <article
                  className="portfolio-entry"
                  key={certification.id}
                >
                  <div className="portfolio-entry-top">
                    <span
                      className={
                        certification.verified
                          ? "portfolio-badge verified"
                          : "portfolio-badge pending"
                      }
                    >
                      {certification.verified
                        ? "Institution Verified"
                        : "Self Reported"}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        deleteCertification(
                          certification.id
                        )
                      }
                    >
                      Remove
                    </button>
                  </div>

                  <h3>
                    {certification.title}
                  </h3>

                  <strong className="portfolio-entry-subtitle">
                    {
                      certification.issuing_organization
                    }
                  </strong>

                  <p>
                    Issued:{" "}
                    {formatDate(
                      certification.issue_date
                    )}
                  </p>

                  {certification.credential_id && (
                    <p>
                      Credential ID:{" "}
                      {
                        certification.credential_id
                      }
                    </p>
                  )}

                  <div className="portfolio-entry-links">
                    {certification.credential_url && (
                      <a
                        href={
                          certification.credential_url
                        }
                        target="_blank"
                        rel="noreferrer"
                      >
                        Credential ↗
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
                        Certificate ↗
                      </a>
                    )}
                  </div>
                </article>
              )
            )}
          </div>
        )}
      </section>

      <section className="portfolio-card">
        <div className="portfolio-section-heading">
          <div>
            <span className="portfolio-kicker">
              // ACHIEVEMENTS
            </span>
            <h2>Achievements</h2>
          </div>

          <button
            type="button"
            className="portfolio-add-button"
            onClick={() =>
              setShowAchievementForm(
                (current) => !current
              )
            }
          >
            {showAchievementForm
              ? "Cancel"
              : "+ Add achievement"}
          </button>
        </div>

        {showAchievementForm && (
          <form
            className="portfolio-form"
            onSubmit={addAchievement}
          >
            <div className="portfolio-form-grid">
              <label>
                <span>
                  Achievement title *
                </span>
                <input
                  value={
                    achievementForm.title
                  }
                  onChange={(event) =>
                    setAchievementForm(
                      (current) => ({
                        ...current,
                        title:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="Hackathon finalist"
                />
              </label>

              <label>
                <span>Type</span>
                <select
                  value={
                    achievementForm.achievement_type
                  }
                  onChange={(event) =>
                    setAchievementForm(
                      (current) => ({
                        ...current,
                        achievement_type:
                          event.target.value,
                      })
                    )
                  }
                >
                  <option value="competition">
                    Competition
                  </option>
                  <option value="hackathon">
                    Hackathon
                  </option>
                  <option value="academic">
                    Academic
                  </option>
                  <option value="research">
                    Research
                  </option>
                  <option value="leadership">
                    Leadership
                  </option>
                  <option value="sports">
                    Sports
                  </option>
                  <option value="other">
                    Other
                  </option>
                </select>
              </label>

              <label>
                <span>Organization</span>
                <input
                  value={
                    achievementForm.organization
                  }
                  onChange={(event) =>
                    setAchievementForm(
                      (current) => ({
                        ...current,
                        organization:
                          event.target.value,
                      })
                    )
                  }
                />
              </label>

              <label>
                <span>Date</span>
                <input
                  type="date"
                  value={
                    achievementForm.achievement_date
                  }
                  onChange={(event) =>
                    setAchievementForm(
                      (current) => ({
                        ...current,
                        achievement_date:
                          event.target.value,
                      })
                    )
                  }
                />
              </label>

              <label className="portfolio-form-wide">
                <span>Description</span>
                <textarea
                  rows="4"
                  value={
                    achievementForm.description
                  }
                  onChange={(event) =>
                    setAchievementForm(
                      (current) => ({
                        ...current,
                        description:
                          event.target.value,
                      })
                    )
                  }
                />
              </label>

              <label className="portfolio-form-wide">
                <span>Proof URL</span>
                <input
                  value={
                    achievementForm.proof_url
                  }
                  onChange={(event) =>
                    setAchievementForm(
                      (current) => ({
                        ...current,
                        proof_url:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="https://..."
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={savingAchievement}
            >
              {savingAchievement
                ? "Adding..."
                : "Add achievement"}
            </button>
          </form>
        )}

        {achievements.length === 0 ? (
          <div className="portfolio-empty">
            <strong>No achievements yet</strong>
            <p>
              Add competitions, hackathons,
              academic accomplishments, research
              or leadership achievements.
            </p>
          </div>
        ) : (
          <div className="portfolio-entry-grid">
            {achievements.map(
              (achievement) => (
                <article
                  className="portfolio-entry"
                  key={achievement.id}
                >
                  <div className="portfolio-entry-top">
                    <span
                      className={
                        achievement.verified
                          ? "portfolio-badge verified"
                          : "portfolio-badge pending"
                      }
                    >
                      {achievement.verified
                        ? "Institution Verified"
                        : "Self Reported"}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        deleteAchievement(
                          achievement.id
                        )
                      }
                    >
                      Remove
                    </button>
                  </div>

                  <span className="portfolio-entry-type">
                    {displaySource(
                      achievement.achievement_type
                    )}
                  </span>

                  <h3>{achievement.title}</h3>

                  {achievement.organization && (
                    <strong className="portfolio-entry-subtitle">
                      {
                        achievement.organization
                      }
                    </strong>
                  )}

                  {achievement.description && (
                    <p>
                      {achievement.description}
                    </p>
                  )}

                  {achievement.achievement_date && (
                    <p>
                      {formatDate(
                        achievement.achievement_date
                      )}
                    </p>
                  )}

                  {achievement.proof_url && (
                    <div className="portfolio-entry-links">
                      <a
                        href={
                          achievement.proof_url
                        }
                        target="_blank"
                        rel="noreferrer"
                      >
                        View proof ↗
                      </a>
                    </div>
                  )}
                </article>
              )
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export default Portfolio;