import { memo } from "react";
import { Alert, Box } from "@mui/material";

function ErrorAlert({ error, onClose }) {
  if (!error) return null;
  return (
    <Box aria-live="polite" aria-atomic="true">
      <Alert severity="error" onClose={() => onClose?.()}>
        {error}
      </Alert>
    </Box>
  );
}

export default memo(ErrorAlert);
