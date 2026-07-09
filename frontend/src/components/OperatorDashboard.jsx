import { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
  Alert,
  CircularProgress,
} from "@mui/material";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import PrecisionManufacturingIcon from "@mui/icons-material/PrecisionManufacturing";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import { useQrScanner } from "../hooks/useQrScanner";

export default function OperatorDashboard({ onStart, loading, error }) {
  const [showScanner, setShowScanner] = useState(false);
  const [manualQr, setManualQr] = useState("");
  const dialogContentRef = useRef(null);

  const handleQrResult = useCallback((decodedText) => {
    setShowScanner(false);
    onStart(decodedText);
  }, [onStart]);

  const {
    scannerContainerRef,
    loading: qrLoading,
    error: qrError,
    statusMessage: qrStatusMessage,
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
    onResult: handleQrResult,
    onError: () => {},
  });

  const handleOpenScanner = useCallback(() => {
    setShowScanner(true);
    startQrScanner();
  }, [startQrScanner]);

  const handleCloseScanner = useCallback(() => {
    stopQrScanner();
    setShowScanner(false);
  }, [stopQrScanner]);

  const handleRetry = useCallback(() => {
    clearQrError();
    startQrScanner();
  }, [clearQrError, startQrScanner]);

  const handleManualStart = useCallback(() => {
    if (manualQr.trim()) {
      onStart(manualQr.trim());
    }
  }, [manualQr, onStart]);

  useEffect(() => {
    if (!showScanner) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        handleCloseScanner();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showScanner, handleCloseScanner]);

  const showContainer =
    qrLoading || (!qrError && showScanner);

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2.5,
        py: 4,
      }}
    >
      <Stack spacing={1} alignItems="center" sx={{ mb: 1 }}>
        <PrecisionManufacturingIcon sx={{ fontSize: 48, color: "primary.main", opacity: 0.8 }} />
        <Typography variant="h4" component="h1" sx={{ fontWeight: 800 }}>
          Operator Workstation
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 360, textAlign: "center" }}>
          Scan the camshaft QR code to start or resume an inspection
        </Typography>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ maxWidth: 460, width: "100%" }}>{error}</Alert>
      )}

      <Card
        sx={{
          width: "100%",
          maxWidth: 460,
          borderRadius: 3,
          border: "1.5px solid rgba(0,70,173,0.12)",
        }}
      >
        <CardContent sx={{ p: { xs: 3, sm: 4 }, "&:last-child": { pb: { xs: 3, sm: 4 } } }}>
          <Stack spacing={3}>
            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={handleOpenScanner}
              disabled={loading}
              startIcon={<QrCodeScannerIcon sx={{ fontSize: 28 }} />}
              sx={{
                minHeight: 64,
                fontSize: "1.1rem",
                fontWeight: 700,
                borderRadius: 2,
                border: "2px dashed rgba(255,255,255,0.3)",
                "&:hover": { borderStyle: "dashed" },
              }}
              aria-label="Open QR code scanner"
            >
              Scan QR Code
            </Button>

            <Stack direction="row" alignItems="center" spacing={1}>
              <Box sx={{ flex: 1, height: 1, bgcolor: "divider" }} />
              <Typography variant="caption" color="text.disabled" sx={{ fontWeight: 600, px: 1 }}>
                OR
              </Typography>
              <Box sx={{ flex: 1, height: 1, bgcolor: "divider" }} />
            </Stack>

            <TextField
              label="Paste QR Code"
              placeholder="e.g. P3979506;SB26006009;VTCJSR"
              fullWidth
              value={manualQr}
              onChange={(e) => setManualQr(e.target.value)}
              disabled={loading}
              multiline
              maxRows={3}
              sx={{ "& .MuiOutlinedInput-root": { fontSize: "1rem", fontFamily: "monospace" } }}
            />

            <Button
              variant="outlined"
              size="large"
              fullWidth
              onClick={handleManualStart}
              disabled={loading || !manualQr.trim()}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <PlayArrowIcon />}
              sx={{ minHeight: 56, fontSize: "1rem", fontWeight: 700 }}
            >
              {loading ? "Starting\u2026" : "Start Inspection"}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Dialog
        open={showScanner}
        onClose={handleCloseScanner}
        maxWidth="xs"
        fullWidth
        aria-labelledby="qr-dialog-title"
        aria-describedby="qr-dialog-description"
        disableRestoreFocus
        keepMounted={false}
      >
        <DialogTitle id="qr-dialog-title">Scan Camshaft QR Code</DialogTitle>
        <DialogContent ref={dialogContentRef} id="qr-dialog-description" tabIndex={-1}>
          {qrError && (
            <Alert severity="warning" sx={{ mb: 2 }} role="alert">
              {qrError}
            </Alert>
          )}
          {qrLoading && (
            <Stack alignItems="center" spacing={1.5} sx={{ py: 4 }} role="status" aria-live="polite">
              <CircularProgress size={40} aria-hidden="true" />
              <Typography variant="body2" color="text.secondary">
                {qrStatusMessage || "Starting camera\u2026"}
              </Typography>
            </Stack>
          )}
          {!qrLoading && !qrError && (
            <Stack alignItems="center" spacing={1.5} sx={{ py: 1 }} role="status" aria-live="polite">
              <Typography variant="body2" color="text.secondary">
                {qrStatusMessage || "Ready to scan"}
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
              display: showContainer ? "block" : "none",
            }}
            role="region"
            aria-label="Camera preview"
          />
          {qrCameras.length > 1 && (
            <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: "wrap" }} role="group" aria-label="Camera selection">
              {qrCameras.map((cam) => (
                <Button
                  key={cam.id}
                  size="small"
                  variant={cam.id === qrSelectedCameraId ? "contained" : "outlined"}
                  color={cam.id === qrSelectedCameraId ? "primary" : "inherit"}
                  onClick={() => qrSwitchCamera(cam.id)}
                  disabled={qrLoading}
                  sx={{ textTransform: "none", fontSize: "0.75rem" }}
                  aria-pressed={cam.id === qrSelectedCameraId}
                  aria-label={`Switch to ${cam.label || `camera ${cam.id.slice(0, 8)}`}`}
                >
                  {cam.label || `Camera ${cam.id.slice(0, 8)}\u2026`}
                </Button>
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: "space-between", px: 2, pb: 1.5 }}>
          <Stack direction="row" spacing={1}>
            {qrError && (
              <Button
                onClick={handleRetry}
                variant="contained"
                size="small"
                aria-label="Retry camera initialization"
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
                aria-label={qrFlashOn ? "Turn flash off" : "Turn flash on"}
                aria-pressed={qrFlashOn}
              >
                {qrFlashOn ? "Flash On" : "Flash"}
              </Button>
            )}
          </Stack>
          <Button onClick={handleCloseScanner} variant="outlined" color="inherit" size="small" aria-label="Close scanner">
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
