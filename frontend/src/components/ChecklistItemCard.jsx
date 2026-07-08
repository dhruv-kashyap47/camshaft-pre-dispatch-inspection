import { useState, memo } from "react";
import {
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
  Collapse,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import PhotoCapture from "./PhotoCapture";

const statusConfig = {
  pending: { label: "Pending", color: "default" },
  ok: { label: "Completed", color: "success", icon: <CheckCircleIcon sx={{ fontSize: 14 }} /> },
  notOk: { label: "NOT OK", color: "error", icon: <CancelIcon sx={{ fontSize: 14 }} /> },
  photoRequired: { label: "Photo Required", color: "primary", icon: <PhotoCameraIcon sx={{ fontSize: 14 }} /> },
};

function ChecklistItemCard({ item, index, total, answer, remark, photo, inspectionId, onAnswer, onRemark, onPhotoChange, submitting }) {
  const [remarksOpen, setRemarksOpen] = useState(!!remark);

  const isOk = answer === "OK";
  const isNotOk = answer === "NOT_OK";
  const hasPhoto = photo?.status === "uploaded";
  const status = isNotOk ? "notOk" : isOk ? "ok" : "pending";

  const statusChip = statusConfig[status];

  return (
    <Card
      role="group"
      aria-label={`Checklist item ${item.sequence_no}: ${item.prompt}`}
      sx={{
        borderRadius: 3,
        border: "1.5px solid",
        borderColor: isOk
          ? "success.main"
          : isNotOk
            ? "error.main"
            : "rgba(0,0,0,0.08)",
        transition: "border-color 0.25s ease, box-shadow 0.25s ease",
        boxShadow: isOk
          ? "0 2px 12px rgba(46,125,50,0.12)"
          : isNotOk
            ? "0 2px 12px rgba(211,47,47,0.12)"
            : "0 1px 4px rgba(0,0,0,0.06)",
        overflow: "visible",
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 3 }, "&:last-child": { pb: { xs: 2, sm: 3 } } }}>
        <Stack spacing={2.5}>
          {/* Header: Item number + Status badge */}
          <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Avatar
                aria-hidden="true"
                sx={{
                  width: 32,
                  height: 32,
                  fontSize: "0.8125rem",
                  fontWeight: 700,
                  bgcolor: isOk
                    ? "success.main"
                    : isNotOk
                      ? "error.main"
                      : "grey.300",
                  color: answer ? "#fff" : "text.secondary",
                  transition: "background-color 0.25s ease",
                }}
              >
                {item.sequence_no}
              </Avatar>
              <Box>
                <Typography variant="subtitle2" sx={{ fontSize: "0.8125rem", lineHeight: 1.3 }}>
                  Item {item.sequence_no} of {total}
                </Typography>
                <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1.3, mt: 0.15 }}>
                  {item.item_code || `Inspection Check #${item.sequence_no}`}
                </Typography>
              </Box>
            </Stack>
            <Chip
              size="small"
              label={statusChip.label}
              color={statusChip.color}
              icon={statusChip.icon}
              variant={isOk || isNotOk ? "filled" : "outlined"}
              sx={{
                fontWeight: 600,
                fontSize: "0.6875rem",
                height: 24,
                flexShrink: 0,
                ...(isOk && { bgcolor: "success.main", color: "#fff" }),
                ...(isNotOk && { bgcolor: "error.main", color: "#fff" }),
              }}
            />
          </Stack>

          {/* Description */}
          <Typography
            variant="body1"
            sx={{
              color: "text.primary",
              lineHeight: 1.6,
              fontWeight: 450,
              fontSize: "0.9375rem",
              px: 0.5,
            }}
          >
            {item.prompt}
          </Typography>

          {/* Photo requirement indicator */}
          {item.requires_photo && !hasPhoto && (
            <Chip
              size="small"
              icon={<PhotoCameraIcon sx={{ fontSize: 14 }} />}
              label="Photo required for this check"
              color="primary"
              variant="outlined"
              sx={{ alignSelf: "flex-start", fontWeight: 500, fontSize: "0.7rem" }}
            />
          )}

          {/* Divider */}
          <Box sx={{ borderTop: "1px solid", borderColor: "divider", my: 0.25 }} />

          {/* OK / NOT OK selection */}
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: "0.8125rem", color: "text.secondary" }}>
            Result
          </Typography>
          <Box role="radiogroup" aria-label={`Result for item ${item.sequence_no}`}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <Box
              role="radio"
              aria-checked={isOk}
              aria-label={`Mark item ${item.sequence_no} as OK`}
              tabIndex={0}
              onClick={() => !submitting && onAnswer(item.id, "OK")}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onAnswer(item.id, "OK"); } }}
              sx={{
                flex: 1,
                p: 1.75,
                borderRadius: 2.5,
                border: "2px solid",
                borderColor: isOk ? "success.main" : "rgba(0,0,0,0.1)",
                bgcolor: isOk ? "rgba(46,125,50,0.08)" : "transparent",
                cursor: submitting ? "default" : "pointer",
                transition: "all 0.2s ease",
                userSelect: "none",
                minHeight: 64,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                "&:hover": submitting ? {} : {
                  borderColor: isOk ? "success.dark" : "success.main",
                  bgcolor: isOk ? "rgba(46,125,50,0.12)" : "rgba(46,125,50,0.04)",
                },
                "&:focus-visible": {
                  outline: "2px solid #2E7D32",
                  outlineOffset: 2,
                },
              }}
            >
              <Stack direction="row" spacing={1.5} alignItems="center">
                <CheckCircleIcon
                  sx={{
                    fontSize: "1.75rem",
                    color: isOk ? "success.main" : "rgba(0,0,0,0.2)",
                    transition: "color 0.2s ease",
                  }}
                />
                <Box>
                  <Typography
                    variant="body1"
                    fontWeight={700}
                    sx={{ color: isOk ? "success.main" : "text.secondary", lineHeight: 1.2 }}
                  >
                    OK
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: isOk ? "success.main" : "text.disabled", fontSize: "0.6875rem", display: { xs: "none", sm: "block" } }}
                  >
                    Within specification
                  </Typography>
                </Box>
              </Stack>
            </Box>

            <Box
              role="radio"
              aria-checked={isNotOk}
              aria-label={`Mark item ${item.sequence_no} as NOT OK`}
              tabIndex={0}
              onClick={() => !submitting && onAnswer(item.id, "NOT_OK")}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onAnswer(item.id, "NOT_OK"); } }}
              sx={{
                flex: 1,
                p: 1.75,
                borderRadius: 2.5,
                border: "2px solid",
                borderColor: isNotOk ? "error.main" : "rgba(0,0,0,0.1)",
                bgcolor: isNotOk ? "rgba(211,47,47,0.08)" : "transparent",
                cursor: submitting ? "default" : "pointer",
                transition: "all 0.2s ease",
                userSelect: "none",
                minHeight: 64,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                "&:hover": submitting ? {} : {
                  borderColor: isNotOk ? "error.dark" : "error.main",
                  bgcolor: isNotOk ? "rgba(211,47,47,0.12)" : "rgba(211,47,47,0.04)",
                },
                "&:focus-visible": {
                  outline: "2px solid #D32F2F",
                  outlineOffset: 2,
                },
              }}
            >
              <Stack direction="row" spacing={1.5} alignItems="center">
                <CancelIcon
                  sx={{
                    fontSize: "1.75rem",
                    color: isNotOk ? "error.main" : "rgba(0,0,0,0.2)",
                    transition: "color 0.2s ease",
                  }}
                />
                <Box>
                  <Typography
                    variant="body1"
                    fontWeight={700}
                    sx={{ color: isNotOk ? "error.main" : "text.secondary", lineHeight: 1.2 }}
                  >
                    NOT OK
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: isNotOk ? "error.main" : "text.disabled", fontSize: "0.6875rem", display: { xs: "none", sm: "block" } }}
                  >
                    Out of specification
                  </Typography>
                </Box>
              </Stack>
            </Box>
          </Stack>
          </Box>

          {/* Photo capture */}
          {inspectionId && (
            <Box sx={{ pt: 0.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: "0.8125rem", color: "text.secondary", mb: 1.25 }}>
                Photo Documentation {item.requires_photo && <Typography component="span" color="error.main" sx={{ fontSize: "0.8125rem" }}>*</Typography>}
              </Typography>
              <PhotoCapture
                inspectionId={inspectionId}
                checklistItemId={item.id}
                existingPhoto={photo}
                onPhotoChange={(data) => onPhotoChange?.(item.id, data)}
              />
            </Box>
          )}

          {/* Remarks (expandable) */}
          <Box sx={{ pt: 0.5 }}>
            <Stack
              direction="row"
              alignItems="center"
              spacing={0.75}
              onClick={() => setRemarksOpen((o) => !o)}
              sx={{
                cursor: "pointer",
                py: 0.75,
                px: 1,
                borderRadius: 1.5,
                bgcolor: remarksOpen ? "rgba(0,0,0,0.02)" : "transparent",
                "&:hover": { bgcolor: "rgba(0,0,0,0.03)" },
              }}
              role="button"
              tabIndex={0}
              aria-expanded={remarksOpen}
              aria-label="Toggle remarks"
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setRemarksOpen((o) => !o); } }}
            >
              <ExpandMoreIcon
                sx={{
                  fontSize: "1.1rem",
                  color: "text.secondary",
                  transform: remarksOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s ease",
                }}
              />
              <Typography variant="body2" fontWeight={500} color="text.secondary">
                Remarks {remark ? `(${remark.length}/500)` : "(optional)"}
              </Typography>
            </Stack>
            <Collapse in={remarksOpen}>
              <TextField
                multiline
                fullWidth
                minRows={2}
                maxRows={5}
                placeholder={isNotOk ? "Describe the issue found..." : "Add any notes or observations..."}
                value={remark || ""}
                onChange={(e) => onRemark(item.id, e.target.value)}
                disabled={submitting}
                inputProps={{
                  maxLength: 500,
                  "aria-label": `Remarks for item ${item.sequence_no}`,
                }}
                helperText={`${(remark || "").length}/500`}
                FormHelperTextProps={{
                  sx: {
                    textAlign: "right",
                    mt: 0.5,
                    fontSize: "0.6875rem",
                    color: (remark || "").length >= 500 ? "error.main" : "text.disabled",
                  },
                }}
                sx={{
                  mt: 0.5,
                  "& .MuiOutlinedInput-root": {
                    bgcolor: "background.paper",
                  },
                }}
              />
            </Collapse>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default memo(ChecklistItemCard);
