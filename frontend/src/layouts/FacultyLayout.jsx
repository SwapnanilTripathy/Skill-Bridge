import { NavLink, Outlet, useNavigate } from "react-router-dom";

import LogoutButton from "../components/LogoutButton";
import { useAuth } from "../hooks/useAuth";
import "./FacultyLayout.css";

function FacultyLayout() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const accountName =
    user?.user_metadata?.full_name?.trim() ||
    user?.email?.split("@")[0] ||
    "Faculty";

  return (
    <div className="faculty-shell">
      {/* =========================
          SIDEBAR
      ========================= */}

      <aside className="faculty-sidebar">
        {/* LOGO */}

        <button
          type="button"
          className="faculty-sidebar-logo"
          onClick={() => navigate("/")}
          aria-label="Go to SkillBridge home"
        >
          <span className="faculty-sidebar-mark">
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

        {/* ROLE */}

        <div className="faculty-sidebar-role">
          <span className="faculty-role-dot"></span>
          Faculty workspace
        </div>

        {/* =========================
            NAVIGATION
        ========================= */}

        <nav className="faculty-sidebar-nav">
          {/* DASHBOARD */}

          <NavLink
            to="/faculty"
            end
            className={({ isActive }) =>
              `faculty-nav-item ${
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
            to="/faculty/profile"
            className={({ isActive }) =>
              `faculty-nav-item ${
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
              <circle cx="12" cy="8" r="4" />

              <path d="M4 21c.8-5 3.5-7 8-7s7.2 2 8 7" />
            </svg>

            Faculty profile
          </NavLink>

          {/* OPPORTUNITIES */}

          <NavLink
            to="/faculty/opportunities"
            className={({ isActive }) =>
              `faculty-nav-item ${
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
                y="7"
                width="18"
                height="13"
                rx="2"
              />

              <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />

              <path d="M3 12h18" />
            </svg>

            Opportunities
          </NavLink>

          {/* APPLICATIONS */}

          <NavLink
            to="/faculty/applications"
            className={({ isActive }) =>
              `faculty-nav-item ${
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
              <path d="M6 3h12v18H6z" />
              <path d="M9 8h6M9 12h6M9 16h4" />
            </svg>

            My applications
          </NavLink>
        </nav>

        {/* =========================
            USER
        ========================= */}

        <div className="faculty-sidebar-bottom">
          <div className="faculty-user-card">
            <div className="faculty-avatar">
              {accountName.charAt(0).toUpperCase()}
            </div>

            <div className="faculty-user-copy">
              <strong>{accountName}</strong>
              <span>{user?.email || ""}</span>
            </div>
          </div>

          <LogoutButton />
        </div>
      </aside>

      {/* =========================
          MAIN AREA
      ========================= */}

      <div className="faculty-main-area">
        <header className="faculty-topbar">
          <span className="faculty-topbar-kicker">
            // academician portal
          </span>

          <button
            type="button"
            className="faculty-opportunity-shortcut"
            onClick={() =>
              navigate("/faculty/opportunities")
            }
          >
            Explore collaborations
          </button>
        </header>

        <main className="faculty-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default FacultyLayout;