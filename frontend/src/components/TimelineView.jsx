import { useState } from "react";
import {
  Box,
  Chip,
  Collapse,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

const ACTION_COLORS = {
  APPROVED: "#2E7D32",
  REJECTED: "#D32F2F",
  SUBMITTED: "#ED6C02",
  CREATED: "#0046AD",
  OVERRIDE: "#9C27B0",
  REVIEWED: "#0288D1",
  SUBMITTED_FOR_REVIEW: "#ED6C02",
  RESUBMITTED: "#FF8F00",
};

function getActionColor(action) {
  if (!action) return "#0046AD";
  const upper = action.toUpperCase();
  for (const [key, color] of Object.entries(ACTION_COLORS)) {
    if (upper.includes(key)) return color;
  }
  return "#0046AD";
}

export default function TimelineView({ events = [] }) {
  const [expanded, setExpanded] = useState({});

  const toggleExpand = (idx) => {
    setExpanded((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  if (events.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
        No timeline events available.
      </Typography>
    );
  }

  return (
    <Box sx={{ position: "relative" }}>
      {events.map((event, i) => {
        const dotColor = getActionColor(event.action);
        const isLast = i === events.length - 1;
        const isExpanded = expanded[i] || false;
        const hasDetails = event.details || event.actor || event.entity_type;

        return (
          <Box
            key={i}
            sx={{
              display: "flex",
              alignItems: "flex-start",
              gap: 1.5,
              position: "relative",
              pl: 0.5,
              pb: isLast ? 0 : 2.5,
              animation: `fadeIn 0.3s ease-out ${i * 0.05}s both`,
            }}
          >
            {!isLast && (
              <Box
                sx={{
                  position: "absolute",
                  left: "9px",
                  top: 18,
                  width: 2,
                  bottom: 0,
                  bgcolor: "rgba(0,0,0,0.08)",
                  borderRadius: 1,
                }}
              />
            )}
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                bgcolor: dotColor,
                mt: 0.5,
                flexShrink: 0,
                boxShadow: `0 0 0 3px ${dotColor}22`,
                animation: "statusPulse 2s ease-in-out infinite",
              }}
            />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    fontVariantNumeric: "tabular-nums",
                    whiteSpace: "nowrap",
                  }}
                >
                  {event.timestamp
                    ? new Date(event.timestamp).toLocaleString()
                    : event.created_at
                      ? new Date(event.created_at).toLocaleString()
                      : ""}
                </Typography>
                <Chip
                  label={event.action || "Unknown"}
                  size="small"
                  variant="outlined"
                  sx={{
                    borderColor: `${dotColor}44`,
                    color: dotColor,
                    fontWeight: 600,
                    fontSize: "0.7rem",
                  }}
                />
                {event.actor && (
                  <Typography variant="caption" color="text.secondary">
                    by {event.actor}
                  </Typography>
                )}
              </Stack>
              {event.entity_type && (
                <Typography variant="caption" color="text.disabled" sx={{ display: "block", mt: 0.15 }}>
                  {event.entity_type}
                  {event.entity_id ? ` #${event.entity_id}` : ""}
                </Typography>
              )}
              {hasDetails && (
                <>
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={0.5}
                    onClick={() => toggleExpand(i)}
                    sx={{
                      cursor: "pointer",
                      mt: 0.25,
                      "&:hover": { color: "primary.main" },
                    }}
                    role="button"
                    tabIndex={0}
                    aria-expanded={isExpanded}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleExpand(i);
                      }
                    }}
                  >
                    <ExpandMoreIcon
                      sx={{
                        fontSize: 14,
                        color: "text.disabled",
                        transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 0.2s ease",
                      }}
                    />
                    <Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.65rem" }}>
                      {isExpanded ? "Hide details" : "Show details"}
                    </Typography>
                  </Stack>
                  <Collapse in={isExpanded}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block", mt: 0.5, p: 1, bgcolor: "grey.50", borderRadius: 1 }}
                    >
                      {event.details || "No additional details"}
                    </Typography>
                  </Collapse>
                </>
              )}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
