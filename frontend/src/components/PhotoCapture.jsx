import { useState, useRef, useCallback } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ReplayIcon from "@mui/icons-material/Replay";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import api from "../api/client";

export default function PhotoCapture({ inspectionId, checklistItemId, existingPhoto, onPhotoChange }) {
  const [photo, setPhoto] = useState(existingPhoto || null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const triggerCapture = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    inputRef.current?.click();
  }, []);

  const handleFile = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    const preview = URL.createObjectURL(file);
    setPhoto({ file, preview, status: "uploading" });
    setUploading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await api.post(
        `/upload/photo/${inspectionId}?checklist_item_id=${checklistItemId}`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (pe) => {
            if (pe.total) {
              setProgress(Math.round((pe.loaded * 100) / pe.total));
            }
          },
          timeout: 60000,
        }
      );

      const data = response.data;
      setPhoto((prev) => ({
        ...prev,
        status: "uploaded",
        photoId: data.photo_id,
        fileName: data.file_name,
      }));
      onPhotoChange?.(data);
    } catch (err) {
      setError(err.response?.data?.detail || "Photo upload failed");
      setPhoto((prev) => ({ ...prev, status: "error" }));
    } finally {
      setUploading(false);
    }
  }, [inspectionId, checklistItemId, onPhotoChange]);

  const handleRetake = useCallback(() => {
    if (photo?.preview?.startsWith("blob:")) {
      URL.revokeObjectURL(photo.preview);
    }
    setPhoto(null);
    setError(null);
    setProgress(0);
    setTimeout(triggerCapture, 80);
  }, [photo, triggerCapture]);

  if (photo?.status === "uploaded") {
    return (
      <Box sx={{ animation: "scaleIn 0.25s ease-out" }}>
        <Stack spacing={1.5} alignItems="center">
          <Box
            sx={{
              position: "relative",
              width: "100%",
              maxWidth: 300,
              borderRadius: 2,
              overflow: "hidden",
              border: "2px solid",
              borderColor: "success.main",
              boxShadow: "0 4px 16px rgba(46,125,50,0.15)",
            }}
          >
            <Box
              component="img"
              src={photo.preview}
              alt="Captured inspection photo"
              sx={{
                width: "100%",
                height: 160,
                objectFit: "cover",
                display: "block",
              }}
            />
            <Stack
              direction="row"
              alignItems="center"
              spacing={0.5}
              sx={{
                position: "absolute",
                top: 8,
                right: 8,
                bgcolor: "rgba(46,125,50,0.92)",
                color: "#fff",
                borderRadius: 1.5,
                px: 1.25,
                py: 0.4,
                fontSize: "0.75rem",
                fontWeight: 600,
                backdropFilter: "blur(4px)",
              }}
            >
              <CheckCircleIcon sx={{ fontSize: 15 }} />
              <span>Uploaded</span>
            </Stack>
          </Box>
          <Button
            variant="outlined"
            size="small"
            startIcon={<ReplayIcon />}
            onClick={handleRetake}
            aria-label="Retake photo"
            sx={{ minHeight: 40, minWidth: 140 }}
          >
            Retake Photo
          </Button>
        </Stack>
      </Box>
    );
  }

  return (
    <Box>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={handleFile}
        aria-label="Choose or capture a photo"
      />

      {!photo ? (
        <Button
          variant="outlined"
          fullWidth
          onClick={triggerCapture}
          startIcon={<CameraAltIcon />}
          aria-label="Capture photo"
          sx={{
            minHeight: 56,
            borderStyle: "dashed",
            borderWidth: 2,
            borderColor: "primary.main",
            color: "primary.main",
            fontSize: "0.9375rem",
            fontWeight: 600,
            animation: "pulse 2s ease-in-out 3",
            "&:hover": {
              borderStyle: "dashed",
              borderWidth: 2,
              bgcolor: "rgba(0,70,173,0.04)",
            },
          }}
        >
          <CameraAltIcon sx={{ mr: 1, fontSize: "1.35rem" }} />
          Capture Photo
        </Button>
      ) : (
        <Stack spacing={1.5} alignItems="center">
          <Box
            sx={{
              position: "relative",
              width: "100%",
              maxWidth: 300,
              borderRadius: 2,
              overflow: "hidden",
              border: "1px solid",
              borderColor: photo.status === "error" ? "error.main" : "divider",
              transition: "border-color 0.2s",
            }}
          >
            <Box
              component="img"
              src={photo.preview}
              alt="Photo preview"
              sx={{
                width: "100%",
                height: 160,
                objectFit: "cover",
                display: "block",
                opacity: uploading ? 0.55 : 1,
                transition: "opacity 0.25s",
              }}
            />
            {uploading && (
              <Stack
                alignItems="center"
                justifyContent="center"
                sx={{
                  position: "absolute",
                  inset: 0,
                  bgcolor: "rgba(0,0,0,0.35)",
                  backdropFilter: "blur(2px)",
                }}
              >
                <CircularProgress
                  variant="determinate"
                  value={progress}
                  size={44}
                  thickness={3.5}
                  sx={{ color: "#fff" }}
                  aria-label={`Upload progress: ${progress}%`}
                />
                <Typography
                  variant="caption"
                  sx={{ color: "#fff", mt: 0.75, fontWeight: 700, fontSize: "0.8125rem" }}
                >
                  {progress}%
                </Typography>
              </Stack>
            )}
            {photo.status === "error" && (
              <Stack
                alignItems="center"
                justifyContent="center"
                sx={{
                  position: "absolute",
                  inset: 0,
                  bgcolor: "rgba(0,0,0,0.4)",
                }}
              >
                <ErrorOutlineIcon sx={{ color: "#fff", fontSize: 28, mb: 0.5 }} />
                <Typography
                  variant="caption"
                  sx={{ color: "#fff", fontWeight: 600, textAlign: "center", px: 2, fontSize: "0.75rem" }}
                >
                  {error || "Upload failed"}
                </Typography>
              </Stack>
            )}
          </Box>

          <Stack direction="row" spacing={1.5}>
            {photo.status === "error" ? (
              <Button
                variant="contained"
                size="small"
                startIcon={<ReplayIcon />}
                onClick={triggerCapture}
                aria-label="Retry upload"
                sx={{ minHeight: 40, minWidth: 140 }}
              >
                Retry Upload
              </Button>
            ) : (
              <Button
                variant="outlined"
                size="small"
                startIcon={<ReplayIcon />}
                onClick={handleRetake}
                disabled={uploading}
                aria-label="Retake photo"
                sx={{ minHeight: 40, minWidth: 140 }}
              >
                Retake Photo
              </Button>
            )}
          </Stack>
        </Stack>
      )}
    </Box>
  );
}
