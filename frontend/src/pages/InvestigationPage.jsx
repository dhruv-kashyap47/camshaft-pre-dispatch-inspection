import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
  Avatar,
  Tooltip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import TimelineIcon from "@mui/icons-material/Timeline";
import AssignmentIcon from "@mui/icons-material/Assignment";
import FindInPageIcon from "@mui/icons-material/FindInPage";
import PhotoCamera from "@mui/icons-material/PhotoCamera";

import api from "../api/client";

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "IN_PROGRESS", label: "In Progress" },
];

const EMPTY_FILTERS = {
  inspection_no: "",
  machine_code: "",
  status: "",
  date_from: "",
  date_to: "",
};

export function InvestigationPage() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedInspection, setSelectedInspection] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  async function search() {
    setLoading(true);
    setError(null);
    setHasSearched(true);
    try {
      const params = {};
      Object.entries(filters).forEach(([k, v]) => {
        if (v.trim()) params[k] = v.trim();
      });
      const response = await api.get("/investigation/search", { params });
      setResults(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Search failed");
    } finally {
      setLoading(false);
    }
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
    setResults([]);
    setSelectedInspection(null);
    setHasSearched(false);
  }

  async function viewDetail(inspectionId) {
    try {
      const response = await api.get(`/investigation/detail/${inspectionId}`);
      setSelectedInspection(response.data);
    } catch {
      setError("Failed to load inspection detail");
    }
  }

  const statusColor = (s) => {
    if (s === "APPROVED") return "success";
    if (s === "REJECTED") return "error";
    if (s === "SUBMITTED") return "warning";
    return "default";
  };

  const timelineActionColor = (action) => {
    if (action?.includes("APPROV")) return "#2E7D32";
    if (action?.includes("REJECT")) return "#D32F2F";
    if (action?.includes("SUBMIT")) return "#ED6C02";
    return "#0046AD";
  };

  const hasFilters = Object.values(filters).some((v) => v !== "");

  return (
    <Stack spacing={3} sx={{ animation: "fadeIn 0.35s ease-out" }}>
      {/* Page Header */}
      <Box>
        <Stack direction="row" spacing={1.25} alignItems="center">
          <AssignmentIcon color="primary" sx={{ fontSize: "1.5rem" }} />
          <Typography variant="h4" component="h1">Investigation Console</Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25, ml: "2.75rem" }}>
          Search inspections, view timelines, and audit trails
        </Typography>
      </Box>

      {/* Alerts */}
      <Box aria-live="polite" aria-atomic="true">
        {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
      </Box>

      {/* Search Form */}
      <Card className="no-lift" sx={{ animation: "slideDown 0.3s ease-out" }}>
        <CardContent>
          <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle2">Search Filters</Typography>
              {hasFilters && (
                <Button
                  size="small"
                  variant="text"
                  color="inherit"
                  startIcon={<ClearIcon />}
                  onClick={clearFilters}
                  sx={{ color: "text.secondary", "&:hover": { color: "text.primary" } }}
                >
                  Clear
                </Button>
              )}
            </Stack>
            <Grid
              container
              spacing={2}
              alignItems="flex-end"
              component="form"
              role="search"
              aria-label="Inspection search"
              onSubmit={(e) => { e.preventDefault(); search(); }}
            >
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  id="filter_inspection_no"
                  label="Inspection No"
                  size="small"
                  fullWidth
                  value={filters.inspection_no}
                  onChange={(e) => setFilters({ ...filters, inspection_no: e.target.value })}
                  inputProps={{ "aria-label": "Inspection number filter" }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  id="filter_machine_code"
                  label="Machine Code"
                  size="small"
                  fullWidth
                  value={filters.machine_code}
                  onChange={(e) => setFilters({ ...filters, machine_code: e.target.value })}
                  inputProps={{ "aria-label": "Machine code filter" }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  id="filter_status"
                  select
                  label="Status"
                  size="small"
                  fullWidth
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  inputProps={{ "aria-label": "Status filter" }}
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  id="filter_date_from"
                  label="From"
                  type="date"
                  size="small"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={filters.date_from}
                  onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
                  inputProps={{ "aria-label": "Date from filter" }}
                />
              </Grid>
              {/* CRITICAL FIX: date_to was in state but never rendered */}
              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  id="filter_date_to"
                  label="To"
                  type="date"
                  size="small"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={filters.date_to}
                  onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
                  inputProps={{ "aria-label": "Date to filter" }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SearchIcon />}
                  onClick={search}
                  disabled={loading}
                  sx={{ height: 36 }}
                >
                  {loading ? "Searching…" : "Search"}
                </Button>
              </Grid>
            </Grid>
          </Stack>
        </CardContent>
      </Card>

      {/* Results */}
      <Grid container spacing={3} alignItems="flex-start">
        <Grid item xs={12} md={selectedInspection ? 5 : 12}>
          {/* Results count */}
          {hasSearched && !loading && (
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
              {results.length > 0
                ? `${results.length} result${results.length !== 1 ? "s" : ""} found`
                : "No results found."}
            </Typography>
          )}

          {/* No results state */}
          {hasSearched && !loading && results.length === 0 && (
            <Card className="no-lift">
              <CardContent>
                <Stack alignItems="center" spacing={1.5} sx={{ py: 4 }}>
                  <FindInPageIcon sx={{ fontSize: 44, color: "text.disabled" }} />
                  <Typography variant="body2" color="text.secondary" textAlign="center">
                    No inspections matched your search criteria.
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          )}

          {/* Prompt when no search yet */}
          {!hasSearched && !loading && (
            <Stack alignItems="center" spacing={1} sx={{ py: 6 }}>
              <SearchIcon sx={{ fontSize: 44, color: "text.disabled" }} />
              <Typography variant="body2" color="text.secondary" textAlign="center">
                Use the filters above to search for inspections.
              </Typography>
            </Stack>
          )}

          {/* Result cards */}
          <Stack spacing={1} role="list" aria-label="Search results">
            {results.map((r, index) => {
              const isSelected = selectedInspection?.inspection?.id === r.id;
              return (
                <Card
                  key={r.id}
                  className="no-lift clickable"
                  role="listitem"
                  aria-current={isSelected ? "true" : undefined}
                  onClick={() => viewDetail(r.id)}
                  sx={{
                    cursor: "pointer",
                    border: isSelected ? "2px solid" : "1px solid",
                    borderColor: isSelected ? "primary.main" : "rgba(0,0,0,0.07)",
                    animation: `slideUp 0.3s ease-out ${index * 0.04}s both`,
                    transition: "border-color 0.18s ease, box-shadow 0.18s ease",
                    "&:hover": {
                      borderColor: isSelected ? "primary.main" : "rgba(0,70,173,0.3)",
                      boxShadow: "0 4px 16px rgba(0,0,0,0.07)",
                    },
                  }}
                >
                  <CardContent sx={{ p: "12px 16px !important" }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Avatar
                          sx={{
                            width: 28,
                            height: 28,
                            bgcolor: isSelected ? "primary.main" : "rgba(0,70,173,0.1)",
                            color: isSelected ? "#fff" : "primary.main",
                            fontSize: "0.6875rem",
                            fontWeight: 700,
                            transition: "all 0.18s ease",
                          }}
                        >
                          {r.inspection_no?.slice(-2)}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2" sx={{ lineHeight: 1.25 }}>
                            {r.inspection_no}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {r.machine_code}
                            {r.full_name ? ` · ${r.full_name}` : ""}
                          </Typography>
                        </Box>
                      </Stack>
                      <Chip size="small" label={r.status} color={statusColor(r.status)} />
                    </Stack>
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
        </Grid>

        {/* Detail Panel */}
        {selectedInspection && (
          <Grid item xs={12} md={7}>
            <Card
              className="no-lift"
              sx={{
                animation: "slideInLeft 0.28s ease-out",
                position: { md: "sticky" },
                top: { md: 80 },
                maxHeight: { md: "calc(100vh - 120px)" },
                overflowY: { md: "auto" },
              }}
            >
              <CardContent>
                <Stack spacing={2.5}>
                  {/* Detail Header */}
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      <Typography variant="h6" sx={{ lineHeight: 1.2 }}>
                        {selectedInspection.inspection?.inspection_no}
                      </Typography>
                      {selectedInspection.inspection?.machine_code && (
                        <Typography variant="caption" color="text.secondary">
                          Machine: {selectedInspection.inspection.machine_code}
                        </Typography>
                      )}
                    </Box>
                    <Chip
                      size="small"
                      label={selectedInspection.inspection?.status}
                      color={statusColor(selectedInspection.inspection?.status)}
                    />
                  </Stack>
                  <Divider />

                  {/* Timeline */}
                  {selectedInspection.timeline?.length > 0 && (
                    <Box>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.75 }}>
                        <TimelineIcon fontSize="small" color="primary" />
                        <Typography variant="subtitle2">Timeline</Typography>
                      </Stack>
                      <Stack spacing={0}>
                        {selectedInspection.timeline.map((entry, i) => {
                          const dotColor = timelineActionColor(entry.action);
                          const isLast = i === selectedInspection.timeline.length - 1;
                          return (
                            <Box
                              key={i}
                              sx={{
                                display: "flex",
                                alignItems: "flex-start",
                                gap: 1.5,
                                position: "relative",
                                pl: 0.5,
                                pb: isLast ? 0 : 2,
                                animation: `fadeIn 0.3s ease-out ${i * 0.06}s both`,
                              }}
                            >
                              {/* Connector line */}
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
                              {/* Dot */}
                              <Box
                                sx={{
                                  width: 10,
                                  height: 10,
                                  borderRadius: "50%",
                                  bgcolor: dotColor,
                                  mt: 0.5,
                                  flexShrink: 0,
                                  boxShadow: `0 0 0 3px ${dotColor}22`,
                                }}
                              />
                              <Box sx={{ flex: 1 }}>
                                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                                  <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
                                    {new Date(entry.timestamp).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </Typography>
                                  <Chip
                                    label={entry.action}
                                    size="small"
                                    variant="outlined"
                                    sx={{ borderColor: `${dotColor}44`, color: dotColor, fontWeight: 600 }}
                                  />
                                </Stack>
                                {entry.details && (
                                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
                                    {entry.details}
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                          );
                        })}
                      </Stack>
                    </Box>
                  )}

                  {/* Responses */}
                  {selectedInspection.responses?.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" gutterBottom sx={{ mb: 1.25 }}>
                        Responses
                      </Typography>
                      <Stack spacing={0.625}>
                        {selectedInspection.responses.map((r) => (
                          <Stack
                            key={r.id}
                            direction="row"
                            justifyContent="space-between"
                            alignItems="center"
                            sx={{
                              p: "8px 12px",
                              borderRadius: 2,
                              bgcolor: r.result === "OK" ? "rgba(46,125,50,0.04)" : "rgba(211,47,47,0.04)",
                              border: "1px solid",
                              borderColor: r.result === "OK" ? "rgba(46,125,50,0.15)" : "rgba(211,47,47,0.15)",
                            }}
                          >
                            <Typography variant="body2" fontWeight={500}>
                              Item #{r.checklist_item_id}
                            </Typography>
                            <Chip size="small" label={r.result} color={r.result === "OK" ? "success" : "error"} />
                          </Stack>
                        ))}
                      </Stack>
                    </Box>
                  )}

                  {/* Overrides */}
                  {selectedInspection.overrides?.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" gutterBottom color="warning.dark" sx={{ mb: 1.25 }}>
                        Overrides
                      </Typography>
                      {selectedInspection.overrides.map((o) => (
                        <Box
                          key={o.id}
                          sx={{
                            p: "10px 12px",
                            mb: 0.75,
                            borderRadius: 2,
                            bgcolor: "rgba(237,108,2,0.05)",
                            border: "1px solid rgba(237,108,2,0.2)",
                          }}
                        >
                          <Typography variant="body2" fontWeight={600}>
                            Item #{o.checklist_item_id}: {o.original_result} → {o.override_result}
                          </Typography>
                          {o.reason && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
                              {o.reason}
                            </Typography>
                          )}
                        </Box>
                      ))}
                    </Box>
                  )}

                  {/* Photos */}
                  {selectedInspection.photos?.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" gutterBottom sx={{ mb: 1 }}>
                        Photos ({selectedInspection.photos.length})
                      </Typography>
                      <Stack spacing={0.75}>
                        {selectedInspection.photos.map((p) => (
                          <Stack key={p.id} direction="row" spacing={0.75} alignItems="center">
                            <PhotoCamera sx={{ fontSize: 14, color: "text.secondary", flexShrink: 0 }} />
                            <Typography variant="body2" color="text.secondary">
                              {p.file_name}
                            </Typography>
                          </Stack>
                        ))}
                      </Stack>
                    </Box>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Stack>
  );
}
