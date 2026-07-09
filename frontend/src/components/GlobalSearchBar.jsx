import { useState, useCallback, useRef } from "react";
import {
  Autocomplete,
  Box,
  CircularProgress,
  InputAdornment,
  TextField,
  Typography,
  Chip,
  Stack,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { useNavigate } from "react-router-dom";
import api from "../api/client";

export default function GlobalSearchBar() {
  const [inputValue, setInputValue] = useState("");
  const [options, setOptions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const timerRef = useRef(null);

  const doSearch = useCallback(async (query) => {
    if (!query || query.length < 2) {
      setOptions([]);
      return;
    }
    setLoading(true);
    try {
      const response = await api.get("/investigation/search", {
        params: { inspection_no: query },
      });
      setOptions(response.data || []);
    } catch {
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (e, val) => {
    setInputValue(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (val && val.length >= 2) {
      timerRef.current = setTimeout(() => doSearch(val), 300);
    } else {
      setOptions([]);
    }
  };

  const handleSelect = (e, value) => {
    if (value?.id) {
      navigate(`/manager/review?inspection_id=${value.id}`);
      setInputValue("");
      setOptions([]);
    }
  };

  const statusColor = (s) => {
    if (s === "APPROVED") return "success";
    if (s === "REJECTED") return "error";
    if (s === "SUBMITTED") return "warning";
    return "default";
  };

  return (
    <Autocomplete
      open={open && (options.length > 0 || (inputValue.length >= 2 && loading))}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      inputValue={inputValue}
      onInputChange={handleInputChange}
      onChange={handleSelect}
      options={options}
      getOptionLabel={(opt) => opt.inspection_no || ""}
      isOptionEqualToValue={(opt, val) => opt.id === val.id}
      loading={loading}
      noOptionsText={inputValue.length < 2 ? "Type at least 2 characters" : "No results found"}
      sx={{ width: { xs: "100%", sm: 280 } }}
      renderOption={(props, option) => {
        const { key, ...rest } = props;
        return (
          <Box
            component="li"
            key={key}
            {...rest}
            sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", px: 2, py: 1 }}
          >
            <Stack spacing={0.25}>
              <Typography variant="body2" fontWeight={600}>
                {option.inspection_no}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {option.machine_code}
                {option.full_name ? ` · ${option.full_name}` : ""}
              </Typography>
            </Stack>
            <Chip
              size="small"
              label={option.status}
              color={statusColor(option.status)}
              variant="outlined"
              sx={{ height: 20, fontSize: "0.65rem" }}
            />
          </Box>
        );
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder="Search inspections..."
          size="small"
          InputProps={{
            ...params.InputProps,
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 18, color: "text.secondary" }} />
              </InputAdornment>
            ),
            endAdornment: (
              <>
                {loading ? <CircularProgress size={16} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              bgcolor: "rgba(255,255,255,0.06)",
              borderRadius: "20px",
              fontSize: "0.8125rem",
              "&:hover": { bgcolor: "rgba(255,255,255,0.1)" },
              "&.Mui-focused": { bgcolor: "rgba(255,255,255,0.12)" },
            },
          }}
        />
      )}
    />
  );
}
