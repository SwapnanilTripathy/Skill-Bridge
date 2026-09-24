import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { supabase } from "../../services/supabase";
import { useAuth } from "../../hooks/useAuth";

import "./DepartmentSetup.css";

function blankDepartment() {
  return {
    id: null,
    name: "",
    code: "",
    studentCount: "",
  };
}

function DepartmentSetup() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const onboardingInstitutionId = location.state?.institutionId || null;
  const onboardingDepartmentCount = Number(
    location.state?.numberOfDepartments || 0
  );

  const [institutionId, setInstitutionId] = useState(
    onboardingInstitutionId
  );
  const [institutionName, setInstitutionName] = useState("");

  const [departments, setDepartments] = useState([]);
  const [originalDepartmentIds, setOriginalDepartmentIds] = useState([]);

  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadDepartmentSetup() {
      if (!user) return;

      setPageLoading(true);
      setError("");
      setMessage("");

      let resolvedInstitutionId = onboardingInstitutionId;

      if (!resolvedInstitutionId) {
        const { data: member, error: memberError } = await supabase
          .from("institution_members")
          .select("institution_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (memberError) {
          setError(memberError.message);
          setPageLoading(false);
          return;
        }

        resolvedInstitutionId = member?.institution_id || null;
      }

      if (!resolvedInstitutionId) {
        setError(
          "No institution is linked to this college account. Complete institution setup first."
        );
        setPageLoading(false);
        return;
      }

      setInstitutionId(resolvedInstitutionId);

      const [institutionResult, departmentResult] = await Promise.all([
        supabase
          .from("institutions")
          .select("id, name")
          .eq("id", resolvedInstitutionId)
          .maybeSingle(),

        supabase
          .from("departments")
          .select("id, name, code, student_count")
          .eq("institution_id", resolvedInstitutionId)
          .order("name"),
      ]);

      if (institutionResult.error) {
        setError(institutionResult.error.message);
        setPageLoading(false);
        return;
      }

      if (departmentResult.error) {
        setError(departmentResult.error.message);
        setPageLoading(false);
        return;
      }

      setInstitutionName(institutionResult.data?.name || "Your institution");

      const existingDepartments = departmentResult.data || [];

      if (existingDepartments.length > 0) {
        const hydrated = existingDepartments.map((department) => ({
          id: department.id,
          name: department.name || "",
          code: department.code || "",
          studentCount:
            department.student_count === null ||
            department.student_count === undefined
              ? ""
              : String(department.student_count),
        }));

        setDepartments(hydrated);
        setOriginalDepartmentIds(
          hydrated.map((department) => department.id)
        );
      } else {
        const initialCount =
          onboardingDepartmentCount > 0 ? onboardingDepartmentCount : 1;

        setDepartments(
          Array.from({ length: initialCount }, () => blankDepartment())
        );

        setOriginalDepartmentIds([]);
      }

      setPageLoading(false);
    }

    loadDepartmentSetup();
  }, [user, onboardingInstitutionId, onboardingDepartmentCount]);

  const configuredCount = useMemo(() => {
    return departments.filter(
      (department) => department.name.trim() && department.code.trim()
    ).length;
  }, [departments]);

  const totalStudents = useMemo(() => {
    return departments.reduce((sum, department) => {
      const value = Number(department.studentCount);
      return sum + (Number.isFinite(value) ? value : 0);
    }, 0);
  }, [departments]);

  function handleDepartmentChange(index, field, value) {
    setMessage("");

    setDepartments((current) =>
      current.map((department, currentIndex) =>
        currentIndex === index
          ? {
              ...department,
              [field]: field === "code" ? value.toUpperCase() : value,
            }
          : department
      )
    );
  }

  function addDepartment() {
    setError("");
    setMessage("");
    setDepartments((current) => [...current, blankDepartment()]);
  }

  function removeDepartment(index) {
    if (departments.length === 1) {
      setError("At least one department is required.");
      return;
    }

    setError("");
    setMessage("");

    setDepartments((current) =>
      current.filter((_, currentIndex) => currentIndex !== index)
    );
  }

  function validateDepartments() {
    if (departments.length === 0) {
      return "Please add at least one department.";
    }

    const normalizedCodes = [];

    for (let index = 0; index < departments.length; index += 1) {
      const department = departments[index];
      const number = index + 1;

      if (!department.name.trim()) {
        return `Enter a name for Department ${number}.`;
      }

      if (!department.code.trim()) {
        return `Enter a code for Department ${number}.`;
      }

      const studentCount = Number(department.studentCount);

      if (
        department.studentCount === "" ||
        !Number.isInteger(studentCount) ||
        studentCount < 0
      ) {
        return `Enter a valid non-negative whole number of students for Department ${number}.`;
      }

      normalizedCodes.push(department.code.trim().toUpperCase());
    }

    const uniqueCodes = new Set(normalizedCodes);

    if (uniqueCodes.size !== normalizedCodes.length) {
      return "Department codes must be unique. The same code cannot be used twice.";
    }

    return "";
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!user) {
      setError("You must be logged in.");
      return;
    }

    if (!institutionId) {
      setError("Institution information is missing.");
      return;
    }

    const validationError = validateDepartments();

    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);

    const currentExistingIds = departments
      .map((department) => department.id)
      .filter(Boolean);

    const removedIds = originalDepartmentIds.filter(
      (id) => !currentExistingIds.includes(id)
    );

    if (removedIds.length > 0) {
      const { error: deleteError } = await supabase
        .from("departments")
        .delete()
        .eq("institution_id", institutionId)
        .in("id", removedIds);

      if (deleteError) {
        setSaving(false);
        setError(deleteError.message);
        return;
      }
    }

    for (const department of departments.filter((item) => item.id)) {
      const { error: updateError } = await supabase
        .from("departments")
        .update({
          name: department.name.trim(),
          code: department.code.trim().toUpperCase(),
          student_count: Number(department.studentCount),
        })
        .eq("id", department.id)
        .eq("institution_id", institutionId);

      if (updateError) {
        setSaving(false);

        if (updateError.code === "23505") {
          setError(
            "A department with the same code already exists for this institution."
          );
        } else {
          setError(updateError.message);
        }

        return;
      }
    }

    const newDepartments = departments.filter(
      (department) => !department.id
    );

    if (newDepartments.length > 0) {
      const { error: insertError } = await supabase
        .from("departments")
        .insert(
          newDepartments.map((department) => ({
            institution_id: institutionId,
            name: department.name.trim(),
            code: department.code.trim().toUpperCase(),
            student_count: Number(department.studentCount),
          }))
        );

      if (insertError) {
        setSaving(false);

        if (insertError.code === "23505") {
          setError(
            "A department with the same code already exists for this institution."
          );
        } else {
          setError(insertError.message);
        }

        return;
      }
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        onboarding_completed: true,
      })
      .eq("id", user.id);

    if (profileError) {
      setSaving(false);
      setError(profileError.message);
      return;
    }

    const { data: refreshedDepartments, error: refreshError } = await supabase
      .from("departments")
      .select("id, name, code, student_count")
      .eq("institution_id", institutionId)
      .order("name");

    if (refreshError) {
      setSaving(false);
      setError(refreshError.message);
      return;
    }

    const hydrated = (refreshedDepartments || []).map((department) => ({
      id: department.id,
      name: department.name || "",
      code: department.code || "",
      studentCount: String(department.student_count ?? 0),
    }));

    setDepartments(hydrated);
    setOriginalDepartmentIds(hydrated.map((department) => department.id));

    setSaving(false);
    setMessage(
      `${hydrated.length} department${
        hydrated.length === 1 ? "" : "s"
      } saved successfully.`
    );

    if (onboardingInstitutionId && originalDepartmentIds.length === 0) {
      navigate("/college");
    }
  }

  if (pageLoading) {
    return (
      <div className="department-setup-state">Loading departments…</div>
    );
  }

  if (!institutionId) {
    return (
      <div className="department-setup-state error">
        <h2>Institution setup required</h2>

        <p>
          {error ||
            "Complete your institution details before adding departments."}
        </p>

        <button
          type="button"
          onClick={() => navigate("/college/onboarding")}
        >
          Go to Institution Setup
        </button>
      </div>
    );
  }

  return (
    <div className="department-setup-page">
      <section className="department-setup-hero">
        <div>
          <span className="department-setup-kicker">// department setup</span>

          <h1>
            Configure your <span>departments</span>
          </h1>

          <p>
            Add the academic departments that belong to{" "}
            <strong>{institutionName}</strong>. Department codes are used later
            for student eligibility and opportunity matching.
          </p>
        </div>

        <div className="department-setup-progress-card">
          <strong>
            {configuredCount}/{departments.length}
          </strong>

          <span>configured</span>

          <div className="department-progress-track">
            <div
              style={{
                width: `${
                  departments.length
                    ? Math.round((configuredCount / departments.length) * 100)
                    : 0
                }%`,
              }}
            ></div>
          </div>
        </div>
      </section>

      <section className="department-setup-summary">
        <div>
          <span>Total departments</span>
          <strong>{departments.length}</strong>
        </div>

        <div>
          <span>Configured</span>
          <strong>{configuredCount}</strong>
        </div>

        <div>
          <span>Declared students</span>
          <strong>{totalStudents}</strong>
        </div>
      </section>

      {error && <div className="department-setup-alert error">{error}</div>}

      {message && (
        <div className="department-setup-alert success">{message}</div>
      )}

      <form className="department-setup-form" onSubmit={handleSubmit}>
        <div className="department-card-grid">
          {departments.map((department, index) => {
            const complete =
              department.name.trim() &&
              department.code.trim() &&
              department.studentCount !== "";

            return (
              <article
                className={`department-edit-card ${complete ? "complete" : ""}`}
                key={department.id || `new-${index}`}
              >
                <div className="department-card-head">
                  <div className="department-number">
                    {String(index + 1).padStart(2, "0")}
                  </div>

                  <div>
                    <span>
                      {department.id ? "Saved department" : "New department"}
                    </span>

                    <h2>
                      {department.name.trim() || `Department ${index + 1}`}
                    </h2>
                  </div>

                  <button
                    type="button"
                    className="department-remove-button"
                    onClick={() => removeDepartment(index)}
                    aria-label={`Remove Department ${index + 1}`}
                  >
                    ×
                  </button>
                </div>

                <div className="department-card-fields">
                  <label className="wide">
                    <span>Department name</span>

                    <input
                      type="text"
                      value={department.name}
                      onChange={(event) =>
                        handleDepartmentChange(index, "name", event.target.value)
                      }
                      placeholder="Computer Science & Engineering"
                    />
                  </label>

                  <label>
                    <span>Department code</span>

                    <input
                      type="text"
                      value={department.code}
                      onChange={(event) =>
                        handleDepartmentChange(index, "code", event.target.value)
                      }
                      placeholder="CSE"
                    />
                  </label>

                  <label>
                    <span>Number of students</span>

                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={department.studentCount}
                      onChange={(event) =>
                        handleDepartmentChange(
                          index,
                          "studentCount",
                          event.target.value
                        )
                      }
                      placeholder="180"
                    />
                  </label>
                </div>

                <div className="department-card-foot">
                  <span className={complete ? "complete" : "incomplete"}>
                    {complete ? "✓ Ready to save" : "Complete all fields"}
                  </span>

                  {department.code && (
                    <strong>{department.code.trim().toUpperCase()}</strong>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        <button
          className="department-add-button"
          type="button"
          onClick={addDepartment}
        >
          <span>+</span>
          Add another department
        </button>

        <div className="department-save-bar">
          <div>
            <strong>
              {departments.length} department
              {departments.length === 1 ? "" : "s"}
            </strong>

            <span>Review the details before saving.</span>
          </div>

          <div className="department-save-actions">
            {originalDepartmentIds.length > 0 && (
              <button
                type="button"
                className="department-secondary-button"
                onClick={() => navigate("/college")}
                disabled={saving}
              >
                Back to dashboard
              </button>
            )}

            <button
              type="submit"
              className="department-primary-button"
              disabled={saving}
            >
              {saving
                ? "Saving departments…"
                : originalDepartmentIds.length > 0
                  ? "Save Changes"
                  : "Complete Setup"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default DepartmentSetup;
