import { useEffect, useMemo, useState } from "react";

import { supabase } from "../../services/supabase";
import { useAuth } from "../../hooks/useAuth";
import "./SkillGapMap.css";

function SkillGapMap() {
  const { user } = useAuth();

  const [students, setStudents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [studentSkills, setStudentSkills] = useState([]);
  const [skills, setSkills] = useState([]);
  const [opportunitySkills, setOpportunitySkills] = useState([]);

  const [departmentFilter, setDepartmentFilter] =
    useState("all");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* =========================
     LOAD DATA
  ========================= */

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    async function loadGapData() {
      try {
        setLoading(true);
        setError("");

        /* 1. FIND INSTITUTION */

        const { data: memberData, error: memberError } =
          await supabase
            .from("institution_members")
            .select("institution_id")
            .eq("user_id", user.id)
            .single();

        if (memberError) throw memberError;

        const institutionId = memberData.institution_id;

        /* 2. DEPARTMENTS */

        const {
          data: departmentData,
          error: departmentError,
        } = await supabase
          .from("departments")
          .select("id, name, code")
          .eq("institution_id", institutionId)
          .order("name", { ascending: true });

        if (departmentError) throw departmentError;

        /* 3. INSTITUTION STUDENTS */

        const { data: studentData, error: studentError } =
          await supabase
            .from("student_profiles")
            .select(
              `
                id,
                user_id,
                department_id,
                verification_status
              `
            )
            .eq("institution_id", institutionId);

        if (studentError) throw studentError;

        const loadedStudents = studentData || [];

        /* 4. STUDENT SKILLS */

        let loadedStudentSkills = [];

        if (loadedStudents.length > 0) {
          const studentIds = loadedStudents.map(
            (student) => student.id
          );

          const {
            data: studentSkillData,
            error: studentSkillError,
          } = await supabase
            .from("student_skills")
            .select(
              `
                id,
                student_id,
                skill_id,
                proficiency,
                source,
                verified
              `
            )
            .in("student_id", studentIds);

          if (studentSkillError) throw studentSkillError;

          loadedStudentSkills = studentSkillData || [];
        }

        /* 5. SKILL CATALOGUE */

        const { data: skillData, error: skillError } =
          await supabase
            .from("skills")
            .select("id, name, category")
            .order("name", { ascending: true });

        if (skillError) throw skillError;

        /* 6. OPEN OPPORTUNITIES */

        const {
          data: opportunityData,
          error: opportunityError,
        } = await supabase
          .from("opportunities")
          .select("id, status")
          .eq("status", "open");

        if (opportunityError) throw opportunityError;

        const openOpportunityIds = (
          opportunityData || []
        ).map((opportunity) => opportunity.id);

        /* 7. INDUSTRY REQUIREMENTS */

        let loadedOpportunitySkills = [];

        if (openOpportunityIds.length > 0) {
          const {
            data: requirementData,
            error: requirementError,
          } = await supabase
            .from("opportunity_skills")
            .select(
              `
                opportunity_id,
                skill_id,
                requirement_type,
                minimum_proficiency,
                weight
              `
            )
            .in("opportunity_id", openOpportunityIds);

          if (requirementError) throw requirementError;

          loadedOpportunitySkills = requirementData || [];
        }

        if (!cancelled) {
          setStudents(loadedStudents);
          setDepartments(departmentData || []);
          setStudentSkills(loadedStudentSkills);
          setSkills(skillData || []);
          setOpportunitySkills(loadedOpportunitySkills);
        }
      } catch (err) {
        console.error(
          "Skill gap map loading error:",
          err
        );

        if (!cancelled) {
          setError(
            err?.message ||
              "Unable to calculate institutional skill gaps."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadGapData();

    return () => {
      cancelled = true;
    };
  }, [user]);

  /* =========================
     FILTER STUDENTS
  ========================= */

  const filteredStudents = useMemo(() => {
    if (departmentFilter === "all") {
      return students;
    }

    return students.filter(
      (student) =>
        student.department_id === departmentFilter
    );
  }, [students, departmentFilter]);

  /* =========================
     GAP CALCULATION
  ========================= */

  const gapData = useMemo(() => {
    if (skills.length === 0) return [];

    const selectedStudentIds = new Set(
      filteredStudents.map((student) => student.id)
    );

    const selectedStudentSkills = studentSkills.filter(
      (studentSkill) =>
        selectedStudentIds.has(studentSkill.student_id)
    );

    /* INDUSTRY DEMAND */

    const demandMap = {};

    opportunitySkills.forEach((requirement) => {
      if (!demandMap[requirement.skill_id]) {
        demandMap[requirement.skill_id] = {
          demandPoints: 0,
          requirementCount: 0,
          requiredCount: 0,
          preferredCount: 0,
        };
      }

      const entry = demandMap[requirement.skill_id];

      entry.demandPoints += Number(
        requirement.weight || 1
      );

      entry.requirementCount += 1;

      if (
        requirement.requirement_type?.toLowerCase() ===
        "required"
      ) {
        entry.requiredCount += 1;
      } else {
        entry.preferredCount += 1;
      }
    });

    /* STUDENT SUPPLY */

    const supplyMap = {};

    selectedStudentSkills.forEach((studentSkill) => {
      if (!supplyMap[studentSkill.skill_id]) {
        supplyMap[studentSkill.skill_id] = {
          students: new Set(),
          verifiedStudents: new Set(),
        };
      }

      const supply =
        supplyMap[studentSkill.skill_id];

      supply.students.add(studentSkill.student_id);

      if (studentSkill.verified === true) {
        supply.verifiedStudents.add(
          studentSkill.student_id
        );
      }
    });

    const totalStudents = filteredStudents.length;

    const demandValues = Object.values(demandMap).map(
      (entry) => entry.demandPoints
    );

    const maximumDemand =
      demandValues.length > 0
        ? Math.max(...demandValues)
        : 0;

    return skills
      .map((skill) => {
        const demand = demandMap[skill.id];

        if (!demand) return null;

        const supply = supplyMap[skill.id];

        const studentsWithSkill =
          supply?.students.size || 0;

        const verifiedStudents =
          supply?.verifiedStudents.size || 0;

        const coverage =
          totalStudents > 0
            ? (studentsWithSkill / totalStudents) * 100
            : 0;

        const verifiedCoverage =
          totalStudents > 0
            ? (verifiedStudents / totalStudents) * 100
            : 0;

        const demandIndex =
          maximumDemand > 0
            ? (demand.demandPoints /
                maximumDemand) *
              100
            : 0;

        /*
          Gap index combines:
          - relative demand
          - missing student coverage

          100 = highest-demand skill with no student coverage
          0 = full student coverage
        */

        const gapIndex =
          demandIndex * (1 - coverage / 100);

        return {
          skillId: skill.id,
          skillName: skill.name,
          category: skill.category,

          demandPoints: demand.demandPoints,
          demandIndex,

          requirementCount:
            demand.requirementCount,

          requiredCount: demand.requiredCount,
          preferredCount: demand.preferredCount,

          studentsWithSkill,
          verifiedStudents,

          coverage,
          verifiedCoverage,
          gapIndex,
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (b.gapIndex !== a.gapIndex) {
          return b.gapIndex - a.gapIndex;
        }

        return b.demandPoints - a.demandPoints;
      });
  }, [
    skills,
    opportunitySkills,
    studentSkills,
    filteredStudents,
  ]);

  /* =========================
     SUMMARY
  ========================= */

  const studentsWithAnySkill = useMemo(() => {
    const selectedStudentIds = new Set(
      filteredStudents.map((student) => student.id)
    );

    const withSkills = new Set();

    studentSkills.forEach((studentSkill) => {
      if (
        selectedStudentIds.has(studentSkill.student_id)
      ) {
        withSkills.add(studentSkill.student_id);
      }
    });

    return withSkills.size;
  }, [filteredStudents, studentSkills]);

  const averageCoverage =
    gapData.length > 0
      ? gapData.reduce(
          (sum, skill) => sum + skill.coverage,
          0
        ) / gapData.length
      : 0;

  const averageVerifiedCoverage =
    gapData.length > 0
      ? gapData.reduce(
          (sum, skill) =>
            sum + skill.verifiedCoverage,
          0
        ) / gapData.length
      : 0;

  /* =========================
     PRIORITY CLASSIFICATION
  ========================= */

  function getPriority(skill) {
    /*
      Zero coverage on a meaningful demanded skill
      should be highlighted.

      This is an institutional training-priority
      classification, not an external industry statistic.
    */

    if (
      skill.coverage === 0 &&
      skill.demandIndex >= 40
    ) {
      return {
        label: "High priority",
        className: "critical",
      };
    }

    if (skill.gapIndex >= 30) {
      return {
        label: "Medium priority",
        className: "moderate",
      };
    }

    return {
      label: "Low priority",
      className: "low",
    };
  }

  const highPriorityCount = gapData.filter(
    (skill) =>
      getPriority(skill).className === "critical"
  ).length;

  /* =========================
     STATES
  ========================= */

  if (loading) {
    return (
      <div className="skill-gap-page">
        <div className="skill-gap-state">
          Calculating academia-industry skill gaps...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="skill-gap-page">
        <div className="skill-gap-state">
          <h3>Unable to load skill gap map</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  /* =========================
     PAGE
  ========================= */

  return (
    <div className="skill-gap-page">
      {/* HEADER */}

      <section className="skill-gap-header">
        <div>
          <span className="skill-gap-kicker">
            // academia × industry intelligence
          </span>

          <h1>Skill Gap Map</h1>

          <p>
            Compare skills requested by current industry
            opportunities with recorded and verified student
            skills across your institution.
          </p>
        </div>

        <div className="skill-gap-filter">
          <label>Department</label>

          <select
            value={departmentFilter}
            onChange={(event) =>
              setDepartmentFilter(event.target.value)
            }
          >
            <option value="all">
              All departments
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
      </section>

      {/* SUMMARY */}

      <section className="skill-gap-summary">
        <article>
          <span>Students analysed</span>
          <strong>{filteredStudents.length}</strong>
          <p>
            Students included in the selected institutional
            group.
          </p>
        </article>

        <article>
          <span>Industry skills</span>
          <strong>{gapData.length}</strong>
          <p>
            Distinct skills requested by current open
            opportunities.
          </p>
        </article>

        <article>
          <span>Recorded coverage</span>
          <strong>
            {averageCoverage.toFixed(0)}%
          </strong>
          <p>
            Average coverage across demanded skills,
            including self-reported skills.
          </p>
        </article>

        <article>
          <span>Verified coverage</span>
          <strong>
            {averageVerifiedCoverage.toFixed(0)}%
          </strong>
          <p>
            Average coverage supported by verified student
            skills.
          </p>
        </article>
      </section>

      {/* READINESS */}

      <section className="skill-gap-coverage-card">
        <div className="skill-gap-readiness-top">
          <div>
            <span className="skill-gap-kicker">
              // institutional readiness
            </span>

            <h2>
              {averageCoverage.toFixed(0)}% recorded
              readiness
            </h2>

            <p>
              {studentsWithAnySkill} of{" "}
              {filteredStudents.length} students have at
              least one recorded skill. Across the skills
              currently demanded by opportunities, average
              coverage is {averageCoverage.toFixed(0)}%.
            </p>
          </div>

          <div className="skill-gap-verified-readiness">
            <span>Verified readiness</span>

            <strong>
              {averageVerifiedCoverage.toFixed(0)}%
            </strong>
          </div>
        </div>

        <div className="skill-gap-big-progress">
          <div
            style={{
              width: `${Math.min(
                averageCoverage,
                100
              )}%`,
            }}
          />
        </div>
      </section>

      {gapData.length === 0 ? (
        <section className="skill-gap-empty">
          <span>01</span>

          <div>
            <h3>No industry skill data available</h3>

            <p>
              Skill gaps will appear when open
              opportunities contain skill requirements.
            </p>
          </div>
        </section>
      ) : (
        <>
          {/* GAP TABLE */}

          <section className="skill-gap-section">
            <div className="skill-gap-section-heading">
              <div>
                <span className="skill-gap-kicker">
                  // demand versus supply
                </span>

                <h2>
                  Academia–Industry Gap Map
                </h2>
              </div>

              <span>
                {gapData.length} skills analysed
              </span>
            </div>

            <div className="skill-gap-explanation">
              <strong>How to read this:</strong>{" "}
              demand points come from opportunity skill
              weights. The relative demand index compares
              each skill with the highest-demand skill in
              the current opportunity dataset. Gap index
              combines relative demand with missing student
              coverage.
            </div>

            <div className="skill-gap-table-wrapper">
              <div className="skill-gap-table">
                <div className="skill-gap-table-head">
                  <span>Skill</span>
                  <span>Demand</span>
                  <span>Student coverage</span>
                  <span>Verified</span>
                  <span>Gap / priority</span>
                </div>

                {gapData.map((skill) => {
                  const priority =
                    getPriority(skill);

                  return (
                    <article
                      className="skill-gap-row"
                      key={skill.skillId}
                    >
                      {/* SKILL */}

                      <div className="skill-gap-skill">
                        <strong>
                          {skill.skillName}
                        </strong>

                        <span>
                          {skill.category ||
                            "General"}
                        </span>

                        <small>
                          {skill.requirementCount}{" "}
                          {skill.requirementCount === 1
                            ? "opportunity requirement"
                            : "opportunity requirements"}
                        </small>
                      </div>

                      {/* DEMAND */}

                      <div className="skill-gap-metric">
                        <strong>
                          {skill.demandIndex.toFixed(0)}
                        </strong>

                        <small>
                          relative demand index
                        </small>

                        <div className="skill-gap-mini-bar">
                          <div
                            style={{
                              width: `${Math.min(
                                skill.demandIndex,
                                100
                              )}%`,
                            }}
                          />
                        </div>

                        <span>
                          {skill.demandPoints} demand{" "}
                          {skill.demandPoints === 1
                            ? "point"
                            : "points"}
                        </span>
                      </div>

                      {/* COVERAGE */}

                      <div className="skill-gap-metric">
                        <strong>
                          {skill.coverage.toFixed(0)}%
                        </strong>

                        <small>
                          recorded coverage
                        </small>

                        <div className="skill-gap-mini-bar">
                          <div
                            style={{
                              width: `${Math.min(
                                skill.coverage,
                                100
                              )}%`,
                            }}
                          />
                        </div>

                        <span>
                          {skill.studentsWithSkill}/
                          {filteredStudents.length}{" "}
                          students
                        </span>
                      </div>

                      {/* VERIFIED */}

                      <div className="skill-gap-metric">
                        <strong>
                          {skill.verifiedCoverage.toFixed(
                            0
                          )}
                          %
                        </strong>

                        <small>
                          verified coverage
                        </small>

                        <span>
                          {skill.verifiedStudents}/
                          {filteredStudents.length}{" "}
                          verified
                        </span>
                      </div>

                      {/* GAP */}

                      <div className="skill-gap-result">
                        <strong>
                          {skill.gapIndex.toFixed(0)}
                        </strong>

                        <small>gap index</small>

                        <span
                          className={`skill-gap-badge ${priority.className}`}
                        >
                          {priority.label}
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>

          {/* TRAINING PRIORITIES */}

          <section className="skill-gap-section">
            <div className="skill-gap-section-heading">
              <div>
                <span className="skill-gap-kicker">
                  // recommended intervention
                </span>

                <h2>Training priorities</h2>
              </div>

              <span>
                {highPriorityCount} high priority
              </span>
            </div>

            <div className="skill-gap-priorities">
              {gapData
                .filter(
                  (skill) =>
                    skill.gapIndex > 0
                )
                .slice(0, 5)
                .map((skill, index) => {
                  const priority =
                    getPriority(skill);

                  return (
                    <article key={skill.skillId}>
                      <span className="skill-gap-priority-number">
                        {String(index + 1).padStart(
                          2,
                          "0"
                        )}
                      </span>

                      <div>
                        <h3>
                          {skill.skillName}
                        </h3>

                        <p>
                          {skill.demandPoints} demand
                          points ·{" "}
                          {skill.coverage.toFixed(0)}%
                          student coverage ·{" "}
                          {skill.verifiedCoverage.toFixed(
                            0
                          )}
                          % verified coverage
                        </p>
                      </div>

                      <span
                        className={`skill-gap-badge ${priority.className}`}
                      >
                        {priority.label}
                      </span>
                    </article>
                  );
                })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default SkillGapMap;