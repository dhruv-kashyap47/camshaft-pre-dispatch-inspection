import { useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  Skeleton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useSearchParams } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import TimelineIcon from "@mui/icons-material/Timeline";
import EditNoteIcon from "@mui/icons-material/EditNote";
import GpsFixedIcon from "@mui/icons-material/GpsFixed";

import api from "../api/client";
import ErrorAlert from "../components/ErrorAlert";
import StatusChip from "../components/StatusChip";
import PhotoViewerDialog from "../components/PhotoViewerDialog";
import TimelineView from "../components/TimelineView";
import ConfirmDialog from "../components/ConfirmDialog";
import { useNotification } from "../components/NotificationProvider";

function SkeletonDetail() {
  return (
    <Stack spacing={2}>
      <Skeleton variant="rounded" height={40} width="60%" />
      <Skeleton variant="rounded" height={24} width="40%" />
      <Divider />
      <Skeleton variant="rounded" height={200} />
      <Skeleton variant="rounded" height={100} />
    </Stack>
  );
}

export default function InspectionReviewPage() {
  const [searchParams] = useSearchParams();
  const inspectionId = searchParams.get("inspection_id");

  const [inspection, setInspection] = useState(null);
  const [loading, setLoading] = useState(!!inspectionId);
  const [error, setError] = useState(null);
  const [managerNotes, setManagerNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [overrideDialog, setOverrideDialog] = useState({ open: false, item: null });

  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const [photoViewerIndex, setPhotoViewerIndex] = useState(0);

  const { success, error: notifyError } = useNotification();

  const loadInspection = useCallback(async (id) => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/manager/inspections/${id}`);
      setInspection(response.data);
      setManagerNotes(response.data.inspection?.manager_notes || "");
    } catch {
      setError("Failed to load inspection detail");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (inspectionId) loadInspection(inspectionId);
  }, [inspectionId, loadInspection]);

  const handleApprove = useCallback(async () => {
    if (!inspection) return;
    setActionLoading(true);
    try {
      await api.post("/manager/approve", {
        inspection_id: inspection.inspection.id,
        approval_note: managerNotes || "Released for dispatch",
      });
      success("Inspection approved successfully");
      loadInspection(inspection.inspection.id);
      setApproveDialogOpen(false);
    } catch (err) {
      notifyError(err.response?.data?.detail || "Approval failed");
    } finally {
      setActionLoading(false);
    }
  }, [inspection, managerNotes, success, notifyError, loadInspection]);

  const handleReject = useCallback(async (reason) => {
    if (!inspection) return;
    setActionLoading(true);
    try {
      await api.post("/manager/reject", {
        inspection_id: inspection.inspection.id,
        reason: reason || "Rejected during review",
      });
      success("Inspection rejected");
      loadInspection(inspection.inspection.id);
      setRejectDialogOpen(false);
    } catch (err) {
      notifyError(err.response?.data?.detail || "Rejection failed");
    } finally {
      setActionLoading(false);
    }
  }, [inspection, success, notifyError, loadInspection]);

  const handleOverride = useCallback(async (reason) => {
    if (!overrideDialog.item) return;
    setActionLoading(true);
    try {
      await api.post("/manager/override", {
        inspection_id: inspection.inspection.id,
        checklist_item_id: overrideDialog.item.checklist_item_id,
        override_result: "OK",
        reason: reason || "Overridden by manager",
      });
      success("Item overridden");
      loadInspection(inspection.inspection.id);
      setOverrideDialog({ open: false, item: null });
    } catch (err) {
      notifyError(err.response?.data?.detail || "Override failed");
    } finally {
      setActionLoading(false);
    }
  }, [overrideDialog, inspection, success, notifyError, loadInspection]);

  const saveNotes = useCallback(async () => {
    if (!inspection) return;
    try {
      await api.post("/manager/notes", {
        inspection_id: inspection.inspection.id,
        notes: managerNotes,
      });
      success("Notes saved");
    } catch {
      notifyError("Failed to save notes");
    }
  }, [inspection, managerNotes, success, notifyError]);

  const openPhotoViewer = (photos, idx) => {
    setPhotoViewerIndex(idx);
    setPhotoViewerOpen(true);
  };

  if (!inspectionId) {
    return (
      <Stack alignItems="center" sx={{ py: 8, animation: "fadeIn 0.35s ease-out" }}>
        <GpsFixedIcon sx={{ fontSize: 48, color: "text.disabled", mb: 2 }} />
        <Typography variant="h6" color="text.secondary">No Inspection Selected</Typography>
        <Typography variant="body2" color="text.secondary">
          Select an inspection from the Review Console or search to begin reviewing.
        </Typography>
      </Stack>
    );
  }

  if (loading && !inspection) {
    return (
      <Box sx={{ animation: "fadeIn 0.35s ease-out", maxWidth: 900, mx: "auto" }}>
        <SkeletonDetail />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ animation: "fadeIn 0.35s ease-out" }}>
        <ErrorAlert error={error} onClose={() => setError(null)} />
      </Box>
    );
  }

  const insp = inspection?.inspection || {};
  const responses = inspection?.responses || [];
  const overrides = inspection?.overrides || [];
  const photos = inspection?.photos || [];
  const timeline = inspection?.timeline || [];
  return (
    <Stack spacing={3} sx={{ animation: "fadeIn 0.35s ease-out", maxWidth: 900, mx: "auto" }}>
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <IconButton
          component="a"
          href="/manager"
          size="small"
          aria-label="Back to review console"
          sx={{ color: "text.secondary" }}
        >
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap">
            <Typography variant="h4" component="h1">{insp.inspection_no}</Typography>
            <StatusChip status={insp.status} />
          </Stack>
          <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ mt: 0.25 }}>
            {insp.machine_code && <Typography variant="body2" color="text.secondary">Part: {insp.machine_code}</Typography>}
            {insp.serial_number && <Typography variant="body2" color="text.secondary">Serial: {insp.serial_number}</Typography>}
            {insp.vendor && <Typography variant="body2" color="text.secondary">Vendor: {insp.vendor}</Typography>}
            {insp.cam_code && <Typography variant="body2" color="text.secondary">Machine: {insp.cam_code}</Typography>}
            {insp.operator_name && <Typography variant="body2" color="text.secondary">Operator: {insp.operator_name}</Typography>}
          </Stack>
        </Box>
      </Stack>

      <ErrorAlert error={error} onClose={() => setError(null)} />

      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Stack spacing={2}>
            <Card className="no-lift">
              <CardContent>
                <Typography variant="h6" gutterBottom>Checklist Responses</Typography>
                {responses.length === 0 && (
                  <Typography variant="body2" color="text.secondary">No responses yet.</Typography>
                )}
                <Stack spacing={1}>
                  {responses.map((r) => (
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
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          Item #{r.checklist_item_id}
                        </Typography>
                        {r.remarks && (
                          <Typography variant="caption" color="text.secondary">
                            {r.remarks}
                          </Typography>
                        )}
                      </Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip size="small" label={r.result} color={r.result === "OK" ? "success" : "error"} variant="filled" />
                        {r.result === "NOT_OK" && insp.status !== "APPROVED" && insp.status !== "REJECTED" && (
                          <Button
                            size="small"
                            variant="text"
                            color="warning"
                            onClick={() => setOverrideDialog({ open: true, item: r })}
                            sx={{ fontSize: "0.7rem", minHeight: 24 }}
                          >
                            Override
                          </Button>
                        )}
                      </Stack>
                    </Stack>
                  ))}
                </Stack>
              </CardContent>
            </Card>

            {overrides.length > 0 && (
              <Card className="no-lift">
                <CardContent>
                  <Typography variant="h6" gutterBottom color="warning.dark">Overrides</Typography>
                  <Stack spacing={1}>
                    {overrides.map((o) => (
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
                </CardContent>
              </Card>
            )}

            <Card className="no-lift">
              <CardContent>
                <Stack spacing={2}>
                  <Typography variant="h6">Manager Notes</Typography>
                  <TextField
                    multiline
                    fullWidth
                    minRows={3}
                    maxRows={6}
                    placeholder="Add notes for this inspection..."
                    value={managerNotes}
                    onChange={(e) => setManagerNotes(e.target.value)}
                    size="small"
                    inputProps={{ "aria-label": "Manager notes", maxLength: 2000 }}
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={saveNotes}
                    startIcon={<EditNoteIcon />}
                    sx={{ alignSelf: "flex-end" }}
                  >
                    Save Notes
                  </Button>
                </Stack>
              </CardContent>
            </Card>

            <Stack direction="row" spacing={2}>
              <Button
                variant="contained"
                color="success"
                size="large"
                fullWidth
                startIcon={actionLoading ? <CircularProgress size={18} color="inherit" /> : <CheckCircleIcon />}
                onClick={() => setApproveDialogOpen(true)}
                disabled={actionLoading || insp.status === "APPROVED" || insp.status === "REJECTED"}
                sx={{ minHeight: 52 }}
              >
                Approve
              </Button>
              <Button
                variant="outlined"
                color="error"
                size="large"
                fullWidth
                startIcon={actionLoading ? <CircularProgress size={18} color="inherit" /> : <CancelIcon />}
                onClick={() => setRejectDialogOpen(true)}
                disabled={actionLoading || insp.status === "APPROVED" || insp.status === "REJECTED"}
                sx={{ minHeight: 52 }}
              >
                Reject
              </Button>
            </Stack>
          </Stack>
        </Grid>

        <Grid item xs={12} md={5}>
          <Stack spacing={2}>
            {photos.length > 0 && (
              <Card className="no-lift">
                <CardContent>
                  <Typography variant="h6" gutterBottom>Photos ({photos.length})</Typography>
                  <Grid container spacing={1}>
                    {photos.map((p, idx) => (
                      <Grid item xs={4} key={p.id}>
                        <Box
                          onClick={() => openPhotoViewer(photos, idx)}
                          sx={{
                            borderRadius: 2,
                            overflow: "hidden",
                            cursor: "pointer",
                            border: "1px solid rgba(0,0,0,0.08)",
                            position: "relative",
                            "&:hover": { opacity: 0.85 },
                          }}
                        >
                          <Box
                            component="img"
                            src={`/api/v1/photo/${p.id}`}
                            alt={p.file_name || "Inspection photo"}
                            sx={{
                              width: "100%",
                              height: 80,
                              objectFit: "cover",
                              display: "block",
                            }}
                            onError={(e) => {
                              e.target.style.display = "none";
                            }}
                          />
                          <Tooltip title={p.file_name || ""} arrow>
                            <PhotoCameraIcon
                              sx={{
                                position: "absolute",
                                bottom: 4,
                                right: 4,
                                fontSize: 14,
                                color: "rgba(255,255,255,0.8)",
                                bgcolor: "rgba(0,0,0,0.4)",
                                borderRadius: "50%",
                                p: 0.25,
                              }}
                            />
                          </Tooltip>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            )}

            <Card className="no-lift">
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                  <TimelineIcon fontSize="small" color="primary" />
                  <Typography variant="h6">Timeline</Typography>
                </Stack>
                <TimelineView events={timeline} />
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>

      <ConfirmDialog
        open={approveDialogOpen}
        onClose={() => setApproveDialogOpen(false)}
        onConfirm={handleApprove}
        title="Approve Inspection"
        message={`Are you sure you want to approve ${insp.inspection_no}?`}
        confirmText="Approve"
        loading={actionLoading}
      />

      <ConfirmDialog
        open={rejectDialogOpen}
        onClose={() => setRejectDialogOpen(false)}
        onConfirm={handleReject}
        title="Reject Inspection"
        message="Provide a reason for rejection:"
        confirmText="Reject"
        destructive
        requireInput
        inputLabel="Rejection Reason"
        inputPlaceholder="Explain why this inspection is rejected..."
        loading={actionLoading}
      />

      <ConfirmDialog
        open={overrideDialog.open}
        onClose={() => setOverrideDialog({ open: false, item: null })}
        onConfirm={handleOverride}
        title="Override Item"
        message={`Override item #${overrideDialog.item?.checklist_item_id} from "${overrideDialog.item?.result}" to "OK"?`}
        confirmText="Override"
        destructive
        requireInput
        inputLabel="Override Reason"
        inputPlaceholder="Explain why this item is being overridden..."
        loading={actionLoading}
      />

      <PhotoViewerDialog
        open={photoViewerOpen}
        onClose={() => setPhotoViewerOpen(false)}
        photos={photos}
        initialIndex={photoViewerIndex}
      />
    </Stack>
  );
}
