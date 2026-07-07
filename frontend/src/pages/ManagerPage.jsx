import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  TextField,
  Typography,
  Avatar,
  Tooltip,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import VisibilityIcon from "@mui/icons-material/Visibility";
import RateReviewIcon from "@mui/icons-material/RateReview";
import RefreshIcon from "@mui/icons-material/Refresh";
import InboxIcon from "@mui/icons-material/Inbox";
import PhotoCamera from "@mui/icons-material/PhotoCamera";

import api from "../api/client";

export function ManagerPage() {
  const [pending, setPending] = useState([]);
  const [reasons, setReasons] = useState({});
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState(null);
  const [detailInspection, setDetailInspection] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const loadPending = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/manager/pending");
      setPending(response.data);
    } catch {
      setError("Failed to load pending inspections");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  async function approve(inspectionId) {
    setActionLoading(inspectionId);
    setError(null);
    try {
      await api.post("/manager/approve", {
        inspection_id: inspectionId,
        approval_note: reasons[inspectionId] || "Released for dispatch",
      });
      loadPending();
    } catch (err) {
      setError(err.response?.data?.detail || "Approval failed");
    } finally {
      setActionLoading(null);
    }
  }

  async function reject(inspectionId) {
    setActionLoading(inspectionId);
    setError(null);
    try {
      await api.post("/manager/reject", {
        inspection_id: inspectionId,
        reason: reasons[inspectionId] || "Rejected during review",
      });
      loadPending();
    } catch (err) {
      setError(err.response?.data?.detail || "Rejection failed");
    } finally {
      setActionLoading(null);
    }
  }

  async function viewDetail(inspectionId) {
    try {
      const response = await api.get(`/manager/inspections/${inspectionId}`);
      setDetailInspection(response.data);
      setDetailOpen(true);
    } catch {
      setError("Failed to load inspection detail");
    }
  }

  const statusChip = (s) => {
    const map = {
      SUBMITTED: { color: "warning", label: "Pending Review" },
      APPROVED: { color: "success", label: "Approved" },
      REJECTED: { color: "error", label: "Rejected" },
      IN_PROGRESS: { color: "info", label: "In Progress" },
    };
    const m = map[s] || { color: "default", label: s };
    return <Chip size="small" color={m.color} label={m.label} variant="filled" />;
  };

  return (
    <Stack spacing={3} sx={{ animation: "fadeIn 0.35s ease-out" }}>
      {/* Page Header */}
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1}>
        <Box>
          <Stack direction="row" spacing={1.25} alignItems="center">
            <RateReviewIcon color="primary" sx={{ fontSize: "1.5rem" }} />
            <Typography variant="h4" component="h1">Review Console</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25, ml: { sm: "2.75rem" } }}>
            {pending.length} inspection{pending.length !== 1 ? "s" : ""} awaiting decision
          </Typography>
        </Box>
        <Button
          variant="outlined"
          size="small"
          onClick={loadPending}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={14} /> : <RefreshIcon />}
          sx={{ alignSelf: { xs: "flex-start", sm: "center" } }}
        >
          {loading ? "Refreshing…" : "Refresh"}
        </Button>
      </Stack>

      {/* Alerts */}
      <Box aria-live="polite" aria-atomic="true">
        {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
      </Box>

      {/* Loading state */}
      {loading && pending.length === 0 && (
        <Stack alignItems="center" sx={{ py: 8 }}>
          <CircularProgress />
        </Stack>
      )}

      {/* Empty state */}
      {pending.length === 0 && !loading && (
        <Card className="no-lift" sx={{ animation: "scaleIn 0.35s ease-out" }}>
          <CardContent>
            <Stack alignItems="center" spacing={1.5} sx={{ py: 5 }}>
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  bgcolor: "success.light",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CheckCircleIcon sx={{ fontSize: 32, color: "success.main" }} />
              </Box>
              <Typography variant="h6" color="text.secondary">All Clear</Typography>
              <Typography variant="body2" color="text.secondary">
                No pending inspections for review.
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Inspection cards */}
      <Stack spacing={2} role="list" aria-label="Pending inspections">
        {pending.map((insp, index) => (
          <Card
            key={insp.id}
            className="no-lift"
            role="listitem"
            sx={{
              animation: `slideUp 0.3s ease-out ${index * 0.05}s both`,
              borderLeft: "3px solid",
              borderLeftColor: insp.status === "SUBMITTED" ? "warning.main" : "divider",
            }}
          >
            <CardContent>
              <Stack spacing={2}>
                {/* Card header */}
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  justifyContent="space-between"
                  alignItems={{ sm: "center" }}
                  spacing={1}
                >
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Avatar
                      sx={{
                        width: 34,
                        height: 34,
                        bgcolor: "rgba(0,70,173,0.1)",
                        color: "primary.main",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                      }}
                    >
                      {insp.inspection_no?.slice(-2)}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1" sx={{ lineHeight: 1.2 }}>
                        {insp.inspection_no}
                      </Typography>
                      {insp.machine_code && (
                        <Typography variant="caption" color="text.secondary">
                          {insp.machine_code}
                          {insp.full_name ? ` · ${insp.full_name}` : ""}
                        </Typography>
                      )}
                    </Box>
                    {statusChip(insp.status)}
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(insp.started_at).toLocaleString()}
                  </Typography>
                </Stack>

                <Divider />

                {/* Actions row */}
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1.5}
                  alignItems={{ sm: "center" }}
                >
                  <Button
                    size="small"
                    variant="text"
                    startIcon={<VisibilityIcon />}
                    onClick={() => viewDetail(insp.id)}
                    sx={{ flexShrink: 0 }}
                  >
                    View Details
                  </Button>
                  <TextField
                    size="small"
                    placeholder="Decision note (optional)"
                    value={reasons[insp.id] || ""}
                    onChange={(e) => setReasons((s) => ({ ...s, [insp.id]: e.target.value }))}
                    inputProps={{ "aria-label": "Decision note" }}
                    sx={{ flex: 1, minWidth: 160 }}
                  />
                  <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
                    <Tooltip title="Approve this inspection for dispatch" arrow>
                      <span>
                        <Button
                          variant="contained"
                          color="success"
                          size="small"
                          startIcon={
                            actionLoading === insp.id
                              ? <CircularProgress size={14} color="inherit" />
                              : <CheckCircleIcon />
                          }
                          onClick={() => approve(insp.id)}
                          disabled={actionLoading !== null}
                          aria-label={`Approve inspection ${insp.inspection_no}`}
                        >
                          Approve
                        </Button>
                      </span>
                    </Tooltip>
                    <Tooltip title="Reject and return to operator" arrow>
                      <span>
                        <Button
                          variant="outlined"
                          color="error"
                          size="small"
                          startIcon={
                            actionLoading === insp.id
                              ? <CircularProgress size={14} color="inherit" />
                              : <CancelIcon />
                          }
                          onClick={() => reject(insp.id)}
                          disabled={actionLoading !== null}
                          aria-label={`Reject inspection ${insp.inspection_no}`}
                        >
                          Reject
                        </Button>
                      </span>
                    </Tooltip>
                  </Stack>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>

      {/* Detail Dialog */}
      <Dialog
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        maxWidth="md"
        fullWidth
        aria-labelledby="detail-dialog-title"
      >
        <DialogTitle id="detail-dialog-title">
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <span>Inspection Detail</span>
            {detailInspection?.inspection && statusChip(detailInspection.inspection.status)}
          </Stack>
        </DialogTitle>
        <DialogContent>
          {detailInspection && (
            <Stack spacing={2.5} sx={{ mt: 0.5 }}>
              <Box>
                <Typography variant="h6" sx={{ lineHeight: 1.3 }}>
                  {detailInspection.inspection?.inspection_no}
                </Typography>
                {detailInspection.inspection?.machine_code && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                    Machine: {detailInspection.inspection.machine_code}
                  </Typography>
                )}
              </Box>

              <Divider />

              {detailInspection.responses?.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom sx={{ mb: 1.25 }}>
                    Checklist Responses
                  </Typography>
                  <Stack spacing={0.75}>
                    {detailInspection.responses.map((r) => (
                      <Stack
                        key={r.id}
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        sx={{
                          p: "10px 14px",
                          borderRadius: 2,
                          bgcolor: r.result === "OK" ? "rgba(46,125,50,0.04)" : "rgba(211,47,47,0.04)",
                          border: "1px solid",
                          borderColor: r.result === "OK" ? "rgba(46,125,50,0.15)" : "rgba(211,47,47,0.15)",
                        }}
                      >
                        <Typography variant="body2" fontWeight={500}>
                          Item #{r.checklist_item_id}
                        </Typography>
                        <Chip
                          size="small"
                          label={r.result}
                          color={r.result === "OK" ? "success" : "error"}
                          variant="filled"
                        />
                      </Stack>
                    ))}
                  </Stack>
                </Box>
              )}

              {detailInspection.overrides?.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom color="warning.dark" sx={{ mb: 1.25 }}>
                    Overrides
                  </Typography>
                  <Stack spacing={0.75}>
                    {detailInspection.overrides.map((o) => (
                      <Box
                        key={o.id}
                        sx={{
                          p: "10px 14px",
                          borderRadius: 2,
                          bgcolor: "rgba(237,108,2,0.05)",
                          border: "1px solid rgba(237,108,2,0.2)",
                        }}
                      >
                        <Typography variant="body2" fontWeight={600}>
                          Item #{o.checklist_item_id}: {o.original_result} → {o.override_result}
                        </Typography>
                        {o.reason && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
                            {o.reason}
                          </Typography>
                        )}
                      </Box>
                    ))}
                  </Stack>
                </Box>
              )}

                    {detailInspection.photos?.length > 0 && (
                      <Box>
                        <Typography variant="subtitle2" gutterBottom sx={{ mb: 1 }}>
                          Photos ({detailInspection.photos.length})
                        </Typography>
                        <Stack spacing={0.75}>
                          {detailInspection.photos.map((p) => (
                            <Stack key={p.id} direction="row" spacing={0.75} alignItems="center">
                              <PhotoCamera sx={{ fontSize: 14, color: "text.secondary", flexShrink: 0 }} />
                              <Typography variant="body2" color="text.secondary">
                                {p.file_name}
                              </Typography>
                            </Stack>
                          ))}
                        </Stack>
                      </Box>
                    )}

              {!detailInspection.responses?.length &&
               !detailInspection.overrides?.length &&
               !detailInspection.photos?.length && (
                <Stack alignItems="center" spacing={1} sx={{ py: 3 }}>
                  <InboxIcon sx={{ fontSize: 36, color: "text.disabled" }} />
                  <Typography variant="body2" color="text.secondary">
                    No detail records available.
                  </Typography>
                </Stack>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)} variant="outlined" color="inherit">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
