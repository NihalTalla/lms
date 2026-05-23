import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Users, FileCode, Calendar, TrendingUp, AlertCircle, CheckCircle2, Clock, Eye, Video, BookOpen, Lock, Code2, Flame, Award, ChevronRight } from 'lucide-react';
import { batches, courses } from '../lib/data';
import { toast } from 'sonner';

interface TrainerDashboardProps {
  onNavigate: (page: string, data?: any) => void;
}

export function TrainerDashboard({ onNavigate }: TrainerDashboardProps) {
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<any>(null);
  const [replyText, setReplyText] = useState('');
  const [sessionData, setSessionData] = useState({ title: '', date: '', time: '', batch: '' });

  const activeBatches = batches.length;
  const totalStudents = batches.reduce((sum, batch) => sum + batch.students, 0);
  const pendingGrading = 0;
  const unansweredQuestions = 0;
  const activeTests = 0;

  const recentSubmissions: any[] = [];

  const activeTestSessions: any[] = [];

  const flaggedQuestions: any[] = [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-neutral-900">Trainer Dashboard</h2>
        <p className="text-neutral-600 mt-1">
          Monitor student progress, manage tests, and track performance
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600 font-medium">Active Batches</p>
                <h3 className="mt-1 text-2xl font-bold">{activeBatches}</h3>
              </div>
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(124, 58, 237, 0.1)' }}>
                <Users className="w-6 h-6" style={{ color: 'var(--color-primary)' }} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600 font-medium">Total Students</p>
                <h3 className="mt-1 text-2xl font-bold">{totalStudents}</h3>
              </div>
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(20, 184, 166, 0.1)' }}>
                <Users className="w-6 h-6" style={{ color: 'var(--color-secondary)' }} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600 font-medium">Active Tests</p>
                <h3 className="mt-1 text-2xl font-bold">{activeTests}</h3>
              </div>
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
                <FileCode className="w-6 h-6" style={{ color: 'var(--color-warning)' }} />
              </div>
            </div>
            <Button variant="link" className="p-0 h-auto mt-2 text-sm" onClick={() => onNavigate('tests')}>
              View Tests →
            </Button>
          </CardContent>
        </Card>
        <Card className="shadow-sm hover:shadow-md transition-shadow cursor-pointer bg-gradient-to-br from-blue-50 to-white border-blue-100" onClick={() => onNavigate('trainer-compiler')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between font-bold">
              <div>
                <p className="text-sm text-blue-600 font-bold uppercase tracking-wider">Coding Sandbox</p>
                <h3 className="mt-1 text-xl font-bold text-blue-900">Open Compiler</h3>
              </div>
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-blue-600 shadow-lg shadow-blue-200">
                <FileCode className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-xs text-blue-500 mt-2">Practice and share code with students</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Course Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.slice(0, 3).map((course) => (
              <div
                key={course.id}
                className="p-4 rounded-lg border border-neutral-200 hover:border-primary/30 hover:shadow-md transition-all group relative cursor-pointer"
                onClick={() => onNavigate('course-modules', course)}
              >
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Eye className="w-4 h-4 text-primary" />
                </div>
                <h4 className="font-semibold mb-1 group-hover:text-primary transition-colors">{course.title}</h4>
                <p className="text-xs text-neutral-600 mb-3 line-clamp-2">{course.description}</p>
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs capitalize">{course.level}</Badge>
                  <Button size="sm" variant="ghost" className="h-auto p-0 text-primary opacity-0 group-hover:opacity-100 transition-all">
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Test Sessions */}
          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Active Test Sessions</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => onNavigate('tests')}>
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activeTestSessions.map((test) => (
                  <div
                    key={test.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-neutral-200 hover:border-neutral-300 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(124, 58, 237, 0.1)' }}>
                        <Video className="w-6 h-6" style={{ color: 'var(--color-primary)' }} />
                      </div>
                      <div>
                        <p className="font-medium">{test.testName}</p>
                        <p className="text-sm text-neutral-600">{test.batch}</p>
                        <div className="flex items-center gap-4 mt-1 text-xs text-neutral-500">
                          <span>{test.students} students</span>
                          {test.flagged > 0 && (
                            <span className="text-red-600 font-medium">{test.flagged} flagged</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className="bg-green-100 text-green-700">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Active
                      </Badge>
                      <Button size="sm" variant="outline" onClick={() => onNavigate('test-monitoring', { testName: test.testName, batch: test.batch })}>
                        <Eye className="w-4 h-4 mr-1" />
                        Monitor
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Submissions */}
          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Submissions</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentSubmissions.map((submission) => (
                  <div
                    key={submission.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-neutral-200 hover:border-neutral-300 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
                          {submission.student.split(' ').map((n: string) => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{submission.student}</p>
                        <p className="text-sm text-neutral-600">{submission.problem}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-neutral-500">{submission.time}</span>
                      {submission.status === 'pending' ? (
                        <Badge variant="outline" style={{ borderColor: 'var(--color-warning)', color: 'var(--color-warning)' }}>
                          <Clock className="w-3 h-3 mr-1" />
                          Pending
                        </Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-700">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Graded
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Flagged Questions */}
          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" style={{ color: 'var(--color-danger)' }} />
                  <CardTitle>Flagged Questions</CardTitle>
                </div>
                <Button variant="ghost" size="sm" onClick={() => onNavigate('messages')}>
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {flaggedQuestions.map((question) => (
                  <div
                    key={question.id}
                    className="p-4 rounded-lg border border-neutral-200 hover:border-neutral-300 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback style={{ backgroundColor: 'var(--color-secondary)', color: 'white' }}>
                            {question.student.split(' ').map((n: string) => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{question.student}</p>
                          <p className="text-xs text-neutral-500">{question.time}</p>
                        </div>
                      </div>
                      <Badge variant="outline" style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}>
                        Urgent
                      </Badge>
                    </div>
                    <p className="text-sm text-neutral-700 mb-3">{question.question}</p>
                    <Button size="sm" style={{ backgroundColor: 'var(--color-primary)', color: 'white' }} onClick={() => {
                      setSelectedQuestion(question);
                      setReplyDialogOpen(true);
                    }}>
                      Reply
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Student Engagement (Streaks) */}
          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-500" />
                <CardTitle>Student Engagement</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3">
                {[].map((student: any, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-neutral-50 rounded-lg">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="text-[10px]">{student.avatar}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate">{student.name}</p>
                      <div className="flex items-center gap-1">
                        <Flame className="w-3 h-3 text-orange-500" />
                        <span className="text-xs font-bold text-orange-600">{student.streak}d streak</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          {/* My Batches */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>My Batches</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {batches.map((batch) => {
                const course = courses.find(c => c.id === batch.courseId);
                return (
                  <div
                    key={batch.id}
                    className="p-4 rounded-lg border border-neutral-200 hover:border-neutral-300 transition-colors cursor-pointer"
                    onClick={() => onNavigate('batches', batch)}
                  >
                    <h4 className="text-sm font-medium mb-1">{batch.name}</h4>
                    <p className="text-xs text-neutral-600 mb-3">{course?.title}</p>
                    <div className="flex items-center justify-between text-xs text-neutral-600">
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {batch.students} students
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {batch.schedule.split('-')[0].trim()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start text-blue-600 border-blue-100 hover:bg-blue-50" onClick={() => onNavigate('trainer-compiler')}>
                <Code2 className="w-4 h-4 mr-2" />
                Live Compiler (Sandbox)
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => onNavigate('batches')}>
                <Flame className="w-4 h-4 mr-2" />
                Student Streaks
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => onNavigate('leaderboard')}>
                <Award className="w-4 h-4 mr-2" />
                View Leaderboard
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => setScheduleDialogOpen(true)}>
                <Calendar className="w-4 h-4 mr-2" />
                Schedule Session
              </Button>
            </CardContent>
          </Card>

          {/* Upcoming Sessions */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Upcoming Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-neutral-500">No scheduled sessions yet.</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Schedule Session Dialog */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Live Session</DialogTitle>
            <DialogDescription>Create a new live session for your batch</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Session Title</Label>
              <Input
                placeholder="e.g., Trees & Graphs Deep Dive"
                value={sessionData.title}
                onChange={(e) => setSessionData({ ...sessionData, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Batch</Label>
              <Select value={sessionData.batch} onValueChange={(v) => setSessionData({ ...sessionData, batch: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select batch" />
                </SelectTrigger>
                <SelectContent>
                  {batches.map((batch) => (
                    <SelectItem key={batch.id} value={batch.id}>{batch.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={sessionData.date}
                  onChange={(e) => setSessionData({ ...sessionData, date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Time</Label>
                <Input
                  type="time"
                  value={sessionData.time}
                  onChange={(e) => setSessionData({ ...sessionData, time: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1"
                style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
                onClick={() => {
                  if (!sessionData.title || !sessionData.batch || !sessionData.date) {
                    toast.error('Please fill all required fields');
                    return;
                  }
                  toast.success(`Session "${sessionData.title}" scheduled successfully`);
                  setScheduleDialogOpen(false);
                  setSessionData({ title: '', date: '', time: '', batch: '' });
                }}
              >
                Schedule Session
              </Button>
              <Button variant="outline" onClick={() => setScheduleDialogOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reply to Question Dialog */}
      <Dialog open={replyDialogOpen} onOpenChange={setReplyDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reply to Question</DialogTitle>
            <DialogDescription>
              Responding to {selectedQuestion?.student}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-neutral-50 rounded-lg">
              <p className="text-sm font-medium mb-1">{selectedQuestion?.student}</p>
              <p className="text-sm text-neutral-600">{selectedQuestion?.question}</p>
            </div>
            <div className="space-y-2">
              <Label>Your Reply</Label>
              <Textarea
                placeholder="Type your response..."
                rows={4}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1"
                style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
                onClick={() => {
                  if (!replyText) {
                    toast.error('Please enter a reply');
                    return;
                  }
                  toast.success(`Reply sent to ${selectedQuestion?.student}`);
                  setReplyDialogOpen(false);
                  setReplyText('');
                  setSelectedQuestion(null);
                }}
              >
                Send Reply
              </Button>
              <Button variant="outline" onClick={() => setReplyDialogOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
