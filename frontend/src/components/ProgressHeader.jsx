import { Box, LinearProgress, Stack, Typography } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonCheckedIcon from "@mui/icons-material/RadioButtonChecked";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import CancelIcon from "@mui/icons-material/Cancel";

const STEP_STATUS = {
  pending: { icon: RadioButtonUncheckedIcon, color: "text.disabled" },
  current: { icon: RadioButtonCheckedIcon, color: "primary.main" },
  completed: { icon: CheckCircleIcon, color: "success.main" },
  notOk: { icon: CancelIcon, color: "error.main" },
};

export default function ProgressHeader({
  currentIndex,
  totalItems,
  answers,
  autoSaveStatus,
}) {
  const answeredCount = answers.filter((a) => a !== undefined).length;
  const pct = totalItems > 0 ? Math.round((answeredCount / totalItems) * 100) : 0;

  return (
    <Box sx={{ flexShrink: 0, animation: "slideUpFade 0.3s ease-out" }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: "1rem" }}>
          Question {Math.min(currentIndex + 1, totalItems)} / {totalItems}
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography
            variant="body2"
            fontWeight={700}
            color={pct >= 100 ? "success.main" : "primary.main"}
          >
            {Math.min(pct, 100)}%
          </Typography>
          <Box
            sx={{
              px: 1,
              py: 0.25,
              borderRadius: 1,
              bgcolor: autoSaveStatus === "saved" ? "success.light" : autoSaveStatus === "saving" ? "info.light" : "grey.100",
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              minWidth: 60,
              justifyContent: "center",
            }}
          >
            <Typography
              variant="caption"
              sx={{
                fontWeight: 600,
                fontSize: "0.65rem",
                color: autoSaveStatus === "saved" ? "success.dark" : autoSaveStatus === "saving" ? "info.dark" : "text.disabled",
                animation: autoSaveStatus === "saving" ? "savingPulse 0.8s ease-in-out infinite" : "none",
              }}
            >
              {autoSaveStatus === "saving" ? "Saving…" : autoSaveStatus === "saved" ? "Saved ✓" : autoSaveStatus === "error" ? "Error!" : ""}
            </Typography>
          </Box>
        </Stack>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={Math.min(pct, 100)}
        color={pct >= 100 ? "success" : "primary"}
        sx={{
          height: 8,
          borderRadius: 4,
          mb: 1.5,
          "& .MuiLinearProgress-bar": {
            animation: pct < 100 ? "progressGlow 2s ease-in-out infinite" : "none",
          },
        }}
      />
      <Stack direction="row" spacing={0.75} sx={{ flexWrap: "wrap", gap: 0.5 }}>
        {Array.from({ length: totalItems }, (_, i) => {
          const itemIdx = i + 1;
          const isCurrent = i === currentIndex;
          const isCompleted = answers[i] !== undefined;
          const isNotOk = answers[i] === "NOT_OK";
          let status;
          if (isCurrent) status = "current";
          else if (isCompleted && isNotOk) status = "notOk";
          else if (isCompleted) status = "completed";
          else status = "pending";
          const StepIcon = STEP_STATUS[status].icon;
          return (
            <Stack key={i} direction="row" spacing={0.25} alignItems="center">
              <StepIcon
                sx={{
                  fontSize: 14,
                  color: STEP_STATUS[status].color,
                  transition: "color 0.3s ease, transform 0.3s ease",
                  animation: isCurrent ? "pulse 2s ease-in-out infinite" : "none",
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  fontWeight: isCurrent ? 700 : 500,
                  color: STEP_STATUS[status].color,
                  fontSize: "0.65rem",
                }}
              >
                {itemIdx}
              </Typography>
            </Stack>
          );
        })}
      </Stack>
    </Box>
  );
}