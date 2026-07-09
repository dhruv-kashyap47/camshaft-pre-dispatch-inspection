import { useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import FindInPageIcon from "@mui/icons-material/FindInPage";
import api from "../api/client";
import PageHeader from "../components/PageHeader";
import ErrorAlert from "../components/ErrorAlert";
import StatusChip from "../components/StatusChip";

const SEARCH_FIELDS = [
  { value: "inspection_no", label: "Inspection Number" },
  { value: "machine_code", label: "Part Number" },
  { value: "serial_number", label: "Serial Number" },
  { value: "vendor", label: "Vendor" },
  { value: "operator_name", label: "Operator" },
  { value: "full_name", label: "Manager" },
];

export default function GlobalSearchPage() {
  const [searchField, setSearchField] = useState("inspection_no");
  const [searchValue, setSearchValue] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const navigate = useNavigate();

  async function doSearch() {
    if (!searchValue.trim()) return;
    setLoading(true);
    setError(null);
    setHasSearched(true);
    try {
      const params = { [searchField]: searchValue.trim() };
      const res = await api.get("/investigation/search", { params });
      setResults(res.data || []);
    } catch (err) {
      setError(err.response?.data?.detail || "Search failed");
    } finally {
      setLoading(false);
    }
  }

  function clearSearch() {
    setSearchValue("");
    setResults([]);
    setHasSearched(false);
    setError(null);
  }

  const statusColor = (s) => {
    if (s === "APPROVED") return "success";
    if (s === "REJECTED") return "error";
    if (s === "SUBMITTED") return "warning";
    return "default";
  };

  return (
    <Stack spacing={3} sx={{ animation: "fadeIn 0.35s ease-out" }}>
      <PageHeader
        icon={<SearchIcon />}
        title="Global Search"
        subtitle="Search across all inspections by any field"
      />

      <ErrorAlert error={error} onClose={() => setError(null)} />

      <Card className="no-lift">
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="subtitle2">Search Criteria</Typography>
            <Grid container spacing={2} alignItems="flex-end" component="form" role="search"
              aria-label="Global search" onSubmit={(e) => { e.preventDefault(); doSearch(); }}>
              <Grid item xs={12} sm={4}>
                <TextField select label="Search By" size="small" fullWidth value={searchField}
                  onChange={(e) => setSearchField(e.target.value)}>
                  {SEARCH_FIELDS.map((f) => (
                    <MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={5}>
                <TextField label="Search Value" size="small" fullWidth value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder="Enter search term..."
                  inputProps={{ "aria-label": "Search value" }} />
              </Grid>
              <Grid item xs={6} sm={1.5}>
                <Button type="submit" variant="contained" fullWidth onClick={doSearch}
                  disabled={loading || !searchValue.trim()}
                  startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SearchIcon />}
                  sx={{ height: 36 }}>
                  Search
                </Button>
              </Grid>
              <Grid item xs={6} sm={1.5}>
                {hasSearched && (
                  <Button variant="text" fullWidth onClick={clearSearch}
                    startIcon={<ClearIcon />} sx={{ height: 36, color: "text.secondary" }}>
                    Clear
                  </Button>
                )}
              </Grid>
            </Grid>
          </Stack>
        </CardContent>
      </Card>

      {hasSearched && !loading && (
        <Typography variant="subtitle2" color="text.secondary">
          {results.length > 0
            ? `${results.length} result${results.length !== 1 ? "s" : ""} found`
            : "No results found."}
        </Typography>
      )}

      {!hasSearched && (
        <Stack alignItems="center" spacing={1} sx={{ py: 6 }}>
          <SearchIcon sx={{ fontSize: 48, color: "text.disabled" }} />
          <Typography variant="body2" color="text.secondary">
            Enter a search term above to find inspections.
          </Typography>
        </Stack>
      )}

      {hasSearched && !loading && results.length === 0 && (
        <Card className="no-lift">
          <CardContent>
            <Stack alignItems="center" spacing={1.5} sx={{ py: 4 }}>
              <FindInPageIcon sx={{ fontSize: 44, color: "text.disabled" }} />
              <Typography variant="body2" color="text.secondary">
                No inspections matched your search criteria.
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      )}

      <Stack spacing={1} role="list" aria-label="Search results">
        {results.map((r, index) => (
          <Card
            key={r.id}
            className="no-lift clickable"
            role="listitem"
            onClick={() => navigate(`/manager/review?inspection_id=${r.id}`)}
            sx={{
              cursor: "pointer",
              animation: `slideUp 0.3s ease-out ${index * 0.04}s both`,
              "&:hover": { boxShadow: "0 4px 16px rgba(0,0,0,0.07)" },
            }}
          >
            <CardContent sx={{ p: "12px 16px !important" }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Avatar sx={{
                    width: 28, height: 28, bgcolor: "rgba(0,70,173,0.1)", color: "primary.main",
                    fontSize: "0.6875rem", fontWeight: 700,
                  }}>
                      {r.inspection_no?.slice(-2)}
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle2" sx={{ lineHeight: 1.25 }}>{r.inspection_no}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {r.machine_code}{r.full_name ? ` · ${r.full_name}` : ""}
                      {r.operator_name ? ` · ${r.operator_name}` : ""}
                      {r.vendor ? ` · ${r.vendor}` : ""}
                    </Typography>
                  </Box>
                </Stack>
                <StatusChip status={r.status} />
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>
    </Stack>
  );
}
