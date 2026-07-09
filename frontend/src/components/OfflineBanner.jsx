import { useState, useEffect } from "react";
import { Alert, Slide } from "@mui/material";
import WifiOffIcon from "@mui/icons-material/WifiOff";
import WifiIcon from "@mui/icons-material/Wifi";

export default function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setOffline(false);
    const handleOffline = () => setOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <Slide direction="down" in={offline} mountOnEnter unmountOnExit>
      <Alert
        severity="warning"
        icon={<WifiOffIcon />}
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10001,
          borderRadius: 0,
          justifyContent: "center",
          "& .MuiAlert-message": { fontWeight: 600, fontSize: "0.8125rem" },
        }}
      >
        You are offline. Some features may be unavailable.
      </Alert>
    </Slide>
  );
}
