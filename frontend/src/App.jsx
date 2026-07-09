import { Navigate, Route, Routes } from "react-router-dom";

import { Shell } from "./components/Shell";
import { useAuth } from "./modules/auth/AuthContext";
import { AdminPage } from "./pages/AdminPage";
import { InvestigationPage } from "./pages/InvestigationPage";
import { LoginPage } from "./pages/LoginPage";
import { ManagerPage } from "./pages/ManagerPage";
import { OperatorPage } from "./pages/OperatorPage";
import { ReportsPage } from "./pages/ReportsPage";

import AdminDashboardPage from "./pages/AdminDashboardPage";
import AuditViewerPage from "./pages/AuditViewerPage";
import ChecklistManagementPage from "./pages/ChecklistManagementPage";
import GlobalSearchPage from "./pages/GlobalSearchPage";
import InspectionReviewPage from "./pages/InspectionReviewPage";
import ManagerDashboardPage from "./pages/ManagerDashboardPage";
import ReportsDashboardPage from "./pages/ReportsDashboardPage";
import RoleManagementPage from "./pages/RoleManagementPage";
import SystemHealthPage from "./pages/SystemHealthPage";
import UserManagementPage from "./pages/UserManagementPage";

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

function ManagerOrOperatorRoute({ children }) {
  const { user, isOperatorMode } = useAuth();
  if (!user) {
    return <Navigate to="/" replace />;
  }
  if (user.role === "MANAGER" && isOperatorMode) {
    return children;
  }
  if (user.role === "OPERATOR") {
    return children;
  }
  return <Navigate to="/" replace />;
}

export default function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<LoginPage />} />

        {/* Operator */}
        <Route
          path="/operator"
          element={
            <ManagerOrOperatorRoute>
              <OperatorPage />
            </ManagerOrOperatorRoute>
          }
        />

        {/* Manager */}
        <Route
          path="/manager"
          element={
            <ProtectedRoute roles={["MANAGER"]}>
              <ManagerPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/dashboard"
          element={
            <ProtectedRoute roles={["MANAGER"]}>
              <ManagerDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/review"
          element={
            <ProtectedRoute roles={["MANAGER"]}>
              <InspectionReviewPage />
            </ProtectedRoute>
          }
        />

        {/* Admin */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={["ADMIN"]}>
              <AdminPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute roles={["ADMIN"]}>
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute roles={["ADMIN"]}>
              <UserManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/roles"
          element={
            <ProtectedRoute roles={["ADMIN"]}>
              <RoleManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/checklists"
          element={
            <ProtectedRoute roles={["ADMIN"]}>
              <ChecklistManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/checklists"
          element={
            <ProtectedRoute roles={["MANAGER"]}>
              <ChecklistManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/audit"
          element={
            <ProtectedRoute roles={["MANAGER", "ADMIN"]}>
              <AuditViewerPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/health"
          element={
            <ProtectedRoute roles={["ADMIN"]}>
              <SystemHealthPage />
            </ProtectedRoute>
          }
        />

        {/* Shared */}
        <Route
          path="/reports"
          element={
            <ProtectedRoute roles={["MANAGER", "ADMIN"]}>
              <ReportsDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/legacy"
          element={
            <ProtectedRoute roles={["MANAGER", "ADMIN"]}>
              <ReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/search"
          element={
            <ProtectedRoute roles={["MANAGER", "ADMIN"]}>
              <GlobalSearchPage />
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
