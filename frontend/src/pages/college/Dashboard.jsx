import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { supabase } from "../../services/supabase";
import { useAuth } from "../../hooks/useAuth";

import "./Dashboard.css";

function CollegeDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [member, setMember] = useState(null);
  const [institution, setInstitution] = useState(null);

  const [departments, setDepartments] = useState([]);
  const [students, setStudents] = useState([]);

  const [studentSkills, setStudentSkills] = useState([]);
  const [skills, setSkills] = useState([]);
  const [opportunitySkills, setOpportunitySkills] = useState([]);
  const [trainingPrograms, setTrainingPrograms] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      if (!user?.id) return;

      try {
        setLoading(true);
        setError("");

        /* =========================================
           1. FIND COLLEGE MEMBER
        ========================================= */

        const { data: memberData, error: memberError } = await supabase
          .from("institution_members")
          .select("institution_id, member_role, designation, phone")
          .eq("user_id", user.id)
          .maybeSingle();

        if (memberError) throw memberError;

        if (!memberData?.institution_id) {
          throw new Error(
            "No institution is linked to this college account yet."
          );
        }

        setMember(memberData);

        const institutionId = memberData.institution_id;

        /* =========================================
           2. LOAD CORE COLLEGE DATA
        ========================================= */

        const [
          institutionResult,
          departmentResult,
          studentResult,
          skillResult,
          opportunityResult,
          trainingResult,
        ] = await Promise.all([
          supabase
            .from("institutions")
            .select(
              "id, name, state, official_email, website, aishe_code, institution_code"
            )
            .eq("id", institutionId)
            .maybeSingle(),

          supabase
            .from("departments")
            .select("id, name, code, student_count")
            .eq("institution_id", institutionId)
            .order("name"),

          supabase
            .from("student_profiles")
            .select(
              "user_id, department_id, profile_completion, verification_status, cgpa"
            )
            .eq("institution_id", institutionId),

          supabase
            .from("skills")
            .select("id, name, category"),

          supabase
            .from("opportunities")
            .select("id")
            .eq("status", "open"),

          supabase
            .from("training_programs")
            .select(
              "id, institution_id, department_id, skill_id, title, training_type, status, start_date, end_date"
            )
            .eq("institution_id", institutionId)
            .order("created_at", { ascending: false }),
        ]);

        if (institutionResult.error) throw institutionResult.error;
        if (departmentResult.error) throw departmentResult.error;
        if (studentResult.error) throw studentResult.error;
        if (skillResult.error) throw skillResult.error;
        if (opportunityResult.error) throw opportunityResult.error;
        if (trainingResult.error) throw trainingResult.error;

        const studentRows = studentResult.data || [];
        const openOpportunityRows = opportunityResult.data || [];

        setInstitution(institutionResult.data || null);
        setDepartments(departmentResult.data || []);
        setStudents(studentRows);
        setSkills(skillResult.data || []);
        setTrainingPrograms(trainingResult.data || []);

        /* =========================================
           3. LOAD STUDENT SKILLS
        ========================================= */

        const studentIds = studentRows.map((student) => student.user_id);

        if (studentIds.length > 0) {
          const { data: studentSkillData, error: studentSkillError } =
            await supabase
              .from("student_skills")
              .select(
                "student_id, skill_id, proficiency, verified, source"
              )
              .in("student_id", studentIds);

          if (studentSkillError) throw studentSkillError;

          setStudentSkills(studentSkillData || []);
        } else {
          setStudentSkills([]);
        }

        /* =========================================
           4. LOAD INDUSTRY SKILL DEMAND
        ========================================= */

        const opportunityIds = openOpportunityRows.map(
          (opportunity) => opportunity.id
        );

        if (opportunityIds.length > 0) {
          const { data: requirementData, error: requirementError } =
            await supabase
              .from("opportunity_skills")
              .select(
                "opportunity_id, skill_id, requirement_type, minimum_proficiency, weight"
              )
              .in("opportunity_id", opportunityIds);

          if (requirementError) throw requirementError;

          setOpportunitySkills(requirementData || []);
        } else {
          setOpportunitySkills([]);
        }
      } catch (loadError) {
        console.error("College dashboard error:", loadError);
        setError(loadError.message || "Could not load college dashboard.");
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [user?.id]);

  /* =========================================
     BASIC STUDENT STATS
  ========================================= */

  const studentStats = useMemo(() => {
    const totalDeclaredStudents = departments.reduce(
      (sum, department) =>
        sum + Number(department.student_count || 0),
      0
    );

    const verifiedStudents = students.filter(
      (student) => student.verification_status === "verified"
    ).length;

    const pendingStudents = students.filter(
      (student) =>
        !student.verification_status ||
        student.verification_status === "pending"
    ).length;

    const rejectedStudents = students.filter(
      (student) => student.verification_status === "rejected"
    ).length;

    const completionValues = students
      .map((student) => Number(student.profile_completion || 0))
      .filter((value) => Number.isFinite(value));

    const averageProfileCompletion = completionValues.length
      ? Math.round(
          completionValues.reduce((sum, value) => sum + value, 0) /
            completionValues.length
        )
      : 0;

    return {
      totalDeclaredStudents,
      registeredStudents: students.length,
      verifiedStudents,
      pendingStudents,
      rejectedStudents,
      averageProfileCompletion,
    };
  }, [departments, students]);

  /* =========================================
     SKILL ANALYSIS
  ========================================= */

  const skillAnalysis = useMemo(() => {
    const skillMap = new Map(
      skills.map((skill) => [skill.id, skill])
    );

    const demandMap = new Map();

    opportunitySkills.forEach((requirement) => {
      const weight = Number(requirement.weight || 1);

      demandMap.set(
        requirement.skill_id,
        (demandMap.get(requirement.skill_id) || 0) + weight
      );
    });

    const maximumDemand = Math.max(
      ...Array.from(demandMap.values()),
      0
    );

    const studentCount = students.length;

    const rows = Array.from(demandMap.entries()).map(
      ([skillId, demandPoints]) => {
        const studentIdsWithSkill = new Set(
          studentSkills
            .filter((row) => row.skill_id === skillId)
            .map((row) => row.student_id)
        );

        const verifiedStudentIds = new Set(
          studentSkills
            .filter(
              (row) =>
                row.skill_id === skillId &&
                row.verified === true
            )
            .map((row) => row.student_id)
        );

        const coverage = studentCount
          ? Math.round(
              (studentIdsWithSkill.size / studentCount) * 100
            )
          : 0;

        const verifiedCoverage = studentCount
          ? Math.round(
              (verifiedStudentIds.size / studentCount) * 100
            )
          : 0;

        const demandIndex = maximumDemand
          ? Math.round((demandPoints / maximumDemand) * 100)
          : 0;

        const gapIndex = Math.round(
          demandIndex * (1 - coverage / 100)
        );

        return {
          skillId,
          name: skillMap.get(skillId)?.name || "Unknown skill",
          category:
            skillMap.get(skillId)?.category || "Uncategorized",
          demandPoints,
          demandIndex,
          coverage,
          verifiedCoverage,
          gapIndex,
        };
      }
    );

    rows.sort((a, b) => {
      if (b.gapIndex !== a.gapIndex) {
        return b.gapIndex - a.gapIndex;
      }

      return b.demandPoints - a.demandPoints;
    });

    return rows;
  }, [
    skills,
    opportunitySkills,
    studentSkills,
    students,
  ]);

  const topSkillGaps = useMemo(
    () => skillAnalysis.slice(0, 5),
    [skillAnalysis]
  );

  const demandedSkillCount = skillAnalysis.length;

  const averageSkillCoverage = useMemo(() => {
    if (!skillAnalysis.length) return 0;

    return Math.round(
      skillAnalysis.reduce(
        (sum, skill) => sum + skill.coverage,
        0
      ) / skillAnalysis.length
    );
  }, [skillAnalysis]);

  const averageVerifiedCoverage = useMemo(() => {
    if (!skillAnalysis.length) return 0;

    return Math.round(
      skillAnalysis.reduce(
        (sum, skill) => sum + skill.verifiedCoverage,
        0
      ) / skillAnalysis.length
    );
  }, [skillAnalysis]);

  /* =========================================
     TRAINING STATS
  ========================================= */

  const trainingStats = useMemo(() => {
    const planned = trainingPrograms.filter(
      (program) => program.status === "planned"
    ).length;

    const active = trainingPrograms.filter(
      (program) => program.status === "active"
    ).length;

    const completed = trainingPrograms.filter(
      (program) => program.status === "completed"
    ).length;

    return {
      total: trainingPrograms.length,
      planned,
      active,
      completed,
    };
  }, [trainingPrograms]);

  const recentTrainingPrograms = useMemo(
    () =>
      trainingPrograms
        .filter(
          (program) =>
            program.status === "active" ||
            program.status === "planned"
        )
        .slice(0, 3),
    [trainingPrograms]
  );

  /* =========================================
     DEPARTMENT DATA
  ========================================= */

  const departmentRows = useMemo(() => {
    return departments.map((department) => {
      const departmentStudents = students.filter(
        (student) => student.department_id === department.id
      );

      const verified = departmentStudents.filter(
        (student) => student.verification_status === "verified"
      ).length;

      return {
        ...department,
        registered: departmentStudents.length,
        verified,
      };
    });
  }, [departments, students]);

  /* =========================================
     HELPERS
  ========================================= */

  function getSkillName(skillId) {
    return (
      skills.find((skill) => skill.id === skillId)?.name ||
      "Skill"
    );
  }

  function formatTrainingType(type) {
    if (!type) return "Training";

    return type
      .split("_")
      .map(
        (word) =>
          word.charAt(0).toUpperCase() + word.slice(1)
      )
      .join(" ");
  }

  function getGapClass(gap) {
    if (gap >= 40) return "high";
    if (gap >= 20) return "medium";
    return "low";
  }

  /* =========================================
     LOADING / ERROR
  ========================================= */

  if (loading) {
    return (
      <div className="college-dashboard-state">
        Loading institution intelligence…
      </div>
    );
  }

  if (error) {
    return (
      <div className="college-dashboard-state error">
        Could not load dashboard: {error}
      </div>
    );
  }

  const accountName =
    user?.user_metadata?.full_name?.trim() ||
    user?.email?.split("@")[0] ||
    "College Admin";

  /* =========================================
     UI
  ========================================= */

  return (
    <div className="college-dashboard">
      {/* HERO */}

      <section className="college-dashboard-hero">
        <div className="college-hero-copy">
          <span className="college-dashboard-eyebrow">
            // institution intelligence
          </span>

          <h1>
            Welcome, <span>{accountName}</span>.
          </h1>

          <p>
            Monitor student readiness, understand industry skill
            demand and coordinate institutional training from one
            workspace.
          </p>
        </div>

        <div className="college-institution-badge">
          <span className="college-live-dot"></span>

          <div>
            <small>INSTITUTION</small>
            <strong>
              {institution?.name || "Institution"}
            </strong>
          </div>
        </div>
      </section>

      {/* MAIN STATS */}

      <section className="college-stat-grid">
        <article className="college-stat-card">
          <span className="college-stat-icon purple">
            ◫
          </span>

          <span className="college-stat-label">
            Registered students
          </span>

          <strong>
            {studentStats.registeredStudents}
          </strong>

          <span className="college-stat-foot">
            {studentStats.totalDeclaredStudents
              ? `${studentStats.totalDeclaredStudents} declared across departments`
              : "Profiles linked to institution"}
          </span>
        </article>

        <article className="college-stat-card">
          <span className="college-stat-icon green">
            ✓
          </span>

          <span className="college-stat-label">
            Verified students
          </span>

          <strong>
            {studentStats.verifiedStudents}
          </strong>

          <span className="college-stat-foot">
            {studentStats.pendingStudents} awaiting verification
          </span>
        </article>

        <article className="college-stat-card">
          <span className="college-stat-icon blue">
            ◈
          </span>

          <span className="college-stat-label">
            Industry skills
          </span>

          <strong>{demandedSkillCount}</strong>

          <span className="college-stat-foot">
            Skills currently demanded by open opportunities
          </span>
        </article>

        <article className="college-stat-card">
          <span className="college-stat-icon orange">
            ↗
          </span>

          <span className="college-stat-label">
            Active training
          </span>

          <strong>{trainingStats.active}</strong>

          <span className="college-stat-foot">
            {trainingStats.planned} planned intervention
            {trainingStats.planned === 1 ? "" : "s"}
          </span>
        </article>
      </section>

      {/* READINESS + ACTIONS */}

      <section className="college-dashboard-two-column">
        <article className="college-dashboard-card">
          <div className="college-card-heading">
            <div>
              <span className="college-card-kicker">
                // student readiness
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

          <div className="college-readiness-block">
            <div className="college-readiness-main">
              <strong>
                {studentStats.averageProfileCompletion}%
              </strong>

              <span>Average profile completion</span>
            </div>

            <div className="college-progress-track large">
              <div
                className="college-progress-fill"
                style={{
                  width: `${Math.min(
                    studentStats.averageProfileCompletion,
                    100
                  )}%`,
                }}
              ></div>
            </div>
          </div>

          <div className="college-readiness-grid">
            <div>
              <span>Verified</span>
              <strong>
                {studentStats.verifiedStudents}
              </strong>
            </div>

            <div>
              <span>Pending</span>
              <strong>
                {studentStats.pendingStudents}
              </strong>
            </div>

            <div>
              <span>Departments</span>
              <strong>{departments.length}</strong>
            </div>
          </div>
        </article>

        <article className="college-dashboard-card college-skill-summary-card">
          <div className="college-card-heading">
            <div>
              <span className="college-card-kicker">
                // academia × industry
              </span>

              <h2>Skill readiness</h2>
            </div>

            <button
              type="button"
              onClick={() =>
                navigate("/college/skill-gap")
              }
            >
              Full gap map →
            </button>
          </div>

          <div className="college-coverage-grid">
            <div>
              <strong>{averageSkillCoverage}%</strong>
              <span>Recorded coverage</span>
            </div>

            <div>
              <strong>
                {averageVerifiedCoverage}%
              </strong>
              <span>Verified coverage</span>
            </div>
          </div>

          <p className="college-skill-note">
            Coverage compares skills recorded for your
            institution's students with skills currently demanded
            by open industry opportunities.
          </p>
        </article>
      </section>

      {/* SKILL GAP */}

      <section className="college-dashboard-card college-gap-card">
        <div className="college-card-heading">
          <div>
            <span className="college-card-kicker">
              // industry demand vs student supply
            </span>

            <h2>Priority skill gaps</h2>
          </div>

          <button
            type="button"
            onClick={() => navigate("/college/skill-gap")}
          >
            View Skill Gap Map →
          </button>
        </div>

        {topSkillGaps.length === 0 ? (
          <div className="college-empty-state">
            Industry skill demand will appear here when open
            opportunities contain skill requirements.
          </div>
        ) : (
          <div className="college-gap-list">
            <div className="college-gap-header">
              <span>Skill</span>
              <span>Demand</span>
              <span>Student coverage</span>
              <span>Gap</span>
            </div>

            {topSkillGaps.map((skill) => (
              <div
                className="college-gap-row"
                key={skill.skillId}
              >
                <div className="college-gap-skill">
                  <span className="college-gap-symbol">
                    {skill.name
                      .charAt(0)
                      .toUpperCase()}
                  </span>

                  <div>
                    <strong>{skill.name}</strong>
                    <small>{skill.category}</small>
                  </div>
                </div>

                <div className="college-gap-value">
                  <strong>{skill.demandIndex}</strong>
                  <span>index</span>
                </div>

                <div className="college-gap-coverage">
                  <div>
                    <strong>{skill.coverage}%</strong>

                    <span>
                      {skill.verifiedCoverage}% verified
                    </span>
                  </div>

                  <div className="college-mini-track">
                    <div
                      style={{
                        width: `${Math.min(
                          skill.coverage,
                          100
                        )}%`,
                      }}
                    ></div>
                  </div>
                </div>

                <div>
                  <span
                    className={`college-gap-badge ${getGapClass(
                      skill.gapIndex
                    )}`}
                  >
                    {skill.gapIndex}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* TRAINING */}

      <section className="college-dashboard-two-column">
        <article className="college-dashboard-card">
          <div className="college-card-heading">
            <div>
              <span className="college-card-kicker">
                // institutional intervention
              </span>

              <h2>Training programmes</h2>
            </div>

            <button
              type="button"
              onClick={() => navigate("/college/training")}
            >
              Manage training →
            </button>
          </div>

          <div className="college-training-stats">
            <div>
              <strong>{trainingStats.active}</strong>
              <span>Active</span>
            </div>

            <div>
              <strong>{trainingStats.planned}</strong>
              <span>Planned</span>
            </div>

            <div>
              <strong>{trainingStats.completed}</strong>
              <span>Completed</span>
            </div>
          </div>

          {recentTrainingPrograms.length === 0 ? (
            <div className="college-small-empty">
              No active or planned training programmes yet.
            </div>
          ) : (
            <div className="college-training-list">
              {recentTrainingPrograms.map((program) => (
                <div
                  className="college-training-row"
                  key={program.id}
                >
                  <div>
                    <span
                      className={`college-training-status ${program.status}`}
                    >
                      {program.status}
                    </span>

                    <strong>{program.title}</strong>

                    <small>
                      {formatTrainingType(
                        program.training_type
                      )}{" "}
                      · {getSkillName(program.skill_id)}
                    </small>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="college-dashboard-card">
          <div className="college-card-heading">
            <div>
              <span className="college-card-kicker">
                // departments
              </span>

              <h2>Department coverage</h2>
            </div>

            <button
              type="button"
              onClick={() =>
                navigate("/college/departments")
              }
            >
              Manage →
            </button>
          </div>

          {departmentRows.length === 0 ? (
            <div className="college-small-empty">
              No departments configured yet.
            </div>
          ) : (
            <div className="college-department-list">
              {departmentRows.slice(0, 4).map((department) => (
                <div
                  className="college-department-row"
                  key={department.id}
                >
                  <div className="college-department-name">
                    <span className="college-department-icon">
                      {department.code
                        ?.slice(0, 2)
                        ?.toUpperCase() || "DP"}
                    </span>

                    <div>
                      <strong>{department.name}</strong>
                      <span>
                        {department.code || "Department"}
                      </span>
                    </div>
                  </div>

                  <div className="college-department-metric">
                    <span>Students</span>
                    <strong>
                      {department.registered}
                    </strong>
                  </div>

                  <div className="college-department-metric">
                    <span>Verified</span>
                    <strong>{department.verified}</strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>

      {/* INSTITUTION DETAILS */}

      <section className="college-dashboard-card college-institution-card">
        <div className="college-card-heading">
          <div>
            <span className="college-card-kicker">
              // institution
            </span>

            <h2>Institution details</h2>
          </div>
        </div>

        <div className="college-detail-grid">
          <div>
            <span>Institution</span>
            <strong>
              {institution?.name || "Not set"}
            </strong>
          </div>

          <div>
            <span>State</span>
            <strong>
              {institution?.state || "Not set"}
            </strong>
          </div>

          <div>
            <span>AISHE code</span>
            <strong>
              {institution?.aishe_code || "Not set"}
            </strong>
          </div>

          <div>
            <span>Institution code</span>
            <strong>
              {institution?.institution_code ||
                "Not set"}
            </strong>
          </div>

          <div>
            <span>Official email</span>
            <strong>
              {institution?.official_email || "Not set"}
            </strong>
          </div>

          <div>
            <span>Your designation</span>
            <strong>
              {member?.designation ||
                "Placement Officer"}
            </strong>
          </div>
        </div>
      </section>
    </div>
  );
}

export default CollegeDashboard;