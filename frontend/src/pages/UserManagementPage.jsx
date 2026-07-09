import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  MenuItem,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  Switch,
  Divider,
} from "@mui/material";
import PeopleIcon from "@mui/icons-material/People";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import EditIcon from "@mui/icons-material/Edit";
import LockResetIcon from "@mui/icons-material/LockReset";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import ToggleOnIcon from "@mui/icons-material/ToggleOn";
import ToggleOffIcon from "@mui/icons-material/ToggleOff";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import SupervisorAccountIcon from "@mui/icons-material/SupervisorAccount";
import PersonIcon from "@mui/icons-material/Person";
import LoginIcon from "@mui/icons-material/Login";

import api from "../api/client";
import { useNotification } from "../components/NotificationProvider";
import PageHeader from "../components/PageHeader";
import ErrorAlert from "../components/ErrorAlert";

const ROLES = ["OPERATOR", "MANAGER", "ADMIN"];

const ROLE_STYLE = {
  ADMIN: { bg: "#FFF3E0", color: "#ED6C02", icon: <AdminPanelSettingsIcon sx={{ fontSize: 14 }} />, label: "Admin" },
  MANAGER: { bg: "#E3F2FD", color: "#0046AD", icon: <SupervisorAccountIcon sx={{ fontSize: 14 }} />, label: "Manager" },
  OPERATOR: { bg: "#E8F5E9", color: "#2E7D32", icon: <PersonIcon sx={{ fontSize: 14 }} />, label: "Operator" },
};

const EMPTY_USER = { employee_id: "", full_name: "", password: "", role: "OPERATOR" };

export default function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selected, setSelected] = useState([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  const [createForm, setCreateForm] = useState(EMPTY_USER);
  const [editForm, setEditForm] = useState({ id: null, full_name: "", is_active: true });
  const [resetForm, setResetForm] = useState({ user_id: null, employee_id: "", new_password: "" });

  const [formLoading, setFormLoading] = useState(false);

  const { success, error: notifyError } = useNotification();

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/admin/users");
      setUsers(res.data || []);
    } catch {
      setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const filtered = useMemo(() => {
    let list = users;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (u) =>
          u.employee_id?.toLowerCase().includes(q) ||
          u.full_name?.toLowerCase().includes(q)
      );
    }
    if (roleFilter) {
      list = list.filter((u) => u.role === roleFilter);
    }
    if (statusFilter) {
      list = list.filter((u) => statusFilter === "active" ? u.is_active : !u.is_active);
    }
    return list;
  }, [users, search, roleFilter, statusFilter]);

  const paginated = useMemo(
    () => filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filtered, page, rowsPerPage]
  );

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelected(paginated.map((u) => u.id));
    } else {
      setSelected([]);
    }
  };

  const handleSelect = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleCreate = async () => {
    setFormLoading(true);
    try {
      await api.post("/admin/users", createForm);
      success("User created successfully");
      setCreateOpen(false);
      setCreateForm(EMPTY_USER);
      loadUsers();
    } catch (err) {
      notifyError(err.response?.data?.detail || "Failed to create user");
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = async () => {
    setFormLoading(true);
    try {
      await api.put(`/admin/users/${editForm.id}`, {
        full_name: editForm.full_name,
        is_active: editForm.is_active,
      });
      success("User updated");
      setEditOpen(false);
      loadUsers();
    } catch (err) {
      notifyError(err.response?.data?.detail || "Failed to update user");
    } finally {
      setFormLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setFormLoading(true);
    try {
      await api.post("/admin/reset-password", {
        user_id: Number(resetForm.user_id),
        new_password: resetForm.new_password,
      });
      success("Password reset successfully");
      setResetOpen(false);
      setResetForm({ user_id: null, employee_id: "", new_password: "" });
    } catch (err) {
      notifyError(err.response?.data?.detail || "Failed to reset password");
    } finally {
      setFormLoading(false);
    }
  };

  const toggleActive = async (user) => {
    try {
      await api.put(`/admin/users/${user.id}`, { is_active: !user.is_active });
      success(user.is_active ? "User disabled" : "User enabled");
      loadUsers();
    } catch (err) {
      notifyError(err.response?.data?.detail || "Failed to toggle status");
    }
  };

  const bulkToggle = async (active) => {
    try {
      const promises = selected.map((id) => api.put(`/admin/users/${id}`, { is_active: active }));
      await Promise.all(promises);
      success(`${selected.length} user(s) ${active ? "enabled" : "disabled"}`);
      setSelected([]);
      loadUsers();
    } catch {
      notifyError("Bulk action failed");
    }
  };

  const bulkResetPassword = async () => {
    const newPw = "Reset@123";
    try {
      const promises = selected.map((id) =>
        api.post("/admin/reset-password", { user_id: Number(id), new_password: newPw })
      );
      await Promise.all(promises);
      success(`${selected.length} password(s) reset to "${newPw}"`);
      setSelected([]);
    } catch {
      notifyError("Bulk password reset failed");
    }
  };

  const openEdit = (user) => {
    setEditForm({ id: user.id, full_name: user.full_name || "", is_active: user.is_active });
    setEditOpen(true);
  };

  const openReset = (user) => {
    setResetForm({ user_id: user.id, employee_id: user.employee_id, new_password: "" });
    setResetOpen(true);
  };

  return (
    <Stack spacing={3} sx={{ animation: "fadeIn 0.35s ease-out" }}>
      <PageHeader
        icon={<PeopleIcon />}
        title="User Management"
        subtitle="Manage users, roles, and access"
        count={users.length}
        action={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" size="small" onClick={loadUsers} disabled={loading} startIcon={<RefreshIcon />}>
              Refresh
            </Button>
            <Button variant="contained" size="small" startIcon={<PersonAddIcon />} onClick={() => setCreateOpen(true)}>
              Add User
            </Button>
          </Stack>
        }
      />

      <ErrorAlert error={error} onClose={() => setError(null)} />

      <Card className="no-lift">
        <CardContent sx={{ p: "14px 18px !important" }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <TextField placeholder="Search by Employee ID or Name..." size="small" fullWidth
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                InputProps={{ startAdornment: <SearchIcon sx={{ fontSize: 18, color: "text.secondary", mr: 1 }} /> }}
                inputProps={{ "aria-label": "Search users" }} />
            </Grid>
            <Grid item xs={6} sm={2}>
              <TextField select size="small" fullWidth label="Role" value={roleFilter}
                onChange={(e) => { setRoleFilter(e.target.value); setPage(0); }}
                SelectProps={{ displayEmpty: true }}>
                <MenuItem value="">All Roles</MenuItem>
                {ROLES.map((r) => (
                  <MenuItem key={r} value={r}>{r.charAt(0) + r.slice(1).toLowerCase()}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={6} sm={2}>
              <TextField select size="small" fullWidth label="Status" value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
                SelectProps={{ displayEmpty: true }}>
                <MenuItem value="">All</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              {selected.length > 0 && (
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Tooltip title="Enable selected users">
                    <Button size="small" variant="outlined" color="success" startIcon={<ToggleOnIcon />}
                      onClick={() => bulkToggle(true)}>
                      Enable ({selected.length})
                    </Button>
                  </Tooltip>
                  <Tooltip title="Disable selected users">
                    <Button size="small" variant="outlined" color="error" startIcon={<ToggleOffIcon />}
                      onClick={() => bulkToggle(false)}>
                      Disable ({selected.length})
                    </Button>
                  </Tooltip>
                  <Tooltip title="Reset password for selected users">
                    <Button size="small" variant="outlined" color="warning" startIcon={<LockResetIcon />}
                      onClick={bulkResetPassword}>
                      Reset PW ({selected.length})
                    </Button>
                  </Tooltip>
                </Stack>
              )}
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <TableContainer component={Card} className="no-lift" sx={{ borderRadius: 2 }}>
        {loading ? (
          <Stack spacing={1} sx={{ p: 3 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} variant="rounded" height={48} />
            ))}
          </Stack>
        ) : (
          <>
            <Table aria-label="Users table">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={selected.length > 0 && selected.length < paginated.length}
                      checked={paginated.length > 0 && selected.length === paginated.length}
                      onChange={handleSelectAll}
                      inputProps={{ "aria-label": "Select all users" }}
                    />
                  </TableCell>
                  <TableCell>User</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Last Login</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginated.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        {search || roleFilter || statusFilter ? "No users match your filters." : "No users found."}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
                {paginated.map((user) => {
                  const rs = ROLE_STYLE[user.role] || ROLE_STYLE.OPERATOR;
                  return (
                    <TableRow key={user.id} hover selected={selected.includes(user.id)}
                      sx={{ "&:hover": { bgcolor: "rgba(0,0,0,0.02)" } }}>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selected.includes(user.id)}
                          onChange={() => handleSelect(user.id)}
                          inputProps={{ "aria-label": `Select ${user.employee_id}` }}
                        />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Avatar sx={{
                            width: 32, height: 32, bgcolor: rs.bg, color: rs.color,
                            fontSize: "0.75rem", fontWeight: 700,
                          }}>
                            {user.employee_id?.charAt(0).toUpperCase()}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {user.employee_id}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {user.full_name || "—"}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          icon={rs.icon}
                          label={rs.label}
                          sx={{
                            bgcolor: rs.bg, color: rs.color, fontWeight: 600,
                            height: 24, fontSize: "0.65rem",
                            "& .MuiChip-icon": { ml: 0.5 },
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={user.is_active ? "Active" : "Inactive"}
                          color={user.is_active ? "success" : "default"}
                          variant={user.is_active ? "filled" : "outlined"}
                          sx={{ height: 22, fontSize: "0.6rem", fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
                          {user.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          {user.last_login ? (
                            <>
                              <LoginIcon sx={{ fontSize: 12, color: "text.disabled" }} />
                              <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
                                {new Date(user.last_login).toLocaleDateString()}
                              </Typography>
                            </>
                          ) : (
                            <Typography variant="caption" color="text.disabled">Never</Typography>
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          <Tooltip title="Edit user">
                            <IconButton size="small" onClick={() => openEdit(user)}
                              aria-label={`Edit ${user.employee_id}`}
                              sx={{ width: 30, height: 30 }}>
                              <EditIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Reset password">
                            <IconButton size="small" onClick={() => openReset(user)}
                              aria-label={`Reset password for ${user.employee_id}`}
                              sx={{ width: 30, height: 30 }}>
                              <LockResetIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={user.is_active ? "Disable user" : "Enable user"}>
                            <IconButton size="small" onClick={() => toggleActive(user)}
                              aria-label={`Toggle status for ${user.employee_id}`}
                              sx={{ width: 30, height: 30 }}>
                              {user.is_active ? (
                                <ToggleOffIcon sx={{ fontSize: 16, color: "error.main" }} />
                              ) : (
                                <ToggleOnIcon sx={{ fontSize: 16, color: "success.main" }} />
                              )}
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={filtered.length}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
              rowsPerPageOptions={[5, 10, 25, 50]}
            />
          </>
        )}
      </TableContainer>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Create User</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField label="Employee ID" fullWidth size="small" value={createForm.employee_id}
              onChange={(e) => setCreateForm({ ...createForm, employee_id: e.target.value })}
              disabled={formLoading} autoComplete="off" placeholder="e.g. EMP001" />
            <TextField label="Full Name" fullWidth size="small" value={createForm.full_name}
              onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
              disabled={formLoading} placeholder="e.g. John Doe" />
            <TextField label="Password" type="password" fullWidth size="small" value={createForm.password}
              onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
              disabled={formLoading} autoComplete="new-password" placeholder="Min 8 characters" />
            <TextField select label="Role" fullWidth size="small" value={createForm.role}
              onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })} disabled={formLoading}>
              {ROLES.map((r) => <MenuItem key={r} value={r}>{r.charAt(0) + r.slice(1).toLowerCase()}</MenuItem>)}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCreateOpen(false)} disabled={formLoading} color="inherit" variant="outlined" size="small">
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={formLoading || !createForm.employee_id || !createForm.password}
            variant="contained" size="small"
            startIcon={formLoading ? <CircularProgress size={14} color="inherit" /> : <PersonAddIcon />}>
            {formLoading ? "Creating..." : "Create User"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Edit User</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField label="Full Name" fullWidth size="small" value={editForm.full_name}
              onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} disabled={formLoading} />
            <Stack direction="row" alignItems="center" spacing={1}>
              <Switch checked={editForm.is_active}
                onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })} />
              <Typography variant="body2">{editForm.is_active ? "Active" : "Inactive"}</Typography>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditOpen(false)} disabled={formLoading} color="inherit" variant="outlined" size="small">
            Cancel
          </Button>
          <Button onClick={handleEdit} disabled={formLoading} variant="contained" size="small"
            startIcon={formLoading ? <CircularProgress size={14} color="inherit" /> : undefined}>
            {formLoading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={resetOpen} onClose={() => setResetOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Reset Password</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <Card variant="outlined" sx={{ bgcolor: "grey.50", borderRadius: 2 }}>
              <CardContent sx={{ p: "12px 16px !important", "&:last-child": { pb: "12px !important" } }}>
                <Typography variant="body2" fontWeight={600}>{resetForm.employee_id}</Typography>
                <Typography variant="caption" color="text.secondary">User ID: {resetForm.user_id}</Typography>
              </CardContent>
            </Card>
            <TextField label="New Password" type="password" fullWidth size="small" value={resetForm.new_password}
              onChange={(e) => setResetForm({ ...resetForm, new_password: e.target.value })}
              disabled={formLoading} autoComplete="new-password" placeholder="Min 8 characters" />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setResetOpen(false)} disabled={formLoading} color="inherit" variant="outlined" size="small">
            Cancel
          </Button>
          <Button onClick={handleResetPassword} disabled={formLoading || !resetForm.new_password}
            variant="contained" color="warning" size="small"
            startIcon={formLoading ? <CircularProgress size={14} color="inherit" /> : <LockResetIcon />}>
            {formLoading ? "Resetting..." : "Reset Password"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}