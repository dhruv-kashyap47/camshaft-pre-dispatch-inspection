import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  MenuItem,
  Skeleton,
  Stack,
  TextField,
  Typography,
  Chip,
} from "@mui/material";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
  Area,
  AreaChart,
} from "recharts";
import BarChartIcon from "@mui/icons-material/BarChart";
import RefreshIcon from "@mui/icons-material/Refresh";
import FileDownloadIcon from "@mui/icons-material/FileDownload";

import api from "../api/client";
import PageHeader from "../components/PageHeader";
import ErrorAlert from "../components/ErrorAlert";
import ExportButton from "../components/ExportButton";

const GRADIENT_COLORS = {
  blue: ["#0046AD", "#4A90D9"],
  green: ["#2E7D32", "#66BB6A"],
  red: ["#D32F2F", "#EF5350"],
  orange: ["#ED6C02", "#FF9800"],
  purple: ["#9C27B0", "#CE93D8"],
  teal: ["#0288D1", "#4FC3F7"],
};

const CHART_COLORS = ["#0046AD", "#2E7D32", "#D32F2F", "#ED6C02", "#9C27B0", "#0288D1"];
const PIE_COLORS = ["#2E7D32", "#D32F2F", "#ED6C02", "#0288D1", "#9C27B0", "#0046AD"];

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid rgba(0,0,0,0.06)",
  boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
  fontSize: 12,
  padding: "8px 12px",
  background: "rgba(255,255,255,0.98)",
};

const FILTER_OPTIONS = [
  { value: 7, label: "Last 7 days" },
  { value: 30, label: "Last 30 days" },
  { value: 90, label: "Last 90 days" },
  { value: 365, label: "Last year" },
];

function ChartSkeleton({ height = 300 }) {
  return (
    <Stack spacing={1}>
      <Skeleton variant="text" width="40%" height={28} />
      <Skeleton variant="rounded" height={height} />
    </Stack>
  );
}

function ChartCard({ title, children, height = 300 }) {
  return (
    <Card className="no-lift" sx={{
      borderRadius: 3,
      transition: "box-shadow 0.2s",
      "&:hover": { boxShadow: "0 4px 20px rgba(0,0,0,0.06)" },
    }}>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ fontSize: "0.9rem", fontWeight: 600 }}>
          {title}
        </Typography>
        <Box sx={{ height }} role="img" aria-label={title}>
          {children}
        </Box>
      </CardContent>
    </Card>
  );
}

function CustomBarShape(props) {
  const { fill, x, y, width, height } = props;
  const [c1, c2] = GRADIENT_COLORS.blue;
  return (
    <defs>
      <linearGradient id={`grad-${fill}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={c1} stopOpacity={1} />
        <stop offset="100%" stopColor={c2} stopOpacity={0.6} />
      </linearGradient>
    </defs>
  );
}

export default function ReportsDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [statusData, setStatusData] = useState([]);
  const [dailyData, setDailyData] = useState([]);
  const [machineData, setMachineData] = useState([]);
  const [photoStats, setPhotoStats] = useState([]);
  const [approvalTimeData, setApprovalTimeData] = useState([]);
  const [operatorProductivity, setOperatorProductivity] = useState([]);
  const [vendorQuality, setVendorQuality] = useState([]);

  const [days, setDays] = useState(30);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { days };
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const [statusRes, dailyRes, machineRes, photoRes, approvalRes, productivityRes, vendorRes] = await Promise.all([
        api.get("/reports/inspection-status", { params }),
        api.get("/reports/daily-summary", { params }),
        api.get("/reports/machine-summary", { params }).catch(() => ({ data: [] })),
        api.get("/reports/photo-statistics", { params }).catch(() => ({ data: [] })),
        api.get("/reports/approval-time", { params }).catch(() => ({ data: [] })),
        api.get("/reports/operator-productivity", { params }).catch(() => ({ data: [] })),
        api.get("/reports/vendor-quality", { params }).catch(() => ({ data: [] })),
      ]);

      setStatusData(statusRes.data || []);
      setDailyData(dailyRes.data || []);
      setMachineData(machineRes.data || []);
      setPhotoStats(photoRes.data || []);
      setApprovalTimeData(approvalRes.data || []);
      setOperatorProductivity(productivityRes.data || []);
      setVendorQuality(vendorRes.data || []);
    } catch {
      setError("Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, [days, dateFrom, dateTo]);

  useEffect(() => { loadReports(); }, [loadReports]);

  const okNotOkData = useMemo(() => {
    const ok = statusData.find((s) => s.label?.toUpperCase() === "APPROVED" || s.status === "APPROVED");
    const notOk = statusData.find((s) => s.label?.toUpperCase() === "REJECTED" || s.status === "REJECTED");
    const pending = statusData.find((s) => s.label?.toUpperCase() === "SUBMITTED" || s.status === "SUBMITTED");
    return [
      { name: "OK (Approved)", value: ok?.count ?? ok?.value ?? 0, color: "#2E7D32" },
      { name: "NOT OK (Rejected)", value: notOk?.count ?? notOk?.value ?? 0, color: "#D32F2F" },
      { name: "Pending", value: pending?.count ?? pending?.value ?? 0, color: "#ED6C02" },
    ].filter((d) => d.value > 0);
  }, [statusData]);

  const exportCSV = async () => {
    try {
      const res = await api.get("/reports/export", { params: { days, date_from: dateFrom, date_to: dateTo }, responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `reports-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {}
  };

  return (
    <Stack spacing={3} sx={{ animation: "fadeIn 0.35s ease-out" }}>
      <PageHeader
        icon={<BarChartIcon />}
        title="Reports"
        subtitle="Comprehensive inspection analytics"
        action={
          <Stack direction="row" spacing={1}>
            <TextField select size="small" value={days} onChange={(e) => setDays(Number(e.target.value))}
              sx={{ minWidth: 130 }} SelectProps={{ displayEmpty: true }}>
              {FILTER_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </TextField>
            <TextField size="small" type="date" label="From" InputLabelProps={{ shrink: true }}
              value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} sx={{ maxWidth: 130 }} />
            <TextField size="small" type="date" label="To" InputLabelProps={{ shrink: true }}
              value={dateTo} onChange={(e) => setDateTo(e.target.value)} sx={{ maxWidth: 130 }} />
            <Button variant="outlined" size="small" onClick={loadReports} disabled={loading}
              startIcon={loading ? <CircularProgress size={14} /> : <RefreshIcon />}>
              Refresh
            </Button>
            <ExportButton endpoint="/reports/export" filename={`reports-${new Date().toISOString().slice(0, 10)}`} />
          </Stack>
        }
      />

      <ErrorAlert error={error} onClose={() => setError(null)} />

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <ChartCard title="Inspection Trend">
            {loading ? <ChartSkeleton /> : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyData.length > 0 ? dailyData : [{ label: "No data", count: 0 }]}
                  margin={{ top: 4, right: 4, bottom: 4, left: -8 }}>
                  <defs>
                    <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0046AD" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#0046AD" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
                  <XAxis dataKey="label || 'date'" tick={{ fontSize: 10, fill: "#5A5D72" }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#5A5D72" }} axisLine={false} tickLine={false} />
                  <RechartsTooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="count || 'total'" stroke="#0046AD" strokeWidth={2.5}
                    fill="url(#trendGradient)" animationDuration={800} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <ChartCard title="OK vs NOT OK">
            {loading ? <ChartSkeleton /> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                    {PIE_COLORS.map((color, i) => (
                      <linearGradient key={i} id={`pieGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity={1} />
                        <stop offset="100%" stopColor={color} stopOpacity={0.6} />
                      </linearGradient>
                    ))}
                  </defs>
                  <Pie data={okNotOkData.length > 0 ? okNotOkData : [{ name: "No data", value: 1 }]}
                    dataKey="value" nameKey="name" cx="50%" cy="45%"
                    outerRadius={110} innerRadius={50} paddingAngle={3} animationDuration={800}>
                    {okNotOkData.map((entry, i) => (
                      <Cell key={i} fill={`url(#pieGrad${i})`} stroke={entry.color} strokeWidth={1} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={tooltipStyle} />
                  <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <ChartCard title="Vendor Quality">
            {loading ? <ChartSkeleton /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={vendorQuality.length > 0 ? vendorQuality.slice(0, 10) : [{ label: "No data", count: 0 }]}
                  layout="vertical" margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#5A5D72" }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="label" type="category" width={90}
                    tick={{ fontSize: 10, fill: "#5A5D72" }} axisLine={false} tickLine={false} />
                  <RechartsTooltip cursor={{ fill: "rgba(0,70,173,0.04)" }} contentStyle={tooltipStyle} />
                  <defs>
                    <linearGradient id="vendorGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#0046AD" stopOpacity={1} />
                      <stop offset="100%" stopColor="#4A90D9" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                  <Bar dataKey="approved || 'count'" fill="url(#vendorGrad)" radius={[0, 8, 8, 0]} maxBarSize={20} animationDuration={800} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <ChartCard title="Operator Performance">
            {loading ? <ChartSkeleton /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={operatorProductivity.length > 0 ? operatorProductivity.slice(0, 10)
                  : [{ employee_id: "No data", total: 0 }]}
                  margin={{ top: 4, right: 4, bottom: 4, left: -8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
                  <XAxis dataKey="employee_id || 'operator_name'" tick={{ fontSize: 10, fill: "#5A5D72" }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#5A5D72" }} axisLine={false} tickLine={false} />
                  <RechartsTooltip cursor={{ fill: "rgba(0,70,173,0.04)" }} contentStyle={tooltipStyle} />
                  <defs>
                    <linearGradient id="opTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0046AD" stopOpacity={1} />
                      <stop offset="100%" stopColor="#4A90D9" stopOpacity={0.6} />
                    </linearGradient>
                    <linearGradient id="opApproved" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2E7D32" stopOpacity={1} />
                      <stop offset="100%" stopColor="#66BB6A" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                  <Bar dataKey="total" fill="url(#opTotal)" radius={[6, 6, 0, 0]} maxBarSize={24} animationDuration={800} name="Total" />
                  <Bar dataKey="approved" fill="url(#opApproved)" radius={[6, 6, 0, 0]} maxBarSize={24} animationDuration={800} name="Approved" />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <ChartCard title="Average Inspection Time">
            {loading ? <ChartSkeleton /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={approvalTimeData.length > 0 ? approvalTimeData : [{ label: "No data", avg_minutes: 0 }]}
                  margin={{ top: 4, right: 4, bottom: 4, left: -8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
                  <XAxis dataKey="label || 'date'" tick={{ fontSize: 10, fill: "#5A5D72" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#5A5D72" }} axisLine={false} tickLine={false} unit="m" />
                  <RechartsTooltip cursor={{ fill: "rgba(0,70,173,0.04)" }} contentStyle={tooltipStyle} formatter={(v) => [`${v}m`, "Avg Time"]} />
                  <defs>
                    <linearGradient id="timeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#9C27B0" stopOpacity={1} />
                      <stop offset="100%" stopColor="#CE93D8" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                  <Bar dataKey="avg_minutes || 'time'" fill="url(#timeGrad)" radius={[8, 8, 0, 0]} maxBarSize={36} animationDuration={800} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <ChartCard title="Photo Upload Trend">
            {loading ? <ChartSkeleton /> : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={photoStats.length > 0 ? photoStats : [{ label: "No data", count: 0 }]}
                  margin={{ top: 4, right: 4, bottom: 4, left: -8 }}>
                  <defs>
                    <linearGradient id="photoGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#9C27B0" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#9C27B0" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
                  <XAxis dataKey="label || 'date'" tick={{ fontSize: 10, fill: "#5A5D72" }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#5A5D72" }} axisLine={false} tickLine={false} />
                  <RechartsTooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="count || 'total'" stroke="#9C27B0" strokeWidth={2.5}
                    fill="url(#photoGrad)" animationDuration={800} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </Grid>
      </Grid>
    </Stack>
  );
}

