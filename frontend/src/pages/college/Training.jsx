import { useEffect, useMemo, useState } from "react";

import { supabase } from "../../services/supabase";
import { useAuth } from "../../hooks/useAuth";
import "./Training.css";

const EMPTY_FORM = {
  title: "",
  skill_id: "",
  department_id: "",
  provider: "",
  training_type: "workshop",
  description: "",
  start_date: "",
  end_date: "",
};

function Training() {
  const { user } = useAuth();

  const [institutionId, setInstitutionId] = useState(null);

  const [skills, setSkills] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [programs, setPrograms] = useState([]);

  const [form, setForm] = useState(EMPTY_FORM);

  const [statusFilter, setStatusFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  /* =========================
     LOAD TRAINING DATA
  ========================= */

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    async function loadTrainingData() {
      try {
        setLoading(true);
        setError("");

        /* =========================
           1. FIND INSTITUTION
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

        const currentInstitutionId =
          memberData.institution_id;

        /* =========================
           2. LOAD DEPARTMENTS
        ========================= */

        const {
          data: departmentData,
          error: departmentError,
        } = await supabase
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
           3. LOAD SKILLS
        ========================= */

        const { data: skillData, error: skillError } =
          await supabase
            .from("skills")
            .select("id, name, category")
            .order("name", {
              ascending: true,
            });

        if (skillError) {
          throw skillError;
        }

        /* =========================
           4. LOAD TRAINING PROGRAMS
        ========================= */

        const {
          data: programData,
          error: programError,
        } = await supabase
          .from("training_programs")
          .select("*")
          .eq("institution_id", currentInstitutionId)
          .order("created_at", {
            ascending: false,
          });

        if (programError) {
          throw programError;
        }

        if (!cancelled) {
          setInstitutionId(currentInstitutionId);
          setDepartments(departmentData || []);
          setSkills(skillData || []);
          setPrograms(programData || []);
        }
      } catch (err) {
        console.error("Training loading error:", err);

        if (!cancelled) {
          setError(
            err?.message ||
              "Unable to load institutional training programs."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadTrainingData();

    return () => {
      cancelled = true;
    };
  }, [user]);

  /* =========================
     LOOKUP MAPS
  ========================= */

  const skillMap = useMemo(() => {
    return skills.reduce((map, skill) => {
      map[skill.id] = skill;
      return map;
    }, {});
  }, [skills]);

  const departmentMap = useMemo(() => {
    return departments.reduce((map, department) => {
      map[department.id] = department;
      return map;
    }, {});
  }, [departments]);

  /* =========================
     FORM
  ========================= */

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function createProgram(event) {
    event.preventDefault();

    setMessage("");
    setError("");

    if (!form.title.trim()) {
      setError("Training title is required.");
      return;
    }

    if (!form.skill_id) {
      setError("Select the target skill.");
      return;
    }

    if (!form.training_type) {
      setError("Select a training type.");
      return;
    }

    if (
      form.start_date &&
      form.end_date &&
      form.end_date < form.start_date
    ) {
      setError(
        "End date cannot be earlier than the start date."
      );
      return;
    }

    try {
      setCreating(true);

      const payload = {
        institution_id: institutionId,

        department_id:
          form.department_id || null,

        skill_id: form.skill_id,

        title: form.title.trim(),

        description:
          form.description.trim() || null,

        provider:
          form.provider.trim() || null,

        training_type: form.training_type,

        start_date:
          form.start_date || null,

        end_date:
          form.end_date || null,

        status: "planned",

        created_by: user.id,
      };

      const { data, error: insertError } =
        await supabase
          .from("training_programs")
          .insert(payload)
          .select("*")
          .single();

      if (insertError) {
        throw insertError;
      }

      setPrograms((current) => [
        data,
        ...current,
      ]);

      setForm(EMPTY_FORM);

      setMessage(
        "Training program created successfully."
      );
    } catch (err) {
      console.error(
        "Training creation error:",
        err
      );

      setError(
        err?.message ||
          "Unable to create training program."
      );
    } finally {
      setCreating(false);
    }
  }

  /* =========================
     UPDATE STATUS
  ========================= */

  async function updateProgramStatus(
    program,
    newStatus
  ) {
    if (!program?.id) return;

    try {
      setUpdatingId(program.id);
      setMessage("");
      setError("");

      const { data, error: updateError } =
        await supabase
          .from("training_programs")
          .update({
            status: newStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", program.id)
          .select("*")
          .single();

      if (updateError) {
        throw updateError;
      }

      setPrograms((current) =>
        current.map((item) =>
          item.id === program.id
            ? data
            : item
        )
      );

      setMessage(
        `${program.title} is now ${formatStatus(
          newStatus
        ).toLowerCase()}.`
      );
    } catch (err) {
      console.error(
        "Training status update error:",
        err
      );

      setError(
        err?.message ||
          "Unable to update training status."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  /* =========================
     HELPERS
  ========================= */

  function formatStatus(status) {
    if (!status) return "Planned";

    return (
      status.charAt(0).toUpperCase() +
      status.slice(1).toLowerCase()
    );
  }

  function formatType(type) {
    if (!type) return "Training";

    return type
      .split("_")
      .map(
        (word) =>
          word.charAt(0).toUpperCase() +
          word.slice(1)
      )
      .join(" ");
  }

  function formatDate(date) {
    if (!date) return "Not set";

    return new Date(
      `${date}T00:00:00`
    ).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  /* =========================
     FILTER PROGRAMS
  ========================= */

  const filteredPrograms = useMemo(() => {
    if (statusFilter === "all") {
      return programs;
    }

    return programs.filter(
      (program) =>
        program.status === statusFilter
    );
  }, [programs, statusFilter]);

  /* =========================
     STATS
  ========================= */

  const plannedCount = programs.filter(
    (program) => program.status === "planned"
  ).length;

  const activeCount = programs.filter(
    (program) => program.status === "active"
  ).length;

  const completedCount = programs.filter(
    (program) => program.status === "completed"
  ).length;

  const distinctTargetSkills = new Set(
    programs
      .filter(
        (program) =>
          program.status !== "cancelled"
      )
      .map((program) => program.skill_id)
  ).size;

  /* =========================
     LOADING
  ========================= */

  if (loading) {
    return (
      <div className="college-training-page">
        <div className="college-training-state">
          Loading institutional training programs...
        </div>
      </div>
    );
  }

  /* =========================
     PAGE
  ========================= */

  return (
    <div className="college-training-page">
      {/* =========================
          HEADER
      ========================= */}

      <section className="college-training-header">
        <span className="college-training-kicker">
          // skill development intervention
        </span>

        <h1>Training</h1>

        <p>
          Turn identified academia–industry skill gaps into
          targeted workshops, courses, certifications and
          development programs for your students.
        </p>
      </section>

      {/* =========================
          SUMMARY
      ========================= */}

      <section className="college-training-summary">
        <article>
          <span>Planned</span>
          <strong>{plannedCount}</strong>
          <p>
            Programs prepared for upcoming skill
            development.
          </p>
        </article>

        <article>
          <span>Active</span>
          <strong>{activeCount}</strong>
          <p>
            Training interventions currently in progress.
          </p>
        </article>

        <article>
          <span>Completed</span>
          <strong>{completedCount}</strong>
          <p>
            Programs successfully completed by the
            institution.
          </p>
        </article>

        <article>
          <span>Target skills</span>
          <strong>{distinctTargetSkills}</strong>
          <p>
            Distinct skills addressed by current training
            plans.
          </p>
        </article>
      </section>

      {/* =========================
          MESSAGES
      ========================= */}

      {error && (
        <div className="college-training-message error">
          {error}
        </div>
      )}

      {message && (
        <div className="college-training-message success">
          {message}
        </div>
      )}

      {/* =========================
          CREATE PROGRAM
      ========================= */}

      <section className="college-training-create">
        <div className="college-training-section-heading">
          <div>
            <span className="college-training-kicker">
              // create intervention
            </span>

            <h2>New training program</h2>

            <p>
              Select a target skill identified through
              institutional skill-gap analysis.
            </p>
          </div>
        </div>

        <form
          className="college-training-form"
          onSubmit={createProgram}
        >
          <div className="college-training-field wide">
            <label htmlFor="training-title">
              Program title *
            </label>

            <input
              id="training-title"
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="e.g. Data Analysis Foundation Workshop"
            />
          </div>

          <div className="college-training-field">
            <label htmlFor="training-skill">
              Target skill *
            </label>

            <select
              id="training-skill"
              name="skill_id"
              value={form.skill_id}
              onChange={handleChange}
            >
              <option value="">
                Select target skill
              </option>

              {skills.map((skill) => (
                <option
                  key={skill.id}
                  value={skill.id}
                >
                  {skill.name}
                  {skill.category
                    ? ` — ${skill.category}`
                    : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="college-training-field">
            <label htmlFor="training-department">
              Target department
            </label>

            <select
              id="training-department"
              name="department_id"
              value={form.department_id}
              onChange={handleChange}
            >
              <option value="">
                Institution-wide
              </option>

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

          <div className="college-training-field">
            <label htmlFor="training-type">
              Training type *
            </label>

            <select
              id="training-type"
              name="training_type"
              value={form.training_type}
              onChange={handleChange}
            >
              <option value="workshop">
                Workshop
              </option>

              <option value="course">
                Course
              </option>

              <option value="certification">
                Certification
              </option>

              <option value="bootcamp">
                Bootcamp
              </option>

              <option value="mentorship">
                Mentorship
              </option>
            </select>
          </div>

          <div className="college-training-field">
            <label htmlFor="training-provider">
              Provider
            </label>

            <input
              id="training-provider"
              type="text"
              name="provider"
              value={form.provider}
              onChange={handleChange}
              placeholder="e.g. Internal Faculty / Industry Partner"
            />
          </div>

          <div className="college-training-field">
            <label htmlFor="training-start">
              Start date
            </label>

            <input
              id="training-start"
              type="date"
              name="start_date"
              value={form.start_date}
              onChange={handleChange}
            />
          </div>

          <div className="college-training-field">
            <label htmlFor="training-end">
              End date
            </label>

            <input
              id="training-end"
              type="date"
              name="end_date"
              value={form.end_date}
              onChange={handleChange}
            />
          </div>

          <div className="college-training-field wide">
            <label htmlFor="training-description">
              Description
            </label>

            <textarea
              id="training-description"
              name="description"
              value={form.description}
              onChange={handleChange}
              rows="4"
              placeholder="Describe the objective, expected learning outcome or training plan..."
            />
          </div>

          <div className="college-training-form-actions">
            <button
              type="submit"
              disabled={creating}
            >
              {creating
                ? "Creating..."
                : "Create training program"}
            </button>
          </div>
        </form>
      </section>

      {/* =========================
          PROGRAM DIRECTORY
      ========================= */}

      <section className="college-training-programs">
        <div className="college-training-section-heading program-heading">
          <div>
            <span className="college-training-kicker">
              // intervention monitoring
            </span>

            <h2>Training programs</h2>

            <p>
              Monitor planned, active and completed
              institutional skill-development programs.
            </p>
          </div>

          <select
            className="college-training-status-filter"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value)
            }
          >
            <option value="all">
              All statuses
            </option>

            <option value="planned">
              Planned
            </option>

            <option value="active">
              Active
            </option>

            <option value="completed">
              Completed
            </option>

            <option value="cancelled">
              Cancelled
            </option>
          </select>
        </div>

        {programs.length === 0 ? (
          <div className="college-training-empty">
            <span>01</span>

            <div>
              <h3>No training programs yet</h3>

              <p>
                Create the first intervention based on a
                skill identified in your Skill Gap Map.
              </p>
            </div>
          </div>
        ) : filteredPrograms.length === 0 ? (
          <div className="college-training-empty">
            <span>02</span>

            <div>
              <h3>No programs with this status</h3>

              <p>
                Change the status filter to view other
                institutional training programs.
              </p>
            </div>
          </div>
        ) : (
          <div className="college-training-list">
            {filteredPrograms.map((program) => {
              const skill =
                skillMap[program.skill_id];

              const department =
                departmentMap[
                  program.department_id
                ];

              const isUpdating =
                updatingId === program.id;

              return (
                <article
                  className="college-training-card"
                  key={program.id}
                >
                  <div className="college-training-card-top">
                    <div>
                      <div className="college-training-card-tags">
                        <span>
                          {formatType(
                            program.training_type
                          )}
                        </span>

                        <span
                          className={`status ${program.status}`}
                        >
                          {formatStatus(
                            program.status
                          )}
                        </span>
                      </div>

                      <h3>{program.title}</h3>

                      <p>
                        {program.description ||
                          "No description provided."}
                      </p>
                    </div>

                    <div className="college-training-target">
                      <span>Target skill</span>

                      <strong>
                        {skill?.name ||
                          "Unknown skill"}
                      </strong>
                    </div>
                  </div>

                  <div className="college-training-card-details">
                    <div>
                      <span>Department</span>

                      <strong>
                        {department
                          ? department.code ||
                            department.name
                          : "Institution-wide"}
                      </strong>
                    </div>

                    <div>
                      <span>Provider</span>

                      <strong>
                        {program.provider || "—"}
                      </strong>
                    </div>

                    <div>
                      <span>Starts</span>

                      <strong>
                        {formatDate(
                          program.start_date
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>Ends</span>

                      <strong>
                        {formatDate(
                          program.end_date
                        )}
                      </strong>
                    </div>
                  </div>

                  <div className="college-training-card-actions">
                    {program.status === "planned" && (
                      <>
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() =>
                            updateProgramStatus(
                              program,
                              "active"
                            )
                          }
                        >
                          Start program
                        </button>

                        <button
                          type="button"
                          className="secondary danger"
                          disabled={isUpdating}
                          onClick={() =>
                            updateProgramStatus(
                              program,
                              "cancelled"
                            )
                          }
                        >
                          Cancel
                        </button>
                      </>
                    )}

                    {program.status === "active" && (
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() =>
                          updateProgramStatus(
                            program,
                            "completed"
                          )
                        }
                      >
                        Mark completed
                      </button>
                    )}

                    {program.status ===
                      "completed" && (
                      <span className="college-training-finished">
                        ✓ Training completed
                      </span>
                    )}

                    {program.status ===
                      "cancelled" && (
                      <span className="college-training-cancelled">
                        Program cancelled
                      </span>
                    )}

                    {isUpdating && (
                      <span className="college-training-updating">
                        Updating...
                      </span>
                    )}
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

export default Training;