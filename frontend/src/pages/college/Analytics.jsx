import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { supabase } from "../../services/supabase";
import { useAuth } from "../../hooks/useAuth";

import "./Analytics.css";

function Analytics() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [institution, setInstitution] = useState(null);
  const [students, setStudents] = useState([]);
  const [applications, setApplications] = useState([]);
  const [opportunitySkills, setOpportunitySkills] = useState([]);
  const [skills, setSkills] = useState([]);
  const [studentSkills, setStudentSkills] = useState([]);
  const [trainingPrograms, setTrainingPrograms] = useState([]);

  useEffect(() => {
    if (!user?.id) return;

    async function loadAnalytics() {
      try {
        setLoading(true);
        setError("");

        /* =========================
           1. INSTITUTION MEMBERSHIP
        ========================= */

        const { data: memberData, error: memberError } = await supabase
          .from("institution_members")
          .select("institution_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (memberError) throw memberError;

        if (!memberData?.institution_id) {
          throw new Error(
            "Your account is not connected to an institution."
          );
        }

        const institutionId = memberData.institution_id;

        /* =========================
           2. INSTITUTION
        ========================= */

        const { data: institutionData, error: institutionError } =
          await supabase
            .from("institutions")
            .select("id, name")
            .eq("id", institutionId)
            .single();

        if (institutionError) throw institutionError;

        setInstitution(institutionData);

        /* =========================
           3. STUDENTS
        ========================= */

        const { data: studentData, error: studentError } =
          await supabase
            .from("student_profiles")
            .select(
              `
                id,
                user_id,
                department_id,
                profile_completion,
                verification_status
              `
            )
            .eq("institution_id", institutionId);

        if (studentError) throw studentError;

        const institutionStudents = studentData || [];
        setStudents(institutionStudents);

        const studentIds = institutionStudents.map(
          (student) => student.id
        );

        /* =========================
           4. APPLICATIONS
        ========================= */

        if (studentIds.length > 0) {
          const { data: applicationData, error: applicationError } =
            await supabase
              .from("applications")
              .select(
                `
                  id,
                  student_id,
                  opportunity_id,
                  status,
                  applied_at
                `
              )
              .in("student_id", studentIds);

          if (applicationError) throw applicationError;

          setApplications(applicationData || []);
        } else {
          setApplications([]);
        }

        /* =========================
           5. STUDENT SKILLS
        ========================= */

        if (studentIds.length > 0) {
          const { data: studentSkillData, error: studentSkillError } =
            await supabase
              .from("student_skills")
              .select(
                `
                  student_id,
                  skill_id,
                  proficiency,
                  verified
                `
              )
              .in("student_id", studentIds);

          if (studentSkillError) throw studentSkillError;

          setStudentSkills(studentSkillData || []);
        } else {
          setStudentSkills([]);
        }

        /* =========================
           6. OPEN OPPORTUNITIES
        ========================= */

        const { data: opportunityData, error: opportunityError } =
          await supabase
            .from("opportunities")
            .select("id")
            .eq("status", "open");

        if (opportunityError) throw opportunityError;

        const opportunityIds = (opportunityData || []).map(
          (opportunity) => opportunity.id
        );

        /* =========================
           7. INDUSTRY SKILL DEMAND
        ========================= */

        if (opportunityIds.length > 0) {
          const {
            data: opportunitySkillData,
            error: opportunitySkillError,
          } = await supabase
            .from("opportunity_skills")
            .select(
              `
                opportunity_id,
                skill_id,
                requirement_type,
                weight
              `
            )
            .in("opportunity_id", opportunityIds);

          if (opportunitySkillError) {
            throw opportunitySkillError;
          }

          setOpportunitySkills(opportunitySkillData || []);
        } else {
          setOpportunitySkills([]);
        }

        /* =========================
           8. SKILLS
        ========================= */

        const { data: skillData, error: skillError } =
          await supabase
            .from("skills")
            .select("id, name, category");

        if (skillError) throw skillError;

        setSkills(skillData || []);

        /* =========================
           9. TRAINING PROGRAMS
        ========================= */

        const { data: trainingData, error: trainingError } =
          await supabase
            .from("training_programs")
            .select(
              `
                id,
                skill_id,
                title,
                training_type,
                status
              `
            )
            .eq("institution_id", institutionId);

        if (trainingError) throw trainingError;

        setTrainingPrograms(trainingData || []);
      } catch (loadError) {
        console.error("College analytics error:", loadError);

        setError(
          loadError?.message ||
            "Unable to load institution analytics."
        );
      } finally {
        setLoading(false);
      }
    }

    loadAnalytics();
  }, [user?.id]);

  /* =========================
     STUDENT ANALYTICS
  ========================= */

  const verifiedStudents = useMemo(() => {
    return students.filter(
      (student) => student.verification_status === "verified"
    ).length;
  }, [students]);

  const averageProfileCompletion = useMemo(() => {
    if (!students.length) return 0;

    const total = students.reduce(
      (sum, student) =>
        sum + Number(student.profile_completion || 0),
      0
    );

    return Math.round(total / students.length);
  }, [students]);

  /* =========================
     APPLICATION ANALYTICS
  ========================= */

  const applicationStats = useMemo(() => {
    const stats = {
      total: applications.length,
      applied: 0,
      shortlisted: 0,
      interview: 0,
      selected: 0,
      rejected: 0,
      withdrawn: 0,
    };

    applications.forEach((application) => {
      if (
        Object.prototype.hasOwnProperty.call(
          stats,
          application.status
        )
      ) {
        stats[application.status] += 1;
      }
    });

    return stats;
  }, [applications]);

  const studentsWithApplications = useMemo(() => {
    return new Set(
      applications.map((application) => application.student_id)
    ).size;
  }, [applications]);

  const participationRate = students.length
    ? Math.round(
        (studentsWithApplications / students.length) * 100
      )
    : 0;

  const selectedStudentCount = useMemo(() => {
    return new Set(
      applications
        .filter((application) => application.status === "selected")
        .map((application) => application.student_id)
    ).size;
  }, [applications]);

  /* =========================
     TRAINING ANALYTICS
  ========================= */

  const activeTraining = useMemo(() => {
    return trainingPrograms.filter(
      (program) => program.status === "active"
    ).length;
  }, [trainingPrograms]);

  const plannedTraining = useMemo(() => {
    return trainingPrograms.filter(
      (program) => program.status === "planned"
    ).length;
  }, [trainingPrograms]);

  const completedTraining = useMemo(() => {
    return trainingPrograms.filter(
      (program) => program.status === "completed"
    ).length;
  }, [trainingPrograms]);

  /* =========================
     INDUSTRY SKILL DEMAND
  ========================= */

  const skillDemand = useMemo(() => {
    const skillMap = new Map(
      skills.map((skill) => [skill.id, skill])
    );

    const demandMap = {};

    opportunitySkills.forEach((requirement) => {
      if (!demandMap[requirement.skill_id]) {
        demandMap[requirement.skill_id] = {
          skillId: requirement.skill_id,
          demandPoints: 0,
          opportunityIds: new Set(),
        };
      }

      demandMap[requirement.skill_id].demandPoints += Number(
        requirement.weight || 0
      );

      demandMap[requirement.skill_id].opportunityIds.add(
        requirement.opportunity_id
      );
    });

    return Object.values(demandMap)
      .map((item) => ({
        skillId: item.skillId,
        name: skillMap.get(item.skillId)?.name || "Unknown skill",
        category:
          skillMap.get(item.skillId)?.category || "General",
        demandPoints: item.demandPoints,
        opportunityCount: item.opportunityIds.size,
      }))
      .sort((a, b) => b.demandPoints - a.demandPoints);
  }, [skills, opportunitySkills]);

  /* =========================
     SKILL COVERAGE
  ========================= */

  const demandedSkillIds = useMemo(() => {
    return new Set(
      opportunitySkills.map(
        (requirement) => requirement.skill_id
      )
    );
  }, [opportunitySkills]);

  /*
    We count unique student + demanded-skill pairs.
    This avoids accidental duplicate rows affecting coverage.
  */

  const recordedDemandedSkillPairs = useMemo(() => {
    const pairs = new Set();

    studentSkills.forEach((studentSkill) => {
      if (demandedSkillIds.has(studentSkill.skill_id)) {
        pairs.add(
          `${studentSkill.student_id}:${studentSkill.skill_id}`
        );
      }
    });

    return pairs;
  }, [studentSkills, demandedSkillIds]);

  const verifiedDemandedSkillPairs = useMemo(() => {
    const pairs = new Set();

    studentSkills.forEach((studentSkill) => {
      if (
        demandedSkillIds.has(studentSkill.skill_id) &&
        studentSkill.verified === true
      ) {
        pairs.add(
          `${studentSkill.student_id}:${studentSkill.skill_id}`
        );
      }
    });

    return pairs;
  }, [studentSkills, demandedSkillIds]);

  const totalPossibleCoverage =
    students.length * demandedSkillIds.size;

  const recordedCoverage = totalPossibleCoverage
    ? Math.round(
        (recordedDemandedSkillPairs.size /
          totalPossibleCoverage) *
          100
      )
    : 0;

  const verifiedCoverage = totalPossibleCoverage
    ? Math.round(
        (verifiedDemandedSkillPairs.size /
          totalPossibleCoverage) *
          100
      )
    : 0;

  /* =========================
     PRIORITY SKILL GAPS
  ========================= */

  const topSkillGaps = useMemo(() => {
    if (!students.length) {
      return skillDemand.slice(0, 5).map((skill) => ({
        ...skill,
        coverage: 0,
        gap: 100,
      }));
    }

    return skillDemand
      .map((skill) => {
        const studentsWithSkill = new Set(
          studentSkills
            .filter(
              (studentSkill) =>
                studentSkill.skill_id === skill.skillId
            )
            .map((studentSkill) => studentSkill.student_id)
        ).size;

        const coverage = Math.round(
          (studentsWithSkill / students.length) * 100
        );

        return {
          ...skill,
          coverage,
          gap: 100 - coverage,
        };
      })
      .sort((a, b) => {
        if (b.gap !== a.gap) {
          return b.gap - a.gap;
        }

        return b.demandPoints - a.demandPoints;
      })
      .slice(0, 5);
  }, [skillDemand, studentSkills, students]);

  /* =========================
     LOADING
  ========================= */

  if (loading) {
    return (
      <div className="college-analytics-state">
        <div className="college-analytics-loader" />
        <p>Loading institution analytics...</p>
      </div>
    );
  }

  /* =========================
     ERROR
  ========================= */

  if (error) {
    return (
      <div className="college-analytics-state error">
        <h2>Unable to load analytics</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="college-analytics-page">
      {/* HERO */}

      <section className="college-analytics-hero">
        <div className="college-analytics-kicker">
          // INSTITUTION INTELLIGENCE
        </div>

        <h1>
          Institution <span>Analytics</span>
        </h1>

        <p>
          Monitor student readiness, industry participation,
          skill demand and institutional training activity.
        </p>

        <div className="college-analytics-institution">
          <span>INSTITUTION</span>

          <strong>
            {institution?.name || "Your institution"}
          </strong>
        </div>
      </section>

      {/* TOP METRICS */}

      <section className="college-analytics-metrics">
        <article className="analytics-metric-card">
          <div className="analytics-metric-top">
            <span className="analytics-metric-icon purple">
              ◫
            </span>
          </div>

          <span className="analytics-metric-label">
            Registered students
          </span>

          <strong className="analytics-metric-number">
            {students.length}
          </strong>

          <p>{verifiedStudents} verified students</p>
        </article>

        <article className="analytics-metric-card">
          <div className="analytics-metric-top">
            <span className="analytics-metric-icon blue">
              ↗
            </span>
          </div>

          <span className="analytics-metric-label">
            Applications
          </span>

          <strong className="analytics-metric-number">
            {applicationStats.total}
          </strong>

          <p>{participationRate}% student participation</p>
        </article>

        <article className="analytics-metric-card">
          <div className="analytics-metric-top">
            <span className="analytics-metric-icon green">
              ✓
            </span>
          </div>

          <span className="analytics-metric-label">
            Selected students
          </span>

          <strong className="analytics-metric-number">
            {selectedStudentCount}
          </strong>

          <p>Students selected through tracked applications</p>
        </article>

        <article className="analytics-metric-card">
          <div className="analytics-metric-top">
            <span className="analytics-metric-icon orange">
              ◎
            </span>
          </div>

          <span className="analytics-metric-label">
            Industry skills
          </span>

          <strong className="analytics-metric-number">
            {demandedSkillIds.size}
          </strong>

          <p>Skills demanded by open opportunities</p>
        </article>
      </section>

      {/* READINESS */}

      <section className="college-analytics-grid">
        <article className="analytics-panel">
          <div className="analytics-panel-heading">
            <div>
              <span className="analytics-eyebrow">
                // STUDENT READINESS
              </span>

              <h2>Institution readiness</h2>
            </div>

            <button
              type="button"
              onClick={() => navigate("/college/students")}
            >
              Manage students →
            </button>
          </div>

          <div className="analytics-readiness-number">
            {averageProfileCompletion}%
          </div>

          <p className="analytics-muted">
            Average profile completion
          </p>

          <div className="analytics-progress">
            <div
              style={{
                width: `${averageProfileCompletion}%`,
              }}
            />
          </div>

          <div className="analytics-mini-grid">
            <div>
              <span>Verified</span>
              <strong>{verifiedStudents}</strong>
            </div>

            <div>
              <span>Pending</span>

              <strong>
                {Math.max(
                  students.length - verifiedStudents,
                  0
                )}
              </strong>
            </div>

            <div>
              <span>Participation</span>
              <strong>{participationRate}%</strong>
            </div>
          </div>
        </article>

        {/* SKILL READINESS */}

        <article className="analytics-panel">
          <div className="analytics-panel-heading">
            <div>
              <span className="analytics-eyebrow">
                // ACADEMIA × INDUSTRY
              </span>

              <h2>Skill readiness</h2>
            </div>

            <button
              type="button"
              onClick={() => navigate("/college/skill-gap")}
            >
              Full gap map →
            </button>
          </div>

          <div className="analytics-coverage-grid">
            <div>
              <strong>{recordedCoverage}%</strong>
              <span>Recorded coverage</span>
            </div>

            <div>
              <strong>{verifiedCoverage}%</strong>
              <span>Verified coverage</span>
            </div>
          </div>

          <p className="analytics-muted center">
            Coverage compares industry-demanded skills with
            skills recorded for students in your institution.
          </p>
        </article>
      </section>

      {/* APPLICATION PIPELINE */}

      <section className="analytics-wide-panel">
        <div className="analytics-panel-heading">
          <div>
            <span className="analytics-eyebrow">
              // INTERNSHIP & PLACEMENT
            </span>

            <h2>Application pipeline</h2>
          </div>
        </div>

        <div className="analytics-pipeline">
          <div>
            <span>Applied</span>
            <strong>{applicationStats.applied}</strong>
          </div>

          <div>
            <span>Shortlisted</span>
            <strong>{applicationStats.shortlisted}</strong>
          </div>

          <div>
            <span>Interview</span>
            <strong>{applicationStats.interview}</strong>
          </div>

          <div>
            <span>Selected</span>
            <strong>{applicationStats.selected}</strong>
          </div>

          <div>
            <span>Rejected</span>
            <strong>{applicationStats.rejected}</strong>
          </div>
        </div>
      </section>

      {/* DEMAND + GAP */}

      <section className="college-analytics-grid">
        <article className="analytics-panel">
          <div className="analytics-panel-heading">
            <div>
              <span className="analytics-eyebrow">
                // INDUSTRY DEMAND
              </span>

              <h2>Most demanded skills</h2>
            </div>
          </div>

          {skillDemand.length === 0 ? (
            <div className="analytics-empty">
              No open opportunity skill requirements found.
            </div>
          ) : (
            <div className="analytics-skill-list">
              {skillDemand.slice(0, 5).map((skill, index) => (
                <div
                  className="analytics-skill-row"
                  key={skill.skillId}
                >
                  <span className="analytics-rank">
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <div className="analytics-skill-copy">
                    <strong>{skill.name}</strong>

                    <span>
                      {skill.opportunityCount} open{" "}
                      {skill.opportunityCount === 1
                        ? "opportunity"
                        : "opportunities"}
                    </span>
                  </div>

                  <span className="analytics-demand">
                    {skill.demandPoints} pts
                  </span>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="analytics-panel">
          <div className="analytics-panel-heading">
            <div>
              <span className="analytics-eyebrow">
                // PRIORITY GAPS
              </span>

              <h2>Skills needing attention</h2>
            </div>

            <button
              type="button"
              onClick={() => navigate("/college/training")}
            >
              Training →
            </button>
          </div>

          {topSkillGaps.length === 0 ? (
            <div className="analytics-empty">
              No skill-gap data available.
            </div>
          ) : (
            <div className="analytics-gap-list">
              {topSkillGaps.map((skill) => (
                <div
                  className="analytics-gap-row"
                  key={skill.skillId}
                >
                  <div>
                    <strong>{skill.name}</strong>

                    <span>
                      {skill.coverage}% student coverage
                    </span>
                  </div>

                  <strong>{skill.gap}% gap</strong>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>

      {/* TRAINING */}

      <section className="analytics-wide-panel">
        <div className="analytics-panel-heading">
          <div>
            <span className="analytics-eyebrow">
              // SKILL DEVELOPMENT
            </span>

            <h2>Training interventions</h2>
          </div>

          <button
            type="button"
            onClick={() => navigate("/college/training")}
          >
            Manage training →
          </button>
        </div>

        <div className="analytics-training-grid">
          <div>
            <span>Active</span>
            <strong>{activeTraining}</strong>
          </div>

          <div>
            <span>Planned</span>
            <strong>{plannedTraining}</strong>
          </div>

          <div>
            <span>Completed</span>
            <strong>{completedTraining}</strong>
          </div>

          <div>
            <span>Total interventions</span>
            <strong>{trainingPrograms.length}</strong>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Analytics;