import { useState } from "react";
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Toolbar,
  Typography,
  Divider,
  Tooltip,
} from "@mui/material";
import { Link as RouterLink, useLocation } from "react-router-dom";
import MenuIcon from "@mui/icons-material/Menu";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import RateReviewIcon from "@mui/icons-material/RateReview";
import BarChartIcon from "@mui/icons-material/BarChart";
import SearchIcon from "@mui/icons-material/Search";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import LogoutIcon from "@mui/icons-material/Logout";
import CloseIcon from "@mui/icons-material/Close";

import { useAuth } from "../modules/auth/AuthContext";

const navByRole = {
  OPERATOR: [
    { label: "Inspections", to: "/operator", icon: <FactCheckIcon fontSize="small" /> },
  ],
  MANAGER: [
    { label: "Review", to: "/manager", icon: <RateReviewIcon fontSize="small" /> },
    { label: "Reports", to: "/reports", icon: <BarChartIcon fontSize="small" /> },
    { label: "Investigate", to: "/investigation", icon: <SearchIcon fontSize="small" /> },
  ],
  ADMIN: [
    { label: "Admin", to: "/admin", icon: <AdminPanelSettingsIcon fontSize="small" /> },
    { label: "Reports", to: "/reports", icon: <BarChartIcon fontSize="small" /> },
    { label: "Investigate", to: "/investigation", icon: <SearchIcon fontSize="small" /> },
  ],
};

const roleStyle = {
  OPERATOR: { bg: "#E8F5E9", color: "#2E7D32", label: "Operator", dot: "#2E7D32" },
  MANAGER: { bg: "#E3F2FD", color: "#0046AD", label: "Manager", dot: "#0046AD" },
  ADMIN: { bg: "#FFF3E0", color: "#ED6C02", label: "Admin", dot: "#ED6C02" },
};

export function Shell({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const nav = user ? navByRole[user.role] || [] : [];
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isActive = (path) => location.pathname === path;
  const rs = user ? roleStyle[user.role] || roleStyle.OPERATOR : roleStyle.OPERATOR;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar position="sticky" color="inherit" sx={{ zIndex: 1201 }}>
        <Toolbar
          sx={{
            justifyContent: "space-between",
            px: { xs: 1.5, sm: 3 },
            gap: 1,
          }}
        >
          {/* --- Left: Hamburger + Logo + Brand --- */}
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ flexShrink: 0 }}>
            {user && (
              <IconButton
                edge="start"
                onClick={() => setDrawerOpen(true)}
                aria-label="Toggle navigation menu"
                sx={{ display: { md: "none" }, color: "text.secondary" }}
                size="small"
              >
                <MenuIcon fontSize="small" />
              </IconButton>
            )}
            <Stack direction="row" alignItems="center" spacing={1.25}>
              <Box
                component="img"
                src="/cumminslogo.png"
                alt="Cummins logo"
                sx={{ height: 28, width: "auto", display: "block" }}
              />
              <Divider orientation="vertical" flexItem sx={{ height: 20, alignSelf: "center" }} />
              <Typography
                className="orbitron"
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: "0.8rem", sm: "0.9375rem" },
                  letterSpacing: 0.5,
                  background: "linear-gradient(135deg, #0046AD 0%, #003380 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  whiteSpace: "nowrap",
                  userSelect: "none",
                }}
              >
                Camshaft PDI
              </Typography>
            </Stack>
          </Stack>

          {/* --- Center/Right: Nav buttons (desktop) --- */}
          <Stack
            component="nav"
            aria-label="Main navigation"
            direction="row"
            spacing={0.5}
            alignItems="center"
            sx={{ display: { xs: "none", md: "flex" } }}
          >
            {nav.map((item) => (
              <Button
                key={item.to}
                component={RouterLink}
                to={item.to}
                startIcon={item.icon}
                aria-current={isActive(item.to) ? "page" : undefined}
                sx={{
                  height: 36,
                  color: isActive(item.to) ? "primary.main" : "text.secondary",
                  bgcolor: isActive(item.to) ? "rgba(0,70,173,0.07)" : "transparent",
                  fontWeight: isActive(item.to) ? 600 : 500,
                  fontSize: "0.8125rem",
                  borderRadius: "8px",
                  px: 1.75,
                  whiteSpace: "nowrap",
                  position: "relative",
                  transition: "all 0.18s ease",
                  "&:hover": {
                    bgcolor: isActive(item.to)
                      ? "rgba(0,70,173,0.12)"
                      : "rgba(0,0,0,0.04)",
                    transform: "none",
                  },
                  "&::after": isActive(item.to)
                    ? {
                        content: '""',
                        position: "absolute",
                        bottom: -2,
                        left: "50%",
                        transform: "translateX(-50%)",
                        width: "56%",
                        height: 2,
                        borderRadius: "2px 2px 0 0",
                        bgcolor: "primary.main",
                      }
                    : {},
                  "& .MuiButton-startIcon": {
                    marginRight: "6px",
                  },
                }}
              >
                {item.label}
              </Button>
            ))}

            {user && (
              <>
                <Divider orientation="vertical" flexItem sx={{ height: 18, mx: 1 }} />
                <Tooltip title={`${rs.label} · ${user.employeeId}`} arrow>
                  <Stack
                    direction="row"
                    spacing={0.875}
                    alignItems="center"
                    sx={{
                      cursor: "default",
                      px: 0.5,
                      py: 0.375,
                      borderRadius: 2,
                    }}
                  >
                    <Avatar
                      sx={{
                        width: 26,
                        height: 26,
                        bgcolor: rs.bg,
                        color: rs.color,
                        fontSize: "0.6875rem",
                        fontWeight: 700,
                      }}
                    >
                      {user.employeeId.charAt(0).toUpperCase()}
                    </Avatar>
                    <Stack spacing={0}>
                      <Typography
                        sx={{
                          fontWeight: 600,
                          fontSize: "0.75rem",
                          lineHeight: 1.2,
                          color: "text.primary",
                        }}
                      >
                        {user.employeeId}
                      </Typography>
                      <Typography
                        sx={{
                          fontWeight: 600,
                          fontSize: "0.625rem",
                          lineHeight: 1.2,
                          color: rs.color,
                          textTransform: "uppercase",
                          letterSpacing: 0.3,
                        }}
                      >
                        {rs.label}
                      </Typography>
                    </Stack>
                  </Stack>
                </Tooltip>
                <Tooltip title="Sign out" arrow>
                  <IconButton
                    onClick={logout}
                    size="small"
                    aria-label="Sign out"
                    sx={{
                      width: 32,
                      height: 32,
                      color: "text.secondary",
                      "&:hover": {
                        color: "error.main",
                        bgcolor: "rgba(211,47,47,0.08)",
                      },
                    }}
                  >
                    <LogoutIcon sx={{ fontSize: "1.05rem" }} />
                  </IconButton>
                </Tooltip>
              </>
            )}
          </Stack>

          {/* --- Mobile: avatar + logout --- */}
          {user && (
            <Stack
              direction="row"
              spacing={0.75}
              alignItems="center"
              sx={{ display: { xs: "flex", md: "none" }, flexShrink: 0 }}
            >
              <Avatar
                sx={{
                  width: 26,
                  height: 26,
                  bgcolor: rs.bg,
                  color: rs.color,
                  fontSize: "0.625rem",
                  fontWeight: 700,
                }}
              >
                {user.employeeId.charAt(0).toUpperCase()}
              </Avatar>
              <Tooltip title="Sign out" arrow>
                <IconButton
                  size="small"
                  onClick={logout}
                  aria-label="Sign out"
                  sx={{
                    width: 30,
                    height: 30,
                    color: "text.secondary",
                    "&:hover": { color: "error.main", bgcolor: "rgba(211,47,47,0.08)" },
                  }}
                >
                  <LogoutIcon sx={{ fontSize: "0.9375rem" }} />
                </IconButton>
              </Tooltip>
            </Stack>
          )}
        </Toolbar>
      </AppBar>

      {/* --- Mobile Drawer --- */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{ "& .MuiDrawer-paper": { width: 268 } }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", height: "100%", py: 1.5 }}>
          {/* Drawer header */}
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ px: 2, pb: 1.5 }}
          >
            <Stack direction="row" alignItems="center" spacing={1.25}>
              <Box
                component="img"
                src="/cumminslogo.png"
                alt="Cummins logo"
                sx={{ height: 26, width: "auto" }}
              />
              <Divider orientation="vertical" flexItem sx={{ height: 18 }} />
              <Typography
                className="orbitron"
                sx={{
                  fontWeight: 700,
                  fontSize: "0.8125rem",
                  letterSpacing: 0.4,
                  background: "linear-gradient(135deg, #0046AD 0%, #003380 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Camshaft PDI
              </Typography>
            </Stack>
            <IconButton
              size="small"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close navigation menu"
              sx={{ color: "text.secondary" }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>

          {user && (
            <Stack
              direction="row"
              spacing={1.5}
              alignItems="center"
              sx={{
                px: 2,
                py: 1.5,
                mx: 1,
                mb: 1,
                borderRadius: 2,
                bgcolor: "grey.50",
              }}
            >
              <Avatar
                sx={{
                  width: 36,
                  height: 36,
                  bgcolor: rs.bg,
                  color: rs.color,
                  fontSize: "0.875rem",
                  fontWeight: 700,
                }}
              >
                {user.employeeId.charAt(0).toUpperCase()}
              </Avatar>
              <Stack spacing={0}>
                <Typography variant="body2" fontWeight={600}>
                  {user.employeeId}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: rs.color, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.3 }}
                >
                  {rs.label}
                </Typography>
              </Stack>
            </Stack>
          )}

          <Divider sx={{ mx: 2, mb: 1 }} />

          {/* Nav items */}
          <List component="nav" aria-label="Navigation" sx={{ px: 1, flex: 1 }}>
            {nav.map((item) => (
              <ListItem key={item.to} disablePadding sx={{ mb: 0.375 }}>
                <ListItemButton
                  component={RouterLink}
                  to={item.to}
                  selected={isActive(item.to)}
                  onClick={() => setDrawerOpen(false)}
                  aria-current={isActive(item.to) ? "page" : undefined}
                  sx={{
                    borderRadius: 2,
                    py: 1,
                    px: 1.5,
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 34,
                      color: isActive(item.to) ? "primary.main" : "text.secondary",
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      fontWeight: isActive(item.to) ? 600 : 500,
                      fontSize: "0.875rem",
                      color: isActive(item.to) ? "primary.main" : "text.primary",
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>

          <Divider sx={{ mx: 2, mb: 0.5 }} />

          {/* Logout */}
          <List sx={{ px: 1 }}>
            <ListItem disablePadding>
              <ListItemButton
                onClick={logout}
                sx={{
                  borderRadius: 2,
                  py: 1,
                  px: 1.5,
                  "&:hover": {
                    bgcolor: "rgba(211,47,47,0.06)",
                    "& .MuiListItemIcon-root": { color: "error.main" },
                    "& .MuiTypography-root": { color: "error.main" },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 34, color: "text.secondary", transition: "color 0.18s" }}>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary="Sign Out"
                  primaryTypographyProps={{
                    color: "text.secondary",
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    transition: "color 0.18s",
                  }}
                />
              </ListItemButton>
            </ListItem>
          </List>
        </Box>
      </Drawer>

      {/* Page content */}
      <Box
        component="main"
        sx={{
          maxWidth: 1280,
          mx: "auto",
          px: { xs: 2, sm: 3 },
          py: { xs: 2.5, sm: 3.5 },
          animation: "fadeIn 0.3s ease-out",
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
