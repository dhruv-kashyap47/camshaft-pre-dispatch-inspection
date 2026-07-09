import { memo } from "react";
import { Box, Card, CardContent, Stack, Typography } from "@mui/material";

function EmptyState({ icon, title, message, action, sx }) {
  return (
    <Card className="no-lift" sx={{ animation: "scaleIn 0.35s ease-out", ...sx }}>
      <CardContent>
        <Stack alignItems="center" spacing={1.5} sx={{ py: 5 }}>
          {icon && (
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                bgcolor: "success.light",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {icon}
            </Box>
          )}
          <Typography variant="h6" color="text.secondary">
            {title}
          </Typography>
          {message && (
            <Typography variant="body2" color="text.secondary">
              {message}
            </Typography>
          )}
          {action && <Box sx={{ mt: 1 }}>{action}</Box>}
        </Stack>
      </CardContent>
    </Card>
  );
}

export default memo(EmptyState);
