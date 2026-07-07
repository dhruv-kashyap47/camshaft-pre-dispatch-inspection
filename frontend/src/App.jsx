import { Navigate, Route, Routes } from "react-router-dom";

import { Shell } from "./components/Shell";
import { useAuth } from "./modules/auth/AuthContext";
import { AdminPage } from "./pages/AdminPage";
import { InvestigationPage } from "./pages/InvestigationPage";
import { LoginPage } from "./pages/LoginPage";
import { ManagerPage } from "./pages/ManagerPage";
import { OperatorPage } from "./pages/OperatorPage";
import { ReportsPage } from "./pages/ReportsPage";

function ProtectedRoute({ roles, children }) {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/" replace />;
  }
  if (!roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

export default function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route
          path="/operator"
          element={
            <ProtectedRoute roles={["OPERATOR"]}>
              <OperatorPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager"
          element={
            <ProtectedRoute roles={["MANAGER"]}>
              <ManagerPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={["ADMIN"]}>
              <AdminPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute roles={["MANAGER", "ADMIN"]}>
              <ReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/investigation"
          element={
            <ProtectedRoute roles={["MANAGER", "ADMIN"]}>
              <InvestigationPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Shell>
  );
}
