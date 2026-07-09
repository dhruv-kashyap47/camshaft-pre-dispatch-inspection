import { useEffect, useState, useCallback, useMemo } from "react";
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
  LinearProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import SendIcon from "@mui/icons-material/Send";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import PrecisionManufacturingIcon from "@mui/icons-material/PrecisionManufacturing";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useQrScanner } from "../hooks/useQrScanner";
import ChecklistItemCard from "../components/ChecklistItemCard";
import SummaryScreen from "../components/SummaryScreen";
import api from "../api/client";

const CHECKLIST_ITEMS = [
  { code: "CAMSHAFT", prompt: "Cam Lobe Surface Finish — visual inspection for scoring, pitting, or wear on all cam lobes", requires_photo: true },
  { code: "CAMSHAFT", prompt: "Base Circle Runout — dial gauge measurement of base circle runout within 0.02mm tolerance", requires_photo: false },
  { code: "CAMSHAFT", prompt: "Journal Diameter — micrometer verification of all journal diameters to drawing specification", requires_photo: false },
  { code: "CAMSHAFT", prompt: "Keyway & Pin Alignment — check of keyway position and dowel pin alignment within 0.5°", requires_photo: true },
  { code: "CAMSHAFT", prompt: "Hardness Test (Rockwell) — hardness verification at specified locations per HRC specification", requires_photo: false },
  { code: "CAMSHAFT", prompt: "Magnetic Particle Inspection (MPI) — crack detection on all ground surfaces and fillet radii", requires_photo: true },
  { code: "CAMSHAFT", prompt: "Camshaft Straightness — V-block measurement for bend/straightness within 0.05mm", requires_photo: false },
  { code: "CAMSHAFT", prompt: "Oil Hole Cleanliness — verification of oil hole passage clearance and chamfer condition", requires_photo: true },
  { code: "CAMSHAFT", prompt: "Timing / Phase Angle — angular position check of all cam lobes relative to timing reference", requires_photo: false },
  { code: "CAMSHAFT", prompt: "Induction Hardening Pattern — etch inspection for proper hardening depth and pattern consistency", requires_photo: true },
  { code: "CAMSHAFT", prompt: "Cam Lobe Profile Check — optical profile verification against master template", requires_photo: true },
  { code: "CAMSHAFT", prompt: "Bearing Journal Surface Finish — Ra/Rz measurement on bearing journal surfaces", requires_photo: false },
  { code: "CAMSHAFT", prompt: "Spline/Serration Gauging — go/no-go gauge check of spline dimensions", requires_photo: true },
  { code: "CAMSHAFT", prompt: "Axial End Play Measurement — feeler gauge measurement of axial clearance", requires_photo: false },
  { code: "CAMSHAFT", prompt: "Dynamic Balance Verification — residual unbalance measurement within specification", requires_photo: false },
  { code: "CAMSHAFT", prompt: "Rust Prevention & Preservation — anti-corrosion oil application and packaging check", requires_photo: true },
  { code: "CAMSHAFT", prompt: "Laser Marking Verification — legibility and accuracy of part number / serial number / date code", requires_photo: true },
];

const DRAFT_KEY_PREFIX = "pdi_draft_";

function getDraftKey(inspectionId) {
  return `${DRAFT_KEY_PREFIX}${inspectionId}`;
}

export function OperatorPage() {
  const [machineCode, setMachineCode] = useState("");
  const [checklist, setChecklist] = useState([]);
  const [inspection, setInspection] = useState(null);
  const [answers, setAnswers] = useState({});
  const [remarks, setRemarks] = useState({});
  const [photos, setPhotos] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [initialized, setInitialized] = useState(false);

  const {
    scannerContainerRef,
    scanning: qrOpen,
    loading: qrLoading,
    error: qrError,
    clearError: clearQrError,
    startScanner: startQrScanner,
    stopScanner: stopQrScanner,
    cameras: qrCameras,
    selectedCameraId: qrSelectedCameraId,
    switchCamera: qrSwitchCamera,
    flashAvailable: qrFlashAvailable,
    flashOn: qrFlashOn,
    toggleFlash: qrToggleFlash,
  } = useQrScanner({
    onResult: (decodedText) => {
      setMachineCode(decodedText);
    },
    onError: (friendlyMessage) => {
      setError(friendlyMessage);
    },
  });

  useEffect(() => {
    loadChecklist();
  }, []);

  async function loadChecklist() {
    try {
      const response = await api.get("/operator/checklist");
      setChecklist(response.data);
    } catch {
      setChecklist(CHECKLIST_ITEMS.map((item, i) => ({ ...item, id: i + 1, sequence_no: i + 1 })));
    }
  }

  // Restore draft from localStorage when inspection is loaded
  useEffect(() => {
    if (!inspection || initialized) return;
    const key = getDraftKey(inspection.id);
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.answers) setAnswers(parsed.answers);
        if (parsed.remarks) setRemarks(parsed.remarks);
        if (typeof parsed.currentIndex === "number") setCurrentIndex(parsed.currentIndex);
      }
    } catch {
      // corrupted draft, ignore
    }
    setInitialized(true);
  }, [inspection, initialized]);

  // Auto-save to localStorage
  useEffect(() => {
    if (!inspection) return;
    const key = getDraftKey(inspection.id);
    const data = { answers, remarks, currentIndex };
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch {
      // storage full or unavailable
    }
  }, [answers, remarks, currentIndex, inspection]);

  const currentItem = useMemo(() => checklist[currentIndex] || null, [checklist, currentIndex]);

  const answeredCount = useMemo(
    () => checklist.filter((item) => answers[item.id] !== undefined).length,
    [checklist, answers]
  );

  const okCount = useMemo(
    () => checklist.filter((item) => answers[item.id] === "OK").length,
    [checklist, answers]
  );

  const notOkCount = useMemo(
    () => checklist.filter((item) => answers[item.id] === "NOT_OK").length,
    [checklist, answers]
  );

  const photoRequiredCount = useMemo(
    () => checklist.filter((item) => item.requires_photo).length,
    [checklist]
  );

  const photoUploadedCount = useMemo(
    () => checklist.filter((item) => photos[item.id]?.status === "uploaded").length,
    [checklist, photos]
  );

  const progressPct = useMemo(
    () => (checklist.length > 0 ? Math.round((answeredCount / checklist.length) * 100) : 0),
    [answeredCount, checklist.length]
  );

  const photoProgressPct = useMemo(
    () => (photoRequiredCount > 0 ? Math.round((photoUploadedCount / photoRequiredCount) * 100) : 100),
    [photoRequiredCount, photoUploadedCount]
  );

  const allAnswered = useMemo(
    () => checklist.length > 0 && checklist.every((item) => answers[item.id] !== undefined),
    [checklist, answers]
  );

  const allPhotosUploaded = useMemo(
    () => photoRequiredCount === 0 || checklist.filter((item) => item.requires_photo).every((item) => photos[item.id]?.status === "uploaded"),
    [checklist, photos, photoRequiredCount]
  );

  const notOkRemarksValid = useMemo(
    () => checklist.filter((item) => answers[item.id] === "NOT_OK").every((item) => (remarks[item.id] || "").trim().length > 0),
    [checklist, answers, remarks]
  );

  const canSubmit = useMemo(
    () => allAnswered && allPhotosUploaded && notOkRemarksValid,
    [allAnswered, allPhotosUploaded, notOkRemarksValid]
  );

  const isLastItem = currentIndex >= checklist.length - 1;
  const isFirstItem = currentIndex <= 0;

  const handleAnswer = useCallback((itemId, value) => {
    setAnswers((prev) => {
      const next = { ...prev, [itemId]: value };
      saveAnswer(itemId, value, remarks[itemId] || "");
      return next;
    });
  }, [inspection, remarks]);

  const handleRemark = useCallback((itemId, value) => {
    setRemarks((prev) => {
      const next = { ...prev, [itemId]: value };
      if (answers[itemId]) {
        saveAnswer(itemId, answers[itemId], value);
      }
      return next;
    });
  }, [inspection, answers]);

  const handlePhotoChange = useCallback((itemId, data) => {
    setPhotos((prev) => ({
      ...prev,
      [itemId]: { status: "uploaded", photoId: data.photo_id, fileName: data.file_name },
    }));
  }, []);

  const handleContinue = useCallback(() => {
    if (!currentItem) return;
    setCurrentIndex((prev) => prev + 1);
  }, [currentItem]);

  const handleBack = useCallback(() => {
    if (!isFirstItem) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [isFirstItem]);

  async function startInspection() {
    if (!machineCode.trim()) {
      setError("Please enter or scan a machine QR code");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await api.post("/engine/resume", {
        raw_qr: machineCode.trim(),
      });
      const inspData = response.data;
      setInspection(inspData.inspection);

      setSubmitted(false);
      setCurrentIndex(0);
      setInitialized(false);

      // Restore existing answers/photos from a resumed inspection
      if (inspData.action === "resumed" && inspData.inspection?.responses?.length) {
        const restoredAnswers = {};
        const restoredRemarks = {};
        const restoredPhotos = {};
        for (const r of inspData.inspection.responses) {
          restoredAnswers[r.checklist_item_id] = r.result;
          if (r.remarks) restoredRemarks[r.checklist_item_id] = r.remarks;
        }
        for (const p of inspData.inspection.photos || []) {
          if (p.checklist_item_id) {
            restoredPhotos[p.checklist_item_id] = { status: "uploaded", photoId: p.id, fileName: p.file_name };
          }
        }
        setAnswers(restoredAnswers);
        setRemarks(restoredRemarks);
        setPhotos(restoredPhotos);
      } else {
        setAnswers({});
        setRemarks({});
        setPhotos({});
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to start inspection");
    } finally {
      setLoading(false);
    }
  }

  async function saveAnswer(itemId, result, remark) {
    if (!inspection) return;
    try {
      await api.post("/engine/save-answer", {
        inspection_id: inspection.id,
        checklist_item_id: itemId,
        result: result,
        remarks: remark || "",
      });
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to save answer");
    }
  }

  function formatError(detail) {
    if (!detail) return "Failed to submit inspection";
    if (typeof detail === "string") return detail;
    if (detail.errors && Array.isArray(detail.errors)) {
      return detail.errors.map((e) => e.message || e.msg).join("; ");
    }
    if (detail.message) return detail.message;
    if (detail.msg) return detail.msg;
    try { return JSON.stringify(detail); } catch { return "Submission failed"; }
  }

  async function submitInspection() {
    if (!inspection || !canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await api.post("/engine/submit", {
        inspection_id: inspection.id,
      });
      setInspection(response.data);
      setSubmitted(true);
      setShowSummary(false);
      localStorage.removeItem(getDraftKey(inspection.id));
    } catch (err) {
      setError(formatError(err.response?.data?.detail));
    } finally {
      setSubmitting(false);
    }
  }

  function resetInspection() {
    setInspection(null);
    setMachineCode("");
    setAnswers({});
    setRemarks({});
    setPhotos({});
    setCurrentIndex(0);
    setSubmitted(false);
    setShowSummary(false);
    setError(null);
    setInitialized(false);
    setSubmitting(false);
  }

  // ────────────────────────────────────
  // Render: Machine Setup (no inspection)
  // ────────────────────────────────────
  if (!inspection) {
    return (
      <Stack spacing={3} sx={{ animation: "fadeIn 0.35s ease-out" }}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1}>
          <Box>
            <Typography variant="h4" component="h1">Operator Workstation</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              Start a new camshaft pre-dispatch inspection
            </Typography>
          </Box>
        </Stack>

        <Box aria-live="polite" aria-atomic="true">
          {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
        </Box>

        <Card
          sx={{
            maxWidth: 520,
            mx: "auto",
            width: "100%",
            animation: "slideUp 0.4s ease-out",
          }}
        >
          <CardContent sx={{ p: { xs: 2.5, sm: 3.5 }, "&:last-child": { pb: { xs: 2.5, sm: 3.5 } } }}>
            <Stack spacing={3}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <PrecisionManufacturingIcon color="primary" sx={{ fontSize: "1.5rem" }} />
                <Box>
                  <Typography variant="h6">Inspection Setup</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Enter or scan the QR code to begin
                  </Typography>
                </Box>
              </Stack>

              <TextField
                id="machine_code"
                label="QR Code"
                placeholder="e.g. P3979506;SB26006009;VTCJSR"
                fullWidth
                value={machineCode}
                onChange={(e) => setMachineCode(e.target.value)}
                disabled={loading}
                inputProps={{ "aria-label": "QR code", autoCapitalize: "characters" }}
                sx={{ "& .MuiOutlinedInput-root": { fontSize: "1.05rem" } }}
              />

              <Button
                variant="outlined"
                fullWidth
                size="large"
                startIcon={<QrCodeScannerIcon />}
                onClick={startQrScanner}
                disabled={loading}
                sx={{
                  minHeight: 52,
                  borderStyle: "dashed",
                  borderWidth: 2,
                  fontSize: "0.9375rem",
                  "&:hover": { borderStyle: "dashed", borderWidth: 2 },
                }}
              >
                Scan QR Code
              </Button>

              <Button
                variant="contained"
                fullWidth
                size="large"
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <PlayArrowIcon />}
                onClick={startInspection}
                disabled={loading || !machineCode.trim()}
                sx={{ minHeight: 52, fontSize: "1rem", fontWeight: 700 }}
              >
                {loading ? "Starting…" : "Start Inspection"}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    );
  }

  // ────────────────────────────────────
  // Render: Submitted
  // ────────────────────────────────────
  if (submitted && inspection) {
    return (
      <Stack spacing={3} sx={{ animation: "fadeIn 0.35s ease-out" }}>
        <Card
          sx={{
            maxWidth: 520,
            mx: "auto",
            width: "100%",
            textAlign: "center",
            animation: "scaleIn 0.35s ease-out",
          }}
        >
          <CardContent sx={{ p: { xs: 3, sm: 4 }, "&:last-child": { pb: { xs: 3, sm: 4 } } }}>
            <Stack spacing={2.5} alignItems="center">
              <CheckCircleIcon sx={{ fontSize: 56, color: "success.main", animation: "scaleIn 0.4s ease-out" }} />
              <Typography variant="h5">Inspection Submitted</Typography>
              <Chip
                label={inspection.inspection_no}
                color="primary"
                variant="filled"
                sx={{ fontWeight: 700, fontSize: "0.875rem", py: 0.5, height: 32 }}
              />
              <Typography variant="body2" color="text.secondary">
                Inspection sent for manager review. You will be notified once it is approved.
              </Typography>
              <Box sx={{ pt: 1 }}>
                <Stack spacing={1.5} direction="row" justifyContent="center" sx={{ flexWrap: "wrap", gap: 1 }}>
                  <Chip icon={<CheckCircleIcon />} label={`${okCount} OK`} color="success" variant="outlined" />
                  {notOkCount > 0 && <Chip icon={<CancelIcon />} label={`${notOkCount} NOT OK`} color="error" variant="outlined" />}
                  {photoUploadedCount > 0 && <Chip icon={<PhotoCameraIcon />} label={`${photoUploadedCount} photos`} color="primary" variant="outlined" />}
                </Stack>
              </Box>
              <Button
                variant="contained"
                size="large"
                startIcon={<RefreshIcon />}
                onClick={resetInspection}
                sx={{ mt: 1, minHeight: 48, minWidth: 200 }}
              >
                Start New Inspection
              </Button>
            </Stack>
          </CardContent>
        </Card>

        {error && (
          <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>
        )}
      </Stack>
    );
  }

  // ────────────────────────────────────
  // Render: Active Inspection (one item at a time + summary)
  // ────────────────────────────────────
  return (
    <Box sx={{ height: "calc(100vh - 100px)", display: "flex", flexDirection: "column", overflow: "hidden", animation: "fadeIn 0.35s ease-out" }}>
      {showSummary ? (
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <SummaryScreen
            checklistItems={checklist}
            answers={checklist.map((item) => answers[item.id])}
            remarks={checklist.map((item) => remarks[item.id])}
            photos={checklist.map((item) => photos[item.id])}
            inspectionNo={inspection?.inspection_no}
            onSubmit={submitInspection}
            submitting={submitting}
            submitDisabled={!canSubmit}
          />
          <Button
            variant="text"
            color="inherit"
            startIcon={<ArrowBackIcon />}
            onClick={() => setShowSummary(false)}
            disabled={submitting}
            sx={{ alignSelf: "flex-start", mt: 1, fontSize: "0.8125rem" }}
          >
            Back to Checklist
          </Button>
          {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mt: 1 }}>{error}</Alert>}
        </Box>
      ) : (
        <Stack spacing={2.5} sx={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {/* Machine info + inspection header */}
          <Card sx={{ borderRadius: 2, boxShadow: "0 1px 3px rgba(0,0,0,0.05)", border: "1px solid rgba(0,0,0,0.05)", flexShrink: 0 }}>
            <CardContent sx={{ p: { xs: 1.5, sm: 2 }, "&:last-child": { pb: { xs: 1.5, sm: 2 } } }}>
              <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1.25}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <PrecisionManufacturingIcon color="primary" sx={{ fontSize: "1.2rem" }} />
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
                      {machineCode || "Machine"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.6875rem" }}>
                      {inspection.inspection_no}
                    </Typography>
                  </Box>
                </Stack>
                <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 0.5 }}>
                  <Chip size="small" icon={<CheckCircleIcon />} label={`${okCount} OK`} color="success" variant="outlined" />
                  {notOkCount > 0 && <Chip size="small" icon={<CancelIcon />} label={`${notOkCount} NOT OK`} color="error" variant="outlined" />}
                  <Chip size="small" icon={<PhotoCameraIcon />} label={`${photoUploadedCount}/${photoRequiredCount} photos`} color="primary" variant="outlined" />
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          {/* Progress section */}
          <Box sx={{ flexShrink: 0, animation: "fadeIn 0.4s ease-out" }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
              <Typography variant="body2" fontWeight={600} color="text.secondary">
                Inspection Progress
              </Typography>
              <Typography
                variant="body2"
                fontWeight={700}
                color={progressPct === 100 ? "success.main" : "primary.main"}
              >
                {answeredCount} / {checklist.length} Complete
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={progressPct}
              color={progressPct === 100 ? "success" : "primary"}
              aria-label={`Checklist completion: ${progressPct}%`}
              sx={{ height: 8, borderRadius: 4, mb: 0.75 }}
            />
            {photoRequiredCount > 0 && (
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.6875rem" }}>
                  Photo completion
                </Typography>
                <Typography
                  variant="caption"
                  fontWeight={600}
                  color={photoProgressPct === 100 ? "success.main" : "text.secondary"}
                  sx={{ fontSize: "0.6875rem" }}
                >
                  {photoUploadedCount} / {photoRequiredCount} uploaded
                </Typography>
              </Stack>
            )}
            {photoRequiredCount > 0 && (
              <LinearProgress
                variant="determinate"
                value={photoProgressPct}
                color={photoProgressPct === 100 ? "success" : "info"}
                aria-label={`Photo completion: ${photoProgressPct}%`}
                sx={{ height: 5, borderRadius: 4, mt: 0.5 }}
              />
            )}
          </Box>

          {/* Alerts */}
          <Box aria-live="polite" aria-atomic="true" sx={{ flexShrink: 0 }}>
            {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
          </Box>

          {/* Current checklist card - scrollable if needed */}
          <Box sx={{ flex: 1, overflow: "hidden", minHeight: 0 }}>
            {currentItem && (
              <Box key={currentItem.id} sx={{ height: "100%", overflow: "hidden", animation: "fadeIn 0.3s ease-out" }}>
                <ChecklistItemCard
                  item={currentItem}
                  index={currentIndex}
                  total={checklist.length}
                  answer={answers[currentItem.id]}
                  remark={remarks[currentItem.id]}
                  photo={photos[currentItem.id]}
                  inspectionId={inspection?.id}
                  onAnswer={handleAnswer}
                  onRemark={handleRemark}
                  onPhotoChange={handlePhotoChange}
                  submitting={submitting}
                />
              </Box>
            )}
          </Box>

          {/* Navigation */}
          <Stack direction="row" spacing={2} justifyContent="space-between" sx={{ pt: 0.5, flexShrink: 0 }}>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={handleBack}
              disabled={isFirstItem || submitting}
              sx={{ minHeight: 48, minWidth: 120, fontSize: "0.875rem" }}
              aria-label="Previous checklist item"
            >
              Back
            </Button>

            {isLastItem ? (
              <Button
                variant="contained"
                color="primary"
                size="large"
                endIcon={<SendIcon />}
                onClick={() => setShowSummary(true)}
                disabled={!canSubmit || submitting}
                sx={{
                  minHeight: 48,
                  minWidth: 160,
                  fontSize: "0.9375rem",
                  fontWeight: 700,
                  animation: canSubmit ? "pulse 2s ease-in-out infinite" : "none",
                }}
                aria-label="Review and submit inspection"
              >
                Review & Submit
              </Button>
            ) : (
              <Button
                variant="contained"
                endIcon={<ArrowForwardIcon />}
                onClick={handleContinue}
                disabled={submitting}
                sx={{ minHeight: 48, minWidth: 140, fontSize: "0.875rem" }}
                aria-label="Continue to next item"
              >
                Continue
              </Button>
            )}
          </Stack>

          {/* Item position indicator */}
          <Typography variant="caption" textAlign="center" color="text.disabled" sx={{ fontSize: "0.6875rem", pb: 1, flexShrink: 0 }}>
            Item {currentIndex + 1} of {checklist.length}
          </Typography>
        </Stack>
      )}

      {/* QR Scanner Dialog */}
      <Dialog
        open={qrOpen}
        onClose={stopQrScanner}
        maxWidth="xs"
        fullWidth
        aria-labelledby="qr-dialog-title"
        disableRestoreFocus
      >
        <DialogTitle id="qr-dialog-title">Scan QR Code</DialogTitle>
        <DialogContent>
          {qrError && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {qrError}
            </Alert>
          )}

          {qrLoading && (
            <Stack alignItems="center" spacing={1.5} sx={{ py: 4 }}>
              <CircularProgress size={40} />
              <Typography variant="body2" color="text.secondary">
                Starting camera…
              </Typography>
            </Stack>
          )}

          <Box
            ref={scannerContainerRef}
            id="qr-reader"
            sx={{
              borderRadius: 2,
              overflow: "hidden",
              bgcolor: "black",
              minHeight: 260,
              display: qrLoading ? "none" : "block",
            }}
          />

          {qrCameras.length > 1 && (
            <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: "wrap" }}>
              {qrCameras.map((cam) => (
                <Button
                  key={cam.id}
                  size="small"
                  variant={cam.id === qrSelectedCameraId ? "contained" : "outlined"}
                  color={cam.id === qrSelectedCameraId ? "primary" : "inherit"}
                  onClick={() => qrSwitchCamera(cam.id)}
                  disabled={qrLoading}
                  sx={{ textTransform: "none", fontSize: "0.75rem" }}
                >
                  {cam.label || `Camera ${cam.id.slice(0, 8)}…`}
                </Button>
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: "space-between", px: 2, pb: 1.5 }}>
          <Stack direction="row" spacing={1}>
            {qrError && (
              <Button
                onClick={() => { clearQrError(); startQrScanner(); }}
                variant="contained"
                size="small"
              >
                Retry
              </Button>
            )}
            {qrFlashAvailable && (
              <Button
                onClick={qrToggleFlash}
                variant="outlined"
                size="small"
                color={qrFlashOn ? "warning" : "inherit"}
                disabled={qrLoading}
              >
                {qrFlashOn ? "Flash On" : "Flash"}
              </Button>
            )}
          </Stack>
          <Button onClick={stopQrScanner} variant="outlined" color="inherit" size="small">
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
