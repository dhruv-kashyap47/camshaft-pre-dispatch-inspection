import { useState, useEffect, useCallback, useRef } from "react";
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
  Tooltip,
  CircularProgress,
  Skeleton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import api from "../api/client";

const SWIPE_THRESHOLD = 50;

export default function PhotoViewerDialog({
  open,
  onClose,
  photos = [],
  initialIndex = 0,
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loadedPhotos, setLoadedPhotos] = useState({});
  const [loading, setLoading] = useState({});

  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setZoom(1);
  }, [initialIndex, open]);

  useEffect(() => {
    const ids = photos.map((p) => p.id);
    ids.forEach((id) => {
      if (!loadedPhotos[id] && !loading[id]) {
        loadPhoto(id);
      }
    });
  }, [photos]);

  async function loadPhoto(photoId) {
    setLoading((prev) => ({ ...prev, [photoId]: true }));
    try {
      const response = await api.get(`/photo/${photoId}`, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(response.data);
      setLoadedPhotos((prev) => ({ ...prev, [photoId]: url }));
    } catch {
      setLoadedPhotos((prev) => ({ ...prev, [photoId]: null }));
    } finally {
      setLoading((prev) => ({ ...prev, [photoId]: false }));
    }
  }

  const currentPhoto = photos[currentIndex];
  const currentSrc = currentPhoto ? loadedPhotos[currentPhoto.id] : null;
  const isLoading = currentPhoto ? loading[currentPhoto.id] : false;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < photos.length - 1;
  const totalPhotos = photos.length;

  const goPrev = useCallback(() => {
    if (hasPrev) {
      setCurrentIndex((i) => i - 1);
      setZoom(1);
    }
  }, [hasPrev]);

  const goNext = useCallback(() => {
    if (hasNext) {
      setCurrentIndex((i) => i + 1);
      setZoom(1);
    }
  }, [hasNext]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "ArrowLeft") { e.preventDefault(); goPrev(); }
      if (e.key === "ArrowRight") { e.preventDefault(); goNext(); }
      if (e.key === "Escape") {
        if (isFullscreen) {
          document.exitFullscreen();
        } else {
          onClose();
        }
      }
      if (e.key === "=" || e.key === "+") setZoom((z) => Math.min(z * 1.5, 5));
      if (e.key === "-") setZoom((z) => Math.max(z / 1.5, 0.5));
      if (e.key === "0") setZoom(1);
    };
    if (open) {
      window.addEventListener("keydown", handleKey);
      return () => window.removeEventListener("keydown", handleKey);
    }
  }, [open, goPrev, goNext, onClose, isFullscreen]);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    touchEndX.current = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > SWIPE_THRESHOLD) {
      if (diff > 0) goNext();
      else goPrev();
    }
  };

  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } catch {}
    } else {
      try {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } catch {}
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      sx={{
        "& .MuiDialog-paper": {
          bgcolor: "rgba(0,0,0,0.92)",
          color: "#fff",
          userSelect: "none",
        },
      }}
      aria-label="Photo viewer"
    >
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="subtitle2" sx={{ color: "rgba(255,255,255,0.7)" }}>
          {totalPhotos > 0
            ? `Photo ${currentIndex + 1} of ${totalPhotos}`
            : "Photo Viewer"}
        </Typography>
        <Stack direction="row" spacing={0.5}>
          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.4)", mr: 1, alignSelf: "center" }}>
            {zoom > 1 ? `${Math.round(zoom * 100)}%` : ""}
          </Typography>
          <Tooltip title="Zoom out">
            <span>
              <IconButton
                size="small"
                onClick={() => setZoom((z) => Math.max(z / 1.5, 0.5))}
                disabled={zoom <= 0.5}
                sx={{ color: "rgba(255,255,255,0.7)" }}
                aria-label="Zoom out"
              >
                <ZoomOutIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Zoom in">
            <span>
              <IconButton
                size="small"
                onClick={() => setZoom((z) => Math.min(z * 1.5, 5))}
                disabled={zoom >= 5}
                sx={{ color: "rgba(255,255,255,0.7)" }}
                aria-label="Zoom in"
              >
                <ZoomInIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={isFullscreen ? "Exit fullscreen (F)" : "Fullscreen (F)"}>
            <IconButton
              size="small"
              onClick={toggleFullscreen}
              sx={{ color: "rgba(255,255,255,0.7)" }}
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Close (Esc)">
            <IconButton size="small" onClick={onClose} sx={{ color: "rgba(255,255,255,0.7)" }} aria-label="Close viewer">
              <CloseIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </DialogTitle>
      <DialogContent
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 400,
          position: "relative",
          overflow: "hidden",
          cursor: zoom > 1 ? "grab" : "default",
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {isLoading && (
          <Box sx={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Stack alignItems="center" spacing={1.5}>
              <CircularProgress sx={{ color: "#fff" }} />
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)" }}>
                Loading photo...
              </Typography>
            </Stack>
          </Box>
        )}

        {!isLoading && currentSrc && (
          <Box
            component="img"
            src={currentSrc}
            alt={currentPhoto?.file_name || "Inspection photo"}
            draggable={false}
            sx={{
              maxWidth: "100%",
              maxHeight: "70vh",
              objectFit: "contain",
              transform: `scale(${zoom})`,
              transition: "transform 0.2s ease",
              opacity: isLoading ? 0 : 1,
            }}
          />
        )}

        {!isLoading && !currentSrc && currentPhoto && (
          <Stack alignItems="center" spacing={1}>
            <Typography sx={{ color: "rgba(255,255,255,0.5)" }}>
              Failed to load photo
            </Typography>
          </Stack>
        )}

        {hasPrev && (
          <IconButton
            onClick={goPrev}
            sx={{
              position: "absolute",
              left: 8,
              top: "50%",
              transform: "translateY(-50%)",
              color: "#fff",
              bgcolor: "rgba(0,0,0,0.4)",
              "&:hover": { bgcolor: "rgba(0,0,0,0.6)" },
              "&:focus-visible": { outline: "2px solid #fff", outlineOffset: 2 },
            }}
            aria-label="Previous photo"
          >
            <ChevronLeftIcon fontSize="large" />
          </IconButton>
        )}

        {hasNext && (
          <IconButton
            onClick={goNext}
            sx={{
              position: "absolute",
              right: 8,
              top: "50%",
              transform: "translateY(-50%)",
              color: "#fff",
              bgcolor: "rgba(0,0,0,0.4)",
              "&:hover": { bgcolor: "rgba(0,0,0,0.6)" },
              "&:focus-visible": { outline: "2px solid #fff", outlineOffset: 2 },
            }}
            aria-label="Next photo"
          >
            <ChevronRightIcon fontSize="large" />
          </IconButton>
        )}
      </DialogContent>

      {currentPhoto && (
        <Box
          sx={{
            px: 3,
            pb: 2,
            display: "flex",
            justifyContent: "center",
            gap: 3,
            flexWrap: "wrap",
          }}
        >
          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)" }}>
            {currentPhoto.file_name}
          </Typography>
          {currentPhoto.created_at && (
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)" }}>
              {new Date(currentPhoto.created_at).toLocaleString()}
            </Typography>
          )}
        </Box>
      )}
    </Dialog>
  );
}
