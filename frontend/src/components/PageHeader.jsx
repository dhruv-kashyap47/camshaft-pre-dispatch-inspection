import { memo } from "react";
import { Box, Stack, Typography, Chip } from "@mui/material";

function PageHeader({ icon, title, subtitle, count, action, sx }) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      justifyContent="space-between"
      alignItems={{ sm: "center" }}
      spacing={1}
      sx={sx}
    >
      <Box>
        <Stack direction="row" spacing={1.25} alignItems="center">
          {icon && (
            <Box sx={{ color: "primary.main", display: "flex", fontSize: "1.5rem" }}>
              {icon}
            </Box>
          )}
          <Typography variant="h4" component="h1">
            {title}
          </Typography>
          {count !== undefined && (
            <Chip label={count} size="small" color="primary" variant="outlined" />
          )}
        </Stack>
        {subtitle && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.25, ml: { sm: "2.75rem" } }}
          >
            {subtitle}
          </Typography>
        )}
      </Box>
      {action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
    </Stack>
  );
}

export default memo(PageHeader);
