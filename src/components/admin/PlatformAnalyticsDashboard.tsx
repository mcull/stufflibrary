'use client';

import {
  Download as DownloadIcon,
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  Inventory as InventoryIcon,
  LocationOn as LocationIcon,
} from '@mui/icons-material';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  CircularProgress,
  Alert,
  Paper,
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { subDays, format } from 'date-fns';
import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index, ...other }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`analytics-tabpanel-${index}`}
      aria-labelledby={`analytics-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

interface TimeSeriesData {
  date: string;
  total: number;
  active?: number;
  pending?: number;
  approved?: number;
  returned?: number;
}

interface GeographicData {
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  user_count: number;
  item_count?: number;
}

interface EngagementData {
  userEngagement: Record<string, unknown>[];
  itemPopularity: Record<string, unknown>[];
  categoryAnalysis: Record<string, unknown>[];
  borrowSuccessRates: Record<string, unknown>[];
  userRetention: Record<string, unknown>[];
  libraryEngagement: Record<string, unknown>[];
}

export function PlatformAnalyticsDashboard() {
  const [activeTab, setActiveTab] = useState(0);
  const [timeRange, setTimeRange] = useState('30d');
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [selectedMetric, setSelectedMetric] = useState('users');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [geographicData, setGeographicData] = useState<GeographicData[]>([]);
  const [engagementData, setEngagementData] = useState<EngagementData | null>(
    null
  );

  useEffect(() => {
    fetchAnalyticsData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange, selectedMetric]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    setError(null);

    try {
      const startDateStr = startDate.toISOString();
      const endDateStr = endDate.toISOString();

      // Fetch time series data
      const timeSeriesResponse = await fetch(
        `/api/admin/analytics/time-series?metric=${selectedMetric}&period=day&startDate=${startDateStr}&endDate=${endDateStr}`
      );

      if (!timeSeriesResponse.ok) {
        throw new Error('Failed to fetch time series data');
      }

      const timeSeriesResult = await timeSeriesResponse.json();
      setTimeSeriesData(timeSeriesResult.data || []);

      // Fetch geographic data
      const geoResponse = await fetch(
        `/api/admin/analytics/geographic?metric=${selectedMetric}`
      );

      if (!geoResponse.ok) {
        throw new Error('Failed to fetch geographic data');
      }

      const geoResult = await geoResponse.json();
      setGeographicData(geoResult.data || []);

      // Fetch engagement data
      const engagementResponse = await fetch(
        `/api/admin/analytics/engagement?startDate=${startDateStr}&endDate=${endDateStr}`
      );

      if (!engagementResponse.ok) {
        throw new Error('Failed to fetch engagement data');
      }

      const engagementResult = await engagementResponse.json();
      setEngagementData(engagementResult);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch analytics data'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async (format: 'csv' | 'json', type: string) => {
    try {
      const response = await fetch('/api/admin/analytics/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          format,
          type,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      if (format === 'csv') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}_export_${format}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: 'application/json',
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}_export.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  const renderOverviewCards = () => {
    if (!engagementData) return null;

    const totalUsers = engagementData.userEngagement?.length || 0;
    const totalItems = engagementData.itemPopularity?.length || 0;
    const totalCategories = engagementData.categoryAnalysis?.length || 0;
    const avgEngagementScore =
      engagementData.userEngagement?.length > 0
        ? engagementData.userEngagement.reduce(
            (sum: number, user: Record<string, unknown>) =>
              sum + ((user.engagement_score as number) || 0),
            0
          ) / engagementData.userEngagement.length
        : 0;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <PeopleIcon color="primary" sx={{ mr: 2 }} />
              <Box>
                <Typography color="textSecondary" gutterBottom>
                  Active Users
                </Typography>
                <Typography variant="h4">{totalUsers}</Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <InventoryIcon color="success" sx={{ mr: 2 }} />
              <Box>
                <Typography color="textSecondary" gutterBottom>
                  Total Items
                </Typography>
                <Typography variant="h4">{totalItems}</Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <TrendingUpIcon color="warning" sx={{ mr: 2 }} />
              <Box>
                <Typography color="textSecondary" gutterBottom>
                  Categories
                </Typography>
                <Typography variant="h4">{totalCategories}</Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <LocationIcon color="info" sx={{ mr: 2 }} />
              <Box>
                <Typography color="textSecondary" gutterBottom>
                  Avg Engagement
                </Typography>
                <Typography variant="h4">
                  {avgEngagementScore.toFixed(1)}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderTimeSeriesChart = () => (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)}{' '}
          Over Time
        </Typography>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={timeSeriesData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickFormatter={(value) => format(new Date(value), 'MMM dd')}
            />
            <YAxis />
            <Tooltip
              labelFormatter={(value) =>
                format(new Date(value), 'MMM dd, yyyy')
              }
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="total"
              stroke="#8884d8"
              strokeWidth={2}
            />
            {selectedMetric === 'users' && (
              <Line
                type="monotone"
                dataKey="active"
                stroke="#82ca9d"
                strokeWidth={2}
              />
            )}
            {selectedMetric === 'borrowRequests' && (
              <>
                <Line
                  type="monotone"
                  dataKey="approved"
                  stroke="#00C49F"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="returned"
                  stroke="#FFBB28"
                  strokeWidth={2}
                />
              </>
            )}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );

  const renderCategoryAnalysisChart = () => {
    if (!engagementData?.categoryAnalysis) return null;

    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Category Analysis
          </Typography>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={engagementData.categoryAnalysis}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="item_count" fill="#8884d8" name="Item Count" />
              <Bar
                dataKey="borrow_requests"
                fill="#82ca9d"
                name="Borrow Requests"
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  };

  const renderBorrowSuccessChart = () => {
    if (!engagementData?.borrowSuccessRates) return null;

    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Borrow Success Rates
          </Typography>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={engagementData.borrowSuccessRates}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="week"
                tickFormatter={(value) => format(new Date(value), 'MMM dd')}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="approval_rate"
                stroke="#00C49F"
                strokeWidth={2}
                name="Approval Rate %"
              />
              <Line
                type="monotone"
                dataKey="completion_rate"
                stroke="#FFBB28"
                strokeWidth={2}
                name="Completion Rate %"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  };

  const renderUserRetentionChart = () => {
    if (!engagementData?.userRetention) return null;

    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            User Retention by Cohort
          </Typography>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={engagementData.userRetention}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="cohort_month"
                tickFormatter={(value) => format(new Date(value), 'MMM yyyy')}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area
                type="monotone"
                dataKey="retention_rate"
                stroke="#8884d8"
                fill="#8884d8"
                name="Retention Rate %"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  };

  const renderGeographicDistribution = () => (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Geographic Distribution
        </Typography>
        <Box sx={{ height: 400, overflow: 'auto' }}>
          {geographicData.slice(0, 20).map((location, index) => (
            <Paper
              key={index}
              sx={{
                p: 2,
                mb: 1,
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <Typography>
                {location.city}, {location.state}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedMetric === 'users'
                  ? `${location.user_count} users`
                  : `${location.item_count || 0} items`}
              </Typography>
            </Paper>
          ))}
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ width: '100%' }}>
        <Typography variant="h4" gutterBottom>
          Platform Analytics Dashboard
        </Typography>

        {/* Controls */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Metric</InputLabel>
            <Select
              value={selectedMetric}
              label="Metric"
              onChange={(e) => setSelectedMetric(e.target.value)}
            >
              <MenuItem value="users">Users</MenuItem>
              <MenuItem value="items">Items</MenuItem>
              <MenuItem value="borrowRequests">Borrow Requests</MenuItem>
              <MenuItem value="libraries">Libraries</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRange}
              label="Time Range"
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <MenuItem value="7d">Last 7 days</MenuItem>
              <MenuItem value="30d">Last 30 days</MenuItem>
              <MenuItem value="90d">Last 90 days</MenuItem>
              <MenuItem value="1y">Last year</MenuItem>
            </Select>
          </FormControl>

          <DatePicker
            label="Start Date"
            value={startDate}
            onChange={(newValue) => newValue && setStartDate(newValue)}
            slotProps={{ textField: { size: 'small' } }}
          />

          <DatePicker
            label="End Date"
            value={endDate}
            onChange={(newValue) => newValue && setEndDate(newValue)}
            slotProps={{ textField: { size: 'small' } }}
          />

          <Button
            variant="contained"
            onClick={fetchAnalyticsData}
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} /> : 'Refresh'}
          </Button>

          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => handleExportData('csv', selectedMetric)}
          >
            Export CSV
          </Button>

          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => handleExportData('json', 'analytics')}
          >
            Export JSON
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Overview Cards */}
        {renderOverviewCards()}

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
          >
            <Tab label="Time Series" />
            <Tab label="Geographic" />
            <Tab label="User Engagement" />
            <Tab label="Success Metrics" />
          </Tabs>
        </Box>

        <TabPanel value={activeTab} index={0}>
          {renderTimeSeriesChart()}
          {renderCategoryAnalysisChart()}
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          {renderGeographicDistribution()}
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          {renderUserRetentionChart()}
        </TabPanel>

        <TabPanel value={activeTab} index={3}>
          {renderBorrowSuccessChart()}
        </TabPanel>
      </Box>
    </LocalizationProvider>
  );
}
