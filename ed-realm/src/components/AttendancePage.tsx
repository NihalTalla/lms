import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Calendar, CheckCircle2, Clock, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../lib/auth-context';
import * as api from '../lib/api';

interface AttendanceSession {
  id: string;
  courseId: string;
  courseTitle: string;
  batchId?: string;
  createdAt: string;
  status: 'open' | 'closed';
  markedStudentIds: string[];
}

export function AttendancePage() {
  const { currentUser } = useAuth();
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [notifiedSessionId, setNotifiedSessionId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const items = (await api.getAttendanceSessions(currentUser?.batchId)) as any[];
        if (!mounted) return;
        // normalize marks -> markedStudentIds
        const normalized = items.map((s) => ({
          id: s.id,
          courseId: s.courseId,
          courseTitle: s.courseTitle,
          batchId: s.batchId,
          createdAt: s.createdAt,
          status: s.status,
          markedStudentIds: Array.isArray(s.marks) ? s.marks.map((m: any) => m.userId) : []
        }));
        setSessions(normalized);
      } catch (err) {
        // ignore for now
      }
    };

    load();
    const interval = window.setInterval(load, 5000);
    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [currentUser?.batchId]);

  const activeSession = sessions.find(s =>
    s.status === 'open' &&
    (!currentUser?.batchId || s.batchId === currentUser.batchId)
  );

  const hasMarkedToday = !!(activeSession && currentUser && activeSession.markedStudentIds.includes(currentUser.id));

  useEffect(() => {
    if (activeSession && !hasMarkedToday && notifiedSessionId !== activeSession.id) {
      toast.info('New attendance request posted');
      setNotifiedSessionId(activeSession.id);
    }
  }, [activeSession, hasMarkedToday, notifiedSessionId]);

  const relevantSessions = sessions
    .filter((session) => !currentUser?.batchId || session.batchId === currentUser.batchId)
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

  const attendanceRecords = relevantSessions.map((session, index) => {
    const createdAt = new Date(session.createdAt);
    const isMarked = !!currentUser && session.markedStudentIds.includes(currentUser.id);

    return {
      id: `${session.id}-${index}`,
      date: createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: isMarked ? createdAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '-',
      session: session.courseTitle,
      status: (isMarked ? 'present' : 'absent') as 'present' | 'absent'
    };
  });

  const attended = attendanceRecords.filter((record) => record.status === 'present').length;
  const absent = attendanceRecords.filter((record) => record.status === 'absent').length;
  const totalSessions = attendanceRecords.length;
  const stats = {
    totalSessions,
    attended,
    percentage: totalSessions > 0 ? Math.round((attended / totalSessions) * 100) : 0,
    onTime: attended,
    late: 0,
    absent
  };

  const handleMarkAttendance = async () => {
    if (!activeSession || !currentUser) return;
    if (activeSession.markedStudentIds.includes(currentUser.id)) return;
    try {
      await api.markAttendance(activeSession.id);
      // optimistic update
      setSessions((prev) => prev.map((s) => (s.id === activeSession.id ? { ...s, markedStudentIds: [...s.markedStudentIds, currentUser.id] } : s)));
      toast.success('Attendance marked successfully!');
    } catch (err) {
      toast.error('Could not mark attendance');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return (
          <Badge className="bg-green-100 text-green-700">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Present
          </Badge>
        );
      case 'late':
        return (
          <Badge className="bg-amber-100 text-amber-700">
            <Clock className="w-3 h-3 mr-1" />
            Late
          </Badge>
        );
      case 'absent':
        return (
          <Badge className="bg-red-100 text-red-700">
            <X className="w-3 h-3 mr-1" />
            Absent
          </Badge>
        );
      default:
        return null;
    }
  };

  const now = new Date();
  const today = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const currentMonthDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayStatusMap = new Map<number, 'present' | 'absent'>();

  attendanceRecords.forEach((record) => {
    const parsed = new Date(record.date);
    if (parsed.getMonth() === now.getMonth() && parsed.getFullYear() === now.getFullYear()) {
      dayStatusMap.set(parsed.getDate(), record.status);
    }
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2>Attendance</h2>
        <p className="text-neutral-600 mt-1">
          Mark and track your class attendance
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600">Attendance Rate</p>
                <h3 className="mt-1">{stats.percentage}%</h3>
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
                <CheckCircle2 className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />
              </div>
            </div>
            <div className="mt-3 h-2 bg-neutral-200 rounded-full overflow-hidden">
              <div
                className="h-full"
                style={{
                  backgroundColor: 'var(--color-accent)',
                  width: `${stats.percentage}%`,
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600">Present</p>
                <h3 className="mt-1">{stats.attended}</h3>
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-green-100">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <p className="text-xs text-neutral-600 mt-2">out of {stats.totalSessions} sessions</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600">Late</p>
                <h3 className="mt-1">{stats.late}</h3>
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-amber-100">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
            </div>
            <p className="text-xs text-neutral-600 mt-2">sessions</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600">Absent</p>
                <h3 className="mt-1">{stats.absent}</h3>
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-red-100">
                <X className="w-5 h-5 text-red-600" />
              </div>
            </div>
            <p className="text-xs text-neutral-600 mt-2">sessions</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Mark Attendance</CardTitle>
            <CardDescription>
              Record your attendance for today
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
                  <span className="text-sm font-medium">{activeSession ? 'Attendance Request' : 'No Active Session'}</span>
                </div>
                {activeSession ? (
                  <Badge style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>Active</Badge>
                ) : (
                  <Badge variant="outline">Inactive</Badge>
                )}
              </div>
              <p className="text-sm text-neutral-700 mb-1">{activeSession?.courseTitle || 'No attendance has been posted for you yet.'}</p>
              <p className="text-xs text-neutral-600">Monday, {today}</p>
              {activeSession && (
                <p className="text-xs text-neutral-600">Posted at {new Date(activeSession.createdAt).toLocaleTimeString()}</p>
              )}
            </div>

            {activeSession && !hasMarkedToday ? (
              <div className="space-y-3">
                <Button
                  className="w-full"
                  style={{ backgroundColor: 'var(--color-accent)' }}
                  onClick={handleMarkAttendance}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Mark Present
                </Button>
                <p className="text-xs text-neutral-600 text-center">
                  Click to mark your attendance for today's session
                </p>
              </div>
            ) : activeSession && hasMarkedToday ? (
              <div className="p-4 bg-green-50 rounded-lg border border-green-200 text-center">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-600" />
                <p className="text-sm font-medium text-green-700">Attendance Marked</p>
                <p className="text-xs text-green-600 mt-1">You're all set for today!</p>
              </div>
            ) : (
              <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200 text-center">
                <p className="text-sm text-neutral-600">No active attendance request.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attendance History */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Attendance History</CardTitle>
            <CardDescription>
              View your past attendance records
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {attendanceRecords.map((record) => (
                <div
                  key={record.id}
                  className="flex flex-col gap-3 p-4 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <p className="font-medium">{record.session}</p>
                      {getStatusBadge(record.status)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-neutral-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {record.date}
                      </div>
                      {record.time !== '-' && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {record.time}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Overview</CardTitle>
          <CardDescription>
            Your attendance pattern for the current month
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="grid min-w-[560px] grid-cols-7 gap-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-center text-xs font-medium text-neutral-600 py-2">
                  {day}
                </div>
              ))}
              {[...Array(currentMonthDays)].map((_, i) => {
                const day = i + 1;
                const status = dayStatusMap.get(day) ?? null;
                const hasSession = !!status;

                return (
                  <div
                    key={day}
                    className={`aspect-square flex items-center justify-center rounded-md text-sm ${
                      hasSession
                        ? status === 'present'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                        : 'bg-neutral-50 text-neutral-400'
                    }`}
                  >
                    {day}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex items-center justify-center gap-6 mt-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 rounded" />
              <span>Present</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-amber-100 rounded" />
              <span>Late</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-100 rounded" />
              <span>Absent</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-neutral-50 rounded border" />
              <span>No Session</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
