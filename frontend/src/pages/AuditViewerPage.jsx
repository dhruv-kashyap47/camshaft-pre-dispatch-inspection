import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Collapse,
  Grid,
  IconButton,
  MenuItem,
  Pagination,
  Skeleton,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  Tooltip,
  Divider,
} from "@mui/material";
import HistoryIcon from "@mui/icons-material/History";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import LoginIcon from "@mui/icons-material/Login";
import LogoutIcon from "@mui/icons-material/Logout";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import LockResetIcon from "@mui/icons-material/LockReset";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";

import api from "../api/client";
import PageHeader from "../components/PageHeader";
import ErrorAlert from "../components/ErrorAlert";
import ExportButton from "../components/ExportButton";

const ACTION_META = {
  LOGIN: { icon: <LoginIcon />, color: "#0288D1", label: "Login" },
  LOGOUT: { icon: <LogoutIcon />, color: "#5C6BC0", label: "Logout" },
  PHOTO_UPLOAD: { icon: <CameraAltIcon />, color: "#26A69A", label: "Photo Upload" },
  STEP_COMPLETED: { icon: <FactCheckIcon />, color: "#0046AD", label: "Step Completed" },
  SUBMITTED: { icon: <FactCheckIcon />, color: "#ED6C02", label: "Submitted" },
  APPROVAL: { icon: <CheckCircleIcon />, color: "#2E7D32", label: "Approved" },
  REJECTION: { icon: <CancelIcon />, color: "#D32F2F", label: "Rejected" },
  OVERRIDE: { icon: <SwapHorizIcon />, color: "#9C27B0", label: "Override" },
  ROLE_CHANGED: { icon: <EditIcon />, color: "#E91E63", label: "Role Changed" },
  PASSWORD_RESET: { icon: <LockResetIcon />, color: "#FF8F00", label: "Password Reset" },
  USER_CREATE: { icon: <PersonAddIcon />, color: "#0046AD", label: "User Created" },
  USER_UPDATE: { icon: <EditIcon />, color: "#0288D1", label: "User Updated" },
  USER_TOGGLE_ACTIVE: { icon: <DeleteIcon />, color: "#D32F2F", label: "User Toggled" },
  CHECKLIST_CREATE: { icon: <AddIcon />, color: "#2E7D32", label: "Checklist Created" },
  CHECKLIST_ITEM_CREATE: { icon: <AddIcon />, color: "#2E7D32", label: "Item Added" },
  CHECKLIST_ITEM_UPDATE: { icon: <EditIcon />, color: "#0288D1", label: "Item Updated" },
  CHECKLIST_ITEM_DELETE: { icon: <DeleteIcon />, color: "#D32F2F", label: "Item Deleted" },
  CHECKLIST_TOGGLE_ACTIVE: { icon: <EditIcon />, color: "#ED6C02", label: "Checklist Toggled" },
  MODE_SWITCH: { icon: <SwapHorizIcon />, color: "#5C6BC0", label: "Mode Switch" },
};

function getActionMeta(action) {
  if (!action) return { icon: <HistoryIcon />, color: "#757575", label: "Unknown" };
  const u = action.toUpperCase();
  if (ACTION_META[u]) return ACTION_META[u];
  if (u.includes("LOGIN")) return ACTION_META.LOGIN;
  if (u.includes("LOGOUT")) return ACTION_META.LOGOUT;
  if (u.includes("PHOTO")) return ACTION_META.PHOTO_UPLOAD;
  if (u.includes("STEP")) return ACTION_META.STEP_COMPLETED;
  if (u.includes("SUBMIT")) return ACTION_META.SUBMITTED;
  if (u.includes("APPROV")) return ACTION_META.APPROVAL;
  if (u.includes("REJECT")) return ACTION_META.REJECTION;
  if (u.includes("OVERRIDE")) return ACTION_META.OVERRIDE;
  if (u.includes("PASSWORD") || u.includes("RESET")) return ACTION_META.PASSWORD_RESET;
  if (u.includes("CREATE")) return { icon: <AddIcon />, color: "#2E7D32", label: "Created" };
  if (u.includes("UPDATE") || u.includes("EDIT")) return { icon: <EditIcon />, color: "#0288D1", label: "Updated" };
  if (u.includes("DELETE") || u.includes("DISABLE")) return { icon: <DeleteIcon />, color: "#D32F2F", label: "Deleted" };
  if (u.includes("TOGGLE")) return { icon: <EditIcon />, color: "#ED6C02", label: "Toggled" };
  return { icon: <HistoryIcon />, color: "#757575", label: action };
}

function formatTimestamp(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const isToday = d.toDateString() === today.toDateString();
  const isYesterday = d.toDateString() === yesterday.toDateString();
  const datePart = isToday ? "Today" : isYesterday ? "Yesterday" : d.toLocaleDateString();
  const timePart = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return { date: datePart, time: timePart, full: d.toLocaleString() };
}

export default function AuditViewerPage() {
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState(null);
  const rowsPerPage = 20;

  const loadAudits = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (search) params.search = search;
      if (entityFilter) params.entity = entityFilter;
      if (actionFilter) params.action = actionFilter;
      const res = await api.get("/admin/audits", { params });
      setAudits(res.data || []);
    } catch {
      setError("Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }, [search, entityFilter, actionFilter]);

  useEffect(() => { loadAudits(); }, [loadAudits]);

  const filtered = useMemo(() => {
    let list = audits;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          (a.employee_id || a.actor || "").toLowerCase().includes(q) ||
          (a.details || "").toLowerCase().includes(q) ||
          (a.action || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [audits, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const paginated = useMemo(
    () => filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage),
    [filtered, page]
  );

  const groupedByDate = useMemo(() => {
    const groups = {};
    paginated.forEach((a) => {
      const key = a.created_at ? new Date(a.created_at).toDateString() : "Unknown";
      if (!groups[key]) groups[key] = [];
      groups[key].push(a);
    });
    return groups;
  }, [paginated]);

  const toggleExpanded = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const parseDetails = (details) => {
    if (!details) return null;
    try {
      return JSON.parse(details);
    } catch {
      return details;
    }
  };

  return (
    <Stack spacing={3} sx={{ animation: "fadeIn 0.35s ease-out" }}>
      <PageHeader
        icon={<HistoryIcon />}
        title="Audit Timeline"
        subtitle="Complete enterprise audit trail"
        count={filtered.length}
        action={
          <Stack direction="row" spacing={1}>
            <ExportButton endpoint="/admin/audits/export" filename={`audit-log-${new Date().toISOString().slice(0, 10)}`} />
            <Button variant="outlined" size="small" onClick={loadAudits} disabled={loading}
              startIcon={loading ? <CircularProgress size={14} /> : <RefreshIcon />}>
              Refresh
            </Button>
          </Stack>
        }
      />

      <ErrorAlert error={error} onClose={() => setError(null)} />

      <Card className="no-lift">
        <CardContent sx={{ p: "14px 18px !important" }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <TextField placeholder="Search by user, action, or details..." size="small" fullWidth
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                InputProps={{ startAdornment: <SearchIcon sx={{ fontSize: 18, color: "text.secondary", mr: 1 }} /> }}
                inputProps={{ "aria-label": "Search audit logs" }} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField select label="Entity" size="small" fullWidth value={entityFilter}
                onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}>
                <MenuItem value="">All Entities</MenuItem>
                <MenuItem value="USER">User</MenuItem>
                <MenuItem value="INSPECTION">Inspection</MenuItem>
                <MenuItem value="CHECKLIST">Checklist</MenuItem>
                <MenuItem value="PHOTO">Photo</MenuItem>
                <MenuItem value="OVERRIDE">Override</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField select label="Action" size="small" fullWidth value={actionFilter}
                onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}>
                <MenuItem value="">All Actions</MenuItem>
                <MenuItem value="LOGIN">Login</MenuItem>
                <MenuItem value="LOGOUT">Logout</MenuItem>
                <MenuItem value="PHOTO_UPLOAD">Photo Upload</MenuItem>
                <MenuItem value="STEP_COMPLETED">Step Completed</MenuItem>
                <MenuItem value="SUBMITTED">Submitted</MenuItem>
                <MenuItem value="APPROVAL">Approved</MenuItem>
                <MenuItem value="REJECTION">Rejected</MenuItem>
                <MenuItem value="OVERRIDE">Override</MenuItem>
                <MenuItem value="PASSWORD_RESET">Password Reset</MenuItem>
                <MenuItem value="USER_CREATE">User Created</MenuItem>
                <MenuItem value="USER_UPDATE">User Updated</MenuItem>
                <MenuItem value="CHECKLIST_CREATE">Checklist Created</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={6} sm={2}>
              <Typography variant="caption" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Box component="span" sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "success.main", display: "inline-block" }} />
                {filtered.length} records
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {loading ? (
        <Stack spacing={2}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={64} />
          ))}
        </Stack>
      ) : filtered.length === 0 ? (
        <Card className="no-lift">
          <CardContent sx={{ py: 6, textAlign: "center" }}>
            <HistoryIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1 }} />
            <Typography variant="body1" color="text.secondary">No audit records found</Typography>
            <Typography variant="body2" color="text.disabled">Try adjusting your search filters</Typography>
          </CardContent>
        </Card>
      ) : (
        <>
          {Object.entries(groupedByDate).map(([dateKey, events]) => (
            <Box key={dateKey}>
              <Typography variant="overline" sx={{ fontWeight: 700, letterSpacing: 0.6, color: "text.secondary", mb: 1, display: "block", px: 0.5 }}>
                {dateKey === new Date().toDateString() ? "Today" : dateKey === new Date(Date.now() - 86400000).toDateString() ? "Yesterday" : dateKey}
              </Typography>
              <Stack spacing={1} sx={{ position: "relative", pl: 2, "&::before": {
                content: '""', position: "absolute", left: 8, top: 0, bottom: 0, width: 2,
                bgcolor: "rgba(0,0,0,0.06)", borderRadius: 1,
              }}}>
                {events.map((a) => {
                  const meta = getActionMeta(a.action);
                  const ts = formatTimestamp(a.created_at);
                  const isExpanded = expandedId === a.id;
                  const details = parseDetails(a.details);
                  return (
                    <Card key={a.id} variant="outlined" sx={{
                      borderRadius: 2, ml: 1, transition: "all 0.18s",
                      borderLeft: `3px solid ${meta.color}`,
                      "&:hover": { boxShadow: "0 2px 8px rgba(0,0,0,0.06)" },
                    }}>
                      <CardContent sx={{ p: "10px 14px !important", "&:last-child": { pb: "10px !important" }, cursor: "pointer" }}
                        onClick={() => toggleExpanded(a.id)} role="button" tabIndex={0}
                        onKeyDown={(e) => { if (e.key === "Enter") toggleExpanded(a.id); }}>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Box sx={{
                            width: 32, height: 32, borderRadius: "50%", display: "flex",
                            alignItems: "center", justifyContent: "center", flexShrink: 0,
                            bgcolor: `${meta.color}15`, color: meta.color,
                          }}>
                            {meta.icon}
                          </Box>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                              <Typography variant="body2" fontWeight={600} sx={{ fontSize: "0.8rem" }}>
                                {meta.label}
                              </Typography>
                              <Chip size="small" label={a.action} variant="outlined" sx={{ height: 18, fontSize: "0.55rem" }} />
                              <Typography variant="caption" color="text.secondary">
                                {a.employee_id || a.actor || "—"}
                              </Typography>
                            </Stack>
                            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                              {a.entity_name && (
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.6rem" }}>
                                  {a.entity_name}{a.entity_id ? ` #${a.entity_id}` : ""}
                                </Typography>
                              )}
                              <Box sx={{ flex: 1 }} />
                              <Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.55rem", fontVariantNumeric: "tabular-nums" }}>
                                {ts.time}
                              </Typography>
                              <IconButton size="small" sx={{ width: 20, height: 20 }}>
                                {isExpanded ? <ExpandLessIcon sx={{ fontSize: 14 }} /> : <ExpandMoreIcon sx={{ fontSize: 14 }} />}
                              </IconButton>
                            </Stack>
                          </Box>
                        </Stack>

                        <Collapse in={isExpanded}>
                          <Divider sx={{ my: 1 }} />
                          <Stack spacing={1} sx={{ pl: 5 }}>
                            <Typography variant="caption" color="text.secondary">
                              <strong>Timestamp:</strong> {ts.full}
                            </Typography>
                            {a.entity_name && (
                              <Typography variant="caption" color="text.secondary">
                                <strong>Entity:</strong> {a.entity_name}{a.entity_id ? ` #${a.entity_id}` : ""}
                              </Typography>
                            )}
                            {a.employee_id && (
                              <Typography variant="caption" color="text.secondary">
                                <strong>User:</strong> {a.employee_id}
                              </Typography>
                            )}
                            {a.old_value && (
                              <Typography variant="caption" color="text.secondary">
                                <strong>Old Value:</strong> {a.old_value}
                              </Typography>
                            )}
                            {a.new_value && (
                              <Typography variant="caption" color="text.secondary">
                                <strong>New Value:</strong> {a.new_value}
                              </Typography>
                            )}
                            {details && (
                              <Box>
                                <Typography variant="caption" color="text.secondary">
                                  <strong>Details:</strong>
                                </Typography>
                                <Box sx={{
                                  bgcolor: "grey.50", borderRadius: 1.5, p: 1.5, mt: 0.5,
                                  fontFamily: "monospace", fontSize: "0.65rem",
                                  maxHeight: 200, overflow: "auto",
                                  whiteSpace: "pre-wrap", wordBreak: "break-all",
                                }}>
                                  {typeof details === "string" ? details : JSON.stringify(details, null, 2)}
                                </Box>
                              </Box>
                            )}
                          </Stack>
                        </Collapse>
                      </CardContent>
                    </Card>
                  );
                })}
              </Stack>
            </Box>
          ))}

          <Stack direction="row" justifyContent="center" sx={{ pt: 2 }}>
            <Pagination
              count={pageCount}
              page={page}
              onChange={(_, p) => setPage(p)}
              color="primary"
              size="small"
              showFirstButton
              showLastButton
            />
          </Stack>
        </>
      )}
    </Stack>
  );
}