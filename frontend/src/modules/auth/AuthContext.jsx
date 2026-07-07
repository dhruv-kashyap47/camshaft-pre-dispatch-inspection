import { createContext, useCallback, useContext, useState } from "react";
import api from "../../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = window.localStorage.getItem("camshaft_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const login = useCallback(async (values) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post("/auth/login", values);
      window.localStorage.setItem("camshaft_token", response.data.access_token);
      const nextUser = {
        employeeId: response.data.employee_id,
        role: response.data.role,
      };
      window.localStorage.setItem("camshaft_user", JSON.stringify(nextUser));
      setUser(nextUser);
    } catch (err) {
      const message =
        err.response?.data?.detail || "Login failed. Check your credentials.";
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/operator/logout");
    } catch {
      // ignore logout errors
    }
    window.localStorage.removeItem("camshaft_token");
    window.localStorage.removeItem("camshaft_user");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, error, loading, setError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
