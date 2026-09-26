import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { supabase } from "../../services/supabase";
import { useAuth } from "../../hooks/useAuth";

import "./CreateFacultyOpportunity.css";

const INITIAL_FORM = {
  title: "",
  opportunity_type: "fdp",
  description: "",
  specialization: "",
  mode: "hybrid",
  location: "",
  start_date: "",
  end_date: "",
  application_deadline: "",
  status: "open",
};

function CreateFacultyOpportunity() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [companyId, setCompanyId] = useState(null);
  const [companyName, setCompanyName] = useState("");

  const [form, setForm] = useState(INITIAL_FORM);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  /* =========================
     LOAD RECRUITER COMPANY
  ========================= */

  useEffect(() => {
    if (!user?.id) return;

    async function loadRecruiterCompany() {
      try {
        setLoading(true);
        setError("");

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
            "Your recruiter account is not connected to a company."
          );
        }

        setCompanyId(recruiterProfile.company_id);

        const {
          data: companyData,
          error: companyError,
        } = await supabase
          .from("companies")
          .select("name")
          .eq("id", recruiterProfile.company_id)
          .single();

        if (companyError) {
          throw companyError;
        }

        setCompanyName(companyData?.name || "");
      } catch (err) {
        console.error(
          "Load recruiter company error:",
          err
        );

        setError(
          err?.message ||
            "Unable to load recruiter company."
        );
      } finally {
        setLoading(false);
      }
    }

    loadRecruiterCompany();
  }, [user?.id]);

  /* =========================
     FORM CHANGE
  ========================= */

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  /* =========================
     VALIDATION
  ========================= */

  function validateForm() {
    if (!form.title.trim()) {
      return "Enter a title for the collaboration.";
    }

    if (!form.opportunity_type) {
      return "Select an opportunity type.";
    }

    if (!form.description.trim()) {
      return "Enter a programme description.";
    }

    if (
      form.start_date &&
      form.end_date &&
      form.end_date < form.start_date
    ) {
      return "End date cannot be before the start date.";
    }

    if (
      form.application_deadline &&
      form.start_date &&
      form.application_deadline > form.start_date
    ) {
      return "Application deadline should be on or before the programme start date.";
    }

    return "";
  }

  /* =========================
     CREATE OPPORTUNITY
  ========================= */

  async function handleSubmit(event) {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    if (!user?.id || !companyId) {
      setError(
        "Recruiter company information is unavailable."
      );
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        company_id: companyId,
        title: form.title.trim(),
        description: form.description.trim(),

        opportunity_type:
          form.opportunity_type,

        specialization:
          form.specialization.trim() || null,

        location:
          form.location.trim() || null,

        mode:
          form.mode || null,

        start_date:
          form.start_date || null,

        end_date:
          form.end_date || null,

        application_deadline:
          form.application_deadline || null,

        status:
          form.status,

        created_by:
          user.id,
      };

      const { error: insertError } =
        await supabase
          .from("faculty_opportunities")
          .insert(payload);

      if (insertError) {
        throw insertError;
      }

      navigate(
        "/recruiter/faculty-opportunities"
      );
    } catch (err) {
      console.error(
        "Create faculty opportunity error:",
        err
      );

      setError(
        err?.message ||
          "Unable to create faculty collaboration."
      );
    } finally {
      setSaving(false);
    }
  }

  /* =========================
     LOADING
  ========================= */

  if (loading) {
    return (
      <div className="create-faculty-state">
        Loading collaboration form...
      </div>
    );
  }

  /* =========================
     PAGE
  ========================= */

  return (
    <div className="create-faculty-page">
      {/* HEADER */}

      <section className="create-faculty-header">
        <button
          type="button"
          className="create-faculty-back"
          onClick={() =>
            navigate(
              "/recruiter/faculty-opportunities"
            )
          }
        >
          ← Back to collaborations
        </button>

        <div className="create-faculty-heading-row">
          <div>
            <span className="create-faculty-eyebrow">
              // industry × academia
            </span>

            <h1>
              Create Faculty{" "}
              <span>Collaboration</span>
            </h1>

            <p>
              Publish a programme for faculty
              development, industry exposure,
              research or academic collaboration.
            </p>
          </div>

          {companyName && (
            <div className="create-faculty-company">
              <span>Publishing as</span>
              <strong>{companyName}</strong>
            </div>
          )}
        </div>
      </section>

      {error && (
        <div className="create-faculty-error">
          {error}
        </div>
      )}

      <form
        className="create-faculty-form"
        onSubmit={handleSubmit}
      >
        {/* BASIC INFORMATION */}

        <section className="create-faculty-section">
          <div className="create-faculty-section-number">
            01
          </div>

          <div className="create-faculty-section-content">
            <div className="create-faculty-section-heading">
              <h2>Programme details</h2>

              <p>
                Define the collaboration faculty
                members will discover.
              </p>
            </div>

            <div className="create-faculty-grid">
              <div className="create-faculty-field create-faculty-full">
                <label htmlFor="title">
                  Programme title *
                </label>

                <input
                  id="title"
                  name="title"
                  type="text"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="e.g. Industry Faculty Development Programme on Applied AI"
                />
              </div>

              <div className="create-faculty-field">
                <label htmlFor="opportunity_type">
                  Collaboration type *
                </label>

                <select
                  id="opportunity_type"
                  name="opportunity_type"
                  value={form.opportunity_type}
                  onChange={handleChange}
                >
                  <option value="faculty_internship">
                    Faculty Internship
                  </option>

                  <option value="fdp">
                    Faculty Development Programme
                  </option>

                  <option value="industrial_training">
                    Industrial Training
                  </option>

                  <option value="research_collaboration">
                    Research Collaboration
                  </option>

                  <option value="consultancy">
                    Consultancy
                  </option>

                  <option value="mentorship">
                    Mentorship
                  </option>

                  <option value="guest_lecture">
                    Guest Lecture
                  </option>

                  <option value="live_industry_project">
                    Live Industry Project
                  </option>
                </select>
              </div>

              <div className="create-faculty-field">
                <label htmlFor="specialization">
                  Preferred specialization
                </label>

                <input
                  id="specialization"
                  name="specialization"
                  type="text"
                  value={form.specialization}
                  onChange={handleChange}
                  placeholder="e.g. Artificial Intelligence"
                />
              </div>

              <div className="create-faculty-field create-faculty-full">
                <label htmlFor="description">
                  Description *
                </label>

                <textarea
                  id="description"
                  name="description"
                  rows="6"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Describe the programme, expected participation, focus areas and collaboration objectives..."
                />
              </div>
            </div>
          </div>
        </section>

        {/* DELIVERY */}

        <section className="create-faculty-section">
          <div className="create-faculty-section-number">
            02
          </div>

          <div className="create-faculty-section-content">
            <div className="create-faculty-section-heading">
              <h2>Delivery & location</h2>

              <p>
                Tell faculty members how the
                programme will be conducted.
              </p>
            </div>

            <div className="create-faculty-grid">
              <div className="create-faculty-field">
                <label htmlFor="mode">
                  Mode
                </label>

                <select
                  id="mode"
                  name="mode"
                  value={form.mode}
                  onChange={handleChange}
                >
                  <option value="online">
                    Online
                  </option>

                  <option value="offline">
                    Offline
                  </option>

                  <option value="hybrid">
                    Hybrid
                  </option>
                </select>
              </div>

              <div className="create-faculty-field">
                <label htmlFor="location">
                  Location
                </label>

                <input
                  id="location"
                  name="location"
                  type="text"
                  value={form.location}
                  onChange={handleChange}
                  placeholder="e.g. Kolkata"
                />
              </div>
            </div>
          </div>
        </section>

        {/* DATES */}

        <section className="create-faculty-section">
          <div className="create-faculty-section-number">
            03
          </div>

          <div className="create-faculty-section-content">
            <div className="create-faculty-section-heading">
              <h2>Programme timeline</h2>

              <p>
                Add application and programme
                dates where applicable.
              </p>
            </div>

            <div className="create-faculty-date-grid">
              <div className="create-faculty-field">
                <label htmlFor="application_deadline">
                  Application deadline
                </label>

                <input
                  id="application_deadline"
                  name="application_deadline"
                  type="date"
                  value={
                    form.application_deadline
                  }
                  onChange={handleChange}
                />
              </div>

              <div className="create-faculty-field">
                <label htmlFor="start_date">
                  Start date
                </label>

                <input
                  id="start_date"
                  name="start_date"
                  type="date"
                  value={form.start_date}
                  onChange={handleChange}
                />
              </div>

              <div className="create-faculty-field">
                <label htmlFor="end_date">
                  End date
                </label>

                <input
                  id="end_date"
                  name="end_date"
                  type="date"
                  value={form.end_date}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>
        </section>

        {/* PUBLISH */}

        <section className="create-faculty-section">
          <div className="create-faculty-section-number">
            04
          </div>

          <div className="create-faculty-section-content">
            <div className="create-faculty-section-heading">
              <h2>Publishing</h2>

              <p>
                Publish immediately or save the
                programme as a draft.
              </p>
            </div>

            <div className="create-faculty-field">
              <label htmlFor="status">
                Publication status
              </label>

              <select
                id="status"
                name="status"
                value={form.status}
                onChange={handleChange}
              >
                <option value="open">
                  Open — visible to faculty
                </option>

                <option value="draft">
                  Draft — recruiter only
                </option>
              </select>
            </div>
          </div>
        </section>

        {/* ACTIONS */}

        <div className="create-faculty-actions">
          <button
            type="button"
            className="create-faculty-cancel"
            disabled={saving}
            onClick={() =>
              navigate(
                "/recruiter/faculty-opportunities"
              )
            }
          >
            Cancel
          </button>

          <button
            type="submit"
            className="create-faculty-submit"
            disabled={saving || !companyId}
          >
            {saving
              ? "Creating..."
              : form.status === "draft"
                ? "Save draft"
                : "Publish collaboration →"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreateFacultyOpportunity;