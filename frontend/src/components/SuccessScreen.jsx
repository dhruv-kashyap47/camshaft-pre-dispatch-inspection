import { Box, Button, Stack, Typography } from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import RefreshIcon from "@mui/icons-material/Refresh";

export default function SuccessScreen({ inspectionNo, onReset }) {
  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        gap: 2.5,
        animation: "slideUpFade 0.5s ease-out",
      }}
    >
      <Box
        sx={{
          width: 96,
          height: 96,
          borderRadius: "50%",
          bgcolor: "success.light",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          animation: "checkFill 0.5s ease-out",
        }}
      >
        <CheckCircleOutlineIcon
          sx={{
            fontSize: 56,
            color: "success.main",
          }}
        />
      </Box>

      <Stack spacing={1} alignItems="center">
        <Typography variant="h4" sx={{ fontWeight: 800, color: "success.main" }}>
          Inspection Submitted
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 320 }}>
          The inspection has been sent for manager review.
        </Typography>
      </Stack>

      <Box
        sx={{
          px: 3,
          py: 1.5,
          borderRadius: 2,
          bgcolor: "primary.main",
          color: "white",
          fontWeight: 800,
          fontSize: "1.25rem",
          letterSpacing: 0.5,
          fontFamily: "monospace",
        }}
      >
        {inspectionNo}
      </Box>

      <Button
        variant="contained"
        size="large"
        onClick={onReset}
        startIcon={<RefreshIcon />}
        sx={{ mt: 1, minHeight: 52, minWidth: 240, fontSize: "1rem", fontWeight: 700 }}
      >
        Return to Dashboard
      </Button>
    </Box>
  );
}