import { useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
  CircularProgress,
} from "@mui/material";

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = "Confirm",
  message = "Are you sure?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  destructive = false,
  requireInput = false,
  inputLabel = "Reason",
  inputPlaceholder = "Enter reason...",
  inputValue = "",
  onInputChange,
  loading = false,
}) {
  const [localInput, setLocalInput] = useState(inputValue || "");

  const handleConfirm = () => {
    if (requireInput && !localInput.trim()) return;
    onConfirm(localInput.trim());
  };

  const handleClose = () => {
    if (!loading) onClose();
  };

  const input = onInputChange !== undefined ? inputValue : localInput;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      aria-labelledby="confirm-dialog-title"
    >
      <DialogTitle id="confirm-dialog-title" sx={{ pb: 1 }}>
        {title}
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: requireInput ? 2 : 0 }}>
          {message}
        </Typography>
        {requireInput && (
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={2}
            maxRows={4}
            label={inputLabel}
            placeholder={inputPlaceholder}
            value={input}
            onChange={(e) => {
              const val = e.target.value;
              if (onInputChange) onInputChange(val);
              else setLocalInput(val);
            }}
            size="small"
            inputProps={{ "aria-label": inputLabel, maxLength: 500 }}
            helperText={`${input.length}/500`}
            FormHelperTextProps={{
              sx: { textAlign: "right", mt: 0.5, fontSize: "0.65rem" },
            }}
            disabled={loading}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading} color="inherit" variant="outlined" size="small">
          {cancelText}
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={loading || (requireInput && !input.trim())}
          color={destructive ? "error" : "primary"}
          variant="contained"
          size="small"
          startIcon={loading ? <CircularProgress size={14} color="inherit" /> : undefined}
        >
          {loading ? `${confirmText}...` : confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
