import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { supabase } from "../../services/supabase";
import { useAuth } from "../../hooks/useAuth";
import "./RecruiterOpportunities.css";

const PROFICIENCY_LEVELS = [
  "beginner",
  "intermediate",
  "advanced",
];

function CreateOpportunity() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [companyId, setCompanyId] = useState("");
  const [recruiterProfileId, setRecruiterProfileId] = useState("");
  const [skills, setSkills] = useState([]);

  const [title, setTitle] = useState("");
  const [type, setType] = useState("internship");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [workMode, setWorkMode] = useState("hybrid");
  const [duration, setDuration] = useState("");

  const [stipendMin, setStipendMin] = useState("");
  const [stipendMax, setStipendMax] = useState("");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");

  const [minimumCgpa, setMinimumCgpa] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [departmentCodes, setDepartmentCodes] = useState("");
  const [applicationDeadline, setApplicationDeadline] = useState("");

  const [selectedSkills, setSelectedSkills] = useState([]);

  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      if (!user) return;

      setPageLoading(true);
      setError("");

      const [recruiterResult, skillResult] = await Promise.all([
        supabase
            .from("recruiter_profiles")
            .select("id, company_id")
            .eq("user_id", user.id)
            .maybeSingle(),

        supabase
          .from("skills")
          .select("id, name, category")
          .order("category")
          .order("name"),
      ]);

      if (recruiterResult.error) {
        setError(recruiterResult.error.message);
        setPageLoading(false);
        return;
      }

      if (!recruiterResult.data?.company_id) {
        setError("No company is linked to this recruiter account.");
        setPageLoading(false);
        return;
      }

      if (skillResult.error) {
        setError(skillResult.error.message);
        setPageLoading(false);
        return;
      }

      setCompanyId(recruiterResult.data.company_id);
      setRecruiterProfileId(recruiterResult.data.id);
      setSkills(skillResult.data || []);
      setPageLoading(false);
    }

    loadData();
  }, [user]);

  const skillCategories = useMemo(() => {
    return [...new Set(skills.map((skill) => skill.category).filter(Boolean))];
  }, [skills]);

  function addSkill(skill) {
    if (selectedSkills.some((item) => item.skill_id === skill.id)) {
      return;
    }

    setSelectedSkills((current) => [
      ...current,
      {
        skill_id: skill.id,
        name: skill.name,
        category: skill.category,
        requirement_type: "required",
        minimum_proficiency: "intermediate",
        weight: 3,
      },
    ]);
  }

  function removeSkill(skillId) {
    setSelectedSkills((current) =>
      current.filter((item) => item.skill_id !== skillId)
    );
  }

  function updateSkill(skillId, field, value) {
    setSelectedSkills((current) =>
      current.map((item) =>
        item.skill_id === skillId
          ? {
              ...item,
              [field]: field === "weight" ? Number(value) : value,
            }
          : item
      )
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!user) {
      setError("You must be logged in.");
      return;
    }

    if (!companyId) {
      setError("Your recruiter account is not linked to a company.");
      return;
    }

    if (!recruiterProfileId) {
      setError("Your recruiter profile could not be identified.");
      return;
    }

    if (!title.trim()) {
      setError("Enter an opportunity title.");
      return;
    }

    if (!description.trim()) {
      setError("Enter an opportunity description.");
      return;
    }

    if (minimumCgpa && (Number(minimumCgpa) < 0 || Number(minimumCgpa) > 10)) {
      setError("Minimum CGPA must be between 0 and 10.");
      return;
    }

    if (selectedSkills.length === 0) {
      setError("Add at least one required or preferred skill.");
      return;
    }

    if (
      type === "internship" &&
      stipendMin &&
      stipendMax &&
      Number(stipendMin) > Number(stipendMax)
    ) {
      setError("Minimum stipend cannot be greater than maximum stipend.");
      return;
    }

    if (
      type === "job" &&
      salaryMin &&
      salaryMax &&
      Number(salaryMin) > Number(salaryMax)
    ) {
      setError("Minimum salary cannot be greater than maximum salary.");
      return;
    }

    const normalizedDepartmentCodes = departmentCodes
      .split(",")
      .map((code) => code.trim().toUpperCase())
      .filter(Boolean);

    setSaving(true);

    const opportunityPayload = {
      company_id: companyId,
      recruiter_id: recruiterProfileId,
      title: title.trim(),
      type,
      description: description.trim(),
      location: location.trim() || null,
      work_mode: workMode,
      duration: duration.trim() || null,

      stipend_min:
        type === "internship" && stipendMin
          ? Number(stipendMin)
          : null,
      stipend_max:
        type === "internship" && stipendMax
          ? Number(stipendMax)
          : null,

      salary_min:
        type === "job" && salaryMin
          ? Number(salaryMin)
          : null,
      salary_max:
        type === "job" && salaryMax
          ? Number(salaryMax)
          : null,

      minimum_cgpa: minimumCgpa ? Number(minimumCgpa) : null,
      graduation_year: graduationYear ? Number(graduationYear) : null,
      eligible_department_codes:
        normalizedDepartmentCodes.length > 0
          ? normalizedDepartmentCodes
          : null,

      application_deadline: applicationDeadline
        ? new Date(`${applicationDeadline}T23:59:59`).toISOString()
        : null,

      // New opportunities begin as drafts.
      // Recruiters publish them from the opportunities page.
      status: "draft",
    };

    const { data: opportunity, error: opportunityError } = await supabase
      .from("opportunities")
      .insert(opportunityPayload)
      .select("id")
      .single();

    if (opportunityError) {
      setSaving(false);
      setError(opportunityError.message);
      return;
    }

    const skillRows = selectedSkills.map((skill) => ({
      opportunity_id: opportunity.id,
      skill_id: skill.skill_id,
      requirement_type: skill.requirement_type,
      minimum_proficiency: skill.minimum_proficiency,
      weight: skill.weight,
    }));

    const { error: skillsError } = await supabase
      .from("opportunity_skills")
      .insert(skillRows);

    if (skillsError) {
      // Prevent leaving an incomplete opportunity behind if skill insertion fails.
      const { error: cleanupError } = await supabase
        .from("opportunities")
        .delete()
        .eq("id", opportunity.id);

      setSaving(false);

      if (cleanupError) {
        setError(
          `Skills could not be saved, and the incomplete opportunity could not be removed automatically. ${skillsError.message}`
        );
      } else {
        setError(
          `Opportunity could not be created because its skills could not be saved: ${skillsError.message}`
        );
      }

      return;
    }

    setSaving(false);
    navigate("/recruiter/opportunities");
  }

  if (pageLoading) {
    return (
      <div className="recruiter-opportunity-state">
        Loading opportunity builder…
      </div>
    );
  }

  return (
    <div className="create-opportunity-page">
      <section className="create-opportunity-head">
        <button
          type="button"
          onClick={() => navigate("/recruiter/opportunities")}
        >
          ← Back to opportunities
        </button>

        <span>// opportunity builder</span>

        <h1>Create a new opportunity</h1>

        <p>
          Define the role, eligibility rules and skills SkillBridge should use
          when matching students.
        </p>
      </section>

      {error && (
        <div className="create-opportunity-error">
          {error}
        </div>
      )}

      <form className="create-opportunity-form" onSubmit={handleSubmit}>
        <section className="create-opportunity-section">
          <div className="create-opportunity-section-head">
            <span>01</span>
            <div>
              <h2>Role details</h2>
              <p>Describe the internship or job you are hiring for.</p>
            </div>
          </div>

          <div className="create-opportunity-fields">
            <label className="wide">
              <span>Opportunity title</span>
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. Machine Learning Intern"
                required
              />
            </label>

            <label>
              <span>Type</span>
              <select
                value={type}
                onChange={(event) => setType(event.target.value)}
              >
                <option value="internship">Internship</option>
                <option value="job">Job</option>
              </select>
            </label>

            <label>
              <span>Work mode</span>
              <select
                value={workMode}
                onChange={(event) => setWorkMode(event.target.value)}
              >
                <option value="onsite">On-site</option>
                <option value="hybrid">Hybrid</option>
                <option value="remote">Remote</option>
              </select>
            </label>

            <label>
              <span>Location</span>
              <input
                type="text"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="e.g. Kolkata"
              />
            </label>

            <label>
              <span>Duration</span>
              <input
                type="text"
                value={duration}
                onChange={(event) => setDuration(event.target.value)}
                placeholder="e.g. 6 months"
              />
            </label>

            <label className="wide">
              <span>Description</span>
              <textarea
                rows="7"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Responsibilities, role expectations, project context..."
                required
              />
            </label>
          </div>
        </section>

        <section className="create-opportunity-section">
          <div className="create-opportunity-section-head">
            <span>02</span>
            <div>
              <h2>Compensation</h2>
              <p>Add a range when compensation is known.</p>
            </div>
          </div>

          <div className="create-opportunity-fields">
            {type === "internship" ? (
              <>
                <label>
                  <span>Minimum stipend / month</span>
                  <input
                    type="number"
                    min="0"
                    value={stipendMin}
                    onChange={(event) => setStipendMin(event.target.value)}
                    placeholder="10000"
                  />
                </label>

                <label>
                  <span>Maximum stipend / month</span>
                  <input
                    type="number"
                    min="0"
                    value={stipendMax}
                    onChange={(event) => setStipendMax(event.target.value)}
                    placeholder="20000"
                  />
                </label>
              </>
            ) : (
              <>
                <label>
                  <span>Minimum salary</span>
                  <input
                    type="number"
                    min="0"
                    value={salaryMin}
                    onChange={(event) => setSalaryMin(event.target.value)}
                    placeholder="500000"
                  />
                </label>

                <label>
                  <span>Maximum salary</span>
                  <input
                    type="number"
                    min="0"
                    value={salaryMax}
                    onChange={(event) => setSalaryMax(event.target.value)}
                    placeholder="800000"
                  />
                </label>
              </>
            )}
          </div>
        </section>

        <section className="create-opportunity-section">
          <div className="create-opportunity-section-head">
            <span>03</span>
            <div>
              <h2>Eligibility</h2>
              <p>
                These rules will be used before candidate ranking begins.
              </p>
            </div>
          </div>

          <div className="create-opportunity-fields">
            <label>
              <span>Minimum CGPA</span>
              <input
                type="number"
                min="0"
                max="10"
                step="0.01"
                value={minimumCgpa}
                onChange={(event) => setMinimumCgpa(event.target.value)}
                placeholder="7.5"
              />
            </label>

            <label>
              <span>Graduation year</span>
              <input
                type="number"
                min="2026"
                max="2040"
                value={graduationYear}
                onChange={(event) => setGraduationYear(event.target.value)}
                placeholder="2029"
              />
            </label>

            <label className="wide">
              <span>Eligible department codes</span>
              <input
                type="text"
                value={departmentCodes}
                onChange={(event) => setDepartmentCodes(event.target.value)}
                placeholder="CSE, IT, ECE"
              />

              <small>
                Separate codes with commas. They are stored in
                eligible_department_codes.
              </small>
            </label>

            <label className="wide">
              <span>Application deadline</span>
              <input
                type="date"
                value={applicationDeadline}
                onChange={(event) =>
                  setApplicationDeadline(event.target.value)
                }
              />
            </label>
          </div>
        </section>

        <section className="create-opportunity-section">
          <div className="create-opportunity-section-head">
            <span>04</span>
            <div>
              <h2>Required skills</h2>
              <p>
                Choose skills from your existing SkillBridge skill catalog.
              </p>
            </div>
          </div>

          <div className="create-skill-browser">
            {skillCategories.map((category) => (
              <div key={category} className="create-skill-category">
                <span>{category.replaceAll("_", " ")}</span>

                <div>
                  {skills
                    .filter((skill) => skill.category === category)
                    .map((skill) => {
                      const selected = selectedSkills.some(
                        (item) => item.skill_id === skill.id
                      );

                      return (
                        <button
                          key={skill.id}
                          type="button"
                          className={selected ? "selected" : ""}
                          onClick={() => addSkill(skill)}
                          disabled={selected}
                        >
                          {selected ? "✓ " : "+ "}
                          {skill.name}
                        </button>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>

          {selectedSkills.length > 0 && (
            <div className="selected-opportunity-skills">
              {selectedSkills.map((skill) => (
                <article key={skill.skill_id}>
                  <div className="selected-opportunity-skill-name">
                    <strong>{skill.name}</strong>
                    <span>{skill.category?.replaceAll("_", " ")}</span>
                  </div>

                  <label>
                    <span>Requirement</span>
                    <select
                      value={skill.requirement_type}
                      onChange={(event) =>
                        updateSkill(
                          skill.skill_id,
                          "requirement_type",
                          event.target.value
                        )
                      }
                    >
                      <option value="required">Required</option>
                      <option value="preferred">Preferred</option>
                    </select>
                  </label>

                  <label>
                    <span>Minimum proficiency</span>
                    <select
                      value={skill.minimum_proficiency}
                      onChange={(event) =>
                        updateSkill(
                          skill.skill_id,
                          "minimum_proficiency",
                          event.target.value
                        )
                      }
                    >
                      {PROFICIENCY_LEVELS.map((level) => (
                        <option key={level} value={level}>
                          {level.charAt(0).toUpperCase() + level.slice(1)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span>Weight</span>
                    <select
                      value={skill.weight}
                      onChange={(event) =>
                        updateSkill(
                          skill.skill_id,
                          "weight",
                          event.target.value
                        )
                      }
                    >
                      {[1, 2, 3, 4, 5].map((weight) => (
                        <option key={weight} value={weight}>
                          {weight}
                        </option>
                      ))}
                    </select>
                  </label>

                  <button
                    type="button"
                    className="remove"
                    onClick={() => removeSkill(skill.skill_id)}
                    aria-label={`Remove ${skill.name}`}
                  >
                    ×
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

        <div className="create-opportunity-actions">
          <button
            type="button"
            className="secondary"
            onClick={() => navigate("/recruiter/opportunities")}
            disabled={saving}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="primary"
            disabled={saving}
          >
            {saving ? "Creating opportunity…" : "Create opportunity"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreateOpportunity;
