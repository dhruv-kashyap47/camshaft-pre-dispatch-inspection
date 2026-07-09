import { memo } from "react";
import { Chip } from "@mui/material";

const STATUS_MAP = {
  APPROVED: { color: "success", label: "Approved" },
  REJECTED: { color: "error", label: "Rejected" },
  SUBMITTED: { color: "warning", label: "Pending Review" },
  IN_PROGRESS: { color: "info", label: "In Progress" },
};

function StatusChip({ status, size = "small", variant, sx }) {
  const cfg = STATUS_MAP[status] || { color: "default", label: status };
  return (
    <Chip
      size={size}
      color={cfg.color}
      label={cfg.label}
      variant={variant ?? (status && STATUS_MAP[status] ? "filled" : "outlined")}
      sx={{ fontWeight: 600, ...sx }}
    />
  );
}

export default memo(StatusChip);
