import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import BarChartIcon from "@mui/icons-material/BarChart";
import RefreshIcon from "@mui/icons-material/Refresh";

import api from "../api/client";

const CHART_COLORS = ["#0046AD", "#FF8F00", "#D32F2F", "#2E7D32"];

// Status-to-color mapping for daily summary boxes
const STATUS_STYLE = {
  APPROVED: { bg: "rgba(46,125,50,0.07)", border: "rgba(46,125,50,0.2)", count: "#2E7D32", label: "#5A5D72" },
  REJECTED: { bg: "rgba(211,47,47,0.06)", border: "rgba(211,47,47,0.18)", count: "#D32F2F", label: "#5A5D72" },
  SUBMITTED: { bg: "rgba(237,108,2,0.06)", border: "rgba(237,108,2,0.18)", count: "#ED6C02", label: "#5A5D72" },
  IN_PROGRESS: { bg: "rgba(0,70,173,0.06)", border: "rgba(0,70,173,0.15)", count: "#0046AD", label: "#5A5D72" },
};

function ChartSkeleton({ height = 300 }) {
  return (
    <Stack spacing={1}>
      <Skeleton variant="text" width="40%" height={28} />
      <Skeleton variant="rectangular" height={height} sx={{ borderRadius: 2 }} />
    </Stack>
  );
}

export function ReportsPage() {
  const [statusData, setStatusData] = useState([]);
  const [dailyData, setDailyData] = useState([]);
  const [machineData, setMachineData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
    setLoading(true);
    setError(null);
    try {
      const [statusRes, dailyRes, machineRes] = await Promise.all([
        api.get("/reports/inspection-status"),
        api.get("/reports/daily-summary"),
        api.get("/reports/machine-summary"),
      ]);
      setStatusData(statusRes.data);
      setDailyData(dailyRes.data);
      setMachineData(machineRes.data);
    } catch {
      setError("Failed to load reports");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Stack spacing={3} sx={{ animation: "fadeIn 0.35s ease-out" }}>
      {/* Page Header */}
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1}>
        <Box>
          <Stack direction="row" spacing={1.25} alignItems="center">
            <BarChartIcon color="primary" sx={{ fontSize: "1.5rem" }} />
            <Typography variant="h4" component="h1">Production Reports</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25, ml: "2.75rem" }}>
            Real-time inspection metrics and summaries
          </Typography>
        </Box>
        <Button
          variant="outlined"
          size="small"
          onClick={loadReports}
          disabled={loading}
          startIcon={<RefreshIcon />}
          sx={{ alignSelf: { xs: "flex-start", sm: "center" } }}
        >
          Refresh
        </Button>
      </Stack>

      {/* Alerts */}
      <Box aria-live="polite" aria-atomic="true">
        {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
      </Box>

      <Grid container spacing={3}>
        {/* Inspection Status Bar Chart */}
        <Grid item xs={12} md={6}>
          <Card className="no-lift" sx={{ animation: "slideUp 0.35s ease-out" }}>
            <CardContent>
              {loading ? (
                <ChartSkeleton />
              ) : (
                <>
                  <Typography variant="h6" gutterBottom>Inspection Status</Typography>
                  <Box
                    role="img"
                    aria-label="Bar chart showing inspection counts by status"
                    sx={{ height: 300 }}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={statusData} margin={{ top: 4, right: 4, bottom: 4, left: -8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 11, fill: "#5A5D72" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          allowDecimals={false}
                          tick={{ fontSize: 11, fill: "#5A5D72" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          cursor={{ fill: "rgba(0,70,173,0.04)" }}
                          contentStyle={{
                            borderRadius: 10,
                            border: "1px solid rgba(0,0,0,0.08)",
                            boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                            fontSize: 12,
                          }}
                        />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={52} animationDuration={700}>
                          {statusData.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Status Distribution Pie */}
        <Grid item xs={12} md={6}>
          <Card className="no-lift" sx={{ animation: "slideUp 0.35s ease-out 0.06s both" }}>
            <CardContent>
              {loading ? (
                <ChartSkeleton />
              ) : (
                <>
                  <Typography variant="h6" gutterBottom>Status Distribution</Typography>
                  <Box
                    role="img"
                    aria-label="Pie chart showing distribution of inspection statuses"
                    sx={{ height: 300 }}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusData}
                          dataKey="value"
                          nameKey="label"
                          cx="50%"
                          cy="45%"
                          outerRadius={100}
                          innerRadius={40}
                          paddingAngle={2}
                          animationDuration={700}
                        >
                          {statusData.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            borderRadius: 10,
                            border: "1px solid rgba(0,0,0,0.08)",
                            boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                            fontSize: 12,
                          }}
                        />
                        <Legend
                          iconType="circle"
                          iconSize={8}
                          wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Today's Summary */}
        {(loading || dailyData.length > 0) && (
          <Grid item xs={12}>
            <Card className="no-lift" sx={{ animation: "slideUp 0.35s ease-out 0.1s both" }}>
              <CardContent>
                {loading ? (
                  <Stack spacing={1.5}>
                    <Skeleton variant="text" width="30%" height={28} />
                    <Grid container spacing={2}>
                      {[0, 1, 2, 3].map((i) => (
                        <Grid item xs={6} sm={3} key={i}>
                          <Skeleton variant="rectangular" height={88} sx={{ borderRadius: 2 }} />
                        </Grid>
                      ))}
                    </Grid>
                  </Stack>
                ) : (
                  <>
                    <Typography variant="h6" gutterBottom>Today's Summary</Typography>
                    <Grid container spacing={2}>
                      {dailyData.map((d, i) => {
                        const style = STATUS_STYLE[d.status] || {
                          bg: "rgba(0,0,0,0.04)",
                          border: "rgba(0,0,0,0.1)",
                          count: "#1A1A2E",
                          label: "#5A5D72",
                        };
                        return (
                          <Grid item xs={6} sm={3} key={d.status}>
                            <Box
                              sx={{
                                textAlign: "center",
                                p: 2,
                                borderRadius: 2.5,
                                bgcolor: style.bg,
                                border: `1px solid ${style.border}`,
                                transition: "all 0.2s ease",
                                animation: `fadeIn 0.35s ease-out ${0.15 + i * 0.08}s both`,
                                "&:hover": {
                                  transform: "translateY(-2px)",
                                  boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
                                },
                              }}
                            >
                              <Typography
                                variant="h3"
                                sx={{ color: style.count, mb: 0.25 }}
                              >
                                {d.count}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{ color: style.label, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}
                              >
                                {d.status}
                              </Typography>
                            </Box>
                          </Grid>
                        );
                      })}
                    </Grid>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Machine Summary */}
        {(loading || machineData.length > 0) && (
          <Grid item xs={12}>
            <Card className="no-lift" sx={{ animation: "slideUp 0.35s ease-out 0.15s both" }}>
              <CardContent>
                {loading ? (
                  <ChartSkeleton height={260} />
                ) : (
                  <>
                    <Typography variant="h6" gutterBottom>Machine Summary</Typography>
                    <Box
                      role="img"
                      aria-label="Horizontal bar chart showing inspection counts per machine"
                      sx={{ height: Math.max(240, machineData.length * 48) }}
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={machineData}
                          layout="vertical"
                          margin={{ top: 4, right: 16, bottom: 4, left: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" horizontal={false} />
                          <XAxis
                            type="number"
                            tick={{ fontSize: 11, fill: "#5A5D72" }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            dataKey="machine_code"
                            type="category"
                            width={100}
                            tick={{ fontSize: 11, fill: "#5A5D72" }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip
                            cursor={{ fill: "rgba(0,70,173,0.04)" }}
                            contentStyle={{
                              borderRadius: 10,
                              border: "1px solid rgba(0,0,0,0.08)",
                              boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                              fontSize: 12,
                            }}
                          />
                          <Legend
                            iconType="circle"
                            iconSize={8}
                            wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                          />
                          <Bar dataKey="total_inspections" fill="#0046AD" radius={[0, 6, 6, 0]} name="Total" animationDuration={700} />
                          <Bar dataKey="approved" fill="#2E7D32" radius={[0, 6, 6, 0]} name="Approved" animationDuration={700} />
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Stack>
  );
}
