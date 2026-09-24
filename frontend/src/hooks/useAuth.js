import { useContext } from "react";
import { AuthContext } from "../context/authStore";

export function useAuth() {
  return useContext(AuthContext);
}