import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import SendIcon from "@mui/icons-material/Send";

export default function SummaryScreen({
  checklistItems,
  answers,
  remarks,
  photos,
  inspectionNo,
  onSubmit,
  submitting,
  submitDisabled,
}) {
  const okCount = checklistItems.filter((_, i) => answers[i] === "OK").length;
  const notOkCount = checklistItems.filter((_, i) => answers[i] === "NOT_OK").length;
  const photoCount = checklistItems.filter((_, i) => photos[i]?.status === "uploaded").length;
  const totalItems = checklistItems.length;
  const pct = totalItems > 0 ? Math.round(((okCount + notOkCount) / totalItems) * 100) : 0;

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        animation: "slideUpFade 0.35s ease-out",
      }}
    >
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 1.5, flexShrink: 0 }}>
        Inspection Summary
      </Typography>

      <Box sx={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", gap: 1 }}>
        <Card sx={{ flexShrink: 0, borderRadius: 2, border: "1px solid rgba(0,0,0,0.06)" }}>
          <CardContent sx={{ p: { xs: 1.5, sm: 2 }, "&:last-child": { pb: { xs: 1.5, sm: 2 } } }}>
            <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between">
              <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 0.5 }}>
                <Chip icon={<CheckCircleIcon />} label={`${okCount} OK`} color="success" variant="outlined" size="small" />
                {notOkCount > 0 && <Chip icon={<CancelIcon />} label={`${notOkCount} NOT OK`} color="error" variant="outlined" size="small" />}
                <Chip icon={<PhotoCameraIcon />} label={`${photoCount} photos`} color="primary" variant="outlined" size="small" />
              </Stack>
              <Typography variant="h6" fontWeight={700} color="primary.main">
                {pct}%
              </Typography>
            </Stack>
          </CardContent>
        </Card>

        <Box sx={{ flex: 1, overflow: "hidden", overflowY: "auto", display: "flex", flexDirection: "column", gap: 1 }}>
          {checklistItems.map((item, i) => {
            const ans = answers[i];
            const rem = remarks[i];
            const ph = photos[i];
            return (
              <Card key={item.id} sx={{ flexShrink: 0, borderRadius: 2, border: "1px solid rgba(0,0,0,0.06)" }}>
                <CardContent sx={{ p: { xs: 1.25, sm: 1.5 }, "&:last-child": { pb: { xs: 1.25, sm: 1.5 } } }}>
                  <Stack spacing={0.5}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ fontSize: "0.65rem" }}>
                        Step {i + 1}
                      </Typography>
                      <Chip
                        size="small"
                        label={ans === "OK" ? "OK" : ans === "NOT_OK" ? "NOT OK" : "Pending"}
                        color={ans === "OK" ? "success" : ans === "NOT_OK" ? "error" : "default"}
                        variant={ans ? "filled" : "outlined"}
                        sx={{ height: 22, fontSize: "0.65rem", fontWeight: 700 }}
                      />
                    </Stack>
                    <Typography variant="body2" sx={{ fontWeight: 500, fontSize: "0.8125rem", lineHeight: 1.4 }}>
                      {item.prompt}
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      {ph?.status === "uploaded" && (
                        <Typography variant="caption" color="primary.main" sx={{ fontWeight: 600, fontSize: "0.65rem" }}>
                          <PhotoCameraIcon sx={{ fontSize: 11, mr: 0.25, verticalAlign: "middle" }} />
                          Photo
                        </Typography>
                      )}
                      {rem && (
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem", fontStyle: "italic" }}>
                          {rem.length > 50 ? `${rem.slice(0, 50)}…` : rem}
                        </Typography>
                      )}
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      </Box>

      <Button
        variant="contained"
        size="large"
        fullWidth
        onClick={onSubmit}
        disabled={submitting || submitDisabled}
        startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
        sx={{ mt: 1.5, minHeight: 56, fontSize: "1rem", fontWeight: 700, flexShrink: 0 }}
      >
        {submitting ? "Submitting…" : "Submit Inspection"}
      </Button>
    </Box>
  );
}