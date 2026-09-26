import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { supabase } from "../../services/supabase";
import { useAuth } from "../../hooks/useAuth";

import "./Profile.css";

function FacultyProfile() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [faculty, setFaculty] = useState(null);
  const [institutionName, setInstitutionName] = useState("");
  const [departmentName, setDepartmentName] = useState("");

  const [isEditing, setIsEditing] = useState(false);

  const [form, setForm] = useState({
    designation: "",
    specialization: "",
    years_experience: "",
    research_interests: "",
    bio: "",
    linkedin_url: "",
  });

  useEffect(() => {
    if (!user?.id) return;

    async function loadProfile() {
      try {
        setLoading(true);
        setError("");

        // ---------------------------------
        // 1. LOAD FACULTY PROFILE
        // ---------------------------------

        const { data: facultyData, error: facultyError } = await supabase
          .from("faculty_profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (facultyError) throw facultyError;

        if (!facultyData) {
          navigate("/faculty/onboarding");
          return;
        }

        setFaculty(facultyData);

        setForm({
          designation: facultyData.designation || "",
          specialization: facultyData.specialization || "",
          years_experience:
            facultyData.years_experience !== null &&
            facultyData.years_experience !== undefined
              ? String(facultyData.years_experience)
              : "",
          research_interests: facultyData.research_interests || "",
          bio: facultyData.bio || "",
          linkedin_url: facultyData.linkedin_url || "",
        });

        // ---------------------------------
        // 2. LOAD INSTITUTION
        // ---------------------------------

        if (facultyData.institution_id) {
          const { data: institutionData, error: institutionError } =
            await supabase
              .from("institutions")
              .select("name")
              .eq("id", facultyData.institution_id)
              .maybeSingle();

          if (institutionError) throw institutionError;

          setInstitutionName(
            institutionData?.name || "Not specified"
          );
        } else {
          setInstitutionName("Not specified");
        }

        // ---------------------------------
        // 3. LOAD DEPARTMENT
        // ---------------------------------

        if (facultyData.department_id) {
          const { data: departmentData, error: departmentError } =
            await supabase
              .from("departments")
              .select("name")
              .eq("id", facultyData.department_id)
              .maybeSingle();

          if (departmentError) throw departmentError;

          setDepartmentName(
            departmentData?.name || "Not specified"
          );
        } else {
          setDepartmentName("Not specified");
        }
      } catch (err) {
        console.error("Faculty profile load error:", err);

        setError(
          err?.message ||
            "Unable to load your faculty profile. Please try again."
        );
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [user?.id, navigate]);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setSuccess("");
    setError("");
  }

  function cancelEditing() {
    if (!faculty) return;

    setForm({
      designation: faculty.designation || "",
      specialization: faculty.specialization || "",
      years_experience:
        faculty.years_experience !== null &&
        faculty.years_experience !== undefined
          ? String(faculty.years_experience)
          : "",
      research_interests: faculty.research_interests || "",
      bio: faculty.bio || "",
      linkedin_url: faculty.linkedin_url || "",
    });

    setIsEditing(false);
    setError("");
    setSuccess("");
  }

  async function handleSave(event) {
    event.preventDefault();

    if (!faculty?.id || !user?.id) return;

    const designation = form.designation.trim();
    const specialization = form.specialization.trim();
    const researchInterests = form.research_interests.trim();
    const bio = form.bio.trim();
    const linkedinUrl = form.linkedin_url.trim();

    if (!designation) {
      setError("Designation is required.");
      return;
    }

    if (!specialization) {
      setError("Primary specialization is required.");
      return;
    }

    let yearsExperience = null;

    if (form.years_experience !== "") {
      yearsExperience = Number(form.years_experience);

      if (
        !Number.isInteger(yearsExperience) ||
        yearsExperience < 0
      ) {
        setError(
          "Years of experience must be a whole number greater than or equal to 0."
        );
        return;
      }
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const updates = {
        designation,
        specialization,
        years_experience: yearsExperience,
        research_interests: researchInterests || null,
        bio: bio || null,
        linkedin_url: linkedinUrl || null,
        updated_at: new Date().toISOString(),
      };

      const { data, error: updateError } = await supabase
        .from("faculty_profiles")
        .update(updates)
        .eq("id", faculty.id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (updateError) throw updateError;

      setFaculty(data);

      setForm({
        designation: data.designation || "",
        specialization: data.specialization || "",
        years_experience:
          data.years_experience !== null &&
          data.years_experience !== undefined
            ? String(data.years_experience)
            : "",
        research_interests: data.research_interests || "",
        bio: data.bio || "",
        linkedin_url: data.linkedin_url || "",
      });

      setIsEditing(false);
      setSuccess("Profile updated successfully.");
    } catch (err) {
      console.error("Faculty profile update error:", err);

      setError(
        err?.message ||
          "Unable to update your faculty profile. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  // =================================
  // LOADING
  // =================================

  if (loading) {
    return (
      <div className="faculty-profile-page">
        <div className="faculty-profile-state">
          <div className="faculty-profile-loader"></div>
          <p>Loading academic profile...</p>
        </div>
      </div>
    );
  }

  // =================================
  // LOAD ERROR
  // =================================

  if (error && !faculty) {
    return (
      <div className="faculty-profile-page">
        <div className="faculty-profile-state faculty-profile-error-state">
          <span>!</span>

          <h2>Unable to load profile</h2>

          <p>{error}</p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="faculty-profile-primary-button"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="faculty-profile-page">
      {/* =========================
          HERO
      ========================= */}

      <section className="faculty-profile-hero">
        <div>
          <p className="faculty-profile-kicker">
            // ACADEMIC PROFILE
          </p>

          <h1>
            Your <span>Faculty Profile</span>
          </h1>

          <p className="faculty-profile-subtitle">
            Maintain your academic expertise, research interests and
            professional information for industry collaboration.
          </p>
        </div>

        {!isEditing && (
          <button
            type="button"
            className="faculty-profile-edit-button"
            onClick={() => {
              setIsEditing(true);
              setSuccess("");
              setError("");
            }}
          >
            Edit profile
          </button>
        )}
      </section>

      {/* =========================
          MESSAGES
      ========================= */}

      {success && (
        <div className="faculty-profile-success">
          ✓ {success}
        </div>
      )}

      {error && (
        <div className="faculty-profile-error">
          {error}
        </div>
      )}

      {/* =========================
          IDENTITY CARD
      ========================= */}

      <section className="faculty-profile-identity-card">
        <div className="faculty-profile-avatar">
          {(user?.user_metadata?.full_name ||
            user?.email ||
            "F")
            .charAt(0)
            .toUpperCase()}
        </div>

        <div className="faculty-profile-identity-copy">
          <p>FACULTY MEMBER</p>

          <h2>
            {user?.user_metadata?.full_name ||
              user?.email?.split("@")[0] ||
              "Faculty Member"}
          </h2>

          <span>
            {form.designation || "Faculty member"}
          </span>
        </div>

        <div className="faculty-profile-identity-divider"></div>

        <div className="faculty-profile-affiliation">
          <div>
            <span>INSTITUTION</span>
            <strong>{institutionName}</strong>
          </div>

          <div>
            <span>DEPARTMENT</span>
            <strong>{departmentName}</strong>
          </div>
        </div>
      </section>

      {/* =========================
          PROFILE CONTENT
      ========================= */}

      {!isEditing ? (
        <div className="faculty-profile-content-grid">
          {/* =========================
              PROFESSIONAL INFORMATION
          ========================= */}

          <section className="faculty-profile-card">
            <div className="faculty-profile-card-heading">
              <p>01</p>

              <div>
                <h2>Professional information</h2>

                <span>
                  Your academic position and primary expertise.
                </span>
              </div>
            </div>

            <div className="faculty-profile-info-grid">
              <div className="faculty-profile-info-item">
                <span>Designation</span>

                <strong>
                  {faculty?.designation || "Not specified"}
                </strong>
              </div>

              <div className="faculty-profile-info-item">
                <span>Experience</span>

                <strong>
                  {faculty?.years_experience !== null &&
                  faculty?.years_experience !== undefined
                    ? `${faculty.years_experience} ${
                        faculty.years_experience === 1
                          ? "year"
                          : "years"
                      }`
                    : "Not specified"}
                </strong>
              </div>

              <div className="faculty-profile-info-item faculty-profile-info-wide">
                <span>Primary specialization</span>

                <strong>
                  {faculty?.specialization ||
                    "Not specified"}
                </strong>
              </div>
            </div>
          </section>

          {/* =========================
              RESEARCH
          ========================= */}

          <section className="faculty-profile-card">
            <div className="faculty-profile-card-heading">
              <p>02</p>

              <div>
                <h2>Research & academic interests</h2>

                <span>
                  Areas that help industry partners identify
                  relevant collaboration.
                </span>
              </div>
            </div>

            <div className="faculty-profile-text-block">
              <span>Research interests</span>

              <p>
                {faculty?.research_interests ||
                  "No research interests added yet."}
              </p>
            </div>
          </section>

          {/* =========================
              ABOUT
          ========================= */}

          <section className="faculty-profile-card">
            <div className="faculty-profile-card-heading">
              <p>03</p>

              <div>
                <h2>About</h2>

                <span>
                  Professional summary visible within your
                  faculty profile.
                </span>
              </div>
            </div>

            <div className="faculty-profile-text-block">
              <span>Academic bio</span>

              <p>
                {faculty?.bio ||
                  "No academic bio added yet."}
              </p>
            </div>
          </section>

          {/* =========================
              PROFESSIONAL LINKS
          ========================= */}

          <section className="faculty-profile-card">
            <div className="faculty-profile-card-heading">
              <p>04</p>

              <div>
                <h2>Professional links</h2>

                <span>
                  Contact and professional identity
                  information.
                </span>
              </div>
            </div>

            <div className="faculty-profile-link-list">
              <div>
                <span>Email</span>

                <strong>
                  {user?.email || "Not available"}
                </strong>
              </div>

              <div>
                <span>LinkedIn</span>

                {faculty?.linkedin_url ? (
                  <a
                    href={faculty.linkedin_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View LinkedIn profile →
                  </a>
                ) : (
                  <strong>Not specified</strong>
                )}
              </div>
            </div>
          </section>
        </div>
      ) : (
        /* =========================
            EDIT FORM
        ========================= */

        <form
          className="faculty-profile-edit-card"
          onSubmit={handleSave}
        >
          <div className="faculty-profile-edit-heading">
            <div>
              <p>// EDIT PROFILE</p>

              <h2>Update academic information</h2>

              <span>
                Keep your faculty profile accurate so industry
                partners can understand your expertise.
              </span>
            </div>
          </div>

          <div className="faculty-profile-form-grid">
            {/* DESIGNATION */}

            <label className="faculty-profile-field">
              <span>Designation *</span>

              <input
                type="text"
                name="designation"
                value={form.designation}
                onChange={handleChange}
                placeholder="e.g. Assistant Professor"
              />
            </label>

            {/* EXPERIENCE */}

            <label className="faculty-profile-field">
              <span>Years of experience</span>

              <input
                type="number"
                min="0"
                step="1"
                name="years_experience"
                value={form.years_experience}
                onChange={handleChange}
                placeholder="e.g. 5"
              />
            </label>

            {/* SPECIALIZATION */}

            <label className="faculty-profile-field faculty-profile-field-full">
              <span>Primary specialization *</span>

              <input
                type="text"
                name="specialization"
                value={form.specialization}
                onChange={handleChange}
                placeholder="e.g. Artificial Intelligence and Machine Learning"
              />
            </label>

            {/* RESEARCH INTERESTS */}

            <label className="faculty-profile-field faculty-profile-field-full">
              <span>Research interests</span>

              <input
                type="text"
                name="research_interests"
                value={form.research_interests}
                onChange={handleChange}
                placeholder="e.g. Computer Vision, Healthcare AI, Explainable AI"
              />
            </label>

            {/* LINKEDIN */}

            <label className="faculty-profile-field faculty-profile-field-full">
              <span>LinkedIn URL</span>

              <input
                type="url"
                name="linkedin_url"
                value={form.linkedin_url}
                onChange={handleChange}
                placeholder="https://linkedin.com/in/..."
              />
            </label>

            {/* BIO */}

            <label className="faculty-profile-field faculty-profile-field-full">
              <span>Academic bio</span>

              <textarea
                name="bio"
                value={form.bio}
                onChange={handleChange}
                placeholder="Describe your teaching, research and academic experience..."
                rows="6"
              />
            </label>
          </div>

          {/* =========================
              FORM ACTIONS
          ========================= */}

          <div className="faculty-profile-form-actions">
            <button
              type="button"
              className="faculty-profile-cancel-button"
              onClick={cancelEditing}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="faculty-profile-primary-button"
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : "Save changes →"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default FacultyProfile;