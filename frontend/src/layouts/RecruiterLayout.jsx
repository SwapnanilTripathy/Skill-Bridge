import { NavLink, Outlet, useNavigate } from "react-router-dom";

import LogoutButton from "../components/LogoutButton";
import { useAuth } from "../hooks/useAuth";
import "./RecruiterLayout.css";

function RecruiterLayout() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const recruiterName =
    user?.user_metadata?.full_name?.trim() ||
    user?.email?.split("@")[0] ||
    "Recruiter";

  return (
    <div className="recruiter-shell">
      <aside className="recruiter-sidebar">
        {/* LOGO */}

        <button
          type="button"
          className="recruiter-sidebar-logo"
          onClick={() => navigate("/")}
          aria-label="Go to SkillBridge home"
        >
          <span className="recruiter-sidebar-mark">
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
              <line x1="0" y1="15" x2="26" y2="15" />
              <line x1="7" y1="10" x2="7" y2="15" />
              <line x1="13" y1="7.5" x2="13" y2="15" />
              <line x1="19" y1="10" x2="19" y2="15" />
            </svg>
          </span>

          <span>
            Skill<span>Bridge</span>
          </span>
        </button>

        {/* WORKSPACE LABEL */}

        <div className="recruiter-sidebar-role">
          <span className="recruiter-role-dot"></span>
          Recruiter workspace
        </div>

        {/* NAVIGATION */}

        <nav className="recruiter-sidebar-nav">
          {/* DASHBOARD */}

          <NavLink
            to="/recruiter"
            end
            className={({ isActive }) =>
              `recruiter-nav-item ${isActive ? "active" : ""}`
            }
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>

            Dashboard
          </NavLink>

          {/* STUDENT OPPORTUNITIES */}

          <NavLink
            to="/recruiter/opportunities"
            className={({ isActive }) =>
              `recruiter-nav-item ${isActive ? "active" : ""}`
            }
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M4 7h16v12H4z" />
              <path d="M8 7V5h8v2M8 12h8" />
            </svg>

            Opportunities
          </NavLink>

          {/* FACULTY COLLABORATIONS */}

          <NavLink
            to="/recruiter/faculty-opportunities"
            className={({ isActive }) =>
              `recruiter-nav-item ${isActive ? "active" : ""}`
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
              <path d="M3 10l9-5 9 5-9 5-9-5z" />
              <path d="M7 12.5V17c3 2 7 2 10 0v-4.5" />
              <path d="M21 10v6" />
            </svg>

            Faculty collaborations
          </NavLink>

          {/* CANDIDATES */}

          <NavLink
            to="/recruiter/candidates"
            className={({ isActive }) =>
              `recruiter-nav-item ${isActive ? "active" : ""}`
            }
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="9" cy="8" r="3" />
              <circle cx="17" cy="10" r="2" />

              <path d="M3 20c.6-4 2.8-6 6-6s5.4 2 6 6" />
              <path d="M15 15c3 0 5 1.7 6 5" />
            </svg>

            Candidates
          </NavLink>

          {/* SHORTLIST */}

          <NavLink
            to="/recruiter/shortlist"
            className={({ isActive }) =>
              `recruiter-nav-item ${isActive ? "active" : ""}`
            }
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M5 4h14v16H5z" />
              <path d="M8 8h8M8 12h5M8 16h6" />
            </svg>

            Shortlist
          </NavLink>

          {/* INTERNSHIP TRACKING */}

          <NavLink
            to="/recruiter/internships"
            className={({ isActive }) =>
              `recruiter-nav-item ${isActive ? "active" : ""}`
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
              <path d="M4 5h16v14H4z" />
              <path d="M8 5V3M16 5V3" />
              <path d="M8 11h8" />
              <path d="M8 15h5" />
              <path d="M18 14v5" />
              <path d="M15.5 16.5H20.5" />
            </svg>

            Internship tracking
          </NavLink>

          {/* ANALYTICS */}

          <NavLink
            to="/recruiter/analytics"
            className={({ isActive }) =>
              `recruiter-nav-item ${isActive ? "active" : ""}`
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
              <path d="M4 19V14" />
              <path d="M9 19V10" />
              <path d="M14 19V5" />
              <path d="M19 19V8" />
              <path d="M2 19h20" />
            </svg>

            Analytics
          </NavLink>
        </nav>

        {/* USER / LOGOUT */}

        <div className="recruiter-sidebar-bottom">
          <div className="recruiter-user-card">
            <div className="recruiter-avatar">
              {recruiterName.charAt(0).toUpperCase()}
            </div>

            <div className="recruiter-user-copy">
              <strong>{recruiterName}</strong>
              <span>{user?.email || ""}</span>
            </div>
          </div>

          <LogoutButton />
        </div>
      </aside>

      {/* MAIN CONTENT */}

      <div className="recruiter-main-area">
        <header className="recruiter-topbar">
          <span className="recruiter-topbar-kicker">
            // recruiter portal
          </span>

          <span className="recruiter-topbar-note">
            Hiring workspace
          </span>
        </header>

        <main className="recruiter-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default RecruiterLayout;