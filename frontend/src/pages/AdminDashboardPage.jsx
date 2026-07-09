import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  Skeleton,
  Stack,
  Typography,
  Chip,
  Avatar,
  Divider,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import PeopleIcon from "@mui/icons-material/People";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import GroupIcon from "@mui/icons-material/Group";
import SecurityIcon from "@mui/icons-material/Security";
import MonitorHeartIcon from "@mui/icons-material/MonitorHeart";
import HistoryIcon from "@mui/icons-material/History";
import BarChartIcon from "@mui/icons-material/BarChart";
import RefreshIcon from "@mui/icons-material/Refresh";
import PersonIcon from "@mui/icons-material/Person";
import SupervisorAccountIcon from "@mui/icons-material/SupervisorAccount";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";
import StorageIcon from "@mui/icons-material/Storage";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import TodayIcon from "@mui/icons-material/Today";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import LoginIcon from "@mui/icons-material/Login";
import AddIcon from "@mui/icons-material/Add";
import SettingsIcon from "@mui/icons-material/Settings";
import DescriptionIcon from "@mui/icons-material/Description";
import api from "../api/client";
import PageHeader from "../components/PageHeader";
import ErrorAlert from "../components/ErrorAlert";

const QUICK_ACTIONS = [
  { label: "Create User", icon: <PersonAddIcon />, to: "/admin/users", color: "primary" },
  { label: "System Health", icon: <MonitorHeartIcon />, to: "/admin/health", color: "error" },
  { label: "Audit Logs", icon: <HistoryIcon />, to: "/admin/audit", color: "warning" },
  { label: "Reports", icon: <BarChartIcon />, to: "/reports", color: "secondary" },
  { label: "Role Management", icon: <SettingsIcon />, to: "/admin/roles", color: "info" },
  { label: "Checklists", icon: <FactCheckIcon />, to: "/admin/checklists", color: "success" },
];

function KpiCard({ label, value, icon, color, sub }) {
  return (
    <Card sx={{
      borderTop: `3px solid ${color}`,
      transition: "box-shadow 0.2s, transform 0.2s",
      height: "100%",
      "&:hover": { boxShadow: "0 4px 20px rgba(0,0,0,0.08)", transform: "translateY(-1px)" },
    }}>
      <CardContent sx={{ p: "14px 18px !important", "&:last-child": { pb: "14px !important" } }}>
        <Stack spacing={0.5}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.3, fontSize: "0.6rem" }}>
              {label}
            </Typography>
            <Box sx={{ color, opacity: 0.7, display: "flex" }}>{icon}</Box>
          </Stack>
          <Typography variant="h4" sx={{ color, fontWeight: 800, lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }}>
            {value ?? "—"}
          </Typography>
          {sub && <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.6rem" }}>{sub}</Typography>}
        </Stack>
      </CardContent>
    </Card>
  );
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export default function AdminDashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [activity, setActivity] = useState([]);
  const [latestUsers, setLatestUsers] = useState([]);
  const [latestLogins, setLatestLogins] = useState([]);
  const [latestAudits, setLatestAudits] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashRes, activityRes, usersRes, loginsRes, auditsRes, healthRes] = await Promise.all([
        api.get("/admin/dashboard").catch(() => ({ data: null })),
        api.get("/admin/recent-activity").catch(() => ({ data: [] })),
        api.get("/admin/latest-users").catch(() => ({ data: [] })),
        api.get("/admin/latest-logins").catch(() => ({ data: [] })),
        api.get("/admin/latest-audits").catch(() => ({ data: [] })),
        api.get("/admin/system-health").catch(() => ({ data: null })),
      ]);
      setDashboard(dashRes.data);
      setActivity(activityRes.data || []);
      setLatestUsers(usersRes.data || []);
      setLatestLogins(loginsRes.data || []);
      setLatestAudits(auditsRes.data || []);
      setHealth(healthRes.data);
    } catch {
      setError("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const d = dashboard || {};
  const h = health || {};

  const stats = [
    { label: "Total Users", value: d.total_users ?? h.total_users ?? 0, icon: <PeopleIcon />, color: "#0046AD" },
    { label: "Operators", value: d.operators ?? h.operators ?? 0, icon: <GroupIcon />, color: "#0288D1" },
    { label: "Managers", value: d.managers ?? h.managers ?? 0, icon: <SupervisorAccountIcon />, color: "#ED6C02" },
    { label: "Admins", value: d.admins ?? h.admins ?? 0, icon: <AdminPanelSettingsIcon />, color: "#9C27B0" },
    { label: "Inspections Today", value: d.total_today ?? 0, icon: <TodayIcon />, color: "#2E7D32" },
    { label: "Pending Reviews", value: d.pending_approvals ?? 0, icon: <PendingActionsIcon />, color: "#D32F2F" },
    { label: "Oracle Storage", value: formatBytes(d.oracle_storage_bytes ?? h.oracle_storage_bytes ?? 0), icon: <StorageIcon />, color: "#5C6BC0" },
    { label: "Photos", value: d.total_photos ?? h.total_photos ?? 0, icon: <PhotoLibraryIcon />, color: "#26A69A" },
  ];

  return (
    <Stack spacing={3} sx={{ animation: "fadeIn 0.35s ease-out" }}>
      <PageHeader
        icon={<AdminPanelSettingsIcon />}
        title="Admin Dashboard"
        subtitle="System administration and monitoring"
        action={
          <Button variant="outlined" size="small" onClick={loadData} disabled={loading}
            startIcon={loading ? <CircularProgress size={14} /> : <RefreshIcon />}>
            Refresh
          </Button>
        }
      />

      <ErrorAlert error={error} onClose={() => setError(null)} />

      {loading && !dashboard && (
        <Grid container spacing={2}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Grid item xs={6} md={3} key={i}>
              <Skeleton variant="rounded" height={100} />
            </Grid>
          ))}
        </Grid>
      )}

      {!loading && (
        <>
          <Grid container spacing={2}>
            {stats.map((stat) => (
              <Grid item xs={6} md={3} key={stat.label}>
                <KpiCard {...stat} />
              </Grid>
            ))}
          </Grid>

          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card className="no-lift" sx={{ height: "100%" }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ fontSize: "0.95rem", fontWeight: 600 }}>
                    Recent Activity
                  </Typography>
                  <Stack spacing={1} sx={{ maxHeight: 320, overflowY: "auto" }}>
                    {activity.length === 0 && (
                      <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
                        No recent activity
                      </Typography>
                    )}
                    {activity.slice(0, 15).map((a, i) => (
                      <Stack key={a.id || i} direction="row" spacing={1} alignItems="flex-start"
                        sx={{ p: "4px 8px", borderRadius: 1, "&:hover": { bgcolor: "rgba(0,0,0,0.03)" } }}>
                        <Box sx={{ width: 6, height: 6, borderRadius: "50%", mt: 0.5, flexShrink: 0,
                          bgcolor: a.action?.includes("APPROV") ? "success.main" : a.action?.includes("REJECT") ? "error.main" : a.action?.includes("CREATE") ? "primary.main" : a.action?.includes("LOGIN") ? "secondary.main" : "grey.400" }} />
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="caption" fontWeight={600} sx={{ fontSize: "0.6rem", display: "block" }}>
                            {a.action || "Action"}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.55rem" }}>
                            {a.user_name || a.employee_id || ""} · {a.timestamp ? new Date(a.timestamp).toLocaleString() : ""}
                          </Typography>
                        </Box>
                      </Stack>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card className="no-lift" sx={{ height: "100%" }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ fontSize: "0.95rem", fontWeight: 600 }}>
                    System Health Summary
                  </Typography>
                  <Stack spacing={1.5}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: h.oracle_status !== false ? "success.main" : "error.main" }} />
                        <Typography variant="body2">Oracle Database</Typography>
                      </Stack>
                      <Chip size="small" label={h.oracle_status !== false ? "Connected" : "Disconnected"}
                        color={h.oracle_status !== false ? "success" : "error"} variant="outlined" sx={{ height: 20, fontSize: "0.6rem" }} />
                    </Stack>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: h.api_status !== false ? "success.main" : "error.main" }} />
                        <Typography variant="body2">API Server</Typography>
                      </Stack>
                      <Chip size="small" label={h.api_status !== false ? "Running" : "Down"}
                        color={h.api_status !== false ? "success" : "error"} variant="outlined" sx={{ height: 20, fontSize: "0.6rem" }} />
                    </Stack>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2">Total Inspections</Typography>
                      <Typography variant="body2" fontWeight={700}>{h.total_inspections?.toLocaleString() || "0"}</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2">Total Photos</Typography>
                      <Typography variant="body2" fontWeight={700}>{h.total_photos?.toLocaleString() || "0"}</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2">Pending Inspections</Typography>
                      <Typography variant="body2" fontWeight={700}>{h.pending_inspections?.toLocaleString() || "0"}</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2">Storage Used</Typography>
                      <Typography variant="body2" fontWeight={700}>{formatBytes(h.oracle_storage_bytes) || "—"}</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2">Checklist Version</Typography>
                      <Typography variant="body2" fontWeight={700}>{h.active_checklist_version || "—"}</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2">API Version</Typography>
                      <Typography variant="body2" fontWeight={700}>v{h.api_version || "—"}</Typography>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card className="no-lift" sx={{ height: "100%" }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ fontSize: "0.95rem", fontWeight: 600 }}>
                    Latest Users
                  </Typography>
                  <Stack spacing={1} sx={{ maxHeight: 320, overflowY: "auto" }}>
                    {latestUsers.length === 0 && (
                      <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
                        No users created yet
                      </Typography>
                    )}
                    {latestUsers.map((u, i) => (
                      <Stack key={u.useraccess_id || i} direction="row" spacing={1.5} alignItems="center"
                        sx={{ p: "4px 8px", borderRadius: 1, "&:hover": { bgcolor: "rgba(0,0,0,0.03)" } }}>
                        <Avatar sx={{ width: 24, height: 24, fontSize: "0.6rem", fontWeight: 700,
                          bgcolor: u.role === "ADMIN" ? "#FFF3E0" : u.role === "MANAGER" ? "#E3F2FD" : "#E8F5E9",
                          color: u.role === "ADMIN" ? "#ED6C02" : u.role === "MANAGER" ? "#0046AD" : "#2E7D32" }}>
                          {u.employee_id?.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="caption" fontWeight={600} sx={{ fontSize: "0.6rem", display: "block" }}>
                            {u.employee_id}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.55rem" }}>
                            {u.full_name || ""} · {u.role || ""}
                          </Typography>
                        </Box>
                        <Chip size="small" label={u.is_active ? "Active" : "Inactive"}
                          color={u.is_active ? "success" : "default"} variant="outlined" sx={{ height: 16, fontSize: "0.5rem" }} />
                      </Stack>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card className="no-lift" sx={{ height: "100%" }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ fontSize: "0.95rem", fontWeight: 600 }}>
                    Quick Actions
                  </Typography>
                  <Grid container spacing={1}>
                    {QUICK_ACTIONS.map((action) => (
                      <Grid item xs={4} key={action.label}>
                        <Button variant="outlined" color={action.color} fullWidth
                          startIcon={action.icon}
                          onClick={() => navigate(action.to)}
                          sx={{ justifyContent: "flex-start", py: 1.25, fontSize: "0.7rem" }}>
                          {action.label}
                        </Button>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card className="no-lift" sx={{ height: "100%" }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ fontSize: "0.95rem", fontWeight: 600 }}>
                    Recent Audits
                  </Typography>
                  <Stack spacing={1} sx={{ maxHeight: 240, overflowY: "auto" }}>
                    {latestAudits.length === 0 && (
                      <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
                        No audit records
                      </Typography>
                    )}
                    {latestAudits.slice(0, 8).map((a, i) => (
                      <Stack key={a.audit_log_id || i} direction="row" spacing={1} alignItems="flex-start"
                        sx={{ p: "4px 8px", borderRadius: 1, "&:hover": { bgcolor: "rgba(0,0,0,0.03)" } }}>
                        <Box sx={{ width: 6, height: 6, borderRadius: "50%", mt: 0.5, flexShrink: 0,
                          bgcolor: a.action?.includes("APPROV") ? "success.main" : a.action?.includes("REJECT") ? "error.main" : "primary.main" }} />
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="caption" fontWeight={600} sx={{ fontSize: "0.6rem", display: "block" }}>
                            {a.action || "Action"}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.55rem" }}>
                            {a.employee_id || ""}
                          </Typography>
                        </Box>
                      </Stack>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card className="no-lift" sx={{ height: "100%" }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ fontSize: "0.95rem", fontWeight: 600 }}>
                    Latest Logins
                  </Typography>
                  <Stack spacing={1} sx={{ maxHeight: 240, overflowY: "auto" }}>
                    {latestLogins.length === 0 && (
                      <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
                        No login records
                      </Typography>
                    )}
                    {latestLogins.slice(0, 8).map((u, i) => (
                      <Stack key={u.useraccess_id || i} direction="row" spacing={1} alignItems="center"
                        sx={{ p: "4px 8px", borderRadius: 1, "&:hover": { bgcolor: "rgba(0,0,0,0.03)" } }}>
                        <LoginIcon sx={{ fontSize: 14, color: "secondary.main", opacity: 0.6 }} />
                        <Typography variant="caption" sx={{ flex: 1, fontWeight: 500, fontSize: "0.6rem" }}>
                          {u.employee_id}
                        </Typography>
                        <Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.55rem" }}>
                          {u.last_login ? new Date(u.last_login).toLocaleDateString() : ""}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      )}
    </Stack>
  );
}

