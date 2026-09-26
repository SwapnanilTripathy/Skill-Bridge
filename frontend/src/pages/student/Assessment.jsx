import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { supabase } from "../../services/supabase";
import "./Assessment.css";

function Assessment() {
  const navigate = useNavigate();

  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* =========================
     LOAD ASSESSMENTS
  ========================= */

  useEffect(() => {
    let cancelled = false;

    async function loadAssessments() {
      try {
        setLoading(true);
        setError("");

        const { data: questions, error: questionError } =
          await supabase
            .from("assessment_questions")
            .select(`
              id,
              difficulty,
              question_type,
              skill_id,
              skills (
                id,
                name,
                category
              )
            `);

        if (questionError) {
          throw questionError;
        }

        const skillMap = {};

        (questions || []).forEach((question) => {
          const skill = question.skills;

          if (!skill) {
            return;
          }

          /*
           * The combination of skill + question type
           * represents one assessment.
           */

          const mapKey = `${skill.id}-${question.question_type}`;

          if (!skillMap[mapKey]) {
            skillMap[mapKey] = {
              id: skill.id,
              name: skill.name,
              category: skill.category,
              questionType: question.question_type,

              questionCount: 0,
              beginnerCount: 0,
              intermediateCount: 0,
              advancedCount: 0,
            };
          }

          skillMap[mapKey].questionCount += 1;

          if (question.difficulty === "beginner") {
            skillMap[mapKey].beginnerCount += 1;
          }

          if (question.difficulty === "intermediate") {
            skillMap[mapKey].intermediateCount += 1;
          }

          if (question.difficulty === "advanced") {
            skillMap[mapKey].advancedCount += 1;
          }
        });

        if (!cancelled) {
          setAssessments(Object.values(skillMap));
        }
      } catch (err) {
        console.error(
          "Assessment loading error:",
          err
        );

        if (!cancelled) {
          setError(
            err?.message ||
              "Unable to load assessments. Please try again."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadAssessments();

    return () => {
      cancelled = true;
    };
  }, []);

  /* =========================
     RETRY
  ========================= */

  async function retryLoadAssessments() {
    try {
      setLoading(true);
      setError("");

      const { data: questions, error: questionError } =
        await supabase
          .from("assessment_questions")
          .select(`
            id,
            difficulty,
            question_type,
            skill_id,
            skills (
              id,
              name,
              category
            )
          `);

      if (questionError) {
        throw questionError;
      }

      const skillMap = {};

      (questions || []).forEach((question) => {
        const skill = question.skills;

        if (!skill) {
          return;
        }

        const mapKey =
          `${skill.id}-${question.question_type}`;

        if (!skillMap[mapKey]) {
          skillMap[mapKey] = {
            id: skill.id,
            name: skill.name,
            category: skill.category,
            questionType: question.question_type,

            questionCount: 0,
            beginnerCount: 0,
            intermediateCount: 0,
            advancedCount: 0,
          };
        }

        skillMap[mapKey].questionCount += 1;

        if (question.difficulty === "beginner") {
          skillMap[mapKey].beginnerCount += 1;
        }

        if (question.difficulty === "intermediate") {
          skillMap[mapKey].intermediateCount += 1;
        }

        if (question.difficulty === "advanced") {
          skillMap[mapKey].advancedCount += 1;
        }
      });

      setAssessments(Object.values(skillMap));
    } catch (err) {
      console.error(
        "Assessment loading error:",
        err
      );

      setError(
        err?.message ||
          "Unable to load assessments. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  /* =========================
     GROUP ASSESSMENTS
  ========================= */

  const technicalAssessments = assessments.filter(
    (assessment) =>
      assessment.questionType === "technical"
  );

  const aptitudeAssessments = assessments.filter(
    (assessment) =>
      assessment.questionType === "aptitude"
  );

  const softSkillAssessments = assessments.filter(
    (assessment) =>
      assessment.questionType === "soft_skill"
  );

  /* =========================
     HELPERS
  ========================= */

  function getTypeLabel(questionType) {
    if (questionType === "aptitude") {
      return "Aptitude";
    }

    if (questionType === "soft_skill") {
      return "Soft Skill";
    }

    return "Technical";
  }

  function getDescription(assessment) {
    if (assessment.questionType === "aptitude") {
      return (
        "Measure logical reasoning, quantitative aptitude " +
        "and analytical problem-solving ability."
      );
    }

    if (assessment.questionType === "soft_skill") {
      return (
        `Evaluate your ${assessment.name} approach through ` +
        "situational workplace questions."
      );
    }

    return (
      `Measure your current ${assessment.name} proficiency ` +
      "through a structured technical assessment."
    );
  }

  /* =========================
     ASSESSMENT CARD
  ========================= */

  function renderAssessmentCard(assessment) {
    return (
      <article
        className="assessment-card"
        key={`${assessment.id}-${assessment.questionType}`}
      >
        <div className="assessment-card-top">
          <span className="assessment-category">
            {getTypeLabel(
              assessment.questionType
            )}
          </span>

          <span className="assessment-question-count">
            {assessment.questionCount} questions
          </span>
        </div>

        <h3>{assessment.name}</h3>

        <p className="assessment-card-description">
          {getDescription(assessment)}
        </p>

        <div className="assessment-levels">
          <div>
            <strong>
              {assessment.beginnerCount}
            </strong>

            <span>Beginner</span>
          </div>

          <div>
            <strong>
              {assessment.intermediateCount}
            </strong>

            <span>Intermediate</span>
          </div>

          <div>
            <strong>
              {assessment.advancedCount}
            </strong>

            <span>Advanced</span>
          </div>
        </div>

        <button
          type="button"
          className="assessment-start-button"
          onClick={() =>
            navigate(
              `/student/assessment/${assessment.id}`
            )
          }
        >
          Start assessment
          <span>→</span>
        </button>
      </article>
    );
  }

  /* =========================
     ASSESSMENT GROUP
  ========================= */

  function renderAssessmentGroup({
    kicker,
    title,
    description,
    items,
  }) {
    if (items.length === 0) {
      return null;
    }

    return (
      <div
        style={{
          marginTop: "34px",
        }}
      >
        <div
          className="assessment-section-heading"
          style={{
            marginBottom: "18px",
          }}
        >
          <div>
            <span className="assessment-kicker">
              // {kicker}
            </span>

            <h2>{title}</h2>

            <p
              style={{
                margin:
                  "7px 0 0",
                color: "#777",
                fontSize: "13px",
                lineHeight: "1.6",
                maxWidth: "650px",
              }}
            >
              {description}
            </p>
          </div>

          <span className="assessment-count">
            {items.length}{" "}
            {items.length === 1
              ? "assessment"
              : "assessments"}
          </span>
        </div>

        <div className="assessment-grid">
          {items.map((assessment) =>
            renderAssessmentCard(assessment)
          )}
        </div>
      </div>
    );
  }

  /* =========================
     LOADING
  ========================= */

  if (loading) {
    return (
      <div className="assessment-page">
        <div className="assessment-state">
          Loading assessments...
        </div>
      </div>
    );
  }

  /* =========================
     PAGE
  ========================= */

  return (
    <div className="assessment-page">
      {/* =========================
          PAGE HEADER
      ========================= */}

      <section className="assessment-header">
        <div>
          <span className="assessment-kicker">
            // skill intelligence
          </span>

          <h1>Skill Assessment</h1>

          <p>
            Build a measured SkillBridge profile across
            technical ability, aptitude and workplace
            soft skills.
          </p>
        </div>
      </section>

      {/* =========================
          PROFILE DIMENSIONS
      ========================= */}

      <section className="assessment-info-grid">
        <div className="assessment-info-card">
          <span>01</span>

          <strong>Technical skills</strong>

          <p>
            Measure proficiency in practical technical
            skills required by industry.
          </p>
        </div>

        <div className="assessment-info-card">
          <span>02</span>

          <strong>Aptitude</strong>

          <p>
            Evaluate reasoning, quantitative ability and
            analytical problem solving.
          </p>
        </div>

        <div className="assessment-info-card">
          <span>03</span>

          <strong>Soft skills</strong>

          <p>
            Evaluate workplace judgement across
            communication, teamwork and leadership.
          </p>
        </div>
      </section>

      {/* =========================
          AVAILABLE ASSESSMENTS
      ========================= */}

      <section className="assessment-list-section">
        <div className="assessment-section-heading">
          <div>
            <span className="assessment-kicker">
              // assessment centre
            </span>

            <h2>Your assessment centre</h2>
          </div>

          <span className="assessment-count">
            {assessments.length} available
          </span>
        </div>

        {/* ERROR */}

        {error && (
          <div className="assessment-error">
            <p>{error}</p>

            <button
              type="button"
              onClick={retryLoadAssessments}
            >
              Try again
            </button>
          </div>
        )}

        {/* EMPTY */}

        {!error &&
          assessments.length === 0 && (
            <div className="assessment-empty">
              <h3>
                No assessments available yet
              </h3>

              <p>
                Assessments will appear here once
                questions are available.
              </p>
            </div>
          )}

        {/* GROUPS */}

        {!error &&
          assessments.length > 0 && (
            <>
              {renderAssessmentGroup({
                kicker: "technical skills",
                title: "Technical Skills",
                description:
                  "Demonstrate your technical proficiency and add assessment-verified skills to your profile.",
                items: technicalAssessments,
              })}

              {renderAssessmentGroup({
                kicker: "aptitude",
                title: "Aptitude",
                description:
                  "Measure reasoning, quantitative ability and analytical thinking used across job roles.",
                items: aptitudeAssessments,
              })}

              {renderAssessmentGroup({
                kicker: "workplace capabilities",
                title: "Soft Skills",
                description:
                  "Situational assessments that measure effective responses to common workplace scenarios.",
                items: softSkillAssessments,
              })}
            </>
          )}
      </section>
    </div>
  );
}

export default Assessment;