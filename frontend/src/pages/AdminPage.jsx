import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
  Avatar,
  Tooltip,
} from "@mui/material";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import LockResetIcon from "@mui/icons-material/LockReset";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import PeopleIcon from "@mui/icons-material/People";
import HistoryIcon from "@mui/icons-material/History";
import PersonOffIcon from "@mui/icons-material/PersonOff";

import api from "../api/client";

export function AdminPage() {
  const [audits, setAudits] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [userForm, setUserForm] = useState({
    employee_id: "",
    full_name: "",
    password: "",
    role: "OPERATOR",
  });
  const [resetForm, setResetForm] = useState({ user_id: "", new_password: "" });

  useEffect(() => {
    loadAudits();
    loadUsers();
  }, []);

  async function loadAudits() {
    try {
      const response = await api.get("/admin/audits");
      setAudits(response.data);
    } catch {
      setError("Failed to load audit logs");
    }
  }

  async function loadUsers() {
    try {
      const response = await api.get("/admin/users");
      setUsers(response.data);
    } catch {
      // optional feature
    }
  }

  async function createUser() {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await api.post("/admin/users", userForm);
      setUserForm({ employee_id: "", full_name: "", password: "", role: "OPERATOR" });
      setSuccess("User created successfully.");
      loadAudits();
      loadUsers();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to create user");
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword() {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await api.post("/admin/reset-password", {
        user_id: Number(resetForm.user_id),
        new_password: resetForm.new_password,
      });
      setResetForm({ user_id: "", new_password: "" });
      setSuccess("Password reset successfully.");
      loadAudits();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  }

  const roleColor = (role) => {
    if (role === "ADMIN") return "warning";
    if (role === "MANAGER") return "primary";
    return "success";
  };

  const roleAvatar = (role) => {
    if (role === "ADMIN") return { bg: "#FFF3E0", color: "#ED6C02" };
    if (role === "MANAGER") return { bg: "#E3F2FD", color: "#0046AD" };
    return { bg: "#E8F5E9", color: "#2E7D32" };
  };

  return (
    <Stack spacing={3} sx={{ animation: "fadeIn 0.35s ease-out" }}>
      {/* Page Header */}
      <Box>
        <Stack direction="row" spacing={1.25} alignItems="center">
          <AdminPanelSettingsIcon color="primary" sx={{ fontSize: "1.5rem" }} />
          <Typography variant="h4" component="h1">Admin Control Room</Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25, ml: "2.75rem" }}>
          User management, password resets, and audit trail
        </Typography>
      </Box>

      {/* Alerts */}
      <Box aria-live="polite" aria-atomic="true">
        {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
        {success && <Alert severity="success" onClose={() => setSuccess(null)}>{success}</Alert>}
      </Box>

      <Grid container spacing={3}>
        {/* Create User */}
        <Grid item xs={12} md={6}>
          <Card className="no-lift" sx={{ animation: "slideUp 0.35s ease-out", height: "100%" }}>
            <CardContent>
              <Stack spacing={2.5}>
                <Stack direction="row" spacing={1.25} alignItems="center">
                  <Avatar
                    sx={{
                      bgcolor: "rgba(0,70,173,0.1)",
                      color: "primary.main",
                      width: 36,
                      height: 36,
                    }}
                  >
                    <PersonAddIcon fontSize="small" />
                  </Avatar>
                  <Typography variant="h6">Create User</Typography>
                </Stack>
                <Divider />
                <TextField
                  id="new_employee_id"
                  label="Employee ID"
                  fullWidth
                  value={userForm.employee_id}
                  onChange={(e) => setUserForm({ ...userForm, employee_id: e.target.value })}
                  disabled={loading}
                  size="small"
                  autoComplete="off"
                />
                <TextField
                  id="new_full_name"
                  label="Full Name"
                  fullWidth
                  value={userForm.full_name}
                  onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
                  disabled={loading}
                  size="small"
                />
                <TextField
                  id="new_password"
                  label="Password"
                  type="password"
                  fullWidth
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  disabled={loading}
                  size="small"
                  autoComplete="new-password"
                />
                <TextField
                  id="new_role"
                  select
                  label="Role"
                  fullWidth
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                  disabled={loading}
                  size="small"
                >
                  <MenuItem value="OPERATOR">Operator</MenuItem>
                  <MenuItem value="MANAGER">Manager</MenuItem>
                  <MenuItem value="ADMIN">IT / Admin</MenuItem>
                </TextField>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={createUser}
                  disabled={loading || !userForm.employee_id || !userForm.password}
                  startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <PersonAddIcon />}
                >
                  {loading ? "Creating…" : "Create User"}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Reset Password */}
        <Grid item xs={12} md={6}>
          <Card className="no-lift" sx={{ animation: "slideUp 0.35s ease-out 0.05s both", height: "100%" }}>
            <CardContent>
              <Stack spacing={2.5}>
                <Stack direction="row" spacing={1.25} alignItems="center">
                  <Avatar
                    sx={{
                      bgcolor: "rgba(237,108,2,0.1)",
                      color: "warning.main",
                      width: 36,
                      height: 36,
                    }}
                  >
                    <LockResetIcon fontSize="small" />
                  </Avatar>
                  <Typography variant="h6">Reset Password</Typography>
                </Stack>
                <Divider />
                <TextField
                  id="reset_user_id"
                  label="User ID"
                  fullWidth
                  value={resetForm.user_id}
                  onChange={(e) => setResetForm({ ...resetForm, user_id: e.target.value })}
                  disabled={loading}
                  size="small"
                  helperText="Enter the numeric user ID"
                  inputProps={{ inputMode: "numeric" }}
                />
                <TextField
                  id="reset_new_password"
                  label="New Password"
                  type="password"
                  fullWidth
                  value={resetForm.new_password}
                  onChange={(e) => setResetForm({ ...resetForm, new_password: e.target.value })}
                  disabled={loading}
                  size="small"
                  autoComplete="new-password"
                />
                <Button
                  variant="outlined"
                  color="warning"
                  fullWidth
                  onClick={resetPassword}
                  disabled={loading || !resetForm.user_id || !resetForm.new_password}
                  startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <LockResetIcon />}
                >
                  Reset Password
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Users Table */}
        <Grid item xs={12}>
          <Card className="no-lift" sx={{ animation: "slideUp 0.35s ease-out 0.1s both" }}>
            <CardContent>
              <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1.5 }}>
                <PeopleIcon color="primary" sx={{ fontSize: "1.2rem" }} />
                <Typography variant="h6">Users</Typography>
                {users.length > 0 && (
                  <Chip label={users.length} size="small" variant="outlined" color="primary" />
                )}
              </Stack>
              <Divider sx={{ mb: 2 }} />

              {users.length === 0 ? (
                <Stack alignItems="center" spacing={1.25} sx={{ py: 4 }}>
                  <PersonOffIcon sx={{ fontSize: 36, color: "text.disabled" }} />
                  <Typography variant="body2" color="text.secondary">
                    No users found.
                  </Typography>
                </Stack>
              ) : (
                <Stack spacing={0.75}>
                  {users.map((u) => {
                    const av = roleAvatar(u.role);
                    return (
                      <Stack
                        key={u.id}
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        sx={{
                          p: "10px 14px",
                          borderRadius: 2,
                          bgcolor: "grey.50",
                          border: "1px solid transparent",
                          transition: "all 0.15s ease",
                          "&:hover": {
                            bgcolor: "grey.100",
                            border: "1px solid rgba(0,0,0,0.06)",
                          },
                        }}
                      >
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Avatar
                            sx={{
                              width: 32,
                              height: 32,
                              bgcolor: av.bg,
                              color: av.color,
                              fontSize: "0.8125rem",
                              fontWeight: 700,
                            }}
                            aria-label={`${u.employee_id} - ${u.role}`}
                          >
                            {u.employee_id?.charAt(0).toUpperCase()}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1.3 }}>
                              {u.employee_id}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {u.full_name}
                            </Typography>
                          </Box>
                          <Chip
                            size="small"
                            label={u.role}
                            variant="outlined"
                            color={roleColor(u.role)}
                          />
                        </Stack>
                        <Chip
                          size="small"
                          color={u.is_active ? "success" : "default"}
                          label={u.is_active ? "Active" : "Inactive"}
                          variant={u.is_active ? "filled" : "outlined"}
                        />
                      </Stack>
                    );
                  })}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Audit Logs */}
        <Grid item xs={12}>
          <Card className="no-lift" sx={{ animation: "slideUp 0.35s ease-out 0.15s both" }}>
            <CardContent>
              <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1.5 }}>
                <HistoryIcon color="primary" sx={{ fontSize: "1.2rem" }} />
                <Typography variant="h6">Audit Logs</Typography>
                {audits.length > 0 && (
                  <Chip label={audits.length} size="small" variant="outlined" color="primary" />
                )}
              </Stack>
              <Divider sx={{ mb: 2 }} />

              {audits.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No audit records.
                </Typography>
              ) : (
                <Stack spacing={0.5}>
                  {/* Show newest first */}
                  {[...audits].reverse().map((a) => (
                    <Stack
                      key={a.id}
                      direction={{ xs: "column", sm: "row" }}
                      alignItems={{ sm: "center" }}
                      spacing={{ xs: 0.5, sm: 1.5 }}
                      sx={{
                        p: "8px 12px",
                        borderRadius: 1.5,
                        transition: "background-color 0.15s ease",
                        "&:hover": { bgcolor: "grey.50" },
                      }}
                    >
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ minWidth: 144, flexShrink: 0, fontVariantNumeric: "tabular-nums" }}
                      >
                        {new Date(a.created_at).toLocaleString()}
                      </Typography>
                      <Tooltip title={a.action} arrow>
                        <Chip
                          label={a.action}
                          size="small"
                          color="primary"
                          variant="outlined"
                          sx={{ flexShrink: 0, maxWidth: 140 }}
                        />
                      </Tooltip>
                      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 80 }}>
                        {a.entity_name}
                      </Typography>
                      <Typography variant="caption" color="text.disabled">
                        #{a.entity_id}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}
