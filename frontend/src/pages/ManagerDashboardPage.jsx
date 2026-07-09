import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  Skeleton,
  Stack,
  Typography,
  Tooltip,
  Avatar,
  AvatarGroup,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";
import AssignmentIcon from "@mui/icons-material/Assignment";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import PeopleIcon from "@mui/icons-material/People";
import TimerIcon from "@mui/icons-material/Timer";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TodayIcon from "@mui/icons-material/Today";
import RefreshIcon from "@mui/icons-material/Refresh";
import VisibilityIcon from "@mui/icons-material/Visibility";
import RateReviewIcon from "@mui/icons-material/RateReview";
import BarChartIcon from "@mui/icons-material/BarChart";
import FindInPageIcon from "@mui/icons-material/FindInPage";
import HistoryIcon from "@mui/icons-material/History";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import api from "../api/client";
import PageHeader from "../components/PageHeader";
import ErrorAlert from "../components/ErrorAlert";

const CHART_COLORS = ["#0046AD", "#2E7D32", "#D32F2F", "#ED6C02", "#9C27B0", "#0288D1"];
const PIE_COLORS = ["#2E7D32", "#D32F2F", "#ED6C02", "#0288D1"];

const tooltipStyle = {
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,0.08)",
  boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
  fontSize: 12,
};

function KpiCard({ label, value, icon, color, sub }) {
  return (
    <Card sx={{
      borderTop: `3px solid ${color}`,
      transition: "box-shadow 0.2s, transform 0.2s",
      "&:hover": { boxShadow: "0 4px 20px rgba(0,0,0,0.08)", transform: "translateY(-1px)" },
    }}>
      <CardContent sx={{ p: "16px 20px !important" }}>
        <Stack spacing={0.5}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.3, fontSize: "0.6rem" }}>
              {label}
            </Typography>
            <Box sx={{ color, opacity: 0.7, display: "flex" }}>{icon}</Box>
          </Stack>
          <Typography variant="h3" sx={{ color, fontWeight: 800, lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }}>
            {value ?? "—"}
          </Typography>
          {sub && <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.6rem" }}>{sub}</Typography>}
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function ManagerDashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [activity, setActivity] = useState([]);
  const [inspectionTrend, setInspectionTrend] = useState([]);
  const [statusBreakdown, setStatusBreakdown] = useState([]);
  const [vendorDist, setVendorDist] = useState([]);
  const [operatorPerf, setOperatorPerf] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashRes, activityRes, trendRes, statusRes, vendorRes, perfRes] = await Promise.all([
        api.get("/manager/dashboard"),
        api.get("/manager/recent-activity").catch(() => ({ data: [] })),
        api.get("/admin/dashboard/inspection-trend").catch(() => ({ data: [] })),
        api.get("/admin/dashboard/inspection-status-breakdown").catch(() => ({ data: [] })),
        api.get("/admin/dashboard/vendor-distribution").catch(() => ({ data: [] })),
        api.get("/admin/dashboard/operator-performance").catch(() => ({ data: [] })),
      ]);
      setDashboard(dashRes.data);
      setActivity(activityRes.data || []);
      setInspectionTrend(trendRes.data || []);
      setStatusBreakdown(statusRes.data || []);
      setVendorDist(vendorRes.data || []);
      setOperatorPerf(perfRes.data || []);
    } catch {
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const dash = dashboard || {};
  const kpis = {
    pendingApprovals: dash.pending_approvals ?? dash.pending ?? 0,
    submittedToday: dash.total_today ?? 0,
    approvedToday: dash.approved_today ?? 0,
    rejectedToday: dash.rejected_today ?? 0,
    activeOperators: dash.active_operators ?? 0,
    avgInspectionTime: dash.avg_inspection_time_minutes ?? 0,
  };

  const pendingQueue = useMemo(() => {
    return (activity || []).filter((a) => a.action?.includes("SUBMITTED") || a.action === "APPROVAL" || a.action === "REJECTION").slice(0, 10);
  }, [activity]);

  const latestSubmitted = useMemo(() => {
    return (activity || []).filter((a) => a.action === "SUBMITTED").slice(0, 5);
  }, [activity]);

  const latestApprovals = useMemo(() => {
    return (activity || []).filter((a) => a.action === "APPROVAL").slice(0, 5);
  }, [activity]);

  return (
    <Stack spacing={3} sx={{ animation: "fadeIn 0.35s ease-out" }}>
      <PageHeader
        icon={<AssignmentIcon />}
        title="Manager Dashboard"
        subtitle="Real-time inspection operations overview"
        action={
          <Button variant="outlined" size="small" onClick={loadData} disabled={loading}
            startIcon={loading ? <CircularProgress size={14} /> : <RefreshIcon />}>
            Refresh
          </Button>
        }
      />

      <ErrorAlert error={error} onClose={() => setError(null)} />

      {loading && !dashboard && (
        <Grid container spacing={2}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Grid item xs={6} md={2} key={i}>
              <Skeleton variant="rounded" height={110} />
            </Grid>
          ))}
        </Grid>
      )}

      {!loading && dashboard && (
        <>
          <Grid container spacing={2}>
            <Grid item xs={6} md={2}>
              <KpiCard label="Pending Approval" value={kpis.pendingApprovals} icon={<PendingActionsIcon />} color="#ED6C02" />
            </Grid>
            <Grid item xs={6} md={2}>
              <KpiCard label="Submitted Today" value={kpis.submittedToday} icon={<TodayIcon />} color="#0046AD" />
            </Grid>
            <Grid item xs={6} md={2}>
              <KpiCard label="Approved Today" value={kpis.approvedToday} icon={<CheckCircleIcon />} color="#2E7D32" />
            </Grid>
            <Grid item xs={6} md={2}>
              <KpiCard label="Rejected Today" value={kpis.rejectedToday} icon={<CancelIcon />} color="#D32F2F" />
            </Grid>
            <Grid item xs={6} md={2}>
              <KpiCard label="Operators Online" value={kpis.activeOperators} icon={<PeopleIcon />} color="#0288D1" />
            </Grid>
            <Grid item xs={6} md={2}>
              <KpiCard label="Avg Inspection Time" value={`${kpis.avgInspectionTime}m`} icon={<TimerIcon />} color="#9C27B0" />
            </Grid>
          </Grid>

          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Card className="no-lift" sx={{ height: "100%" }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ fontSize: "0.95rem", fontWeight: 600 }}>
                    Inspection Trend
                  </Typography>
                  <Box sx={{ height: 280 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={inspectionTrend.length > 0 ? inspectionTrend : [{ date: "No data", count: 0 }]} margin={{ top: 4, right: 8, bottom: 4, left: -8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#5A5D72" }} axisLine={false} tickLine={false} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#5A5D72" }} axisLine={false} tickLine={false} />
                        <RechartsTooltip contentStyle={tooltipStyle} />
                        <Line type="monotone" dataKey="count" stroke="#0046AD" strokeWidth={2.5}
                          dot={{ r: 3, fill: "#0046AD", strokeWidth: 0 }}
                          activeDot={{ r: 5, fill: "#0046AD" }}
                          animationDuration={800} />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card className="no-lift" sx={{ height: "100%" }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ fontSize: "0.95rem", fontWeight: 600 }}>
                    Approval Status
                  </Typography>
                  <Box sx={{ height: 280 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={statusBreakdown.length > 0 ? statusBreakdown : [{ status: "No data", count: 1 }]}
                          dataKey="count" nameKey="status" cx="50%" cy="45%"
                          outerRadius={90} innerRadius={40} paddingAngle={2} animationDuration={800}>
                          {statusBreakdown.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip contentStyle={tooltipStyle} />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card className="no-lift" sx={{ height: "100%" }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ fontSize: "0.95rem", fontWeight: 600 }}>
                    Vendor Distribution
                  </Typography>
                  <Box sx={{ height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={vendorDist.length > 0 ? vendorDist.slice(0, 10) : [{ label: "No data", count: 0 }]}
                        layout="vertical" margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 10, fill: "#5A5D72" }} axisLine={false} tickLine={false} />
                        <YAxis dataKey="label" type="category" width={100}
                          tick={{ fontSize: 10, fill: "#5A5D72" }} axisLine={false} tickLine={false} />
                        <RechartsTooltip cursor={{ fill: "rgba(0,70,173,0.04)" }} contentStyle={tooltipStyle} />
                        <Bar dataKey="count" fill="#0046AD" radius={[0, 6, 6, 0]} maxBarSize={24} animationDuration={800} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card className="no-lift" sx={{ height: "100%" }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ fontSize: "0.95rem", fontWeight: 600 }}>
                    Operator Performance
                  </Typography>
                  <Box sx={{ height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={operatorPerf.length > 0 ? operatorPerf.slice(0, 10) : [{ employee_id: "No data", total: 0 }]}
                        margin={{ top: 4, right: 8, bottom: 4, left: -8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                        <XAxis dataKey="employee_id" tick={{ fontSize: 10, fill: "#5A5D72" }} axisLine={false} tickLine={false} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#5A5D72" }} axisLine={false} tickLine={false} />
                        <RechartsTooltip cursor={{ fill: "rgba(0,70,173,0.04)" }} contentStyle={tooltipStyle} />
                        <Bar dataKey="total" fill="#0046AD" radius={[6, 6, 0, 0]} maxBarSize={32} animationDuration={800} />
                        <Bar dataKey="approved" fill="#2E7D32" radius={[6, 6, 0, 0]} maxBarSize={32} animationDuration={800} />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card className="no-lift" sx={{ height: "100%" }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ fontSize: "0.95rem", fontWeight: 600 }}>
                    Pending Queue
                  </Typography>
                  <Stack spacing={1} sx={{ maxHeight: 280, overflowY: "auto" }}>
                    {pendingQueue.length === 0 && (
                      <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
                        No pending items
                      </Typography>
                    )}
                    {pendingQueue.map((a, i) => (
                      <Stack key={a.id || i} direction="row" spacing={1} alignItems="center"
                        sx={{ p: "4px 8px", borderRadius: 1, "&:hover": { bgcolor: "rgba(0,0,0,0.03)" } }}>
                        <Box sx={{ width: 6, height: 6, borderRadius: "50%",
                          bgcolor: a.action === "APPROVAL" ? "success.main" : a.action === "REJECTION" ? "error.main" : "warning.main", flexShrink: 0 }} />
                        <Typography variant="caption" sx={{ flex: 1, fontWeight: 500, fontSize: "0.6rem" }}>
                          {a.details ? (typeof a.details === 'string' ? a.details.substring(0, 40) : "Action") : a.action}
                        </Typography>
                        <Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.55rem" }}>
                          {a.timestamp ? new Date(a.timestamp).toLocaleTimeString() : ""}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                  <Button size="small" variant="text" fullWidth sx={{ mt: 1 }} onClick={() => navigate("/manager")}
                    startIcon={<RateReviewIcon />}>
                    Review All
                  </Button>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card className="no-lift" sx={{ height: "100%" }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ fontSize: "0.95rem", fontWeight: 600 }}>
                    Latest Submissions
                  </Typography>
                  <Stack spacing={1} sx={{ maxHeight: 280, overflowY: "auto" }}>
                    {latestSubmitted.length === 0 && (
                      <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
                        No submissions today
                      </Typography>
                    )}
                    {latestSubmitted.map((a, i) => (
                      <Stack key={a.id || i} direction="row" spacing={1} alignItems="center"
                        sx={{ p: "4px 8px", borderRadius: 1, "&:hover": { bgcolor: "rgba(0,0,0,0.03)" } }}>
                        <TodayIcon sx={{ fontSize: 14, color: "primary.main", opacity: 0.6 }} />
                        <Typography variant="caption" sx={{ flex: 1, fontWeight: 500, fontSize: "0.6rem" }}>
                          {a.user_name || a.employee_id || "Operator"}
                        </Typography>
                        <Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.55rem" }}>
                          {a.timestamp ? new Date(a.timestamp).toLocaleTimeString() : ""}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card className="no-lift" sx={{ height: "100%" }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ fontSize: "0.95rem", fontWeight: 600 }}>
                    Recent Activity
                  </Typography>
                  <Stack spacing={1} sx={{ maxHeight: 280, overflowY: "auto" }}>
                    {activity.length === 0 && (
                      <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
                        No recent activity
                      </Typography>
                    )}
                    {activity.slice(0, 12).map((a, i) => (
                      <Stack key={a.id || i} direction="row" spacing={1} alignItems="flex-start"
                        sx={{ p: "4px 8px", borderRadius: 1, "&:hover": { bgcolor: "rgba(0,0,0,0.03)" } }}>
                        <Box sx={{ width: 6, height: 6, borderRadius: "50%", mt: 0.5, flexShrink: 0,
                          bgcolor: a.action?.includes("APPROV") ? "success.main" : a.action?.includes("REJECT") ? "error.main" : a.action?.includes("CREATE") ? "primary.main" : "grey.400" }} />
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="caption" fontWeight={600} sx={{ fontSize: "0.6rem", display: "block" }}>
                            {a.action || "Action"}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.55rem", display: "block" }}>
                            {a.user_name || ""} · {a.timestamp ? new Date(a.timestamp).toLocaleTimeString() : ""}
                          </Typography>
                        </Box>
                      </Stack>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card className="no-lift" sx={{ height: "100%" }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ fontSize: "0.95rem", fontWeight: 600 }}>
                    Latest Approvals
                  </Typography>
                  <Stack spacing={1} sx={{ maxHeight: 280, overflowY: "auto" }}>
                    {latestApprovals.length === 0 && (
                      <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
                        No approvals yet
                      </Typography>
                    )}
                    {latestApprovals.map((a, i) => (
                      <Stack key={a.id || i} direction="row" spacing={1} alignItems="center"
                        sx={{ p: "4px 8px", borderRadius: 1, "&:hover": { bgcolor: "rgba(0,0,0,0.03)" } }}>
                        <ThumbUpIcon sx={{ fontSize: 14, color: "success.main", opacity: 0.7 }} />
                        <Typography variant="caption" sx={{ flex: 1, fontWeight: 500, fontSize: "0.6rem" }}>
                          {a.user_name || a.employee_id || "—"}
                        </Typography>
                        <Chip size="small" label="Approved" color="success" variant="outlined" sx={{ height: 16, fontSize: "0.5rem" }} />
                      </Stack>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      )}
    </Stack>
  );
}
