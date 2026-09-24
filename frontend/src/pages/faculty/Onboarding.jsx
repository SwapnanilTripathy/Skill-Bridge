import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { supabase } from "../../services/supabase";
import { useAuth } from "../../hooks/useAuth";
import "./Onboarding.css";

const EMPTY_FORM = {
  institution_id: "",
  department_id: "",
  designation: "",
  specialization: "",
  years_experience: "",
  research_interests: "",
  linkedin_url: "",
  bio: "",
};

function FacultyOnboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [institutions, setInstitutions] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [form, setForm] = useState(EMPTY_FORM);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");

  /* =========================
     LOAD INSTITUTIONS
  ========================= */

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    async function loadOnboardingData() {
      try {
        setLoading(true);
        setError("");

        /* Check whether onboarding is already complete */

        const {
          data: profileData,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select("role, onboarding_completed")
          .eq("id", user.id)
          .single();

        if (profileError) {
          throw profileError;
        }

        if (profileData.role !== "faculty") {
          throw new Error(
            "This account is not registered as a faculty account."
          );
        }

        if (profileData.onboarding_completed) {
          navigate("/faculty", {
            replace: true,
          });
          return;
        }

        /* Load registered institutions */

        const {
          data: institutionData,
          error: institutionError,
        } = await supabase
          .from("institutions")
          .select("id, name")
          .order("name", {
            ascending: true,
          });

        if (institutionError) {
          throw institutionError;
        }

        /* Load departments */

        const {
          data: departmentData,
          error: departmentError,
        } = await supabase
          .from("departments")
          .select("id, institution_id, name, code")
          .order("name", {
            ascending: true,
          });

        if (departmentError) {
          throw departmentError;
        }

        if (!cancelled) {
          setInstitutions(institutionData || []);
          setDepartments(departmentData || []);
        }
      } catch (err) {
        console.error(
          "Faculty onboarding loading error:",
          err
        );

        if (!cancelled) {
          setError(
            err?.message ||
              "Unable to load faculty onboarding."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadOnboardingData();

    return () => {
      cancelled = true;
    };
  }, [user, navigate]);

  /* =========================
     DEPARTMENT FILTER
  ========================= */

  const availableDepartments = useMemo(() => {
    if (!form.institution_id) {
      return [];
    }

    return departments.filter(
      (department) =>
        department.institution_id ===
        form.institution_id
    );
  }, [departments, form.institution_id]);

  /* =========================
     FORM CHANGE
  ========================= */

  function handleChange(event) {
    const { name, value } = event.target;

    if (name === "institution_id") {
      setForm((current) => ({
        ...current,
        institution_id: value,
        department_id: "",
      }));

      return;
    }

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  /* =========================
     SUBMIT ONBOARDING
  ========================= */

  async function handleSubmit(event) {
    event.preventDefault();

    if (!user) return;

    setError("");

    if (!form.institution_id) {
      setError("Please select your institution.");
      return;
    }

    if (!form.department_id) {
      setError("Please select your department.");
      return;
    }

    if (!form.designation.trim()) {
      setError("Please enter your designation.");
      return;
    }

    if (!form.specialization.trim()) {
      setError(
        "Please enter your primary specialization."
      );
      return;
    }

    const experience =
      form.years_experience === ""
        ? null
        : Number(form.years_experience);

    if (
      experience !== null &&
      (!Number.isInteger(experience) ||
        experience < 0)
    ) {
      setError(
        "Years of experience must be zero or a positive whole number."
      );
      return;
    }

    try {
      setSubmitting(true);

      /* =========================
         1. CHECK EXISTING MEMBERSHIP
      ========================= */

      const {
        data: existingMembership,
        error: membershipCheckError,
      } = await supabase
        .from("institution_members")
        .select(
          "id, institution_id, department_id, member_role"
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (membershipCheckError) {
        throw membershipCheckError;
      }

      /* =========================
         2. CREATE / UPDATE MEMBERSHIP
      ========================= */

      if (existingMembership) {
        const {
          error: membershipUpdateError,
        } = await supabase
          .from("institution_members")
          .update({
            institution_id:
              form.institution_id,

            department_id:
              form.department_id,

            member_role: "faculty",

            designation:
              form.designation.trim(),

            is_verified: false,
          })
          .eq("id", existingMembership.id);

        if (membershipUpdateError) {
          throw membershipUpdateError;
        }
      } else {
        const {
          error: membershipInsertError,
        } = await supabase
          .from("institution_members")
          .insert({
            user_id: user.id,

            institution_id:
              form.institution_id,

            department_id:
              form.department_id,

            member_role: "faculty",

            designation:
              form.designation.trim(),

            is_verified: false,
          });

        if (membershipInsertError) {
          throw membershipInsertError;
        }
      }

      /* =========================
         3. CHECK FACULTY PROFILE
      ========================= */

      const {
        data: existingFacultyProfile,
        error: facultyCheckError,
      } = await supabase
        .from("faculty_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (facultyCheckError) {
        throw facultyCheckError;
      }

      const facultyPayload = {
        user_id: user.id,

        institution_id:
          form.institution_id,

        department_id:
          form.department_id,

        designation:
          form.designation.trim(),

        specialization:
          form.specialization.trim(),

        years_experience: experience,

        bio:
          form.bio.trim() || null,

        linkedin_url:
          form.linkedin_url.trim() || null,

        research_interests:
          form.research_interests.trim() ||
          null,

        updated_at:
          new Date().toISOString(),
      };

      /* =========================
         4. CREATE / UPDATE FACULTY PROFILE
      ========================= */

      if (existingFacultyProfile) {
        const {
          error: facultyUpdateError,
        } = await supabase
          .from("faculty_profiles")
          .update(facultyPayload)
          .eq("id", existingFacultyProfile.id);

        if (facultyUpdateError) {
          throw facultyUpdateError;
        }
      } else {
        const {
          error: facultyInsertError,
        } = await supabase
          .from("faculty_profiles")
          .insert(facultyPayload);

        if (facultyInsertError) {
          throw facultyInsertError;
        }
      }

      /* =========================
         5. COMPLETE ONBOARDING
      ========================= */

      const {
        error: completionError,
      } = await supabase
        .from("profiles")
        .update({
          onboarding_completed: true,
        })
        .eq("id", user.id);

      if (completionError) {
        throw completionError;
      }

      /* =========================
         6. GO TO FACULTY PORTAL
      ========================= */

      navigate("/faculty", {
        replace: true,
      });
    } catch (err) {
      console.error(
        "Faculty onboarding error:",
        err
      );

      setError(
        err?.message ||
          "Unable to complete faculty onboarding."
      );
    } finally {
      setSubmitting(false);
    }
  }

  /* =========================
     LOADING
  ========================= */

  if (loading) {
    return (
      <div className="faculty-onboarding-page">
        <div className="faculty-onboarding-state">
          Loading faculty onboarding...
        </div>
      </div>
    );
  }

  /* =========================
     PAGE
  ========================= */

  return (
    <div className="faculty-onboarding-page">
      <div className="faculty-onboarding-container">
        {/* HEADER */}

        <section className="faculty-onboarding-header">
          <span className="faculty-onboarding-kicker">
            // academician onboarding
          </span>

          <h1>
            Set up your faculty profile
          </h1>

          <p>
            Connect your academic profile with your
            institution and discover industry
            collaborations, faculty development
            opportunities and research programs.
          </p>
        </section>

        {/* ERROR */}

        {error && (
          <div className="faculty-onboarding-error">
            {error}
          </div>
        )}

        {/* FORM */}

        <form
          className="faculty-onboarding-form"
          onSubmit={handleSubmit}
        >
          {/* =========================
              ACADEMIC AFFILIATION
          ========================= */}

          <section className="faculty-onboarding-section">
            <div className="faculty-section-heading">
              <span>01</span>

              <div>
                <h2>
                  Academic affiliation
                </h2>

                <p>
                  Select the institution and department
                  you are currently associated with.
                </p>
              </div>
            </div>

            <div className="faculty-form-grid">
              <div className="faculty-form-field">
                <label htmlFor="faculty-institution">
                  Institution *
                </label>

                <select
                  id="faculty-institution"
                  name="institution_id"
                  value={form.institution_id}
                  onChange={handleChange}
                >
                  <option value="">
                    Select institution
                  </option>

                  {institutions.map(
                    (institution) => (
                      <option
                        key={institution.id}
                        value={institution.id}
                      >
                        {institution.name}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="faculty-form-field">
                <label htmlFor="faculty-department">
                  Department *
                </label>

                <select
                  id="faculty-department"
                  name="department_id"
                  value={form.department_id}
                  onChange={handleChange}
                  disabled={
                    !form.institution_id
                  }
                >
                  <option value="">
                    {form.institution_id
                      ? "Select department"
                      : "Select institution first"}
                  </option>

                  {availableDepartments.map(
                    (department) => (
                      <option
                        key={department.id}
                        value={department.id}
                      >
                        {department.code
                          ? `${department.code} — ${department.name}`
                          : department.name}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>
          </section>

          {/* =========================
              PROFESSIONAL PROFILE
          ========================= */}

          <section className="faculty-onboarding-section">
            <div className="faculty-section-heading">
              <span>02</span>

              <div>
                <h2>
                  Professional profile
                </h2>

                <p>
                  Add information that helps industry
                  partners understand your academic
                  expertise.
                </p>
              </div>
            </div>

            <div className="faculty-form-grid">
              <div className="faculty-form-field">
                <label htmlFor="faculty-designation">
                  Designation *
                </label>

                <input
                  id="faculty-designation"
                  type="text"
                  name="designation"
                  value={form.designation}
                  onChange={handleChange}
                  placeholder="e.g. Assistant Professor"
                />
              </div>

              <div className="faculty-form-field">
                <label htmlFor="faculty-experience">
                  Years of experience
                </label>

                <input
                  id="faculty-experience"
                  type="number"
                  min="0"
                  step="1"
                  name="years_experience"
                  value={form.years_experience}
                  onChange={handleChange}
                  placeholder="e.g. 5"
                />
              </div>

              <div className="faculty-form-field faculty-wide">
                <label htmlFor="faculty-specialization">
                  Primary specialization *
                </label>

                <input
                  id="faculty-specialization"
                  type="text"
                  name="specialization"
                  value={form.specialization}
                  onChange={handleChange}
                  placeholder="e.g. Artificial Intelligence and Machine Learning"
                />
              </div>

              <div className="faculty-form-field faculty-wide">
                <label htmlFor="faculty-research">
                  Research interests
                </label>

                <input
                  id="faculty-research"
                  type="text"
                  name="research_interests"
                  value={form.research_interests}
                  onChange={handleChange}
                  placeholder="e.g. Computer Vision, Healthcare AI, Explainable AI"
                />
              </div>

              <div className="faculty-form-field faculty-wide">
                <label htmlFor="faculty-linkedin">
                  LinkedIn URL
                </label>

                <input
                  id="faculty-linkedin"
                  type="url"
                  name="linkedin_url"
                  value={form.linkedin_url}
                  onChange={handleChange}
                  placeholder="https://linkedin.com/in/..."
                />
              </div>

              <div className="faculty-form-field faculty-wide">
                <label htmlFor="faculty-bio">
                  Professional bio
                </label>

                <textarea
                  id="faculty-bio"
                  name="bio"
                  value={form.bio}
                  onChange={handleChange}
                  rows="5"
                  placeholder="Briefly describe your teaching, research or industry collaboration experience..."
                />
              </div>
            </div>
          </section>

          {/* =========================
              NOTE
          ========================= */}

          <div className="faculty-onboarding-note">
            <strong>
              Institution association
            </strong>

            <p>
              Your faculty account will be associated
              with the selected institution. Institutional
              verification can be handled separately by
              the college.
            </p>
          </div>

          {/* =========================
              SUBMIT
          ========================= */}

          <div className="faculty-onboarding-actions">
            <button
              type="submit"
              disabled={submitting}
            >
              {submitting
                ? "Setting up faculty profile..."
                : "Complete faculty setup"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default FacultyOnboarding;