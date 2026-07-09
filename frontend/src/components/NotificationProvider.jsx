import { createContext, useCallback, useContext, useState, useRef, useEffect } from "react";
import { Alert, Box, Button, Snackbar, Stack, Typography } from "@mui/material";

const NotificationContext = createContext(null);

let idCounter = 0;

function NotificationItem({ notification, onDismiss }) {
  const { id, message, type, action, duration } = notification;
  const timerRef = useRef(null);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (duration > 0) {
      timerRef.current = setTimeout(() => {
        setExiting(true);
        setTimeout(() => onDismiss(id), 200);
      }, duration);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [id, duration, onDismiss]);

  const handleDismiss = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setExiting(true);
    setTimeout(() => onDismiss(id), 200);
  };

  return (
    <Snackbar
      open
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      sx={{ position: "static" }}
    >
      <Alert
        severity={type}
        onClose={handleDismiss}
        variant="standard"
        action={
          action ? (
            <Button
              color="inherit"
              size="small"
              onClick={() => {
                action.onClick?.();
                handleDismiss();
              }}
              sx={{ fontWeight: 700, fontSize: "0.75rem" }}
            >
              {action.label}
            </Button>
          ) : undefined
        }
        sx={{
          width: "100%",
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          animation: exiting
            ? "slideDown 0.2s ease-in forwards"
            : "slideUp 0.3s ease-out",
          "& .MuiAlert-message": { width: "100%" },
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {message}
        </Typography>
      </Alert>
    </Snackbar>
  );
}

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const notify = useCallback((message, options = {}) => {
    const id = ++idCounter;
    const { type = "info", duration = 5000, action } = options;
    setNotifications((prev) => [...prev, { id, message, type, duration, action }]);
    return id;
  }, []);

  const dismiss = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const success = useCallback((msg, opts) => notify(msg, { ...opts, type: "success" }), [notify]);
  const warning = useCallback((msg, opts) => notify(msg, { ...opts, type: "warning" }), [notify]);
  const error = useCallback((msg, opts) => notify(msg, { ...opts, type: "error" }), [notify]);
  const info = useCallback((msg, opts) => notify(msg, { ...opts, type: "info" }), [notify]);

  return (
    <NotificationContext.Provider value={{ notify, success, warning, error, info, dismiss }}>
      {children}
      <Stack
        spacing={1}
        sx={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 10000,
          maxWidth: 420,
          width: "100%",
          pointerEvents: "none",
          "& > *": { pointerEvents: "auto" },
        }}
      >
        {notifications.map((n) => (
          <NotificationItem key={n.id} notification={n} onDismiss={dismiss} />
        ))}
      </Stack>
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotification must be used within NotificationProvider");
  return ctx;
}
