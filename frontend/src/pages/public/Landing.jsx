import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Landing.css";

function Landing() {
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const [navScrolled, setNavScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("home");
  const [selectedPillar, setSelectedPillar] = useState(null);
  const [contactOpen, setContactOpen] = useState(false);
  const [contactStatus, setContactStatus] = useState("");

  useEffect(() => {
    const handleScroll = () => {
      setNavScrolled(window.scrollY > 8);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const revealElements = document.querySelectorAll(".reveal");

    if (reduceMotion || !("IntersectionObserver" in window)) {
      revealElements.forEach((element) => {
        element.classList.add("visible");

        const bars = element.querySelector(".pipe-bars");
        if (bars) {
          bars.classList.add("animate");
        }
      });

      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          entry.target.classList.add("visible");

          const bars = entry.target.querySelector(".pipe-bars");
          if (bars) {
            bars.classList.add("animate");
          }

          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.15 }
    );

    revealElements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;

    const sectionIds = [
      "home",
      "about",
      "features",
      "how",
      "proof",
      "contact",
    ];

    const sections = sectionIds
      .map((id) => document.getElementById(id))
      .filter(Boolean);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      {
        rootMargin: "-45% 0px -50% 0px",
        threshold: 0,
      }
    );

    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!contactOpen) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setContactOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleEscape);
    };
  }, [contactOpen]);

  const closeMobileMenu = () => {
    setMenuOpen(false);
  };

  const handleContactSubmit = (event) => {
    event.preventDefault();

    // UI-only for now. We can connect this to an email/API endpoint later.
    setContactStatus(
      "The contact form UI is working. Message delivery will be connected next."
    );
    event.currentTarget.reset();
  };

  const pillarClass = (baseClass, name) =>
    `pillar ${baseClass} reveal ${
      selectedPillar === name ? "selected" : ""
    }`;

  return (
    <>
      <div className="top-accent"></div>
      <div className="glow"></div>
      <div className="glow-2"></div>
      <div className="grain"></div>

      <div className="page">
        {/* =========================
            NAVBAR
        ========================== */}

        <nav className={`nav ${navScrolled ? "scrolled" : ""}`}>
          <a
            className="logo"
            href="#home"
            onClick={closeMobileMenu}
            aria-label="SkillBridge home"
          >
            <span className="mark">
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

            Skill<span className="accent">Bridge</span>
          </a>

          <ul className={`nav-links ${menuOpen ? "open" : ""}`}>
            <li>
              <a
                href="#home"
                className={activeSection === "home" ? "active" : ""}
                onClick={closeMobileMenu}
              >
                Home
              </a>
            </li>

            <li>
              <a
                href="#about"
                className={activeSection === "about" ? "active" : ""}
                onClick={closeMobileMenu}
              >
                About
              </a>
            </li>

            <li>
              <a
                href="#features"
                className={activeSection === "features" ? "active" : ""}
                onClick={closeMobileMenu}
              >
                Features
              </a>
            </li>

            <li>
              <a
                href="#how"
                className={activeSection === "how" ? "active" : ""}
                onClick={closeMobileMenu}
              >
                How it Works
              </a>
            </li>

            <li>
              <a
                href="#proof"
                className={activeSection === "proof" ? "active" : ""}
                onClick={closeMobileMenu}
              >
                Proof
              </a>
            </li>

            <li>
              <a
                href="#contact"
                className={activeSection === "contact" ? "active" : ""}
                onClick={closeMobileMenu}
              >
                Contact
              </a>
            </li>
          </ul>

          <div className="nav-right">
            <button
              className="btn btn-ghost"
              onClick={() => navigate("/login")}
            >
              Sign In
            </button>

            <button
              type="button"
              className={`nav-toggle ${menuOpen ? "open" : ""}`}
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((current) => !current)}
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
          </div>
        </nav>

        {/* =========================
            HERO
        ========================== */}

        <section className="hero" id="home">
          <div className="hero-grid">
            <div className="hero-copy">
              <div className="eyebrow">// connecting four worlds</div>

              <h1>
                Bridging <span className="role-student">Students</span> &amp;{" "}
                <span className="role-faculty">Faculty</span>,
                <br />
                <span className="role-college">Colleges</span> &amp;{" "}
                <span className="role-recruiter">Recruiters</span>
                <br />
                Together
              </h1>

              <p className="lede">
                One network where talent, education and opportunity meet — so
                students grow, faculty advance, colleges empower, and
                recruiters discover what&apos;s next.
              </p>

              <div className="tag-row">
                <span className="tag tg">
                  <span className="sw"></span>
                  student
                </span>

                <span className="tag tb">
                  <span className="sw"></span>
                  faculty
                </span>

                <span className="tag ty">
                  <span className="sw"></span>
                  college
                </span>

                <span className="tag tr">
                  <span className="sw"></span>
                  recruiter
                </span>
              </div>

              <div className="hero-actions">
                <button
                  className="btn btn-primary"
                  onClick={() => navigate("/signup")}
                >
                  Get Started

                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                  >
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </button>

                <button
                  className="btn btn-ghost"
                  onClick={() => navigate("/login")}
                >
                  Sign In
                </button>
              </div>
            </div>

            {/* =========================
                HERO STATS
            ========================== */}

            <div className="hero-stats">
              <div className="mtile brand reveal">
                <div className="m-label">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="9" cy="8" r="3.4" />
                    <path d="M3.5 20c0-3.5 2.5-6 5.5-6s5.5 2.5 5.5 6" />
                    <path d="M16 4.6a3.4 3.4 0 0 1 0 6.6" />
                    <path d="M20.5 20c0-2.8-1.7-5-4-5.7" />
                  </svg>
                  Students
                </div>

                <div className="m-val">18.4K</div>

                <div className="m-foot">
                  Verified students live right now
                </div>
              </div>

              <div className="mtile reveal">
                <div className="m-label">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 22s7-6.5 7-12.5A7 7 0 0 0 5 9.5C5 15.5 12 22 12 22Z" />
                    <circle cx="12" cy="9.5" r="2.6" />
                  </svg>
                  Colleges
                </div>

                <div className="m-val">312</div>

                <div className="m-foot">
                  Partner institutions connected
                </div>
              </div>

              <div className="mtile reveal">
                <div className="m-label">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="2" y="6" width="20" height="14" rx="2" />
                    <path d="M8 6V4.5C8 3.5 8.8 3 10 3h4c1.2 0 2 .5 2 1.5V6" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                  </svg>
                  Recruiters
                </div>

                <div className="m-val">86</div>

                <div className="m-foot">Companies actively hiring</div>
              </div>

              <div className="mtile reveal">
                <div className="m-label">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 5c3-1.3 6-1.3 8 0v14c-2-1.3-5-1.3-8 0V5Z" />
                    <path d="M20 5c-3-1.3-6-1.3-8 0v14c2-1.3 5-1.3 8 0V5Z" />
                  </svg>
                  Faculty
                </div>

                <div className="m-val">540</div>

                <div className="m-foot">Faculty members connected</div>
              </div>

              <div className="mtile wide reveal">
                <div className="m-label">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12.5 2 4 13h6l-1 9 8.5-11h-6l1-9Z" />
                  </svg>
                  Matches
                </div>

                <div className="m-val">947</div>

                <div className="m-foot">Shortlists sent this week</div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================
            PIPELINE
        ========================== */}

        <section className="pipeline" aria-label="Matching activity">
          <div className="pipeline-inner">
            <div className="pipe-card reveal">
              <div className="pipe-head">
                <div>
                  <div className="m-label">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M4 21V10M12 21V4M20 21v-7" />
                    </svg>
                    Matches per week
                  </div>

                  <div className="pipe-sub">
                    A visual preview of how SkillBridge can track matching
                    activity across a placement cycle.
                  </div>
                </div>

                <div className="pipe-tag">// demo preview</div>
              </div>

              <div
                className="pipe-bars"
                aria-label="Illustrative weekly matching activity"
              >
                {[24, 31, 28, 42, 39, 54, 61, 57, 73, 81, 88, 100].map(
                  (height, index) => (
                    <div className="pipe-bar" key={index}>
                      <span style={{ height: `${height}%` }}></span>
                    </div>
                  )
                )}
              </div>

              <div className="pipe-scale">
                <span>Week 1</span>
                <span>Week 12</span>
              </div>
            </div>
          </div>
        </section>

        {/* =========================
            ABOUT
        ========================== */}

        <section id="about" className="about">
          <div className="section-inner">
            <div className="section-head reveal">
              <div className="eyebrow">// why we exist</div>

              <h2>
                <span className="accent-text">SkillBridge</span> is one
                platform,
                <br />
                four worlds in sync
              </h2>

              <p className="lede">
                Students graduate with skills that are hard to present in a
                structured way. Faculty need better channels to turn expertise
                into industry collaboration. Colleges need better visibility
                into industry demand. Recruiters need a faster way to
                identify relevant talent. SkillBridge connects all four
                through one shared skill ecosystem.
              </p>
            </div>

            <div className="pillar-grid">
              {/* STUDENT */}
              <div className={pillarClass("pillar-green", "student")}>
                <button
                  type="button"
                  className="pillar-icon"
                  aria-label="Highlight student role"
                  onClick={() =>
                    setSelectedPillar((current) =>
                      current === "student" ? null : "student"
                    )
                  }
                >
                  <svg
                    viewBox="0 0 28 22"
                    width="22"
                    height="17"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M0 8 L14 0 L28 8 L14 16 Z" />
                    <path d="M6 11 V18 C6 20 10 22 14 22 C18 22 22 20 22 18 V11" />
                    <line x1="28" y1="8" x2="28" y2="16" />
                  </svg>
                </button>

                <div>
                  <h3>Students</h3>
                  <p>
                    Build a skill-first profile from your resume, projects and
                    experience, discover matched opportunities and understand
                    which skills can improve your fit.
                  </p>
                </div>
              </div>

              {/* COLLEGE */}
              <div className={pillarClass("pillar-yellow", "college")}>
                <button
                  type="button"
                  className="pillar-icon"
                  aria-label="Highlight college role"
                  onClick={() =>
                    setSelectedPillar((current) =>
                      current === "college" ? null : "college"
                    )
                  }
                >
                  <svg
                    viewBox="0 0 26 19"
                    width="20"
                    height="15"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M0 7 L13 0 L26 7" />
                    <line x1="2" y1="7" x2="24" y2="7" />
                    <line x1="4" y1="7" x2="4" y2="19" />
                    <line x1="10" y1="7" x2="10" y2="19" />
                    <line x1="16" y1="7" x2="16" y2="19" />
                    <line x1="22" y1="7" x2="22" y2="19" />
                    <line x1="1" y1="19" x2="25" y2="19" />
                  </svg>
                </button>

                <div>
                  <h3>Colleges</h3>
                  <p>
                    Understand student readiness, compare academic talent with
                    industry demand and identify training areas that can improve
                    placement outcomes.
                  </p>
                </div>
              </div>

              {/* RECRUITER */}
              <div className={pillarClass("pillar-red", "recruiter")}>
                <button
                  type="button"
                  className="pillar-icon"
                  aria-label="Highlight recruiter role"
                  onClick={() =>
                    setSelectedPillar((current) =>
                      current === "recruiter" ? null : "recruiter"
                    )
                  }
                >
                  <svg
                    viewBox="0 0 26 22"
                    width="20"
                    height="17"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="0" y="5" width="26" height="17" rx="2" />
                    <path d="M8 5 V2 C8 1 9 0 10 0 H16 C17 0 18 1 18 2 V5" />
                    <line x1="0" y1="13" x2="26" y2="13" />
                  </svg>
                </button>

                <div>
                  <h3>Recruiters</h3>
                  <p>
                    Define opportunity requirements, automatically filter
                    eligible students and discover candidates ranked by
                    relevant skills and project experience.
                  </p>
                </div>
              </div>

              {/* FACULTY */}
              <div className={pillarClass("pillar-blue", "faculty")}>
                <button
                  type="button"
                  className="pillar-icon"
                  aria-label="Highlight faculty role"
                  onClick={() =>
                    setSelectedPillar((current) =>
                      current === "faculty" ? null : "faculty"
                    )
                  }
                >
                  <svg
                    viewBox="0 0 24 22"
                    width="19"
                    height="17"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 4c3-1.3 6-1.3 8 0v15c-2-1.3-5-1.3-8 0V4Z" />
                    <path d="M20 4c-3-1.3-6-1.3-8 0v15c2-1.3 5-1.3 8 0V4Z" />
                  </svg>
                </button>

                <div>
                  <h3>Faculty</h3>
                  <p>
                    Connect with industry for professional development,
                    research collaboration and consultancy — while feeding
                    expertise back into the skill ecosystem.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================
            FEATURES
        ========================== */}

        <section id="features" className="features">
          <div className="section-inner">
            <div className="section-head reveal">
              <div className="eyebrow">// the platform</div>

              <h2>
                What <span className="accent-text">SkillBridge</span> actually
                does
              </h2>

              <p className="lede">
                One connected system for skill mapping, opportunity matching
                and academia-industry collaboration — everything each of the
                four portals actually does.
              </p>
            </div>

            {/* STUDENT */}
            <div className="feature-group">
              <div className="feature-group-head">
                <span className="dot green"></span>
                <h4>For students</h4>
              </div>

              <div className="feature-grid">
                <div className="feature-card fc-green reveal">
                  <div className="f-index">01</div>
                  <h3>Resume Intelligence</h3>
                  <p>
                    Upload a resume and SkillBridge extracts relevant skills,
                    projects and experience to build a structured student
                    profile.
                  </p>
                </div>

                <div className="feature-card fc-green reveal">
                  <div className="f-index">02</div>
                  <h3>Skill Assessment</h3>
                  <p>
                    Take skill-specific assessments so your proficiency
                    levels are backed by more than a self-rating.
                  </p>
                </div>

                <div className="feature-card fc-green reveal">
                  <div className="f-index">03</div>
                  <h3>Skill Roadmap</h3>
                  <p>
                    Build a focused roadmap for any opportunity, tracking
                    exactly which skills close the gap to a stronger match.
                  </p>
                </div>

                <div className="feature-card fc-green reveal">
                  <div className="f-index">04</div>
                  <h3>Opportunity Matching</h3>
                  <p>
                    SkillBridge checks eligibility first, then ranks every
                    opportunity against your saved skills and proficiency
                    levels.
                  </p>
                </div>

                <div className="feature-card fc-green reveal">
                  <div className="f-index">05</div>
                  <h3>Internship Progress Tracking</h3>
                  <p>
                    Follow every milestone of an internship once a match
                    turns into an offer.
                  </p>
                </div>
              </div>
            </div>

            {/* RECRUITER */}
            <div className="feature-group">
              <div className="feature-group-head">
                <span className="dot red"></span>
                <h4>For recruiters</h4>
              </div>

              <div className="feature-grid">
                <div className="feature-card fc-red reveal">
                  <div className="f-index">06</div>
                  <h3>Opportunity Management</h3>
                  <p>
                    Post, edit and publish hiring roles, then control exactly
                    when they open for student eligibility matching.
                  </p>
                </div>

                <div className="feature-card fc-red reveal">
                  <div className="f-index">07</div>
                  <h3>Smart Candidate Matching</h3>
                  <p>
                    Define eligibility and required skills, and SkillBridge
                    filters and ranks candidates by fit automatically.
                  </p>
                </div>

                <div className="feature-card fc-red reveal">
                  <div className="f-index">08</div>
                  <h3>Candidate Review &amp; Shortlisting</h3>
                  <p>
                    Review every applicant&apos;s profile and resume, then
                    shortlist candidates for the next hiring stage.
                  </p>
                </div>

                <div className="feature-card fc-red reveal">
                  <div className="f-index">09</div>
                  <h3>Recruitment Analytics</h3>
                  <p>
                    Track hiring funnel performance across every opportunity
                    you&apos;ve posted.
                  </p>
                </div>

                <div className="feature-card fc-red reveal">
                  <div className="f-index">10</div>
                  <h3>Faculty Collaboration Postings</h3>
                  <p>
                    Publish faculty development, research and consultancy
                    opportunities straight to academia.
                  </p>
                </div>
              </div>
            </div>

            {/* COLLEGE */}
            <div className="feature-group">
              <div className="feature-group-head">
                <span className="dot yellow"></span>
                <h4>For colleges</h4>
              </div>

              <div className="feature-grid">
                <div className="feature-card fc-yellow reveal">
                  <div className="f-index">11</div>
                  <h3>Department Setup</h3>
                  <p>
                    Configure the academic departments that every student
                    record in your institution is built on.
                  </p>
                </div>

                <div className="feature-card fc-yellow reveal">
                  <div className="f-index">12</div>
                  <h3>Student Oversight</h3>
                  <p>
                    Monitor student academic profiles, verification status
                    and institutional readiness from one place.
                  </p>
                </div>

                <div className="feature-card fc-yellow reveal">
                  <div className="f-index">13</div>
                  <h3>Skill Gap Mapping</h3>
                  <p>
                    Compare skills requested by live opportunities against
                    recorded, verified student skills to see exactly where
                    the gaps are.
                  </p>
                </div>

                <div className="feature-card fc-yellow reveal">
                  <div className="f-index">14</div>
                  <h3>Training Recommendations</h3>
                  <p>
                    Turn identified academia-industry skill gaps into
                    targeted workshops, courses and certifications.
                  </p>
                </div>

                <div className="feature-card fc-yellow reveal">
                  <div className="f-index">15</div>
                  <h3>Institution Analytics</h3>
                  <p>
                    Track institution-wide student readiness and placement
                    trends over time.
                  </p>
                </div>
              </div>
            </div>

            {/* FACULTY */}
            <div className="feature-group">
              <div className="feature-group-head">
                <span className="dot blue"></span>
                <h4>For faculty</h4>
              </div>

              <div className="feature-grid">
                <div className="feature-card fc-blue reveal">
                  <div className="f-index">16</div>
                  <h3>Faculty Profile</h3>
                  <p>
                    Maintain your academic expertise, research interests and
                    professional information for industry collaboration.
                  </p>
                </div>

                <div className="feature-card fc-blue reveal">
                  <div className="f-index">17</div>
                  <h3>Opportunity Discovery</h3>
                  <p>
                    Discover faculty development programmes, research
                    collaborations and consultancy work posted directly by
                    industry.
                  </p>
                </div>

                <div className="feature-card fc-blue reveal">
                  <div className="f-index">18</div>
                  <h3>Application Tracking</h3>
                  <p>
                    Track your faculty development, research and training
                    applications from submission through to outcome.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================
            HOW IT WORKS
        ========================== */}

        <section id="how" className="how">
          <div className="section-inner">
            <div className="section-head reveal">
              <div className="eyebrow">// how it works</div>

              <h2>
                From profile to{" "}
                <span className="accent-text">opportunity</span>
              </h2>

              <p className="lede">
                SkillBridge connects student data, college insights and
                recruiter requirements through one intelligent matching
                system.
              </p>
            </div>

            <div className="step-grid">
              <div className="step-card reveal">
                <div className="step-num">01</div>
                <h3>Build your skill profile</h3>
                <p>
                  Students complete their academic profile and upload a resume.
                  SkillBridge identifies skills, projects and relevant
                  experience.
                </p>
              </div>

              <div className="step-card reveal">
                <div className="step-num">02</div>
                <h3>Recruiters define requirements</h3>
                <p>
                  Companies create internship or placement opportunities with
                  eligibility requirements, required skills and preferred
                  skills.
                </p>
              </div>

              <div className="step-card reveal">
                <div className="step-num">03</div>
                <h3>SkillBridge finds the match</h3>
                <p>
                  Ineligible candidates are filtered first. Eligible students
                  are then ranked according to their skills, projects and
                  overall role compatibility.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =========================
            SKILL GAP / PROOF
        ========================== */}

        <section id="proof" className="proof">
          <div className="section-inner">
            <div className="section-head reveal">
              <div className="eyebrow">// academia meets industry</div>

              <h2>
                Turn the <span className="accent-text">skill gap</span> into
                actionable insight
              </h2>

              <p className="lede">
                SkillBridge helps colleges understand what industry wants and
                helps students understand what they need to improve.
              </p>
            </div>

            <div className="proof-split">
              <div className="proof-quote reveal">
                <svg
                  className="quote-mark"
                  viewBox="0 0 32 24"
                  width="30"
                  height="22"
                >
                  <path d="M9.5 0C4.5 3 0 8.4 0 14.7 0 19.9 3.6 24 8.6 24c4 0 7-3 7-6.9 0-3.6-2.6-6.4-6-6.4-.7 0-1.4.1-1.9.3C8.6 6.7 12 3 16.6.9L9.5 0Zm17 0C21.5 3 17 8.4 17 14.7 17 19.9 20.6 24 25.6 24c4 0 7-3 7-6.9 0-3.6-2.6-6.4-6-6.4-.7 0-1.4.1-1.9.3C25.6 6.7 29 3 33.6.9L26.5 0Z" />
                </svg>

                <p>
                  Instead of asking students to apply blindly, SkillBridge
                  shows how closely their current abilities match an
                  opportunity and what is preventing a stronger match.
                </p>

                <div className="proof-by">
                  <div className="n">Skill-first matching</div>
                  <div className="r">
                    Built into the SkillBridge workflow
                  </div>
                </div>
              </div>

              <div className="proof-rows reveal">
                <div className="proof-row">
                  <div>
                    <div className="rn">Industry Demand</div>
                    <div className="rs">
                      Skills recruiters are currently requesting
                    </div>
                  </div>
                  <div className="rv">Demand</div>
                </div>

                <div className="proof-row">
                  <div>
                    <div className="rn">Student Skill Supply</div>
                    <div className="rs">
                      Skills available across students and departments
                    </div>
                  </div>
                  <div className="rv">Supply</div>
                </div>

                <div className="proof-row">
                  <div>
                    <div className="rn">Skill Gap</div>
                    <div className="rs">
                      Difference between industry needs and student readiness
                    </div>
                  </div>
                  <div className="rv">Gap</div>
                </div>

                <div className="proof-row">
                  <div>
                    <div className="rn">Training Recommendation</div>
                    <div className="rs">
                      Areas colleges can prioritize before placement season
                    </div>
                  </div>
                  <div className="rv">Action</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================
            CONTACT
        ========================== */}

        <section id="contact" className="contact">
          <div className="section-inner">
            <div className="contact-inner cta-band reveal">
              <div>
                <div className="eyebrow">// get involved</div>

                <h2>
                  Ready to{" "}
                  <span className="accent-text">cross the bridge?</span>
                </h2>

                <p className="lede">
                  Your next opportunity is one connection away. Whether
                  you&apos;re a student, faculty, college or recruiter,
                  SkillBridge is designed to bring the right people and
                  skills together.
                </p>
              </div>

              <div className="contact-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ padding: "14px 32px", fontSize: "1rem" }}
                  onClick={() => {
                    setContactStatus("");
                    setContactOpen(true);
                  }}
                >
                  Contact us
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* =========================
            FOOTER
        ========================== */}

        <footer className="footer">
          <span>© 2026 SkillBridge</span>
          <span>
            Built for students, faculty, colleges &amp; recruiters —
            together.
          </span>
        </footer>
      </div>

      {/* =========================
          CONTACT MODAL
      ========================== */}

      <div
        className={`modal-overlay ${contactOpen ? "open" : ""}`}
        aria-hidden={!contactOpen}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            setContactOpen(false);
          }
        }}
      >
        <div
          className="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="contactModalTitle"
        >
          <button
            type="button"
            className="modal-close"
            aria-label="Close contact form"
            onClick={() => setContactOpen(false)}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>

          <div className="modal-panel active">
            <div className="eyebrow">// get in touch</div>
            <h3 id="contactModalTitle">Contact us</h3>

            <form className="modal-form" onSubmit={handleContactSubmit}>
              <label>
                Name
                <input type="text" required placeholder="Your name" />
              </label>

              <label>
                Email
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                />
              </label>

              <label>
                Message
                <textarea
                  required
                  rows="4"
                  placeholder="How can we help?"
                ></textarea>
              </label>

              <button
                type="submit"
                className="btn btn-primary modal-submit"
              >
                Send message
              </button>
            </form>

            {contactStatus && (
              <p className="modal-switch" role="status">
                {contactStatus}
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default Landing;