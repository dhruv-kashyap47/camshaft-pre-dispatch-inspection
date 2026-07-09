import { createContext, useCallback, useContext, useMemo, useState } from "react";
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

  const [activeMode, setActiveMode] = useState(() => {
    try {
      return window.localStorage.getItem("camshaft_active_mode") || "OPERATOR_MODE";
    } catch {
      return "OPERATOR_MODE";
    }
  });

  const isOperatorMode = activeMode === "OPERATOR_MODE";

  const login = useCallback(async (values) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post("/auth/login", {
        employee_id: values.employee_id,
        password: values.password,
      });
      window.localStorage.setItem("camshaft_token", response.data.access_token);
      const nextUser = {
        employeeId: response.data.employee_id,
        role: response.data.role,
        displayName: response.data.display_name,
      };
      window.localStorage.setItem("camshaft_user", JSON.stringify(nextUser));
      setUser(nextUser);
      return response.data;
    } catch (err) {
      const message =
        err.response?.data?.detail || "Login failed. Check your credentials.";
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const setMode = useCallback((mode) => {
    setActiveMode(mode);
    window.localStorage.setItem("camshaft_active_mode", mode);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/operator/logout");
    } catch {
      // ignore logout errors
    }
    window.localStorage.removeItem("camshaft_token");
    window.localStorage.removeItem("camshaft_user");
    window.localStorage.removeItem("camshaft_active_mode");
    setUser(null);
    setActiveMode("OPERATOR_MODE");
  }, []);

  const value = useMemo(() => ({
    user, login, logout, error, loading, setError,
    activeMode, setActiveMode: setMode, isOperatorMode,
  }), [user, login, logout, error, loading, setError, activeMode, setMode, isOperatorMode]);

  return (
    <AuthContext.Provider value={value}>
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
