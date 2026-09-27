import {
  NavLink,
  Outlet,
  useNavigate,
} from "react-router-dom";

import LogoutButton from "../components/LogoutButton";
import { useAuth } from "../hooks/useAuth";
import "./StudentLayout.css";

function StudentLayout() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const studentName =
    user?.user_metadata?.full_name?.trim() ||
    user?.email?.split("@")[0] ||
    "Student";

  return (
    <div className="student-shell">
      <aside className="student-sidebar">
        {/* =========================
            LOGO
        ========================= */}

        <button
          type="button"
          className="student-sidebar-logo"
          onClick={() => navigate("/")}
          aria-label="Go to SkillBridge home"
        >
          <span className="student-sidebar-mark">
            <svg
              viewBox="0 0 26 22"
              width="17"
              height="14"
              fill="none"
              stroke="#1a1a1a"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 15 L2 9 M24 15 L24 9" />
              <path d="M2 9 C 9 -1 17 -1 24 9" />

              <line
                x1="0"
                y1="15"
                x2="26"
                y2="15"
              />

              <line
                x1="7"
                y1="10"
                x2="7"
                y2="15"
              />

              <line
                x1="13"
                y1="7.5"
                x2="13"
                y2="15"
              />

              <line
                x1="19"
                y1="10"
                x2="19"
                y2="15"
              />
            </svg>
          </span>

          <span>
            Skill<span>Bridge</span>
          </span>
        </button>

        {/* =========================
            WORKSPACE LABEL
        ========================= */}

        <div className="student-sidebar-role">
          <span className="student-role-dot"></span>
          Student workspace
        </div>

        {/* =========================
            NAVIGATION
        ========================= */}

        <nav className="student-sidebar-nav">
          {/* DASHBOARD */}

          <NavLink
            to="/student"
            end
            className={({ isActive }) =>
              `student-nav-item ${
                isActive ? "active" : ""
              }`
            }
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect
                x="3"
                y="3"
                width="7"
                height="7"
                rx="1"
              />

              <rect
                x="14"
                y="3"
                width="7"
                height="7"
                rx="1"
              />

              <rect
                x="3"
                y="14"
                width="7"
                height="7"
                rx="1"
              />

              <rect
                x="14"
                y="14"
                width="7"
                height="7"
                rx="1"
              />
            </svg>

            Dashboard
          </NavLink>

          {/* PROFILE */}

          <NavLink
            to="/student/profile"
            className={({ isActive }) =>
              `student-nav-item ${
                isActive ? "active" : ""
              }`
            }
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle
                cx="12"
                cy="8"
                r="4"
              />

              <path d="M4 21c.8-4.2 3.4-6 8-6s7.2 1.8 8 6" />
            </svg>

            Profile
          </NavLink>

          {/* DIGITAL PORTFOLIO */}

          <NavLink
            to="/student/portfolio"
            className={({ isActive }) =>
              `student-nav-item ${
                isActive ? "active" : ""
              }`
            }
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect
                x="3"
                y="5"
                width="18"
                height="15"
                rx="2"
              />

              <path d="M8 5V3h8v2" />
              <path d="M3 10h18" />
              <path d="M9 14h6" />
              <path d="M9 17h4" />
            </svg>

            Digital Portfolio
          </NavLink>

          {/* SKILL ASSESSMENT */}

          <NavLink
            to="/student/assessment"
            className={({ isActive }) =>
              `student-nav-item ${
                isActive ? "active" : ""
              }`
            }
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect
                x="5"
                y="5"
                width="14"
                height="16"
                rx="2"
              />

              <path d="M9 5V3h6v2" />
              <path d="m9 12 2 2 4-5" />
              <path d="M9 17h6" />
            </svg>

            Skill Assessment
          </NavLink>

          {/* OPPORTUNITIES */}

          <NavLink
            to="/student/opportunities"
            className={({ isActive }) =>
              `student-nav-item ${
                isActive ? "active" : ""
              }`
            }
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M4 7h16v12H4z" />
              <path d="M8 7V5h8v2M9 12h6" />
            </svg>

            Opportunities
          </NavLink>

          {/* MY APPLICATIONS */}

          <NavLink
            to="/student/applications"
            className={({ isActive }) =>
              `student-nav-item ${
                isActive ? "active" : ""
              }`
            }
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect
                x="4"
                y="3"
                width="16"
                height="18"
                rx="2"
              />

              <path d="M8 8h8" />
              <path d="M8 12h8" />
              <path d="M8 16h5" />

              <path d="M7 3V1" />
              <path d="M17 3V1" />
            </svg>

            My Applications
          </NavLink>

          {/* CAREER GUIDANCE */}

          <NavLink
            to="/student/career-guidance"
            className={({ isActive }) =>
              `student-nav-item ${
                isActive ? "active" : ""
              }`
            }
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle
                cx="12"
                cy="12"
                r="9"
              />

              <path d="M15.5 8.5 14 14l-5.5 1.5L10 10z" />
            </svg>

            Career Guidance
          </NavLink>

          {/* SKILL ROADMAP */}

          <NavLink
            to="/student/roadmap"
            className={({ isActive }) =>
              `student-nav-item ${
                isActive ? "active" : ""
              }`
            }
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M4 19V9M10 19V5M16 19v-7M22 19H2" />
            </svg>

            Skill roadmap
          </NavLink>

          {/* LEARNING HUB */}

          <NavLink
            to="/student/learning"
            className={({ isActive }) =>
              `student-nav-item ${
                isActive ? "active" : ""
              }`
            }
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5z" />

              <path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5z" />

              <path d="M11 19h2" />
            </svg>

            Learning Hub
          </NavLink>

          {/* INTERNSHIP PROGRESS */}

          <NavLink
            to="/student/internship-progress"
            className={({ isActive }) =>
              `student-nav-item ${
                isActive ? "active" : ""
              }`
            }
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 7h16v13H4z" />

              <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />

              <path d="M4 12h16" />
              <path d="M9 12v2h6v-2" />
            </svg>

            Internship Progress
          </NavLink>
        </nav>

        {/* =========================
            USER / LOGOUT
        ========================= */}

        <div className="student-sidebar-bottom">
          <div className="student-user-card">
            <div className="student-avatar">
              {studentName
                .charAt(0)
                .toUpperCase()}
            </div>

            <div className="student-user-copy">
              <strong>
                {studentName}
              </strong>

              <span>
                {user?.email || ""}
              </span>
            </div>
          </div>

          <LogoutButton />
        </div>
      </aside>

      {/* =========================
          MAIN AREA
      ========================= */}

      <div className="student-main-area">
        <header className="student-topbar">
          <div>
            <span className="student-topbar-kicker">
              // student portal
            </span>
          </div>

          <button
            type="button"
            className="student-profile-shortcut"
            onClick={() =>
              navigate("/student/profile")
            }
          >
            View profile
          </button>
        </header>

        <main className="student-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
export default StudentLayout;