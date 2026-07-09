import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  LinearProgress,
  Skeleton,
  Stack,
  Typography,
  Chip,
  Tooltip,
  Divider,
} from "@mui/material";
import MonitorHeartIcon from "@mui/icons-material/MonitorHeart";
import RefreshIcon from "@mui/icons-material/Refresh";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import StorageIcon from "@mui/icons-material/Storage";
import ApiIcon from "@mui/icons-material/Api";
import TagIcon from "@mui/icons-material/Tag";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import PeopleIcon from "@mui/icons-material/People";
import TimerIcon from "@mui/icons-material/Timer";
import DnsIcon from "@mui/icons-material/Dns";
import SpeedIcon from "@mui/icons-material/Speed";
import LinkIcon from "@mui/icons-material/Link";
import MemoryIcon from "@mui/icons-material/Memory";
import SdStorageIcon from "@mui/icons-material/SdStorage";
import CloudQueueIcon from "@mui/icons-material/CloudQueue";
import PersonIcon from "@mui/icons-material/Person";
import SupervisorAccountIcon from "@mui/icons-material/SupervisorAccount";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import TodayIcon from "@mui/icons-material/Today";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import ThumbDownIcon from "@mui/icons-material/ThumbDown";
import api from "../api/client";
import PageHeader from "../components/PageHeader";
import ErrorAlert from "../components/ErrorAlert";

function HealthCard({ icon, label, value, ok, metric, sub }) {
  return (
    <Card
      sx={{
        borderTop: `3px solid ${ok !== false ? "#2E7D32" : "#D32F2F"}`,
        transition: "box-shadow 0.2s, transform 0.2s",
        "&:hover": { boxShadow: "0 4px 20px rgba(0,0,0,0.08)", transform: "translateY(-1px)" },
      }}
    >
      <CardContent sx={{ p: "14px 18px !important", "&:last-child": { pb: "14px !important" } }}>
        <Stack spacing={1}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4, fontSize: "0.6rem" }}>
              {label}
            </Typography>
            <Box sx={{ color: ok !== false ? "success.main" : "error.main", opacity: 0.7, display: "flex" }}>
              {icon}
            </Box>
          </Stack>
          <Typography variant="h5" sx={{ fontWeight: 700, color: ok !== false ? "text.primary" : "error.main", fontVariantNumeric: "tabular-nums" }}>
            {value ?? "—"}
          </Typography>
          {sub && (
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.6rem", lineHeight: 1.2 }}>
              {sub}
            </Typography>
          )}
          {metric !== undefined && (
            <Box sx={{ mt: 0.5 }}>
              <LinearProgress
                variant="determinate"
                value={Math.min(metric, 100)}
                sx={{
                  height: 4,
                  borderRadius: 2,
                  bgcolor: "rgba(0,0,0,0.06)",
                  "& .MuiLinearProgress-bar": {
                    borderRadius: 2,
                    bgcolor: metric > 80 ? "error.main" : metric > 50 ? "warning.main" : "success.main",
                  },
                }}
              />
            </Box>
          )}
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

function formatUptime(seconds) {
  if (!seconds) return "—";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(" ");
}

export default function SystemHealthPage() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/admin/system-health");
      setHealth(res.data);
    } catch {
      setError("Failed to load system health");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadHealth(); }, [loadHealth]);

  const h = health || {};

  const dbOk = h.oracle_status !== false && h.oracle_status !== "error";
  const apiOk = h.api_status !== false && h.api_status !== "error";

  return (
    <Stack spacing={3} sx={{ animation: "fadeIn 0.35s ease-out" }}>
      <PageHeader
        icon={<MonitorHeartIcon />}
        title="System Health"
        subtitle="Enterprise monitoring dashboard"
        action={
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              size="small"
              icon={dbOk && apiOk ? <CheckCircleIcon sx={{ fontSize: 14 }} /> : <CancelIcon sx={{ fontSize: 14 }} />}
              label={dbOk && apiOk ? "All Systems Operational" : "Issues Detected"}
              color={dbOk && apiOk ? "success" : "error"}
              variant="filled"
              sx={{ height: 24, fontSize: "0.65rem", fontWeight: 600 }}
            />
            <Button variant="outlined" size="small" onClick={loadHealth} disabled={loading}
              startIcon={loading ? <CircularProgress size={14} /> : <RefreshIcon />}>
              Refresh
            </Button>
          </Stack>
        }
      />

      <ErrorAlert error={error} onClose={() => setError(null)} />

      {loading ? (
        <Grid container spacing={2}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Skeleton variant="rounded" height={110} />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Stack spacing={3}>
          <Box>
            <Typography variant="overline" sx={{ fontWeight: 600, letterSpacing: 0.6, color: "text.secondary", mb: 1.5, display: "block" }}>
              System Status
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <HealthCard icon={<StorageIcon />} label="Oracle Database" value={dbOk ? "Connected" : "Disconnected"} ok={dbOk}
                  sub={h.oracle_version ? `v${h.oracle_version}` : undefined} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <HealthCard icon={<SpeedIcon />} label="Oracle Response Time" value={h.oracle_response_time_ms != null ? `${h.oracle_response_time_ms}ms` : "—"} ok
                  metric={h.oracle_response_time_ms != null ? Math.min(h.oracle_response_time_ms / 10, 100) : undefined} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <HealthCard icon={<LinkIcon />} label="Active DB Connections" value={h.active_connections ?? "—"} ok />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <HealthCard icon={<ApiIcon />} label="API Server" value={apiOk ? "Running" : "Down"} ok={apiOk}
                  sub={`v${h.api_version || "—"}`} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <HealthCard icon={<TimerIcon />} label="API Uptime" value={formatUptime(h.api_uptime_seconds)} ok />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <HealthCard icon={<TagIcon />} label="API Version" value={h.api_version || "—"} ok />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <HealthCard icon={<FactCheckIcon />} label="Total Inspections" value={h.total_inspections?.toLocaleString() || "0"} ok />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <HealthCard icon={<PendingActionsIcon />} label="Pending Inspections" value={h.pending_inspections?.toLocaleString() || "0"} ok />
              </Grid>
            </Grid>
          </Box>

          <Divider />

          <Box>
            <Typography variant="overline" sx={{ fontWeight: 600, letterSpacing: 0.6, color: "text.secondary", mb: 1.5, display: "block" }}>
              Today's Activity
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={4}>
                <HealthCard icon={<TodayIcon />} label="Submitted Today" value={h.submitted_today?.toLocaleString() || "0"} ok />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <HealthCard icon={<ThumbUpIcon />} label="Approved Today" value={h.approved_today?.toLocaleString() || "0"} ok />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <HealthCard icon={<ThumbDownIcon />} label="Rejected Today" value={h.rejected_today?.toLocaleString() || "0"} ok />
              </Grid>
            </Grid>
          </Box>

          <Divider />

          <Box>
            <Typography variant="overline" sx={{ fontWeight: 600, letterSpacing: 0.6, color: "text.secondary", mb: 1.5, display: "block" }}>
              Users
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3} md={2.4}>
                <HealthCard icon={<PeopleIcon />} label="Total Users" value={h.total_users?.toLocaleString() || "0"} ok />
              </Grid>
              <Grid item xs={6} sm={3} md={2.4}>
                <HealthCard icon={<PersonIcon />} label="Operators" value={h.operators?.toLocaleString() || "0"} ok />
              </Grid>
              <Grid item xs={6} sm={3} md={2.4}>
                <HealthCard icon={<SupervisorAccountIcon />} label="Managers" value={h.managers?.toLocaleString() || "0"} ok />
              </Grid>
              <Grid item xs={6} sm={3} md={2.4}>
                <HealthCard icon={<AdminPanelSettingsIcon />} label="Admins" value={h.admins?.toLocaleString() || "0"} ok />
              </Grid>
            </Grid>
          </Box>

          <Divider />

          <Box>
            <Typography variant="overline" sx={{ fontWeight: 600, letterSpacing: 0.6, color: "text.secondary", mb: 1.5, display: "block" }}>
              Storage & Photos
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={4}>
                <HealthCard icon={<PhotoLibraryIcon />} label="Total BLOB Photos" value={h.total_photos?.toLocaleString() || "0"} ok />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <HealthCard icon={<SdStorageIcon />} label="Oracle Storage Used" value={formatBytes(h.oracle_storage_bytes) || "—"} ok
                  metric={h.oracle_storage_bytes ? Math.min(h.oracle_storage_bytes / (1024 * 1024 * 100) * 100, 100) : undefined} />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <HealthCard icon={<CloudQueueIcon />} label="Checklist Version" value={h.active_checklist_version || "—"} ok />
              </Grid>
            </Grid>
          </Box>

          <Divider />

          <Box>
            <Typography variant="overline" sx={{ fontWeight: 600, letterSpacing: 0.6, color: "text.secondary", mb: 1.5, display: "block" }}>
              System Resources
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <HealthCard icon={<MemoryIcon />} label="CPU Usage" value={h.cpu_usage != null ? `${h.cpu_usage}%` : "N/A"} ok
                  metric={h.cpu_usage} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <HealthCard icon={<DnsIcon />} label="Memory Usage" value={h.memory_usage != null ? `${h.memory_usage}%` : "N/A"} ok
                  metric={h.memory_usage} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <HealthCard icon={<SdStorageIcon />} label="Disk Usage" value={h.disk_usage != null ? `${h.disk_usage}%` : "N/A"} ok
                  metric={h.disk_usage} />
              </Grid>
            </Grid>
          </Box>
        </Stack>
      )}
    </Stack>
  );
}