import { useCallback, useEffect, useRef, useState } from "react";
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
  Grid,
  LinearProgress,
  Stack,
  TextField,
  Typography,
  Avatar,
  Tooltip,
} from "@mui/material";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import SendIcon from "@mui/icons-material/Send";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import PrecisionManufacturingIcon from "@mui/icons-material/PrecisionManufacturing";
import AssignmentIcon from "@mui/icons-material/Assignment";
import { Html5Qrcode } from "html5-qrcode";

import api from "../api/client";

const QR_SCANNER_ID = "qr-reader";

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

export function OperatorPage() {
  const [machineCode, setMachineCode] = useState("");
  const [checklist, setChecklist] = useState([]);
  const [inspection, setInspection] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [qrOpen, setQrOpen] = useState(false);
  const scannerRef = useRef(null);

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

  const startQrScanner = useCallback(async () => {
    setQrOpen(true);
    try {
      const scanner = new Html5Qrcode(QR_SCANNER_ID);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        async (decodedText) => {
          await scanner.stop();
          setQrOpen(false);
          setMachineCode(decodedText);
        },
        () => {},
      );
    } catch {
      setError("Camera access denied or not available");
      setQrOpen(false);
    }
  }, []);

  function stopQrScanner() {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }
    setQrOpen(false);
  }

  async function startInspection() {
    if (!machineCode.trim()) {
      setError("Please enter or scan a machine code");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await api.post("/operator/start", {
        machine_code: machineCode.trim(),
      });
      setInspection(response.data);
      setSubmitted(false);
      setAnswers({});
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to start inspection");
    } finally {
      setLoading(false);
    }
  }

  async function submitInspection() {
    if (!inspection) return;
    setLoading(true);
    setError(null);
    try {
      const payload = {
        inspection_id: inspection.id,
        answers: checklist.map((item) => ({
          checklist_item_id: item.id,
          result: answers[item.id] || "OK",
          remarks: "",
        })),
      };
      const response = await api.post("/operator/submit", payload);
      setInspection(response.data);
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to submit inspection");
    } finally {
      setLoading(false);
    }
  }

  const answeredCount = Object.values(answers).filter((v) => v === "OK" || v === "NOT_OK").length;
  const okCount = Object.values(answers).filter((v) => v === "OK").length;
  const notOkCount = Object.values(answers).filter((v) => v === "NOT_OK").length;
  const progressPct = checklist.length > 0 ? Math.round((answeredCount / checklist.length) * 100) : 0;

  return (
    <Stack spacing={3} sx={{ animation: "fadeIn 0.35s ease-out" }}>
      {/* Page Header */}
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1}>
        <Box>
          <Typography variant="h4" component="h1">Operator Workstation</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            Start and submit camshaft pre-dispatch inspections
          </Typography>
        </Box>
        {inspection && (
          <Chip
            icon={<CheckCircleIcon />}
            label={`${inspection.inspection_no} · ${inspection.status}`}
            color="primary"
            variant="filled"
            sx={{ fontWeight: 600, animation: "scaleIn 0.25s ease-out", alignSelf: { xs: "flex-start", sm: "center" } }}
          />
        )}
      </Stack>

      {/* Alerts */}
      <Box aria-live="polite" aria-atomic="true">
        {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
        {submitted && (
          <Alert
            severity="success"
            icon={<CheckCircleIcon />}
            onClose={() => setSubmitted(false)}
          >
            Inspection submitted successfully and sent for manager review.
          </Alert>
        )}
      </Box>

      <Grid container spacing={3} alignItems="flex-start">
        {/* Left: Machine Setup Panel */}
        <Grid item xs={12} md={4}>
          <Card
            className="no-lift"
            sx={{
              position: { md: "sticky" },
              top: { md: 80 },
              animation: "slideInLeft 0.35s ease-out",
            }}
          >
            <CardContent>
              <Stack spacing={2.5}>
                <Stack direction="row" spacing={1.25} alignItems="center">
                  <PrecisionManufacturingIcon color="primary" sx={{ fontSize: "1.25rem" }} />
                  <Typography variant="h6">Machine Setup</Typography>
                </Stack>

                <TextField
                  id="machine_code"
                  label="Machine Code"
                  placeholder="e.g. CAM-1001"
                  fullWidth
                  value={machineCode}
                  onChange={(e) => setMachineCode(e.target.value)}
                  disabled={loading || !!inspection}
                  inputProps={{ "aria-label": "Machine code" }}
                />

                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<QrCodeScannerIcon />}
                  onClick={startQrScanner}
                  disabled={loading || !!inspection}
                  sx={{
                    borderStyle: "dashed",
                    "&:hover": { borderStyle: "dashed" },
                    borderWidth: "1.5px",
                    "&:hover.MuiButton-outlined": { borderWidth: "1.5px" },
                  }}
                >
                  Scan QR Code
                </Button>

                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <PlayArrowIcon />}
                  onClick={startInspection}
                  disabled={loading || !machineCode.trim() || !!inspection}
                >
                  {loading ? "Starting…" : "Start Inspection"}
                </Button>

                {inspection && (
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      bgcolor: "rgba(0,70,173,0.04)",
                      border: "1px solid rgba(0,70,173,0.15)",
                      animation: "scaleIn 0.25s ease-out",
                    }}
                  >
                    <Typography variant="subtitle2" color="primary" sx={{ mb: 0.5 }}>
                      Active Inspection
                    </Typography>
                    <Typography variant="body2" fontWeight={600} color="text.primary">
                      {inspection.inspection_no}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: "wrap", gap: 0.5 }}>
                      <Chip
                        size="small"
                        icon={<CheckCircleIcon />}
                        label={`${okCount} OK`}
                        color="success"
                        variant="outlined"
                      />
                      {notOkCount > 0 && (
                        <Chip
                          size="small"
                          icon={<CancelIcon />}
                          label={`${notOkCount} NOT OK`}
                          color="error"
                          variant="outlined"
                        />
                      )}
                    </Stack>
                  </Box>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Right: Checklist Panel */}
        <Grid item xs={12} md={8}>
          <Card className="no-lift" sx={{ animation: "slideUp 0.4s ease-out" }}>
            <CardContent>
              <Stack spacing={3}>
                {/* Checklist header */}
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Stack direction="row" spacing={1.25} alignItems="center">
                    <AssignmentIcon color="primary" sx={{ fontSize: "1.2rem" }} />
                    <Typography variant="h6">Quality Checklist</Typography>
                    {checklist.length > 0 && (
                      <Chip
                        label={`${checklist.length} items`}
                        size="small"
                        variant="outlined"
                        color="primary"
                      />
                    )}
                  </Stack>
                  {inspection && !submitted && (
                    <Typography variant="caption" color="text.secondary">
                      {answeredCount} of {checklist.length} checked
                    </Typography>
                  )}
                </Stack>

                {/* Progress bar */}
                {inspection && !submitted && checklist.length > 0 && (
                  <Box>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={500}>
                        Progress
                      </Typography>
                      <Typography variant="caption" color={progressPct === 100 ? "success.main" : "text.secondary"} fontWeight={600}>
                        {progressPct}%
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={progressPct}
                      color={progressPct === 100 ? "success" : "primary"}
                      aria-label={`Checklist completion: ${progressPct}%`}
                    />
                  </Box>
                )}

                {/* Empty state */}
                {checklist.length === 0 && (
                  <Stack alignItems="center" spacing={1.5} sx={{ py: 6 }}>
                    <AssignmentIcon sx={{ fontSize: 48, color: "text.disabled" }} />
                    <Typography variant="body2" color="text.secondary" textAlign="center">
                      No checklist items loaded for this machine family.
                    </Typography>
                  </Stack>
                )}

                {/* Checklist items */}
                {checklist.map((item, index) => {
                  const answer = answers[item.id];
                  const isOk = answer === "OK";
                  const isNotOk = answer === "NOT_OK";
                  return (
                    <Box
                      key={item.id}
                      role="group"
                      aria-label={`Check ${item.sequence_no}: ${item.prompt}`}
                      sx={{
                        p: 2,
                        borderRadius: 2.5,
                        border: "1px solid",
                        borderColor: isOk
                          ? "success.main"
                          : isNotOk
                            ? "error.main"
                            : "rgba(0,0,0,0.09)",
                        bgcolor: isOk
                          ? "rgba(46,125,50,0.04)"
                          : isNotOk
                            ? "rgba(211,47,47,0.04)"
                            : "transparent",
                        transition: "border-color 0.2s ease, background-color 0.2s ease",
                        animation: `fadeIn 0.35s ease-out ${index * 0.04}s both`,
                        "&:hover": {
                          borderColor: isOk
                            ? "success.dark"
                            : isNotOk
                              ? "error.dark"
                              : "rgba(0,70,173,0.3)",
                        },
                      }}
                    >
                      <Stack spacing={1.5}>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                          <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ flex: 1, minWidth: 0 }}>
                            <Avatar
                              aria-hidden="true"
                              sx={{
                                width: 26,
                                height: 26,
                                fontSize: "0.6875rem",
                                bgcolor: isOk
                                  ? "success.main"
                                  : isNotOk
                                    ? "error.main"
                                    : "rgba(0,0,0,0.1)",
                                color: answer ? "#fff" : "text.secondary",
                                fontWeight: 700,
                                mt: 0.2,
                                flexShrink: 0,
                                transition: "background-color 0.2s ease",
                              }}
                            >
                              {item.sequence_no}
                            </Avatar>
                            <Typography
                              variant="body2"
                              sx={{ flex: 1, lineHeight: 1.55, fontWeight: 500 }}
                            >
                              {item.prompt}
                            </Typography>
                          </Stack>
                          <Tooltip
                            title={item.requires_photo ? "Photo required for this check" : "Photo optional"}
                            arrow
                          >
                            <Chip
                              variant="outlined"
                              size="small"
                              label={item.requires_photo ? "📷 Photo" : "Visual"}
                              color={item.requires_photo ? "primary" : "default"}
                              sx={{ flexShrink: 0, mt: 0.125 }}
                            />
                          </Tooltip>
                        </Stack>

                        <Stack direction="row" spacing={1.25}>
                          <Button
                            variant={isOk ? "contained" : "outlined"}
                            color="success"
                            size="small"
                            startIcon={<CheckCircleIcon />}
                            aria-label={`Mark item ${item.sequence_no} as OK`}
                            aria-pressed={isOk}
                            onClick={() => setAnswers((s) => ({ ...s, [item.id]: "OK" }))}
                            disabled={!inspection || submitted}
                            sx={{
                              flex: 1,
                              fontWeight: 600,
                              transition: "all 0.18s ease",
                            }}
                          >
                            OK
                          </Button>
                          <Button
                            variant={isNotOk ? "contained" : "outlined"}
                            color="error"
                            size="small"
                            startIcon={<CancelIcon />}
                            aria-label={`Mark item ${item.sequence_no} as NOT OK`}
                            aria-pressed={isNotOk}
                            onClick={() => setAnswers((s) => ({ ...s, [item.id]: "NOT_OK" }))}
                            disabled={!inspection || submitted}
                            sx={{
                              flex: 1,
                              fontWeight: 600,
                              transition: "all 0.18s ease",
                            }}
                          >
                            NOT OK
                          </Button>
                        </Stack>
                      </Stack>
                    </Box>
                  );
                })}

                {/* Submit */}
                <Button
                  disabled={!inspection || submitted || loading}
                  variant="contained"
                  color="primary"
                  size="large"
                  fullWidth
                  startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <SendIcon />}
                  onClick={submitInspection}
                  sx={{ mt: 0.5 }}
                >
                  {loading ? "Submitting…" : "Submit Inspection"}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* QR Scanner Dialog */}
      <Dialog
        open={qrOpen}
        onClose={stopQrScanner}
        maxWidth="xs"
        fullWidth
        aria-labelledby="qr-dialog-title"
      >
        <DialogTitle id="qr-dialog-title">Scan Machine QR Code</DialogTitle>
        <DialogContent>
          <Box
            id={QR_SCANNER_ID}
            sx={{ borderRadius: 2, overflow: "hidden", bgcolor: "black", minHeight: 260 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={stopQrScanner} variant="outlined" color="inherit" fullWidth>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
