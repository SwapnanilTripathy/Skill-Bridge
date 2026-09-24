import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";
import { supabase } from "../services/supabase";

function ProtectedRoute({ children, allowedRole }) {
  const { user, loading } = useAuth();

  const [role, setRole] = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    async function getUserRole() {
      // Wait until AuthProvider finishes checking the session
      if (loading) {
        return;
      }

      // No logged-in user
      if (!user) {
        setRole(null);
        setRoleLoading(false);
        return;
      }

      setRoleLoading(true);

      // Read this user's role from SkillBridge profiles
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error(
          "Error loading user role:",
          error.message
        );

        setRole(null);
        setRoleLoading(false);
        return;
      }

      setRole(data?.role ?? null);
      setRoleLoading(false);
    }

    getUserRole();
  }, [user, loading]);

  // Still checking authentication or profile
  if (loading || roleLoading) {
    return <p>Loading...</p>;
  }

  // Not logged in
  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  // Logged in but hasn't selected a role yet
  if (!role) {
    return (
      <Navigate
        to="/select-role"
        replace
      />
    );
  }

  // User is trying to access the wrong portal
  if (allowedRole && role !== allowedRole) {
    if (role === "student") {
      return (
        <Navigate
          to="/student"
          replace
        />
      );
    }

    if (role === "recruiter") {
      return (
        <Navigate
          to="/recruiter"
          replace
        />
      );
    }

    if (role === "college") {
      return (
        <Navigate
          to="/college"
          replace
        />
      );
    }

    if (role === "faculty") {
      return (
        <Navigate
          to="/faculty"
          replace
        />
      );
    }

    return (
      <Navigate
        to="/select-role"
        replace
      />
    );
  }

  return children;
}

export default ProtectedRoute;