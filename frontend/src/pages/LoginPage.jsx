import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";

import { useAuth } from "../modules/auth/AuthContext";

export function LoginPage() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { employee_id: "", password: "" },
  });
  const { login, error, loading, setError } = useAuth();
  const navigate = useNavigate();

  async function onSubmit(values) {
    try {
      const data = await login(values);
      const role = data.role;
      const route = role === "ADMIN" ? "/admin" : `/${role.toLowerCase()}`;
      navigate(route);
    } catch {
      // error is set in AuthContext
    }
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(145deg, #EBF0F8 0%, #D8E6F2 40%, #F0F4F8 100%)",
        p: 2,
      }}
    >
      <Card
        className="no-lift"
        sx={{
          width: "100%",
          maxWidth: 400,
          borderRadius: "18px",
          boxShadow: "0 12px 40px rgba(0,70,173,0.12), 0 2px 8px rgba(0,0,0,0.06)",
          border: "1px solid rgba(0,70,173,0.08)",
          overflow: "visible",
          animation: "slideUp 0.4s ease-out",
        }}
      >
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          {/* Header */}
          <Stack spacing={2.5} alignItems="center" sx={{ mb: 3 }}>
            <Box
              component="img"
              src="/cumminslogo.png"
              alt="Cummins — Pre-Dispatch Inspection System"
              title="Cummins"
              sx={{ height: 48, width: "auto" }}
            />
            <Stack spacing={0.625} alignItems="center">
              <Typography
                component="h1"
                className="orbitron"
                sx={{
                  fontWeight: 800,
                  textAlign: "center",
                  fontSize: { xs: "1.2rem", sm: "1.45rem" },
                  background: "linear-gradient(135deg, #0046AD 0%, #003380 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  letterSpacing: 0.5,
                  lineHeight: 1.2,
                }}
              >
                Camshaft PDI
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ textAlign: "center", maxWidth: 280, fontWeight: 500, lineHeight: 1.5 }}
              >
                Pre-dispatch inspection &amp; quality management
              </Typography>
            </Stack>
          </Stack>

          {/* Live error region */}
          <Box
            aria-live="polite"
            aria-atomic="true"
            sx={{ minHeight: error ? "auto" : 0, mb: error ? 2.5 : 0 }}
          >
            {error && (
              <Alert
                severity="error"
                onClose={() => setError(null)}
                sx={{ width: "100%" }}
              >
                {error}
              </Alert>
            )}
          </Box>

          {/* Form */}
          <Box
            component="form"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
          >
            <Stack spacing={2.5}>
              <TextField
                id="employee_id"
                label="Employee ID"
                autoFocus
                fullWidth
                disabled={loading}
                autoComplete="username"
                inputProps={{ "aria-describedby": errors.employee_id ? "employee_id_error" : undefined }}
                {...register("employee_id", { required: "Employee ID is required" })}
                error={!!errors.employee_id}
                helperText={
                  errors.employee_id
                    ? <span id="employee_id_error">{errors.employee_id.message}</span>
                    : undefined
                }
              />
              <TextField
                id="password"
                label="Password"
                type="password"
                fullWidth
                disabled={loading}
                autoComplete="current-password"
                inputProps={{ "aria-describedby": errors.password ? "password_error" : undefined }}
                {...register("password", { required: "Password is required" })}
                error={!!errors.password}
                helperText={
                  errors.password
                    ? <span id="password_error">{errors.password.message}</span>
                    : undefined
                }
              />
              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={loading}
                startIcon={
                  loading
                    ? <CircularProgress size={18} color="inherit" />
                    : <QrCodeScannerIcon />
                }
                sx={{ mt: 0.5, py: 1.375 }}
              >
                {loading ? "Signing In…" : "Sign In"}
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
