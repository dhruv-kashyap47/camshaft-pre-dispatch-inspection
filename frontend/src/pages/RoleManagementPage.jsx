import { Box, Card, CardContent, Grid, Stack, Typography, Avatar, Chip } from "@mui/material";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import RateReviewIcon from "@mui/icons-material/RateReview";
import PrecisionManufacturingIcon from "@mui/icons-material/PrecisionManufacturing";

import PageHeader from "../components/PageHeader";

const ROLES_DATA = [
  {
    title: "Operator",
    icon: <PrecisionManufacturingIcon sx={{ fontSize: 32 }} />,
    color: "#2E7D32",
    bg: "#E8F5E9",
    description: "Perform camshaft inspections using the inspection workstation. Scan QR codes, complete checklists, capture photos, and submit results for manager review.",
    permissions: [
      "Start and resume inspections",
      "Complete checklist items (OK / NOT OK)",
      "Capture and upload photos",
      "Add remarks to items",
      "Submit inspections for review",
    ],
  },
  {
    title: "Manager",
    icon: <RateReviewIcon sx={{ fontSize: 32 }} />,
    color: "#0046AD",
    bg: "#E3F2FD",
    description: "Review submitted inspections, approve or reject results, override individual items, and monitor operational metrics.",
    permissions: [
      "Review pending inspections",
      "Approve or reject inspections",
      "Override individual checklist items",
      "Add manager notes to inspections",
      "View production reports and dashboards",
      "Investigate and search inspection history",
      "Switch to Operator Mode to conduct inspections",
      "View audit logs",
    ],
  },
  {
    title: "Admin / IT",
    icon: <AdminPanelSettingsIcon sx={{ fontSize: 32 }} />,
    color: "#ED6C02",
    bg: "#FFF3E0",
    description: "Full system administration including user management, cams, checklists, and system monitoring.",
    permissions: [
      "Create, edit, and disable users",
      "Reset user passwords",
      "Manage cam codes and statuses",
      "Manage checklist versions and items",
      "View audit logs and system health",
      "Access all reports and investigations",
      "Manage system configuration",
    ],
  },
];

export default function RoleManagementPage() {
  return (
    <Stack spacing={3} sx={{ animation: "fadeIn 0.35s ease-out" }}>
      <PageHeader
        icon={<AdminPanelSettingsIcon />}
        title="Role Management"
        subtitle="System roles and their associated permissions"
      />

      <Grid container spacing={3}>
        {ROLES_DATA.map((role) => (
          <Grid item xs={12} md={4} key={role.title}>
            <Card
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                borderTop: `3px solid ${role.color}`,
                animation: "slideUp 0.35s ease-out",
              }}
            >
              <CardContent sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
                <Stack spacing={2} sx={{ flex: 1 }}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar sx={{ width: 48, height: 48, bgcolor: role.bg, color: role.color }}>
                      {role.icon}
                    </Avatar>
                    <Box>
                      <Typography variant="h6">{role.title}</Typography>
                      <Chip size="small" label={role.title.toUpperCase()} variant="outlined" sx={{ color: role.color, borderColor: role.color, fontWeight: 700, fontSize: "0.65rem" }} />
                    </Box>
                  </Stack>

                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                    {role.description}
                  </Typography>

                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2" gutterBottom sx={{ color: role.color }}>
                      Permissions
                    </Typography>
                    <Stack spacing={0.75} component="ul" sx={{ pl: 1.5, m: 0 }}>
                      {role.permissions.map((perm, i) => (
                        <Typography
                          key={i}
                          variant="body2"
                          component="li"
                          color="text.secondary"
                          sx={{
                            lineHeight: 1.5,
                            "&::marker": { color: role.color },
                          }}
                        >
                          {perm}
                        </Typography>
                      ))}
                    </Stack>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Stack>
  );
}
