import { createTheme } from "@mui/material/styles";

const CUMMINS_BLUE = "#0046AD";
const CUMMINS_DARK = "#003380";
const CUMMINS_LIGHT = "#E8EEF6";

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: CUMMINS_BLUE, dark: CUMMINS_DARK, light: "#4A7BC4", contrastText: "#fff" },
    secondary: { main: "#FF8F00", dark: "#C77600", light: "#FFB74D", contrastText: "#fff" },
    error: { main: "#D32F2F", light: "#FFEBEE" },
    success: { main: "#2E7D32", light: "#E8F5E9" },
    warning: { main: "#ED6C02", light: "#FFF3E0" },
    info: { main: "#0288D1", light: "#E1F5FE" },
    background: {
      default: "#F4F6F8",
      paper: "#FFFFFF",
    },
    text: {
      primary: "#1A1A2E",
      secondary: "#5A5D72",
    },
    divider: "rgba(0,0,0,0.08)",
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
    h4: { fontWeight: 700, fontSize: "1.75rem", letterSpacing: -0.3, lineHeight: 1.25 },
    h5: { fontWeight: 600, fontSize: "1.35rem", lineHeight: 1.3 },
    h6: { fontWeight: 600, fontSize: "1.05rem", lineHeight: 1.35 },
    // Display variant for large stat numbers (reports)
    h3: { fontWeight: 800, fontSize: "2.25rem", letterSpacing: -0.5, lineHeight: 1.1 },
    subtitle1: { fontWeight: 600, fontSize: "0.9375rem", lineHeight: 1.4 },
    subtitle2: { fontWeight: 600, fontSize: "0.8125rem", color: "#5A5D72", lineHeight: 1.4 },
    body1: { fontSize: "0.9375rem", lineHeight: 1.6 },
    body2: { fontSize: "0.875rem", lineHeight: 1.55 },
    caption: { fontSize: "0.75rem", lineHeight: 1.5 },
    button: { fontWeight: 600, fontSize: "0.875rem", textTransform: "none", letterSpacing: 0.1 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-16px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.04); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes ripple {
          0% { box-shadow: 0 0 0 0 rgba(0,70,173,0.3); }
          100% { box-shadow: 0 0 0 12px rgba(0,70,173,0); }
        }
        @keyframes skeletonPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        body {
          background-color: #F4F6F8;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        .orbitron {
          font-family: 'Orbitron', 'Inter', sans-serif !important;
        }
        /* Respect reduced motion */
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
        /* Consistent scrollbar styling */
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.25); }
      `,
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          minHeight: 40,
          borderRadius: 10,
          padding: "9px 20px",
          boxShadow: "none",
          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          "&:hover": {
            boxShadow: "none",
            transform: "translateY(-1px)",
          },
          "&:active": {
            transform: "translateY(0) scale(0.98)",
          },
          "&:focus-visible": {
            outline: `2px solid ${CUMMINS_BLUE}`,
            outlineOffset: "2px",
          },
          "&.Mui-disabled": {
            opacity: 0.5,
          },
        },
        sizeSmall: { minHeight: 32, padding: "5px 14px", fontSize: "0.8125rem" },
        sizeLarge: { minHeight: 48, padding: "12px 28px", fontSize: "0.9375rem" },
        containedPrimary: {
          "&:hover": { backgroundColor: CUMMINS_DARK },
        },
        containedSuccess: {
          "&:hover": { backgroundColor: "#1B5E20" },
        },
        containedError: {
          "&:hover": { backgroundColor: "#C62828" },
        },
        outlined: {
          borderWidth: "1.5px",
          "&:hover": { borderWidth: "1.5px", backgroundColor: "rgba(0,70,173,0.04)" },
        },
        outlinedError: {
          "&:hover": { backgroundColor: "rgba(211,47,47,0.04)" },
        },
        outlinedSuccess: {
          "&:hover": { backgroundColor: "rgba(46,125,50,0.04)" },
        },
        text: {
          "&:hover": { backgroundColor: "rgba(0,70,173,0.06)" },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          transition: "all 0.18s ease",
          "&:focus-visible": {
            outline: `2px solid ${CUMMINS_BLUE}`,
            outlineOffset: "2px",
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          boxShadow: "0 1px 4px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
          border: "1px solid rgba(0,0,0,0.05)",
          transition: "box-shadow 0.25s cubic-bezier(0.4, 0, 0.2, 1), transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
          "&:hover": {
            boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
            transform: "translateY(-2px)",
          },
          // Cards that should not lift on hover (checklist items, list rows)
          "&.no-lift": {
            "&:hover": {
              transform: "none",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
            },
          },
          "&.clickable": {
            cursor: "pointer",
          },
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: "20px 24px",
          "&:last-child": { paddingBottom: 20 },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: 10,
            backgroundColor: "#FAFBFC",
            transition: "background-color 0.18s ease, box-shadow 0.18s ease",
            "& fieldset": {
              borderColor: "rgba(0,0,0,0.15)",
              transition: "border-color 0.18s ease",
            },
            "&:hover fieldset": {
              borderColor: "rgba(0,70,173,0.4)",
            },
            "&.Mui-focused": {
              backgroundColor: "#fff",
              boxShadow: "0 0 0 3px rgba(0,70,173,0.12)",
            },
            "&.Mui-focused fieldset": {
              borderColor: CUMMINS_BLUE,
              borderWidth: "1.5px",
            },
            "&.Mui-disabled": {
              backgroundColor: "#F0F2F4",
            },
          },
          "& .MuiInputLabel-root": {
            fontWeight: 500,
            fontSize: "0.875rem",
          },
          "& .MuiFormHelperText-root": {
            marginTop: 4,
            fontSize: "0.75rem",
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600,
          fontSize: "0.75rem",
          height: 26,
        },
        sizeSmall: {
          height: 22,
          fontSize: "0.7rem",
        },
        filled: {
          "&.MuiChip-colorPrimary": {
            backgroundColor: CUMMINS_LIGHT,
            color: CUMMINS_BLUE,
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: "0 1px 0 rgba(0,0,0,0.07)",
          borderBottom: "1px solid rgba(0,0,0,0.06)",
          backdropFilter: "blur(10px)",
          backgroundColor: "rgba(255,255,255,0.96)",
          color: "#1A1A2E",
        },
      },
    },
    MuiToolbar: {
      styleOverrides: {
        root: {
          minHeight: 56,
          "@media (min-width: 600px)": {
            minHeight: 56,
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          padding: "10px 16px",
          animation: "slideDown 0.25s ease-out",
          fontSize: "0.875rem",
          alignItems: "center",
        },
        standardError: {
          backgroundColor: "#FDEDED",
          color: "#5F2120",
          border: "1px solid rgba(211,47,47,0.2)",
        },
        standardSuccess: {
          backgroundColor: "#EDF7ED",
          color: "#1E4620",
          border: "1px solid rgba(46,125,50,0.2)",
        },
        standardWarning: {
          backgroundColor: "#FFF3E0",
          color: "#663C00",
          border: "1px solid rgba(237,108,2,0.2)",
        },
        standardInfo: {
          backgroundColor: "#E1F5FE",
          color: "#01579B",
          border: "1px solid rgba(2,136,209,0.2)",
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
          boxShadow: "0 24px 64px rgba(0,0,0,0.14)",
          animation: "scaleIn 0.2s ease-out",
          border: "1px solid rgba(0,0,0,0.06)",
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          padding: "20px 24px 16px",
          fontSize: "1.05rem",
          fontWeight: 700,
          letterSpacing: -0.1,
          borderBottom: "1px solid rgba(0,0,0,0.07)",
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: "20px 24px",
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: "12px 20px 16px",
          borderTop: "1px solid rgba(0,0,0,0.07)",
          gap: 8,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          padding: "12px 16px",
          fontSize: "0.875rem",
          borderBottom: "1px solid rgba(0,0,0,0.06)",
        },
        head: {
          fontWeight: 700,
          fontSize: "0.75rem",
          textTransform: "uppercase",
          letterSpacing: 0.5,
          backgroundColor: "#F4F6F8",
          color: "#5A5D72",
          padding: "10px 16px",
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          transition: "background-color 0.15s ease",
          "&:hover": {
            backgroundColor: "rgba(0,70,173,0.025)",
          },
          "&.Mui-selected": {
            backgroundColor: "rgba(0,70,173,0.06)",
          },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: "none",
          boxShadow: "4px 0 24px rgba(0,0,0,0.08)",
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          marginRight: 8,
          transition: "all 0.18s ease",
          "&.Mui-selected": {
            backgroundColor: CUMMINS_LIGHT,
            "&:hover": { backgroundColor: CUMMINS_LIGHT },
          },
          "&:focus-visible": {
            outline: `2px solid ${CUMMINS_BLUE}`,
            outlineOffset: "-2px",
          },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          height: 6,
          backgroundColor: "rgba(0,0,0,0.07)",
        },
        bar: {
          borderRadius: 4,
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: "rgba(0,0,0,0.07)",
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          borderRadius: 8,
          fontSize: "0.75rem",
          fontWeight: 500,
          backgroundColor: "rgba(26,26,46,0.92)",
          backdropFilter: "blur(4px)",
          padding: "6px 10px",
        },
        arrow: {
          color: "rgba(26,26,46,0.92)",
        },
      },
    },
    MuiBackdrop: {
      styleOverrides: {
        root: {
          backgroundColor: "rgba(0,0,0,0.3)",
          backdropFilter: "blur(2px)",
        },
      },
    },
    MuiCircularProgress: {
      defaultProps: {
        thickness: 3.5,
      },
    },
    MuiInputAdornment: {
      styleOverrides: {
        root: {
          "& .MuiTypography-root": { fontSize: "0.875rem" },
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: 10,
          boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
          border: "1px solid rgba(0,0,0,0.06)",
        },
        list: {
          padding: "6px",
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: "8px 12px",
          marginBottom: "2px",
          "&:last-child": { marginBottom: 0 },
          "&:hover": {
            backgroundColor: "rgba(0,70,173,0.06)",
          },
          "&.Mui-selected": {
            backgroundColor: "rgba(0,70,173,0.1)",
            "&:hover": { backgroundColor: "rgba(0,70,173,0.14)" },
          },
          "&:focus-visible": {
            outline: `2px solid #0046AD`,
            outlineOffset: "-2px",
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        icon: {
          color: "rgba(0,0,0,0.35)",
          "&:hover": { color: "rgba(0,0,0,0.6)" },
        },
      },
    },
    MuiSkeleton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
  },
});
