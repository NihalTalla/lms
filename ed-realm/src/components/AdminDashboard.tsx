import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Users, BookOpen, Activity, TrendingUp, UserPlus, AlertCircle, CheckCircle2, FolderPlus, FileText, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import api from '../lib/api';

interface AdminDashboardProps {
  onNavigate: (page: string, data?: any) => void;
}

export function AdminDashboard({ onNavigate }: AdminDashboardProps) {
  const [overview, setOverview] = useState<any>(null);
  const [usersAnalytics, setUsersAnalytics] = useState<any>(null);
  const [submissionsAnalytics, setSubmissionsAnalytics] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;

    const loadDashboard = async () => {
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
        toast.error('Failed to load admin analytics');
      }
    };

    void loadDashboard();

    return () => {
      mounted = false;
    };
  }, []);

  const totalUsers = useMemo(() => {
    const byRole = overview?.totalUsers ?? {};
    return Object.values(byRole).reduce((sum: number, value: any) => sum + Number(value || 0), 0);
  }, [overview]);

  const activeCourses = overview?.totalCourses ?? courses.length;
  const systemHealth = overview ? 100 : 0;
  const growthSeries = usersAnalytics?.newUsersPerWeek ?? [];
  const monthlyGrowth = growthSeries.length >= 2
    ? Math.max(
      0,
      Math.round(
        (((growthSeries[growthSeries.length - 1]?.count ?? 0) - (growthSeries[growthSeries.length - 2]?.count ?? 0)) /
          Math.max(1, growthSeries[growthSeries.length - 2]?.count ?? 1)) * 100
      )
    )
    : 0;

  const enrollmentData = growthSeries.map((row: any) => ({ month: row.week, students: row.count }));

  const courseDistribution = [
    { name: 'Published', value: courses.filter((c) => c.isPublished).length, color: '#14B8A6' },
    { name: 'Draft', value: courses.filter((c) => !c.isPublished).length, color: '#F59E0B' }
  ].filter((row) => row.value > 0);

  const submissionStats = submissionsAnalytics.slice(-7).map((row) => {
    const date = new Date(row.date);
    return {
      day: date.toLocaleDateString('en-US', { weekday: 'short' }),
      submissions: row.total
    };
  });

  const recentActivity = Array.isArray(overview?.recentActivity)
    ? overview.recentActivity.map((activity: any) => ({
      action: `Submission ${activity.status}`,
      detail: `${activity.user?.name ?? 'Unknown user'} • ${activity.problem?.title ?? 'Unknown problem'}`,
      time: new Date(activity.createdAt).toLocaleString(),
      status: activity.verdict === 'accepted' ? 'success' : 'warning'
    }))
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2>Admin Dashboard</h2>
          <p className="text-neutral-600 mt-1">
            System overview and platform analytics
          </p>
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2 text-neutral-900">
                <FolderPlus className="w-4 h-4 text-neutral-700" />
                Assessment
                <ChevronDown className="w-4 h-4 text-neutral-700" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onNavigate('assessment')}>
                <FileText className="w-4 h-4 mr-2" />
                Assessment Management
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" className="text-neutral-900" onClick={() => onNavigate('users')}>
            <UserPlus className="w-4 h-4 mr-2 text-neutral-700" />
            Add User
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate('users')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600 ">Total Users</p>
                <h3 className="mt-1">{totalUsers}</h3>
                <p className="text-xs text-green-600 mt-1">+{monthlyGrowth}% this month</p>
              </div>
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(124, 58, 237, 0.1)' }}>
                <Users className="w-6 h-6" style={{ color: 'var(--color-primary)' }} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate('courses')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600">Active Courses</p>
                <h3 className="mt-1">{activeCourses}</h3>
                <p className="text-xs text-neutral-600 mt-1">Published + draft inventory</p>
              </div>
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(20, 184, 166, 0.1)' }}>
                <BookOpen className="w-6 h-6" style={{ color: 'var(--color-secondary)' }} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => toast.success('All systems operational')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600">System Health</p>
                <h3 className="mt-1">{systemHealth}%</h3>
                <p className="text-xs text-green-600 mt-1">Analytics services reachable</p>
              </div>
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
                <Activity className="w-6 h-6" style={{ color: 'var(--color-accent)' }} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate('analytics')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600">Monthly Growth</p>
                <h3 className="mt-1">+{monthlyGrowth}%</h3>
                <p className="text-xs text-neutral-600 mt-1">User acquisition rate</p>
              </div>
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
                <TrendingUp className="w-6 h-6" style={{ color: 'var(--color-warning)' }} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>User Enrollment Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={enrollmentData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="month" stroke="#94A3B8" />
                <YAxis stroke="#94A3B8" />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="students"
                  stroke="#7C3AED"
                  strokeWidth={2}
                  dot={{ fill: '#7C3AED', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Course Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={courseDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {courseDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Weekly Submission Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={submissionStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="day" stroke="#94A3B8" />
                <YAxis stroke="#94A3B8" />
                <Tooltip />
                <Legend />
                <Bar dataKey="submissions" fill="#14B8A6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.length === 0 ? (
                <p className="text-sm text-neutral-500">No recent activity available.</p>
              ) : recentActivity.map((activity: any, index: number) => (
                <div key={index} className="flex gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${activity.status === 'success'
                      ? 'bg-green-100'
                      : 'bg-yellow-100'
                    }`}>
                    {activity.status === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-yellow-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{activity.action}</p>
                    <p className="text-xs text-neutral-600 truncate">{activity.detail}</p>
                    <p className="text-xs text-neutral-400 mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm">Active Students</h4>
              <Badge className="bg-green-100 text-green-700">Online</Badge>
            </div>
            <h3>{overview?.activeUsers ?? 0}</h3>
            <p className="text-sm text-neutral-600 mt-1">Users active in last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm">Avg. Completion Rate</h4>
              <Badge variant="outline">This Month</Badge>
            </div>
            <h3>
              {overview?.totalSubmissions
                ? `${Math.round(((overview.submissionsByVerdict?.accepted ?? 0) / Math.max(1, overview.totalSubmissions)) * 100)}%`
                : '0%'}
            </h3>
            <p className="text-sm text-neutral-600 mt-1">Accepted submissions ratio</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm">Support Tickets</h4>
              <Badge variant="outline" style={{ borderColor: 'var(--color-warning)', color: 'var(--color-warning)' }}>
                3 Pending
              </Badge>
            </div>
            <h3>{overview?.totalSubmissions ?? 0}</h3>
            <p className="text-sm text-neutral-600 mt-1">Total submissions processed</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
