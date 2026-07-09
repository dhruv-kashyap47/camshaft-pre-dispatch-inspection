import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Skeleton,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import ChecklistIcon from "@mui/icons-material/Checklist";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import RefreshIcon from "@mui/icons-material/Refresh";
import PlaylistAddCheckIcon from "@mui/icons-material/PlaylistAddCheck";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import VisibilityIcon from "@mui/icons-material/Visibility";
import ArchiveIcon from "@mui/icons-material/Archive";

import api from "../api/client";
import { useAuth } from "../modules/auth/AuthContext";
import { useNotification } from "../components/NotificationProvider";
import PageHeader from "../components/PageHeader";
import ErrorAlert from "../components/ErrorAlert";

export default function ChecklistManagementPage() {
  const { user } = useAuth();
  const isManager = user?.role === "MANAGER";
  const API = isManager ? "/manager" : "/admin";

  const [checklists, setChecklists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState({});

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", description: "", items: [] });
  const [formLoading, setFormLoading] = useState(false);

  const [editItemOpen, setEditItemOpen] = useState(false);
  const [editItemForm, setEditItemForm] = useState({
    id: null, header_id: null, item_code: "", prompt: "", sequence_no: 1, requires_photo: false, is_active: true,
  });

  const [addItemOpen, setAddItemOpen] = useState(false);
  const [addItemForm, setAddItemForm] = useState({
    header_id: null, item_code: "", prompt: "", sequence_no: 1, requires_photo: false,
  });

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewItems, setPreviewItems] = useState([]);
  const [previewTitle, setPreviewTitle] = useState("");

  const { success, error: notifyError } = useNotification();

  const loadChecklists = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`${API}/checklists`);
      setChecklists(res.data || []);
    } catch {
      setError("Failed to load checklists");
    } finally {
      setLoading(false);
    }
  }, [API]);

  useEffect(() => { loadChecklists(); }, [loadChecklists]);

  const toggleExpand = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCreate = async () => {
    setFormLoading(true);
    try {
      await api.post(`${API}/checklists`, createForm);
      success("Checklist version created");
      setCreateOpen(false);
      setCreateForm({ name: "", description: "", items: [] });
      loadChecklists();
    } catch (err) {
      notifyError(err.response?.data?.detail || "Failed to create checklist");
    } finally {
      setFormLoading(false);
    }
  };

  const toggleActive = async (cl) => {
    try {
      await api.post(`${API}/checklists/${cl.id}/toggle-active`);
      success(cl.is_active ? "Checklist deactivated" : "Checklist activated");
      loadChecklists();
    } catch (err) {
      notifyError(err.response?.data?.detail || "Failed to toggle checklist");
    }
  };

  const openEditItem = (item, headerId) => {
    setEditItemForm({
      id: item.id,
      header_id: headerId,
      item_code: item.item_code || "",
      prompt: item.prompt || "",
      sequence_no: item.sequence_no || 1,
      requires_photo: item.requires_photo || false,
      is_active: item.is_active !== false,
    });
    setEditItemOpen(true);
  };

  const handleEditItem = async () => {
    setFormLoading(true);
    try {
      await api.put(`${API}/checklists/items/${editItemForm.id}`, {
        item_code: editItemForm.item_code,
        prompt: editItemForm.prompt,
        sequence_no: editItemForm.sequence_no,
        requires_photo: editItemForm.requires_photo,
        is_active: editItemForm.is_active,
      });
      success("Checklist item updated");
      setEditItemOpen(false);
      loadChecklists();
    } catch (err) {
      notifyError(err.response?.data?.detail || "Failed to update item");
    } finally {
      setFormLoading(false);
    }
  };

  const openAddItem = (headerId) => {
    setAddItemForm({ header_id: headerId, item_code: "", prompt: "", sequence_no: 1, requires_photo: false });
    setAddItemOpen(true);
  };

  const handleAddItem = async () => {
    setFormLoading(true);
    try {
      await api.post(`${API}/checklists/${addItemForm.header_id}/items`, {
        item_code: addItemForm.item_code,
        prompt: addItemForm.prompt,
        sequence_no: addItemForm.sequence_no,
        requires_photo: addItemForm.requires_photo,
      });
      success("Checklist item added");
      setAddItemOpen(false);
      loadChecklists();
    } catch (err) {
      notifyError(err.response?.data?.detail || "Failed to add item");
    } finally {
      setFormLoading(false);
    }
  };

  const deleteItem = async (item, headerId) => {
    try {
      await api.delete(`${API}/checklists/items/${item.id}`);
      success("Item deleted");
      loadChecklists();
    } catch (err) {
      notifyError(err.response?.data?.detail || "Failed to delete item");
    }
  };

  const moveItem = async (items, index, direction) => {
    const newItems = [...items];
    const swapIndex = index + direction;
    if (swapIndex < 0 || swapIndex >= newItems.length) return;
    [newItems[index], newItems[swapIndex]] = [newItems[swapIndex], newItems[index]];
    const seqs = items[0] ? items.map((it, i) => ({ id: it.id, sequence_no: i + 1 })) : [];
    try {
      await api.put(`${API}/checklists/${items[0]?.header_id || 0}/reorder`, seqs);
      loadChecklists();
    } catch {
      notifyError("Failed to reorder");
    }
  };

  const openPreview = (cl) => {
    setPreviewTitle(`${cl.name || `Checklist v${cl.version}`} — Preview`);
    setPreviewItems(cl.items || []);
    setPreviewOpen(true);
  };

  return (
    <Stack spacing={3} sx={{ animation: "fadeIn 0.35s ease-out" }}>
      <PageHeader
        icon={<ChecklistIcon />}
        title="Checklist Management"
        subtitle="Manage inspection checklists and items"
        count={checklists.length}
        action={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" size="small" onClick={loadChecklists} disabled={loading} startIcon={<RefreshIcon />}>
              Refresh
            </Button>
            <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
              New Version
            </Button>
          </Stack>
        }
      />

      <ErrorAlert error={error} onClose={() => setError(null)} />

      {loading ? (
        <Stack spacing={2}>
          {[0, 1, 2].map((i) => <Skeleton key={i} variant="rounded" height={80} />)}
        </Stack>
      ) : (
        <Stack spacing={2}>
          {checklists.length === 0 && (
            <Card className="no-lift">
              <CardContent>
                <Stack alignItems="center" spacing={1.5} sx={{ py: 4 }}>
                  <PlaylistAddCheckIcon sx={{ fontSize: 44, color: "text.disabled" }} />
                  <Typography variant="body1" color="text.secondary">No checklists found</Typography>
                  <Typography variant="body2" color="text.secondary">Create your first checklist version to get started.</Typography>
                </Stack>
              </CardContent>
            </Card>
          )}

          {checklists.map((cl) => {
            const isExpanded = expanded[cl.id] || false;
            const items = cl.items || [];
            return (
              <Card key={cl.id} className="no-lift" sx={{ animation: "slideUp 0.3s ease-out" }}>
                <CardContent sx={{ p: "16px 20px !important" }}>
                  <Stack spacing={1}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <IconButton
                          size="small"
                          onClick={() => toggleExpand(cl.id)}
                          aria-label={isExpanded ? "Collapse items" : "Expand items"}
                          sx={{ color: "text.secondary" }}
                        >
                          {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        </IconButton>
                        <Box>
                          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                            <Typography variant="subtitle2">{cl.name || `Checklist v${cl.version}`}</Typography>
                            <Chip size="small" label={`v${cl.version}`} color="primary" variant="outlined" sx={{ height: 20, fontSize: "0.6rem" }} />
                            <Chip size="small" color={cl.is_active ? "success" : "default"} label={cl.is_active ? "Active" : "Inactive"} variant={cl.is_active ? "filled" : "outlined"} sx={{ height: 20, fontSize: "0.6rem" }} />
                            <Chip size="small" label={`${items.length} items`} variant="outlined" sx={{ height: 20, fontSize: "0.6rem" }} />
                          </Stack>
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                            Created {cl.created_at ? new Date(cl.created_at).toLocaleDateString() : "—"}
                          </Typography>
                        </Box>
                      </Stack>
                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title="Preview checklist">
                          <IconButton size="small" onClick={() => openPreview(cl)} aria-label="Preview checklist">
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={cl.is_active ? "Archive (deactivate)" : "Activate version"}>
                          <IconButton size="small" onClick={() => toggleActive(cl)} color={cl.is_active ? "error" : "success"} aria-label="Toggle active">
                            <ArchiveIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Add item">
                          <IconButton size="small" onClick={() => openAddItem(cl.id)} color="primary" aria-label="Add item">
                            <AddIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Stack>

                    <Collapse in={isExpanded}>
                      <Divider sx={{ my: 1.5 }} />
                      <Stack spacing={0.5}>
                        {items.length === 0 ? (
                          <Typography variant="body2" color="text.secondary" sx={{ py: 1, textAlign: "center" }}>
                            No items in this checklist
                          </Typography>
                        ) : (
                          items.map((item, idx) => (
                            <Card key={item.id || idx} variant="outlined" sx={{ borderRadius: 2 }}>
                              <CardContent sx={{ p: "10px 14px !important", "&:last-child": { pb: "10px !important" } }}>
                                <Stack direction="row" alignItems="center" spacing={1.5}>
                                  <Typography variant="caption" color="text.disabled" sx={{ minWidth: 24, fontWeight: 600 }}>
                                    {idx + 1}
                                  </Typography>
                                  <Box sx={{ flex: 1 }}>
                                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                                      <Typography variant="body2" fontWeight={600}>
                                        {item.item_code || `Item ${item.sequence_no}`}
                                      </Typography>
                                      {item.requires_photo && (
                                        <Chip size="small" icon={<CameraAltIcon sx={{ fontSize: 12 }} />} label="Photo required" color="primary" variant="outlined" sx={{ height: 20, fontSize: "0.55rem" }} />
                                      )}
                                      <Chip size="small" label={`Seq ${item.sequence_no}`} variant="outlined" sx={{ height: 18, fontSize: "0.55rem" }} />
                                      {!item.is_active && (
                                        <Chip size="small" label="Disabled" color="default" variant="outlined" sx={{ height: 18, fontSize: "0.55rem" }} />
                                      )}
                                    </Stack>
                                    <Typography variant="caption" color="text.secondary">
                                      {item.prompt || "—"}
                                    </Typography>
                                  </Box>
                                  <Stack direction="row" spacing={0.25}>
                                    <IconButton size="small" onClick={() => moveItem(items, idx, -1)} disabled={idx === 0} aria-label="Move up" sx={{ width: 24, height: 24 }}>
                                      <ArrowUpwardIcon sx={{ fontSize: 14 }} />
                                    </IconButton>
                                    <IconButton size="small" onClick={() => moveItem(items, idx, 1)} disabled={idx === items.length - 1} aria-label="Move down" sx={{ width: 24, height: 24 }}>
                                      <ArrowDownwardIcon sx={{ fontSize: 14 }} />
                                    </IconButton>
                                    <Tooltip title="Edit item">
                                      <IconButton size="small" onClick={() => openEditItem(item, cl.id)} aria-label="Edit item" sx={{ width: 24, height: 24 }}>
                                        <EditIcon sx={{ fontSize: 14 }} />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Delete item">
                                      <IconButton size="small" onClick={() => deleteItem(item, cl.id)} color="error" aria-label="Delete item" sx={{ width: 24, height: 24 }}>
                                        <DeleteIcon sx={{ fontSize: 14 }} />
                                      </IconButton>
                                    </Tooltip>
                                  </Stack>
                                </Stack>
                              </CardContent>
                            </Card>
                          ))
                        )}
                      </Stack>
                    </Collapse>
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>New Checklist Version</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Checklist Name" fullWidth size="small" value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} disabled={formLoading} />
            <TextField label="Description (optional)" fullWidth size="small" value={createForm.description}
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} disabled={formLoading} multiline rows={2} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)} disabled={formLoading} color="inherit" variant="outlined" size="small">Cancel</Button>
          <Button onClick={handleCreate} disabled={formLoading || !createForm.name}
            variant="contained" size="small" startIcon={formLoading ? <CircularProgress size={14} color="inherit" /> : <AddIcon />}>
            {formLoading ? "Creating..." : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editItemOpen} onClose={() => setEditItemOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Edit Checklist Item</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Item Code" fullWidth size="small" value={editItemForm.item_code}
              onChange={(e) => setEditItemForm({ ...editItemForm, item_code: e.target.value })} disabled={formLoading} />
            <TextField label="Prompt" fullWidth size="small" value={editItemForm.prompt}
              onChange={(e) => setEditItemForm({ ...editItemForm, prompt: e.target.value })} disabled={formLoading} multiline rows={2} />
            <TextField label="Sequence No" type="number" fullWidth size="small" value={editItemForm.sequence_no}
              onChange={(e) => setEditItemForm({ ...editItemForm, sequence_no: parseInt(e.target.value, 10) || 1 })} disabled={formLoading} />
            <Stack direction="row" alignItems="center" spacing={1}>
              <Switch checked={editItemForm.requires_photo}
                onChange={(e) => setEditItemForm({ ...editItemForm, requires_photo: e.target.checked })} />
              <Typography variant="body2">Requires Photo</Typography>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Switch checked={editItemForm.is_active}
                onChange={(e) => setEditItemForm({ ...editItemForm, is_active: e.target.checked })} />
              <Typography variant="body2">Active</Typography>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditItemOpen(false)} disabled={formLoading} color="inherit" variant="outlined" size="small">Cancel</Button>
          <Button onClick={handleEditItem} disabled={formLoading}
            variant="contained" size="small" startIcon={formLoading ? <CircularProgress size={14} color="inherit" /> : undefined}>
            {formLoading ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={addItemOpen} onClose={() => setAddItemOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add Checklist Item</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Item Code" fullWidth size="small" value={addItemForm.item_code}
              onChange={(e) => setAddItemForm({ ...addItemForm, item_code: e.target.value })} disabled={formLoading}
              placeholder="e.g. DIM_001" />
            <TextField label="Prompt" fullWidth size="small" value={addItemForm.prompt}
              onChange={(e) => setAddItemForm({ ...addItemForm, prompt: e.target.value })} disabled={formLoading}
              placeholder="e.g. Check outer diameter" multiline rows={2} />
            <TextField label="Sequence No" type="number" fullWidth size="small" value={addItemForm.sequence_no}
              onChange={(e) => setAddItemForm({ ...addItemForm, sequence_no: parseInt(e.target.value, 10) || 1 })} disabled={formLoading} />
            <Stack direction="row" alignItems="center" spacing={1}>
              <Switch checked={addItemForm.requires_photo}
                onChange={(e) => setAddItemForm({ ...addItemForm, requires_photo: e.target.checked })} />
              <Typography variant="body2">Requires Photo</Typography>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddItemOpen(false)} disabled={formLoading} color="inherit" variant="outlined" size="small">Cancel</Button>
          <Button onClick={handleAddItem} disabled={formLoading || !addItemForm.item_code || !addItemForm.prompt}
            variant="contained" size="small" startIcon={formLoading ? <CircularProgress size={14} color="inherit" /> : <AddIcon />}>
            {formLoading ? "Adding..." : "Add Item"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{previewTitle}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            {previewItems.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No items in this checklist.</Typography>
            ) : (
              previewItems.map((item, idx) => (
                <Card key={item.id || idx} variant="outlined" sx={{ borderRadius: 2, borderLeft: `3px solid ${item.requires_photo ? "#ED6C02" : "#0046AD"}` }}>
                  <CardContent sx={{ p: "12px 16px !important", "&:last-child": { pb: "12px !important" } }}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Box sx={{ width: 28, height: 28, borderRadius: "50%", bgcolor: "rgba(0,70,173,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Typography variant="caption" fontWeight={700} color="primary.main">{idx + 1}</Typography>
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" fontWeight={600}>{item.item_code || `Step ${idx + 1}`}</Typography>
                        <Typography variant="caption" color="text.secondary">{item.prompt || "—"}</Typography>
                      </Box>
                      {item.requires_photo && <CameraAltIcon sx={{ fontSize: 18, color: "warning.main" }} />}
                    </Stack>
                  </CardContent>
                </Card>
              ))
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)} variant="outlined" size="small" color="inherit">Close</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
