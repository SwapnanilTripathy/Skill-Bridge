import { useState } from "react";

import { supabase } from "../services/supabase";
import { useAuth } from "../hooks/useAuth";

import "./ResumeUpload.css";

function ResumeUpload({ studentId, onUploadComplete }) {
  const { user } = useAuth();

  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Skills detected by Flask from the resume
  const [detectedSkills, setDetectedSkills] = useState([]);

  // --------------------------------------------------
  // SELECT FILE
  // --------------------------------------------------

  function handleFileChange(event) {
    const file = event.target.files[0];

    setError("");
    setSuccess("");
    setDetectedSkills([]);

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (file.type !== "application/pdf") {
      setError("Please select a PDF file.");
      setSelectedFile(null);
      return;
    }

    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
      setError("Resume must be smaller than 5 MB.");
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  }

  // --------------------------------------------------
  // FORMAT FILE SIZE
  // --------------------------------------------------

  function formatFileSize(bytes) {
    if (!bytes) {
      return "0 KB";
    }

    const kb = bytes / 1024;

    if (kb < 1024) {
      return `${kb.toFixed(1)} KB`;
    }

    return `${(kb / 1024).toFixed(2)} MB`;
  }

  // --------------------------------------------------
  // UPLOAD RESUME
  // --------------------------------------------------

  async function handleUpload() {
    setError("");
    setSuccess("");
    setDetectedSkills([]);

    if (!user) {
      setError("You must be logged in.");
      return;
    }

    if (!studentId) {
      setError("Student profile information is missing.");
      return;
    }

    if (!selectedFile) {
      setError("Please choose a PDF resume.");
      return;
    }

    setUploading(true);

    // --------------------------------------------------
    // LOAD SKILLBRIDGE SKILL CATALOG
    // --------------------------------------------------

    const { data: skillCatalog, error: skillCatalogError } =
      await supabase
        .from("skills")
        .select("id, name, category");

    if (skillCatalogError) {
      setUploading(false);

      setError(
        `Could not load SkillBridge skill catalog: ${skillCatalogError.message}`
      );

      return;
    }

    // --------------------------------------------------
    // CREATE SAFE FILE NAME
    // --------------------------------------------------

    const safeFileName = selectedFile.name
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9._-]/g, "");

    const filePath =
      `${user.id}/${Date.now()}-${safeFileName}`;

    // --------------------------------------------------
    // 1. UPLOAD PDF TO SUPABASE STORAGE
    // --------------------------------------------------

    const { error: uploadError } =
      await supabase.storage
        .from("resume")
        .upload(filePath, selectedFile, {
          contentType: "application/pdf",
          upsert: false,
        });

    if (uploadError) {
      setUploading(false);
      setError(uploadError.message);
      return;
    }

    // --------------------------------------------------
    // 2. MARK OLD RESUMES AS NOT CURRENT
    // --------------------------------------------------

    const { error: oldResumeError } =
      await supabase
        .from("resumes")
        .update({
          is_current: false,
        })
        .eq("student_id", studentId)
        .eq("is_current", true);

    if (oldResumeError) {
      await supabase.storage
        .from("resume")
        .remove([filePath]);

      setUploading(false);
      setError(oldResumeError.message);
      return;
    }

    // --------------------------------------------------
    // 3. CREATE RESUME DATABASE RECORD
    // --------------------------------------------------

    const { data: resumeData, error: resumeError } =
      await supabase
        .from("resumes")
        .insert({
          student_id: studentId,
          file_url: filePath,
          file_name: selectedFile.name,
          is_current: true,
        })
        .select()
        .single();

    if (resumeError) {
      await supabase.storage
        .from("resume")
        .remove([filePath]);

      setUploading(false);
      setError(resumeError.message);
      return;
    }

    // --------------------------------------------------
    // 4. SEND PDF + SKILL CATALOG TO FLASK
    // --------------------------------------------------

    try {
      const formData = new FormData();

      formData.append("resume", selectedFile);

      formData.append(
        "skill_catalog",
        JSON.stringify(skillCatalog || [])
      );

      const parseResponse = await fetch(
        "http://127.0.0.1:5000/api/resume/parse",
        {
          method: "POST",
          body: formData,
        }
      );

      const parseResult = await parseResponse.json();

      console.log(
        "SkillBridge detected skills:",
        parseResult.detected_skills
      );

      if (!parseResponse.ok || !parseResult.success) {
        setUploading(false);

        setError(
          parseResult.message ||
            "Resume uploaded, but text extraction failed."
        );

        return;
      }

      // --------------------------------------------------
      // 5. SAVE EXTRACTED TEXT
      // --------------------------------------------------

      const { error: parsedTextError } =
        await supabase
          .from("resumes")
          .update({
            parsed_text: parseResult.text,
          })
          .eq("id", resumeData.id);

      if (parsedTextError) {
        setUploading(false);

        setError(
          `Resume was uploaded, but extracted text could not be saved: ${parsedTextError.message}`
        );

        return;
      }

      // --------------------------------------------------
      // 6. STORE DETECTED SKILLS IN COMPONENT
      // --------------------------------------------------

      const skillsFound =
        parseResult.detected_skills || [];

      setDetectedSkills(skillsFound);

      // --------------------------------------------------
      // 7. UPDATE PROFILE COMPLETION
      // --------------------------------------------------

      const { error: profileError } =
        await supabase
          .from("student_profiles")
          .update({
            profile_completion: 70,
          })
          .eq("id", studentId);

      if (profileError) {
        setUploading(false);
        setError(profileError.message);
        return;
      }

      // --------------------------------------------------
      // 8. FINISHED
      // --------------------------------------------------

      setSelectedFile(null);
      setUploading(false);

      if (skillsFound.length > 0) {
        setSuccess(
          `Resume analysed successfully. ${skillsFound.length} skills detected.`
        );
      } else {
        setSuccess(
          "Resume analysed successfully. No skills from the SkillBridge catalog were detected."
        );
      }

      if (onUploadComplete) {
        onUploadComplete({
          ...resumeData,
          parsed_text: parseResult.text,
          detected_skills: skillsFound,
        });
      }
    } catch (parseError) {
      console.error(
        "Resume parsing error:",
        parseError
      );

      setUploading(false);

      setError(
        "Resume was uploaded, but SkillBridge could not connect to the resume parser. Make sure the Flask backend is running."
      );
    }
  }

  // --------------------------------------------------
  // COMPONENT
  // --------------------------------------------------

  return (
    <div className="resume-uploader">
      <div className="resume-drop-area">

        <div className="resume-upload-icon">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 16V4" />
            <path d="M7 9l5-5 5 5" />
            <path d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
          </svg>
        </div>

        <h3 className="resume-uploader-title">
          Upload your resume
        </h3>

        <p className="resume-uploader-description">
          SkillBridge will analyse your resume and
          identify skills that can be used for
          opportunity matching.
        </p>

        <input
          id="resume-file-input"
          className="resume-file-input"
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileChange}
        />

        <label
          htmlFor="resume-file-input"
          className="resume-select-button"
        >
          <span className="resume-plus">+</span>
          Choose PDF
        </label>

        {selectedFile && (
          <div className="resume-selected-card">
            <div className="resume-pdf-icon">
              PDF
            </div>

            <div className="resume-selected-info">
              <strong>
                {selectedFile.name}
              </strong>

              <span>
                {formatFileSize(
                  selectedFile.size
                )}
              </span>
            </div>
          </div>
        )}

        <button
          className="resume-process-button"
          type="button"
          onClick={handleUpload}
          disabled={
            uploading || !selectedFile
          }
        >
          {uploading
            ? "Analysing Resume..."
            : "Upload & Analyse Resume"}
        </button>

        <p className="resume-file-note">
          PDF ONLY · MAXIMUM 5 MB
        </p>

        {error && (
          <div className="resume-status resume-error">
            {error}
          </div>
        )}

        {success && (
          <div className="resume-status resume-success">
            {success}
          </div>
        )}
      </div>

      {/* ----------------------------------------------
          DETECTED SKILLS
      ---------------------------------------------- */}

      {detectedSkills.length > 0 && (
        <div className="resume-detected-section">

          <div className="resume-detected-header">
            <div>
              <span className="resume-detected-label">
                // RESUME ANALYSIS
              </span>

              <h4>
                Skills detected from your resume
              </h4>
            </div>

            <div className="resume-detected-count">
              <strong>
                {detectedSkills.length}
              </strong>

              <span>detected</span>
            </div>
          </div>

          <p className="resume-detected-description">
            These skills were found by comparing your
            resume with the SkillBridge skill catalog.
          </p>

          <div className="resume-skill-list">
            {detectedSkills.map(
              (skill, index) => (
                <div
                  className="resume-skill-chip"
                  key={
                    skill.id ||
                    `${skill.name}-${index}`
                  }
                >
                  <span className="resume-skill-check">
                    ✓
                  </span>

                  <span>
                    {skill.name}
                  </span>

                  {skill.category && (
                    <small>
                      {skill.category}
                    </small>
                  )}
                </div>
              )
            )}
          </div>

          <div className="resume-review-note">
            <strong>
              Next step:
            </strong>{" "}
            Review these skills and choose your
            proficiency before adding them to your
            SkillBridge skill profile.
          </div>
        </div>
      )}
    </div>
  );
}

export default ResumeUpload;