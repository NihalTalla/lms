import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  TrendingUp,
  Users,
  BookOpen,
  Target,
  Activity,
  Download,
  Calendar
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { exportToCSV, exportToPDF } from '../lib/exportUtils';
import { toast } from 'sonner';
import api from '../lib/api';

interface AnalyticsPageProps {
  onNavigate: (page: string, data?: any) => void;
}

export function AnalyticsPage({ onNavigate }: AnalyticsPageProps) {
  const [timeRange, setTimeRange] = useState('30d');
  const [overview, setOverview] = useState<any>(null);
  const [usersAnalytics, setUsersAnalytics] = useState<any>(null);
  const [submissionsAnalytics, setSubmissionsAnalytics] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;

    const loadAnalytics = async () => {
      try {
        const [overviewRes, usersRes, submissionsRes, coursesRes] = await Promise.all([
          api.getAnalyticsOverview(),
          api.getAnalyticsUsers(),
          api.getAnalyticsSubmissions(),
          api.getCourses()
        ]);

        if (!mounted) return;
        setOverview(overviewRes ?? null);
        setUsersAnalytics(usersRes ?? null);
        setSubmissionsAnalytics(Array.isArray(submissionsRes) ? submissionsRes : []);
        setCourses(Array.isArray(coursesRes) ? coursesRes : []);
      } catch {
        if (!mounted) return;
        toast.error('Failed to load analytics data');
      }
    };

    void loadAnalytics();
    return () => {
      mounted = false;
    };
  }, []);

  const userEngagementData = useMemo(() => {
    const userWeeks = usersAnalytics?.newUsersPerWeek ?? [];
    if (!Array.isArray(userWeeks) || userWeeks.length === 0) return [];

    return userWeeks.map((row: any, index: number) => ({
      date: row.week,
      active: overview?.activeUsers ?? 0,
      new: row.count ?? 0,
      returning: Math.max(0, (overview?.activeUsers ?? 0) - (row.count ?? 0)),
      _index: index
    }));
  }, [usersAnalytics, overview]);

  const coursePerformanceData = useMemo(() => {
    return courses.slice(0, 8).map((course) => ({
      course: course.title,
      enrolled: 0,
      completed: 0
    }));
  }, [courses]);

  const exportReport = (format: 'excel' | 'pdf') => {
    const headers = ['Course', 'Published'];
    const rows = coursePerformanceData.map((course) => [
      course.course,
      'N/A'
    ]);

    if (format === 'pdf') {
      exportToPDF('analytics_report', 'Course Performance', headers, rows);
      toast.success('PDF export started');
    } else {
      exportToCSV('analytics_report', headers, rows);
      toast.success('Excel export started');
    }
  };

  const submissionsByVerdict = overview?.submissionsByVerdict ?? {};
  const submissionStatusData = Object.entries(submissionsByVerdict).map(([name, value], index) => ({
    name,
    value: Number(value || 0),
    color: ['#10B981', '#EF4444', '#F59E0B', '#8B5CF6', '#3B82F6'][index % 5]
  }));

  const submissionsSeries = submissionsAnalytics.map((row) => ({
    date: row.date,
    total: row.total,
    accepted: row.accepted
  }));

  const keyMetrics = {
    totalRevenue: 0,
    revenueGrowth: 0,
    activeUsers: overview?.activeUsers ?? 0,
    userGrowth: 0,
    avgEngagement: overview?.totalSubmissions
      ? Math.round(((overview.submissionsByVerdict?.accepted ?? 0) / Math.max(1, overview.totalSubmissions)) * 100)
      : 0,
    completionRate: overview?.totalSubmissions
      ? Math.round(((overview.submissionsByVerdict?.accepted ?? 0) / Math.max(1, overview.totalSubmissions)) * 100)
      : 0
  };

  const totalUsers = Object.values(overview?.totalUsers ?? {}).reduce((sum: number, value: any) => sum + Number(value || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2>Analytics Dashboard</h2>
          <p className="text-neutral-600 mt-1">
            Comprehensive insights and performance metrics
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-36 text-neutral-900">
              <Calendar className="w-4 h-4 mr-2 text-neutral-700" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="text-neutral-900">
                <Download className="w-4 h-4 mr-2 text-neutral-700" />
                Export Report
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportReport('excel')}>Export as Excel</DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportReport('pdf')}>Export as PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-neutral-600">Total Revenue</p>
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(124, 58, 237, 0.1)' }}>
                <TrendingUp className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
              </div>
            </div>
            <h3>${(keyMetrics.totalRevenue / 1000).toFixed(0)}K</h3>
            <div className="flex items-center gap-1 mt-2">
              <span className="text-xs text-neutral-500">Not yet wired to billing analytics</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-neutral-600">Active Users</p>
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(20, 184, 166, 0.1)' }}>
                <Users className="w-5 h-5" style={{ color: 'var(--color-secondary)' }} />
              </div>
            </div>
            <h3>{keyMetrics.activeUsers || totalUsers}</h3>
            <div className="flex items-center gap-1 mt-2">
              <TrendingUp className="w-3 h-3 text-green-600" />
              <span className="text-xs text-green-600">Live</span>
              <span className="text-xs text-neutral-500">from backend analytics</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-neutral-600">Avg. Engagement</p>
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
                <Activity className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />
              </div>
            </div>
            <h3>{keyMetrics.avgEngagement}%</h3>
            <div className="flex items-center gap-1 mt-2">
              <TrendingUp className="w-3 h-3 text-green-600" />
              <span className="text-xs text-green-600">Accepted ratio</span>
              <span className="text-xs text-neutral-500">of total submissions</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-neutral-600">Completion Rate</p>
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
                <Target className="w-5 h-5" style={{ color: 'var(--color-warning)' }} />
              </div>
            </div>
            <h3>{keyMetrics.completionRate}%</h3>
            <div className="flex items-center gap-1 mt-2">
              <span className="text-xs text-neutral-500">Derived from verdict distribution</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="engagement" className="space-y-6">
        <TabsList>
          <TabsTrigger value="engagement">User Engagement</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
        </TabsList>

        <TabsContent value="engagement" className="space-y-6">
          {/* User Engagement Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Daily Active Users</CardTitle>
                <CardDescription>Active, new, and returning users over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={userEngagementData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="date" stroke="#94A3B8" />
                    <YAxis stroke="#94A3B8" />
                    <Tooltip />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="active"
                      stackId="1"
                      stroke="#7C3AED"
                      fill="#7C3AED"
                      fillOpacity={0.6}
                    />
                    <Area
                      type="monotone"
                      dataKey="new"
                      stackId="2"
                      stroke="#14B8A6"
                      fill="#14B8A6"
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Submission Trend (30d)</CardTitle>
                <CardDescription>Total vs accepted submissions</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={submissionsSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="date" stroke="#94A3B8" />
                    <YAxis stroke="#94A3B8" />
                    <Tooltip />
                    <Bar dataKey="total" fill="#7C3AED" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="accepted" fill="#14B8A6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Submission Status */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Submission Status Distribution</CardTitle>
                <CardDescription>Breakdown of all code submissions</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={submissionStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {submissionStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>User Role Distribution</CardTitle>
                <CardDescription>Current users by role</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={Object.entries(usersAnalytics?.countsByRole ?? {}).map(([role, count]) => ({ role, count }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="role" stroke="#94A3B8" />
                    <YAxis stroke="#94A3B8" />
                    <Tooltip />
                    <Bar dataKey="count" fill="#10B981" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Course Catalog Snapshot</CardTitle>
                <CardDescription>Current courses returned by API</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={coursePerformanceData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis type="number" stroke="#94A3B8" />
                    <YAxis dataKey="course" type="category" stroke="#94A3B8" width={120} />
                    <Tooltip />
                    <Bar dataKey="enrolled" fill="#7C3AED" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Publication Status</CardTitle>
                <CardDescription>Published vs draft courses</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Published', value: courses.filter((course) => course.isPublished).length, color: '#10B981' },
                        { name: 'Draft', value: courses.filter((course) => !course.isPublished).length, color: '#F59E0B' }
                      ]}
                      cx="50%"
                      cy="50%"
                      dataKey="value"
                      outerRadius={110}
                      label
                    >
                      <Cell fill="#10B981" />
                      <Cell fill="#F59E0B" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Performance Notes</CardTitle>
              <CardDescription>Additional per-student/course performance endpoints are pending</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-neutral-600">
                This panel is waiting for dedicated leaderboard APIs. Once those APIs are exposed,
                this section can be wired for real-time rankings.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Analytics</CardTitle>
              <CardDescription>Awaiting billing/finance metrics endpoint integration</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-neutral-600">
                Billing APIs are available for operations, but aggregate revenue analytics are not yet exposed on this dashboard.
              </p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-neutral-600 mb-1">Course Sales</p>
                <h3>N/A</h3>
                <p className="text-sm text-neutral-500 mt-2">Pending analytics endpoint</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-neutral-600 mb-1">Subscriptions</p>
                <h3>N/A</h3>
                <p className="text-sm text-neutral-500 mt-2">Pending analytics endpoint</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-neutral-600 mb-1">Other Services</p>
                <h3>N/A</h3>
                <p className="text-sm text-neutral-500 mt-2">Pending analytics endpoint</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
