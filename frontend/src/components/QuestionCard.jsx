import { memo } from "react";
import {
  Box,
  Card,
  CardContent,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import PhotoCapture from "./PhotoCapture";

const okSx = {
  flex: 1,
  p: 2,
  borderRadius: 2.5,
  border: "2px solid",
  cursor: "pointer",
  transition: "all 0.2s ease",
  userSelect: "none",
  minHeight: 64,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  "&:focus-visible": { outline: "2px solid #2E7D32", outlineOffset: 2 },
};

function QuestionCard({
  item,
  index,
  total,
  answer,
  remark,
  photo,
  inspectionId,
  onAnswer,
  onRemark,
  onPhotoChange,
  disabled,
}) {
  const isOk = answer === "OK";
  const isNotOk = answer === "NOT_OK";
  const hasPhoto = photo?.status === "uploaded";

  return (
    <Card
      role="group"
      aria-label={`Checklist item ${index + 1}: ${item.prompt}`}
      sx={{
        borderRadius: 3,
        border: "1.5px solid",
        borderColor: isOk ? "success.main" : isNotOk ? "error.main" : "rgba(0,0,0,0.08)",
        transition: "border-color 0.25s ease, box-shadow 0.25s ease",
        boxShadow: isOk
          ? "0 2px 12px rgba(46,125,50,0.12)"
          : isNotOk
            ? "0 2px 12px rgba(211,47,47,0.12)"
            : "0 1px 4px rgba(0,0,0,0.06)",
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 2.5 }, "&:last-child": { pb: { xs: 2, sm: 2.5 } } }}>
        <Stack spacing={2}>
          <Typography
            variant="body1"
            sx={{
              fontWeight: 600,
              lineHeight: 1.5,
              fontSize: "0.9375rem",
              color: "text.primary",
            }}
          >
            {item.prompt}
          </Typography>

          {item.requires_photo && (
            <Typography variant="caption" color="error.main" sx={{ fontWeight: 600, fontSize: "0.7rem" }}>
              <PhotoCameraIcon sx={{ fontSize: 12, mr: 0.5, verticalAlign: "middle" }} />
              Photo required
            </Typography>
          )}

          {inspectionId && (
            <Box>
              <PhotoCapture
                inspectionId={inspectionId}
                checklistItemId={item.id}
                existingPhoto={photo}
                onPhotoChange={(data) => onPhotoChange?.(item.id, data)}
              />
            </Box>
          )}

          <Box role="radiogroup" aria-label={`Result for item ${index + 1}`}>
            <Stack direction="row" spacing={1.5}>
              <Box
                role="radio"
                aria-checked={isOk}
                aria-label={`Mark item ${index + 1} as OK`}
                tabIndex={0}
                onClick={() => !disabled && onAnswer(item.id, "OK")}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onAnswer(item.id, "OK"); } }}
                sx={{
                  ...okSx,
                  borderColor: isOk ? "success.main" : "rgba(0,0,0,0.1)",
                  bgcolor: isOk ? "rgba(46,125,50,0.08)" : "transparent",
                  "&:hover": disabled ? {} : {
                    borderColor: isOk ? "success.dark" : "success.main",
                    bgcolor: isOk ? "rgba(46,125,50,0.12)" : "rgba(46,125,50,0.04)",
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
                    <Typography variant="body1" fontWeight={700} sx={{ color: isOk ? "success.main" : "text.secondary", lineHeight: 1.2 }}>
                      OK
                    </Typography>
                    <Typography variant="caption" sx={{ color: isOk ? "success.main" : "text.disabled", fontSize: "0.6875rem" }}>
                      Within spec
                    </Typography>
                  </Box>
                </Stack>
              </Box>
              <Box
                role="radio"
                aria-checked={isNotOk}
                aria-label={`Mark item ${index + 1} as NOT OK`}
                tabIndex={0}
                onClick={() => !disabled && onAnswer(item.id, "NOT_OK")}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onAnswer(item.id, "NOT_OK"); } }}
                sx={{
                  ...okSx,
                  borderColor: isNotOk ? "error.main" : "rgba(0,0,0,0.1)",
                  bgcolor: isNotOk ? "rgba(211,47,47,0.08)" : "transparent",
                  "&:hover": disabled ? {} : {
                    borderColor: isNotOk ? "error.dark" : "error.main",
                    bgcolor: isNotOk ? "rgba(211,47,47,0.12)" : "rgba(211,47,47,0.04)",
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
                    <Typography variant="body1" fontWeight={700} sx={{ color: isNotOk ? "error.main" : "text.secondary", lineHeight: 1.2 }}>
                      NOT OK
                    </Typography>
                    <Typography variant="caption" sx={{ color: isNotOk ? "error.main" : "text.disabled", fontSize: "0.6875rem" }}>
                      Out of spec
                    </Typography>
                  </Box>
                </Stack>
              </Box>
            </Stack>
          </Box>

          <TextField
            multiline
            fullWidth
            minRows={2}
            maxRows={3}
            placeholder={isNotOk ? "Describe the issue found…" : "Add notes (optional)…"}
            value={remark || ""}
            onChange={(e) => onRemark(item.id, e.target.value)}
            disabled={disabled}
            inputProps={{
              maxLength: 500,
              "aria-label": `Remarks for item ${index + 1}`,
            }}
            helperText={`${(remark || "").length}/500`}
            FormHelperTextProps={{
              sx: { textAlign: "right", mt: 0.5, fontSize: "0.65rem", color: (remark || "").length >= 500 ? "error.main" : "text.disabled" },
            }}
            sx={{
              "& .MuiOutlinedInput-root": { bgcolor: "background.paper", fontSize: "0.875rem" },
            }}
          />
        </Stack>
      </CardContent>
    </Card>
  );
}

export default memo(QuestionCard);