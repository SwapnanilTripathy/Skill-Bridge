import { useEffect, useMemo, useState } from "react";

import { supabase } from "../../services/supabase";
import { useAuth } from "../../hooks/useAuth";

import ResumeUpload from "../../components/ResumeUpload";

import "./StudentProfile.css";

const PROFICIENCY_LEVELS = [
  "beginner",
  "intermediate",
  "advanced",
];

function formatLabel(value) {
  if (!value) return "";

  const text = String(value)
    .replaceAll("_", " ")
    .toLowerCase();

  return (
    text.charAt(0).toUpperCase() +
    text.slice(1)
  );
}

function Profile() {
  const { user } = useAuth();

  const [profile, setProfile] =
    useState(null);

  const [studentProfile, setStudentProfile] =
    useState(null);

  const [institution, setInstitution] =
    useState(null);

  const [department, setDepartment] =
    useState(null);

  const [skills, setSkills] =
    useState([]);

  const [selectedSkills, setSelectedSkills] =
    useState([]);

  const [originalSkillIds, setOriginalSkillIds] =
    useState([]);

  const [skillSearch, setSkillSearch] =
    useState("");

  const [skillCategory, setSkillCategory] =
    useState("all");

  const [loading, setLoading] =
    useState(true);

  const [savingSkills, setSavingSkills] =
    useState(false);

  const [error, setError] =
    useState("");

  const [skillMessage, setSkillMessage] =
    useState("");

  // --------------------------------------------------
  // LOAD PROFILE
  // --------------------------------------------------

  useEffect(() => {
    async function loadProfile() {
      if (!user) return;

      setLoading(true);
      setError("");

      // --------------------------------------------------
      // 1. BASIC PROFILE
      // --------------------------------------------------

      const {
        data: profileData,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select(
          "full_name, email, role, onboarding_completed"
        )
        .eq("id", user.id)
        .single();

      if (profileError) {
        setError(profileError.message);
        setLoading(false);
        return;
      }

      setProfile(profileData);

      // --------------------------------------------------
      // 2. STUDENT PROFILE
      // --------------------------------------------------

      const {
        data: studentData,
        error: studentError,
      } = await supabase
        .from("student_profiles")
        .select(`
          id,
          phone,
          institution_id,
          department_id,
          degree,
          current_year,
          current_semester,
          graduation_year,
          cgpa,
          college_email,
          location,
          bio,
          linkedin_url,
          github_url,
          portfolio_url,
          profile_completion
        `)
        .eq("user_id", user.id)
        .single();

      if (studentError) {
        setError(studentError.message);
        setLoading(false);
        return;
      }

      setStudentProfile(studentData);

      // --------------------------------------------------
      // 3. LOAD SKILLS + SAVED SKILLS
      // --------------------------------------------------

      const requests = [
        supabase
          .from("skills")
          .select("id, name, category")
          .order("category")
          .order("name"),

        supabase
          .from("student_skills")
          .select(
            "skill_id, proficiency, source, verified"
          )
          .eq(
            "student_id",
            studentData.id
          ),
      ];

      // --------------------------------------------------
      // 4. INSTITUTION
      // --------------------------------------------------

      if (studentData.institution_id) {
        requests.push(
          supabase
            .from("institutions")
            .select("id, name")
            .eq(
              "id",
              studentData.institution_id
            )
            .single()
        );
      } else {
        requests.push(
          Promise.resolve({
            data: null,
            error: null,
          })
        );
      }

      // --------------------------------------------------
      // 5. DEPARTMENT
      // --------------------------------------------------

      if (studentData.department_id) {
        requests.push(
          supabase
            .from("departments")
            .select("id, name, code")
            .eq(
              "id",
              studentData.department_id
            )
            .single()
        );
      } else {
        requests.push(
          Promise.resolve({
            data: null,
            error: null,
          })
        );
      }

      const [
        skillsResult,
        studentSkillsResult,
        institutionResult,
        departmentResult,
      ] = await Promise.all(requests);

      if (skillsResult.error) {
        setError(
          skillsResult.error.message
        );
        setLoading(false);
        return;
      }

      if (studentSkillsResult.error) {
        setError(
          studentSkillsResult.error.message
        );
        setLoading(false);
        return;
      }

      if (institutionResult.error) {
        setError(
          institutionResult.error.message
        );
        setLoading(false);
        return;
      }

      if (departmentResult.error) {
        setError(
          departmentResult.error.message
        );
        setLoading(false);
        return;
      }

      // --------------------------------------------------
      // 6. PREPARE SKILLS
      // --------------------------------------------------

      const skillCatalog =
        skillsResult.data || [];

      const savedStudentSkills =
        studentSkillsResult.data || [];

      setSkills(skillCatalog);

      setInstitution(
        institutionResult.data || null
      );

      setDepartment(
        departmentResult.data || null
      );

      const skillLookup = new Map(
        skillCatalog.map((skill) => [
          skill.id,
          skill,
        ])
      );

      const hydratedSkills =
        savedStudentSkills
          .map((savedSkill) => {
            const catalogSkill =
              skillLookup.get(
                savedSkill.skill_id
              );

            if (!catalogSkill) {
              return null;
            }

            return {
              skill_id:
                savedSkill.skill_id,

              name:
                catalogSkill.name,

              category:
                catalogSkill.category,

              proficiency:
                savedSkill.proficiency ||
                "beginner",

              source:
                savedSkill.source,

              verified:
                savedSkill.verified,
            };
          })
          .filter(Boolean);

      setSelectedSkills(
        hydratedSkills
      );

      setOriginalSkillIds(
        hydratedSkills.map(
          (skill) =>
            skill.skill_id
        )
      );

      setLoading(false);
    }

    loadProfile();
  }, [user]);

  // --------------------------------------------------
  // SKILL CATEGORIES
  // --------------------------------------------------

  const categories = useMemo(() => {
    return [
      ...new Set(
        skills
          .map(
            (skill) =>
              skill.category
          )
          .filter(Boolean)
      ),
    ].sort((a, b) =>
      a.localeCompare(b)
    );
  }, [skills]);

  // --------------------------------------------------
  // FILTER SKILLS
  // --------------------------------------------------

  const filteredSkills =
    useMemo(() => {
      const search =
        skillSearch
          .trim()
          .toLowerCase();

      return skills.filter(
        (skill) => {
          const alreadySelected =
            selectedSkills.some(
              (item) =>
                item.skill_id ===
                skill.id
            );

          if (alreadySelected) {
            return false;
          }

          const matchesCategory =
            skillCategory ===
              "all" ||
            skill.category ===
              skillCategory;

          const matchesSearch =
            !search ||
            skill.name
              .toLowerCase()
              .includes(search) ||
            String(
              skill.category || ""
            )
              .toLowerCase()
              .replaceAll("_", " ")
              .includes(search);

          return (
            matchesCategory &&
            matchesSearch
          );
        }
      );
    }, [
      skills,
      selectedSkills,
      skillSearch,
      skillCategory,
    ]);

  // --------------------------------------------------
  // ADD MANUAL SKILL
  // --------------------------------------------------

  function addSkill(skill) {
    setSkillMessage("");

    setSelectedSkills(
      (current) => [
        ...current,
        {
          skill_id: skill.id,
          name: skill.name,
          category:
            skill.category,
          proficiency:
            "beginner",
          source:
            "self_reported",
          verified: false,
        },
      ]
    );
  }

  // --------------------------------------------------
  // ADD RESUME DETECTED SKILLS
  // --------------------------------------------------

  function addDetectedSkills(
    detectedSkills
  ) {
    if (
      !Array.isArray(
        detectedSkills
      ) ||
      detectedSkills.length === 0
    ) {
      setSkillMessage(
        "Resume processed successfully, but no skills from the SkillBridge catalog were detected."
      );

      return;
    }

    let numberAdded = 0;

    setSelectedSkills(
      (currentSkills) => {
        const currentSkillIds =
          new Set(
            currentSkills.map(
              (skill) =>
                skill.skill_id
            )
          );

        const newSkills = [];

        detectedSkills.forEach(
          (detectedSkill) => {
            if (
              !detectedSkill?.id ||
              currentSkillIds.has(
                detectedSkill.id
              )
            ) {
              return;
            }

            const catalogSkill =
              skills.find(
                (skill) =>
                  skill.id ===
                  detectedSkill.id
              );

            if (!catalogSkill) {
              return;
            }

            currentSkillIds.add(
              detectedSkill.id
            );

            newSkills.push({
              skill_id:
                catalogSkill.id,

              name:
                catalogSkill.name,

              category:
                catalogSkill.category,

              proficiency:
                "beginner",

              source: "resume",

              verified: false,
            });
          }
        );

        numberAdded =
          newSkills.length;

        return [
          ...currentSkills,
          ...newSkills,
        ];
      }
    );

    setTimeout(() => {
      if (numberAdded > 0) {
        setSkillMessage(
          `${numberAdded} skill${
            numberAdded === 1
              ? ""
              : "s"
          } detected from your resume. Review the proficiency levels below, then click Save Skills.`
        );
      } else {
        setSkillMessage(
          "The skills detected from this resume are already in your skill profile."
        );
      }
    }, 0);
  }

  // --------------------------------------------------
  // UPDATE PROFICIENCY
  // --------------------------------------------------

  function updateProficiency(
    skillId,
    proficiency
  ) {
    setSkillMessage("");

    setSelectedSkills(
      (current) =>
        current.map(
          (skill) =>
            skill.skill_id ===
            skillId
              ? {
                  ...skill,
                  proficiency,
                }
              : skill
        )
    );
  }

  // --------------------------------------------------
  // REMOVE SKILL
  // --------------------------------------------------

  function removeSkill(skillId) {
    setSkillMessage("");

    setSelectedSkills(
      (current) =>
        current.filter(
          (skill) =>
            skill.skill_id !==
            skillId
        )
    );
  }

  // --------------------------------------------------
  // SAVE SKILLS
  // --------------------------------------------------

  async function saveSkills() {
    if (!studentProfile?.id) {
      setError(
        "Student profile not found."
      );

      return;
    }

    setSavingSkills(true);
    setError("");
    setSkillMessage("");

    const selectedIds =
      selectedSkills.map(
        (skill) =>
          skill.skill_id
      );

    const removedIds =
      originalSkillIds.filter(
        (skillId) =>
          !selectedIds.includes(
            skillId
          )
      );

    // --------------------------------------------------
    // DELETE REMOVED SKILLS
    // --------------------------------------------------

    if (removedIds.length > 0) {
      const {
        error: deleteError,
      } = await supabase
        .from("student_skills")
        .delete()
        .eq(
          "student_id",
          studentProfile.id
        )
        .in(
          "skill_id",
          removedIds
        );

      if (deleteError) {
        setSavingSkills(false);

        setError(
          deleteError.message
        );

        return;
      }
    }

    // --------------------------------------------------
    // UPSERT CURRENT SKILLS
    // --------------------------------------------------

    if (
      selectedSkills.length > 0
    ) {
      const rows =
        selectedSkills.map(
          (skill) => ({
            student_id:
              studentProfile.id,

            skill_id:
              skill.skill_id,

            proficiency:
              skill.proficiency,

            source:
              skill.source ||
              "self_reported",

            verified: Boolean(
              skill.verified
            ),

            updated_at:
              new Date().toISOString(),
          })
        );

      const {
        error: upsertError,
      } = await supabase
        .from("student_skills")
        .upsert(rows, {
          onConflict:
            "student_id,skill_id",
        });

      if (upsertError) {
        setSavingSkills(false);

        setError(
          upsertError.message
        );

        return;
      }
    }

    setOriginalSkillIds(
      selectedIds
    );

    setSavingSkills(false);

    setSkillMessage(
      selectedSkills.length > 0
        ? `${
            selectedSkills.length
          } skill${
            selectedSkills.length ===
            1
              ? ""
              : "s"
          } saved. Your opportunity match scores will now use these proficiency levels.`
        : "Your skill profile is currently empty."
    );
  }

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (loading) {
    return (
      <div className="student-profile-state">
        Loading profile…
      </div>
    );
  }

  // --------------------------------------------------
  // ERROR
  // --------------------------------------------------

  if (error && !profile) {
    return (
      <div className="student-profile-state error">
        {error}
      </div>
    );
  }

  if (
    !profile ||
    !studentProfile
  ) {
    return (
      <div className="student-profile-state">
        Student profile not found.
      </div>
    );
  }

  // --------------------------------------------------
  // COMPONENT
  // --------------------------------------------------

  return (
    <div className="student-profile-page">

      {/* ================================================
          PROFILE HEADER
      ================================================= */}

      <section className="student-profile-head">
        <div>
          <span className="student-profile-kicker">
            // student profile
          </span>

          <h1>My Profile</h1>

          <p>
            Keep your academic
            details, resume and skill
            profile current so
            SkillBridge can calculate
            stronger opportunity
            matches.
          </p>
        </div>

        <div className="student-profile-completion">
          <strong>
            {studentProfile.profile_completion ||
              0}
            %
          </strong>

          <span>
            profile completion
          </span>
        </div>
      </section>

      {error && (
        <div className="student-profile-alert error">
          {error}
        </div>
      )}

      {/* ================================================
          BASIC + ACADEMICS
      ================================================= */}

      <section className="student-profile-grid">

        <article className="student-profile-card">
          <span className="student-profile-card-kicker">
            // basic information
          </span>

          <h2>
            Contact details
          </h2>

          <div className="student-profile-detail-list">
            <div>
              <span>Name</span>

              <strong>
                {profile.full_name ||
                  "Not added"}
              </strong>
            </div>

            <div>
              <span>Email</span>

              <strong>
                {profile.email ||
                  user?.email ||
                  "Not added"}
              </strong>
            </div>

            <div>
              <span>Phone</span>

              <strong>
                {studentProfile.phone ||
                  "Not added"}
              </strong>
            </div>

            <div>
              <span>
                College email
              </span>

              <strong>
                {studentProfile.college_email ||
                  "Not added"}
              </strong>
            </div>
          </div>
        </article>

        <article className="student-profile-card">
          <span className="student-profile-card-kicker">
            // academics
          </span>

          <h2>
            Academic profile
          </h2>

          <div className="student-profile-detail-list">
            <div>
              <span>College</span>

              <strong>
                {institution?.name ||
                  "Not available"}
              </strong>
            </div>

            <div>
              <span>
                Department
              </span>

              <strong>
                {department
                  ? `${department.name} (${department.code})`
                  : "Not available"}
              </strong>
            </div>

            <div>
              <span>Degree</span>

              <strong>
                {studentProfile.degree ||
                  "Not added"}
              </strong>
            </div>

            <div>
              <span>
                Year / Semester
              </span>

              <strong>
                {studentProfile.current_year ||
                  "—"}{" "}
                /{" "}
                {studentProfile.current_semester ||
                  "—"}
              </strong>
            </div>

            <div>
              <span>
                Graduation year
              </span>

              <strong>
                {studentProfile.graduation_year ||
                  "Not added"}
              </strong>
            </div>

            <div>
              <span>CGPA</span>

              <strong>
                {studentProfile.cgpa ??
                  "Not added"}
              </strong>
            </div>
          </div>
        </article>

      </section>

      {/* ================================================
          PROFESSIONAL LINKS
      ================================================= */}

      <section className="student-profile-card student-professional-card">
        <div className="student-profile-section-head">
          <div>
            <span className="student-profile-card-kicker">
              // professional presence
            </span>

            <h2>Links</h2>
          </div>
        </div>

        <div className="student-professional-links">

          <div>
            <span>LinkedIn</span>

            <strong>
              {studentProfile.linkedin_url ||
                "Not added"}
            </strong>
          </div>

          <div>
            <span>GitHub</span>

            <strong>
              {studentProfile.github_url ||
                "Not added"}
            </strong>
          </div>

          <div>
            <span>
              Portfolio
            </span>

            <strong>
              {studentProfile.portfolio_url ||
                "Not added"}
            </strong>
          </div>

        </div>
      </section>

      {/* ================================================
          RESUME
      ================================================= */}

      <section className="student-profile-card student-resume-card">

        <div className="student-profile-section-head">
          <div>
            <span className="student-profile-card-kicker">
              // resume intelligence
            </span>

            <h2>Resume</h2>
          </div>

          <p>
            Upload your latest resume
            so SkillBridge can extract
            skills and add them to your
            skill profile for review.
          </p>
        </div>

        <ResumeUpload
          studentId={
            studentProfile.id
          }
          onUploadComplete={(
            resume
          ) => {
            console.log(
              "Uploaded resume:",
              resume
            );

            addDetectedSkills(
              resume.detected_skills ||
                []
            );
          }}
        />

      </section>

      {/* ================================================
          SKILL PROFILE
      ================================================= */}

      <section className="student-profile-card student-skills-card">

        <div className="student-profile-section-head">
          <div>
            <span className="student-profile-card-kicker">
              // skill profile
            </span>

            <h2>
              My Skills
            </h2>
          </div>

          <div className="student-skill-count">
            <strong>
              {selectedSkills.length}
            </strong>

            <span>
              selected skills
            </span>
          </div>
        </div>

        <p className="student-skills-intro">
          Add skills you currently
          have and choose your
          proficiency honestly.
          Resume-detected skills start
          at Beginner until you review
          them.
        </p>

        {/* ==============================================
            SKILL SEARCH
        =============================================== */}

        <div className="student-skill-picker">

          <div className="student-skill-picker-controls">

            <label>
              <span>
                Search skill
              </span>

              <input
                type="search"
                value={
                  skillSearch
                }
                onChange={(
                  event
                ) =>
                  setSkillSearch(
                    event.target
                      .value
                  )
                }
                placeholder="Python, React, communication..."
              />
            </label>

            <label>
              <span>
                Category
              </span>

              <select
                value={
                  skillCategory
                }
                onChange={(
                  event
                ) =>
                  setSkillCategory(
                    event.target
                      .value
                  )
                }
              >
                <option value="all">
                  All categories
                </option>

                {categories.map(
                  (category) => (
                    <option
                      key={
                        category
                      }
                      value={
                        category
                      }
                    >
                      {formatLabel(
                        category
                      )}
                    </option>
                  )
                )}
              </select>
            </label>

          </div>

          <div className="student-skill-browser">

            {filteredSkills.length >
            0 ? (
              filteredSkills
                .slice(0, 30)
                .map(
                  (skill) => (
                    <button
                      key={
                        skill.id
                      }
                      type="button"
                      onClick={() =>
                        addSkill(
                          skill
                        )
                      }
                    >
                      <span>
                        +
                      </span>

                      {skill.name}

                      <small>
                        {formatLabel(
                          skill.category
                        )}
                      </small>
                    </button>
                  )
                )
            ) : (
              <p>
                No additional
                skills match your
                search.
              </p>
            )}

          </div>
        </div>

        {/* ==============================================
            SELECTED SKILLS
        =============================================== */}

        <div className="student-selected-skills">

          <div className="student-selected-skills-head">

            <div>
              <span className="student-profile-card-kicker">
                // selected
              </span>

              <h3>
                Your proficiency
                levels
              </h3>
            </div>

            <span>
              Beginner →
              Intermediate →
              Advanced
            </span>

          </div>

          {selectedSkills.length ===
          0 ? (
            <div className="student-selected-skills-empty">

              <strong>
                No skills added yet
              </strong>

              <p>
                Upload your resume
                or choose skills from
                the catalog above.
                Your opportunity
                score stays at 0%
                until SkillBridge
                has skills to
                compare.
              </p>

            </div>
          ) : (
            <div className="student-selected-skill-list">

              {selectedSkills.map(
                (skill) => (
                  <article
                    key={
                      skill.skill_id
                    }
                  >

                    <div className="student-selected-skill-name">
                      <strong>
                        {skill.name}
                      </strong>

                      <span>
                        {formatLabel(
                          skill.category
                        )}
                      </span>
                    </div>

                    <label>
                      <span>
                        Proficiency
                      </span>

                      <select
                        value={
                          skill.proficiency
                        }
                        onChange={(
                          event
                        ) =>
                          updateProficiency(
                            skill.skill_id,
                            event
                              .target
                              .value
                          )
                        }
                      >
                        {PROFICIENCY_LEVELS.map(
                          (
                            level
                          ) => (
                            <option
                              key={
                                level
                              }
                              value={
                                level
                              }
                            >
                              {formatLabel(
                                level
                              )}
                            </option>
                          )
                        )}
                      </select>
                    </label>

                    <div className="student-skill-source">
                      <span>
                        Source
                      </span>

                      <strong>
                        {skill.source ===
                        "self_reported"
                          ? "Self reported"
                          : skill.source ===
                            "resume"
                          ? "Resume detected"
                          : formatLabel(
                              skill.source
                            )}
                      </strong>
                    </div>

                    <button
                      type="button"
                      className="student-remove-skill"
                      onClick={() =>
                        removeSkill(
                          skill.skill_id
                        )
                      }
                      aria-label={`Remove ${skill.name}`}
                    >
                      Remove
                    </button>

                  </article>
                )
              )}

            </div>
          )}

        </div>

        {/* ==============================================
            MESSAGES
        =============================================== */}

        {skillMessage && (
          <div className="student-profile-alert success">
            {skillMessage}
          </div>
        )}

        {/* ==============================================
            SAVE
        =============================================== */}

        <div className="student-skills-actions">

          <span>
            Review your proficiency
            levels before saving.
            Match scores recalculate
            when you return to
            Opportunities.
          </span>

          <button
            type="button"
            onClick={
              saveSkills
            }
            disabled={
              savingSkills
            }
          >
            {savingSkills
              ? "Saving skills…"
              : "Save Skills"}
          </button>

        </div>

      </section>

    </div>
  );
}

export default Profile;