import { useState, useRef, useCallback, useEffect } from "react";
import { Html5Qrcode } from "html5-qrcode";

const SCAN_COOLDOWN_MS = 1500;
const DEFAULT_FPS = 10;
const DEFAULT_QRBOX = { width: 240, height: 240 };

const ERROR_MESSAGES = {
  NotAllowedError:
    "Camera access denied. Please allow camera permission in your browser settings and try again.",
  NotFoundError:
    "No camera found on this device. Please connect a camera and try again.",
  NotReadableError:
    "Camera is busy or unavailable. Close other apps that may be using the camera and try again.",
  AbortError: "Camera access was aborted. Please try again.",
  SecurityError:
    "This browser only allows camera access over HTTPS (or localhost during development).",
  OverconstrainedError:
    "Rear camera not available on this device.",
  InvalidStateError:
    "Camera is already in use. Please restart the scanner.",
};

function getFriendlyError(error) {
  if (!error) return "Unknown camera error. Please try again.";
  return (
    ERROR_MESSAGES[error.name] ||
    `Camera error (${error.name}): ${error.message || "Please try again."}`
  );
}

function isSecureContext() {
  return (
    window.isSecureContext ||
    location.protocol === "https:" ||
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1" ||
    location.hostname === "[::1]"
  );
}

function logError(error, extra = {}) {
  console.error("[QR Scanner]", {
    name: error?.name,
    message: error?.message,
    code: error?.code,
    stack: error?.stack,
    secureContext: window.isSecureContext,
    protocol: location.protocol,
    hostname: location.hostname,
    userAgent: navigator.userAgent,
    ...extra,
  });
}

export function useQrScanner({ onResult, onError } = {}) {
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState(null);
  const [flashAvailable, setFlashAvailable] = useState(false);
  const [flashOn, setFlashOn] = useState(false);

  const scannerContainerRef = useRef(null);
  const scannerRef = useRef(null);
  const mountedRef = useRef(true);
  const scanningRef = useRef(false);
  const initializingRef = useRef(false);
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);
  const selectedCameraIdRef = useRef(selectedCameraId);
  const lastScanText = useRef("");
  const lastScanTime = useRef(0);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    selectedCameraIdRef.current = selectedCameraId;
  }, [selectedCameraId]);

  useEffect(() => {
    scanningRef.current = scanning;
  }, [scanning]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      destroyScanner();
    };
  }, []);

  useEffect(() => {
    if (!scanning) return;
    let cancelled = false;

    (async () => {
      if (initializingRef.current) return;
      initializingRef.current = true;
      setLoading(true);
      setError(null);

      try {
        if (!isSecureContext()) {
          const err = new Error("Camera requires secure context");
          err.name = "SecurityError";
          throw err;
        }

        if (!navigator.mediaDevices?.getUserMedia) {
          const err = new Error("getUserMedia not available");
          err.name = "SecurityError";
          throw err;
        }

        const container = scannerContainerRef.current || document.getElementById("qr-reader");
        if (!container) {
          throw new Error("Scanner container element not found in the DOM");
        }

        await destroyScanner();
        if (cancelled) return;

        const scanner = new Html5Qrcode(container);
        scannerRef.current = scanner;

        Html5Qrcode.getCameras()
          .then((devices) => {
            if (mountedRef.current) setCameras(devices || []);
          })
          .catch(() => {});

        const config = { fps: DEFAULT_FPS, qrbox: DEFAULT_QRBOX };
        let started = false;
        let lastErr = null;

        const cameraId = selectedCameraIdRef.current;

        if (cameraId) {
          if (cancelled) { await destroyScanner(); return; }
          try {
            await scanner.start(
              { deviceId: { exact: cameraId } },
              config,
              onScanSuccess,
              onScanFailure
            );
            if (cancelled) { await destroyScanner(); return; }
            started = true;
          } catch (err) {
            lastErr = err;
          }
        }

        if (!started) {
          const strategies = [
            { facingMode: "environment" },
            { facingMode: "user" },
          ];

          for (const strat of strategies) {
            if (cancelled) { await destroyScanner(); return; }
            try {
              await scanner.start(
                strat,
                config,
                onScanSuccess,
                onScanFailure
              );
              if (cancelled) { await destroyScanner(); return; }
              started = true;
              break;
            } catch (err) {
              lastErr = err;
              if (err.name === "NotAllowedError") break;
            }
          }
        }

        if (!started && lastErr?.name === "OverconstrainedError") {
          try {
            const devices = await Html5Qrcode.getCameras();
            for (const device of devices) {
              if (!device.id) continue;
              if (cancelled) { await destroyScanner(); return; }
              try {
                try { await scanner.stop(); } catch {}
                await scanner.start(
                  { deviceId: { exact: device.id } },
                  config,
                  onScanSuccess,
                  onScanFailure
                );
                if (cancelled) { await destroyScanner(); return; }
                if (mountedRef.current) setSelectedCameraId(device.id);
                started = true;
                break;
              } catch (err) {
                lastErr = err;
              }
            }
          } catch {}
        }

        if (!started) {
          throw lastErr || new Error("No camera available");
        }

        if (!cancelled && mountedRef.current) {
          setLoading(false);
          detectFlashSupport();
        }
      } catch (err) {
        if (!cancelled && mountedRef.current) {
          setLoading(false);
          handleError(err, {
            selectedCameraId: selectedCameraIdRef.current,
          });
          setScanning(false);
        }
      } finally {
        initializingRef.current = false;
      }
    })();

    return () => {
      cancelled = true;
      initializingRef.current = false;
      destroyScanner();
    };
  }, [scanning]);

  function detectFlashSupport() {
    const track = getVideoTrack();
    if (!track) return;
    try {
      const capabilities = track.getCapabilities();
      if (capabilities?.torch) {
        if (mountedRef.current) {
          setFlashAvailable(true);
          setFlashOn(false);
        }
      }
    } catch {}
  }

  function getVideoTrack() {
    const container = scannerContainerRef.current || document.getElementById("qr-reader");
    if (!container) return null;
    const video = container.querySelector("video");
    if (!video || !video.srcObject) return null;
    const tracks = video.srcObject.getVideoTracks();
    return tracks.length > 0 ? tracks[0] : null;
  }

  async function destroyScanner() {
    const scanner = scannerRef.current;
    if (!scanner) return;
    scannerRef.current = null;
    try {
      await scanner.stop();
    } catch {}
    try {
      await scanner.clear();
    } catch {}
  }

  function handleError(err, extra = {}) {
    logError(err, extra);
    const friendly = getFriendlyError(err);
    setError(friendly);
    onErrorRef.current?.(friendly, err);
  }

  const onScanSuccess = useCallback(async (decodedText) => {
    if (!mountedRef.current || !scanningRef.current) return;

    const text = (decodedText || "").trim();
    if (!text) return;

    const now = Date.now();
    if (
      text === lastScanText.current &&
      now - lastScanTime.current < SCAN_COOLDOWN_MS
    ) {
      return;
    }

    lastScanText.current = text;
    lastScanTime.current = now;

    await destroyScanner();

    if (mountedRef.current) {
      setScanning(false);
      onResultRef.current?.(text);
    }
  }, []);

  const onScanFailure = useCallback(() => {}, []);

  const startScanner = useCallback(() => {
    if (scanningRef.current) return;
    lastScanText.current = "";
    lastScanTime.current = 0;
    setError(null);
    setScanning(true);
  }, []);

  const stopScanner = useCallback(async () => {
    await destroyScanner();
    if (mountedRef.current) {
      setScanning(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const switchCamera = useCallback(
    async (cameraId) => {
      setSelectedCameraId(cameraId);
      if (scanningRef.current) {
        await destroyScanner();
        if (mountedRef.current) {
          setScanning(false);
          await new Promise((r) => setTimeout(r, 50));
          startScanner();
        }
      }
    },
    [startScanner]
  );

  const toggleFlash = useCallback(async () => {
    const track = getVideoTrack();
    if (!track) return;

    try {
      const newState = !flashOn;
      await track.applyConstraints({ advanced: [{ torch: newState }] });
      if (mountedRef.current) {
        setFlashOn(newState);
      }
    } catch (err) {
      console.warn("[QR Scanner] Flash toggle failed:", err);
    }
  }, [flashOn]);

  return {
    scannerContainerRef,
    scanning,
    loading,
    error,
    clearError,
    startScanner,
    stopScanner,
    cameras,
    selectedCameraId,
    switchCamera,
    flashAvailable,
    flashOn,
    toggleFlash,
  };
}
