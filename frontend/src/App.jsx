import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

/* =========================
   RECRUITER PAGES
========================= */

import RecruiterOnboarding from "./pages/recruiter/Onboarding";
import RecruiterOpportunities from "./pages/recruiter/Opportunities";
import CreateOpportunity from "./pages/recruiter/CreateOpportunities";
import RecruiterCandidates from "./pages/recruiter/Candidates";
import CandidateDetails from "./pages/recruiter/CandidateDetails";
import Shortlist from "./pages/recruiter/Shortlist";
import CreateFacultyOpportunity from "./pages/recruiter/CreateFacultyOpportunity";
import FacultyOpportunities from "./pages/recruiter/FacultyOpportunities";
import RecruiterAnalytics from "./pages/recruiter/Analytics";
import RecruiterInternshipTracking from "./pages/recruiter/InternshipTracking";

/* =========================
   COLLEGE PAGES
========================= */

import CollegeOnboarding from "./pages/college/Onboarding";
import DepartmentSetup from "./pages/college/DepartmentSetup";
import Students from "./pages/college/Students";
import SkillGapMap from "./pages/college/SkillGapMap";
import Training from "./pages/college/Training";
import Analytics from "./pages/college/Analytics";
import PortfolioVerification from "./pages/college/PortfolioVerification";
import PlacementMonitoring from "./pages/college/PlacementMonitoring";

/* =========================
   STUDENT PAGES
========================= */

import StudentProfile from "./pages/student/Profile";
import StudentOpportunities from "./pages/student/StudentOpportunities";
import Assessment from "./pages/student/Assessment";
import TakeAssessment from "./pages/student/TakeAssessment";
import CareerGuidance from "./pages/student/CareerGuidance";
import SkillRoadmap from "./pages/student/SkillRoadmap";
import LearningHub from "./pages/student/LearningHub";
import Applications from "./pages/student/Applications";
import StudentInternshipTracking from "./pages/student/InternshipTracking";
import Portfolio from "./pages/student/Portfolio";

/* =========================
   FACULTY PAGES
========================= */

import FacultyOnboarding from "./pages/faculty/Onboarding";
import FacultyDashboard from "./pages/faculty/Dashboard";
import FacultyProfile from "./pages/faculty/Profile";
import FacultyOpportunitiesPage from "./pages/faculty/Opportunities";
import MyApplications from "./pages/faculty/MyApplications";

/* =========================
   PUBLIC PAGES
========================= */

import Landing from "./pages/public/Landing";
import Signup from "./pages/public/Signup";
import Login from "./pages/public/Login";
import RoleSelection from "./pages/public/RoleSelection";

/* =========================
   DASHBOARDS / ONBOARDING
========================= */

import StudentDashboard from "./pages/student/Dashboard";
import StudentOnboarding from "./pages/student/Onboarding";

import RecruiterDashboard from "./pages/recruiter/Dashboard";
import CollegeDashboard from "./pages/college/Dashboard";

/* =========================
   LAYOUTS
========================= */

import StudentLayout from "./layouts/StudentLayout";
import RecruiterLayout from "./layouts/RecruiterLayout";
import CollegeLayout from "./layouts/CollegeLayout";
import FacultyLayout from "./layouts/FacultyLayout";

/* =========================
   AUTH
========================= */

import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* =====================================================
            PUBLIC PAGES
        ===================================================== */}

        <Route path="/" element={<Landing />} />

        <Route
          path="/signup"
          element={<Signup />}
        />

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/select-role"
          element={<RoleSelection />}
        />

        {/* =====================================================
            STUDENT PORTAL
        ===================================================== */}

        <Route
          path="/student"
          element={
            <ProtectedRoute allowedRole="student">
              <StudentLayout />
            </ProtectedRoute>
          }
        >
          {/* DASHBOARD */}

          <Route
            index
            element={<StudentDashboard />}
          />

          {/* ONBOARDING */}

          <Route
            path="onboarding"
            element={<StudentOnboarding />}
          />

          {/* PROFILE */}

          <Route
            path="profile"
            element={<StudentProfile />}
          />

          {/* DIGITAL PORTFOLIO */}

          <Route
            path="portfolio"
            element={<Portfolio />}
          />

          {/* SKILL ASSESSMENT */}

          <Route
            path="assessment"
            element={<Assessment />}
          />

          <Route
            path="assessment/:skillId"
            element={<TakeAssessment />}
          />

          {/* OPPORTUNITIES */}

          <Route
            path="opportunities"
            element={<StudentOpportunities />}
          />

          {/* APPLICATION TRACKING */}

          <Route
            path="applications"
            element={<Applications />}
          />

          {/* CAREER GUIDANCE */}

          <Route
            path="career-guidance"
            element={<CareerGuidance />}
          />

          {/* PERSONALIZED SKILL ROADMAP */}

          <Route
            path="roadmap"
            element={<SkillRoadmap />}
          />

          {/* LEARNING HUB */}

          <Route
            path="learning"
            element={<LearningHub />}
          />

          {/* INTERNSHIP PROGRESS */}

          <Route
            path="internship-progress"
            element={<StudentInternshipTracking />}
          />
        </Route>

        {/* =====================================================
            RECRUITER / INDUSTRY PORTAL
        ===================================================== */}

        <Route
          path="/recruiter"
          element={
            <ProtectedRoute allowedRole="recruiter">
              <RecruiterLayout />
            </ProtectedRoute>
          }
        >
          {/* DASHBOARD */}

          <Route
            index
            element={<RecruiterDashboard />}
          />

          {/* ONBOARDING */}

          <Route
            path="onboarding"
            element={<RecruiterOnboarding />}
          />

          {/* STUDENT OPPORTUNITIES */}

          <Route
            path="opportunities"
            element={<RecruiterOpportunities />}
          />

          <Route
            path="opportunities/create"
            element={<CreateOpportunity />}
          />

          {/* FACULTY / ACADEMIA COLLABORATIONS */}

          <Route
            path="faculty-opportunities"
            element={<FacultyOpportunities />}
          />

          <Route
            path="faculty-opportunities/create"
            element={<CreateFacultyOpportunity />}
          />

          {/* CANDIDATES */}

          <Route
            path="candidates"
            element={<RecruiterCandidates />}
          />

          <Route
            path="candidates/:applicationId"
            element={<CandidateDetails />}
          />

          {/* SHORTLIST */}

          <Route
            path="shortlist"
            element={<Shortlist />}
          />

          {/* INTERNSHIP PROGRESS / MENTOR FEEDBACK */}

          <Route
            path="internships"
            element={<RecruiterInternshipTracking />}
          />

          {/* RECRUITMENT ANALYTICS */}

          <Route
            path="analytics"
            element={<RecruiterAnalytics />}
          />
        </Route>

        {/* =====================================================
            COLLEGE / INSTITUTION PORTAL
        ===================================================== */}

        <Route
          path="/college"
          element={
            <ProtectedRoute allowedRole="college">
              <CollegeLayout />
            </ProtectedRoute>
          }
        >
          {/* DASHBOARD */}

          <Route
            index
            element={<CollegeDashboard />}
          />

          {/* ONBOARDING */}

          <Route
            path="onboarding"
            element={<CollegeOnboarding />}
          />

          {/* DEPARTMENT MANAGEMENT */}

          <Route
            path="departments"
            element={<DepartmentSetup />}
          />

          {/* STUDENT MANAGEMENT */}

          <Route
            path="students"
            element={<Students />}
          />

          {/* PORTFOLIO VERIFICATION */}

          <Route
            path="portfolio-verification"
            element={<PortfolioVerification />}
          />

          {/* ACADEMIA - INDUSTRY SKILL GAP MAP */}

          <Route
            path="skill-gap"
            element={<SkillGapMap />}
          />

          {/* INSTITUTION ANALYTICS */}

          <Route
            path="analytics"
            element={<Analytics />}
          />

          {/* TRAINING INTERVENTIONS */}

          <Route
            path="training"
            element={<Training />}
          />

          {/* PLACEMENT & INTERNSHIP MONITORING */}

          <Route
            path="placement-monitoring"
            element={<PlacementMonitoring />}
          />
        </Route>

        {/* =====================================================
            FACULTY / ACADEMICIAN PORTAL
        ===================================================== */}

        <Route
          path="/faculty"
          element={
            <ProtectedRoute allowedRole="faculty">
              <FacultyLayout />
            </ProtectedRoute>
          }
        >
          {/* DASHBOARD */}

          <Route
            index
            element={<FacultyDashboard />}
          />

          {/* ONBOARDING */}

          <Route
            path="onboarding"
            element={<FacultyOnboarding />}
          />

          {/* FACULTY PROFILE */}

          <Route
            path="profile"
            element={<FacultyProfile />}
          />

          {/* INDUSTRY COLLABORATION OPPORTUNITIES */}

          <Route
            path="opportunities"
            element={<FacultyOpportunitiesPage />}
          />

          {/* APPLICATION TRACKING */}

          <Route
            path="applications"
            element={<MyApplications />}
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;