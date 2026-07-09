import { useState, useRef } from "react";
import {
  Button,
  CircularProgress,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import DescriptionIcon from "@mui/icons-material/Description";
import TableChartIcon from "@mui/icons-material/TableChart";
import TextSnippetIcon from "@mui/icons-material/TextSnippet";
import api from "../api/client";
import { useNotification } from "./NotificationProvider";

const FORMATS = [
  { key: "pdf", label: "PDF", icon: <DescriptionIcon fontSize="small" />, ext: "pdf" },
  { key: "xlsx", label: "Excel", icon: <TableChartIcon fontSize="small" />, ext: "xlsx" },
  { key: "csv", label: "CSV", icon: <TextSnippetIcon fontSize="small" />, ext: "csv" },
];

export default function ExportButton({
  endpoint,
  filename = "export",
  params = {},
  size = "small",
  variant = "outlined",
}) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [loading, setLoading] = useState(null);
  const { success, error } = useNotification();
  const open = Boolean(anchorEl);

  const handleClick = (e) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleExport = async (format) => {
    setAnchorEl(null);
    setLoading(format.key);
    try {
      const response = await api.get(endpoint, {
        params: { ...params, format: format.key },
        responseType: "blob",
      });
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${filename}.${format.ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      success(`${filename}.${format.ext} downloaded`);
    } catch {
      error("Export failed");
    } finally {
      setLoading(null);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleClick}
        startIcon={
          loading ? <CircularProgress size={14} color="inherit" /> : <FileDownloadIcon />
        }
        disabled={!!loading}
        aria-label="Export data"
        aria-haspopup="true"
      >
        {loading ? "Exporting..." : "Export"}
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        {FORMATS.map((fmt) => (
          <MenuItem key={fmt.key} onClick={() => handleExport(fmt)} dense>
            <ListItemIcon>{fmt.icon}</ListItemIcon>
            <ListItemText primary={fmt.label} primaryTypographyProps={{ variant: "body2" }} />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
