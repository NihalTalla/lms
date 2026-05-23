import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Trophy, Clock, CheckCircle2, TrendingUp, ArrowRight, Calendar, Code, Users, Flame } from 'lucide-react';
import { problems, courses, batches, assessments } from '../lib/data';
import { toast } from 'sonner';

interface StudentDashboardProps {
  onNavigate: (page: string, data?: any) => void;
}

export function StudentDashboard({ onNavigate }: StudentDashboardProps) {
  const [sessionDetailsOpen, setSessionDetailsOpen] = useState(false);
  const studentProgress = 0;
  const currentStreak = 0;
  const solvedProblems = 0;
  const totalPoints = 0;

  const recentSubmissions: any[] = [];

  const upcomingSession = {
    title: 'No upcoming session',
    date: '-',
    time: '-',
    instructor: '-',
  };

  const recommendedProblems = problems.slice(0, 3);
  const studentAssessments = assessments.filter(a => a.batchId === 'batch-1');
  const currentBatch = batches[0];
  const currentCourse = courses[0];

  return (
    <div className="space-y-4 sm:space-y-6">

      {/* Header */}
      <div>
        <h2 className="text-lg sm:text-xl font-bold">Welcome back, Emma! Let's start with backend development 👋</h2>
        <p className="text-sm text-neutral-600 mt-1">Here's your learning progress and upcoming activities</p>
      </div>

      {/* Stats Grid — 2 cols on mobile, 4 on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="pt-4 sm:pt-6 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-neutral-600">Course Progress</p>
                <h3 className="text-xl sm:text-2xl font-bold mt-1">{studentProgress}%</h3>
              </div>
              <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(124, 58, 237, 0.1)' }}>
                <TrendingUp className="w-4 h-4 sm:w-6 sm:h-6" style={{ color: 'var(--color-primary)' }} />
              </div>
            </div>
            <Progress value={studentProgress} className="mt-3" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 sm:pt-6 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-neutral-600">Problems Solved</p>
                <h3 className="text-xl sm:text-2xl font-bold mt-1">{solvedProblems}</h3>
              </div>
              <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
                <CheckCircle2 className="w-4 h-4 sm:w-6 sm:h-6" style={{ color: 'var(--color-accent)' }} />
              </div>
            </div>
            <p className="text-xs text-neutral-600 mt-2">+3 this week</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 sm:pt-6 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-neutral-600">Current Streak</p>
                <h3 className="text-xl sm:text-2xl font-bold mt-1">{currentStreak} days</h3>
              </div>
              <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
                <Flame className="w-4 h-4 sm:w-6 sm:h-6" style={{ color: 'var(--color-warning)' }} />
              </div>
            </div>
            <p className="text-xs text-neutral-600 mt-2">Keep it going!</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 sm:pt-6 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-neutral-600">Total Points</p>
                <h3 className="text-xl sm:text-2xl font-bold mt-1">{totalPoints.toLocaleString()}</h3>
              </div>
              <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(20, 184, 166, 0.1)' }}>
                <Trophy className="w-4 h-4 sm:w-6 sm:h-6" style={{ color: 'var(--color-secondary)' }} />
              </div>
            </div>
            <p className="text-xs text-neutral-600 mt-2">Rank #12</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">

          {/* Upcoming Live Session */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--color-danger)' }} />
                  <CardTitle className="text-base sm:text-lg">Upcoming Live Session</CardTitle>
                </div>
                <Badge variant="outline" className="text-xs shrink-0" style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}>
                  In 2 days
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <h4 className="text-sm sm:text-base font-semibold">{upcomingSession.title}</h4>
                  {/* Stack on mobile, row on desktop */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4 mt-2 text-sm text-neutral-600">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                      <span className="text-xs sm:text-sm">{upcomingSession.date}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span className="text-xs sm:text-sm">{upcomingSession.time}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5 text-sm text-neutral-600">
                    <Users className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-xs sm:text-sm">Instructor: {upcomingSession.instructor}</span>
                  </div>
                </div>
                <div className="flex gap-2 sm:gap-3">
                  <Button
                    size="sm"
                    className="flex-1 sm:flex-none"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                    onClick={() => {
                      toast.success('Joining session... Please wait');
                      setTimeout(() => toast.info('Live session will start in 2 days'), 1000);
                    }}
                  >
                    Join Session
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 sm:flex-none" onClick={() => setSessionDetailsOpen(true)}>
                    View Details
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Submissions */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base sm:text-lg">Recent Submissions</CardTitle>
                <Button variant="ghost" size="sm" className="text-xs sm:text-sm" onClick={() => onNavigate('problems')}>
                  View All <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 sm:space-y-3">
                {recentSubmissions.map((submission) => (
                  <div
                    key={submission.id}
                    className="flex items-center justify-between p-3 sm:p-4 rounded-lg border border-neutral-200 hover:border-neutral-300 hover:shadow-sm transition-all duration-200 cursor-pointer"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <Code className="w-4 h-4 text-neutral-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{submission.problemTitle}</p>
                        <p className="text-xs text-neutral-500">{submission.time}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {submission.status === 'accepted' ? (
                        <>
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-xs px-1.5">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Accepted
                          </Badge>
                          <span className="text-xs text-neutral-600 hidden sm:inline">+{submission.points} pts</span>
                        </>
                      ) : (
                        <Badge variant="outline" className="border-red-300 text-red-600 text-xs px-1.5">
                          Wrong
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recommended Problems */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">Recommended for You</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Based on your progress and learning path</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 sm:space-y-3">
                {recommendedProblems.length > 0 ? (
                  recommendedProblems.map((problem) => (
                    <div
                      key={problem.id}
                      className="flex items-center justify-between p-3 sm:p-4 rounded-lg border border-neutral-200 hover:border-neutral-300 hover:shadow-sm transition-all duration-200 cursor-pointer"
                      onClick={() => onNavigate('problem', problem)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm">{problem.title}</p>
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              problem.difficulty === 'easy'
                                ? 'border-green-300 text-green-700'
                                : problem.difficulty === 'medium'
                                ? 'border-yellow-300 text-yellow-700'
                                : 'border-red-300 text-red-700'
                            }`}
                          >
                            {problem.difficulty}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          {problem.tags.slice(0, 2).map((tag) => (
                            <span key={tag} className="text-xs px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className="text-xs text-neutral-600">{problem.points} pts</span>
                        <ArrowRight className="w-3.5 h-3.5 text-neutral-400" />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 rounded-lg border border-dashed border-neutral-200 text-sm text-neutral-600">
                    Problems will appear here once they are loaded from the API.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Assessments */}
          {studentAssessments.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg">Upcoming Assessments</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Tests and assessments for your batch</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 sm:space-y-3">
                  {studentAssessments.map((assessment) => (
                    <div
                      key={assessment.id}
                      className="p-3 sm:p-4 rounded-lg border border-neutral-200 hover:border-neutral-300 hover:shadow-sm transition-all duration-200 cursor-pointer"
                      onClick={() => toast.info('Assessment feature coming soon!')}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-sm">{assessment.name}</p>
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                assessment.status === 'published'
                                  ? 'border-green-300 text-green-700'
                                  : 'border-yellow-300 text-yellow-700'
                              }`}
                            >
                              {assessment.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-neutral-600 mt-1">{assessment.description}</p>
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-neutral-500 flex-wrap">
                            <span>{assessment.duration} mins</span>
                            <span>{assessment.totalMarks} marks</span>
                            <span>{assessment.questions.length} questions</span>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-neutral-400 shrink-0 mt-1" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4 sm:space-y-6">
          {/* Current Batch */}
          <Card className="cursor-pointer hover:shadow-md transition-all duration-200" onClick={() => onNavigate('problems')}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">Current Batch</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <h4 className="text-sm sm:text-base font-semibold">{currentBatch?.name ?? 'No active batch assigned'}</h4>
                  <p className="text-xs sm:text-sm text-neutral-600 mt-1">{currentCourse?.title ?? 'Course details will appear here'}</p>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-neutral-600">Progress</span>
                    <span>{studentProgress}%</span>
                  </div>
                  <Progress value={studentProgress} />
                </div>
                <div className="pt-1 space-y-1.5 text-xs sm:text-sm text-neutral-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    {currentBatch?.schedule ?? 'Schedule pending'}
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 shrink-0" />
                    {currentBatch?.students ?? 0} students
                  </div>
                </div>
                <Button size="sm" style={{ backgroundColor: 'var(--color-primary)' }} className="w-full">
                  View Problems <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick actions row on mobile */}
          <div className="grid grid-cols-2 gap-3 sm:hidden">
            <Card className="cursor-pointer" onClick={() => onNavigate('leaderboard')}>
              <CardContent className="pt-4 pb-4 flex flex-col items-center text-center gap-2">
                <Trophy className="w-6 h-6" style={{ color: 'var(--color-primary)' }} />
                <p className="text-xs font-semibold">Leaderboard</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer" onClick={() => onNavigate('code-practice')}>
              <CardContent className="pt-4 pb-4 flex flex-col items-center text-center gap-2">
                <Code className="w-6 h-6" style={{ color: 'var(--color-secondary)' }} />
                <p className="text-xs font-semibold">Practice</p>
              </CardContent>
            </Card>
          </div>

          {/* Leaderboard — desktop only */}
          <Card className="hidden sm:block">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Leaderboard</CardTitle>
              <CardDescription className="text-xs">See how you rank among your peers</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => onNavigate('leaderboard')} variant="outline" className="w-full" size="sm">
                View Leaderboard <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          {/* Monaco — desktop only */}
          <Card className="hidden sm:block">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Monaco</CardTitle>
              <CardDescription className="text-xs">Practice programs with Monaco Editor</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => onNavigate('code-practice')} style={{ backgroundColor: 'var(--color-primary)' }} className="w-full" size="sm">
                Start Practicing <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs sm:text-sm text-neutral-500">No recent activity yet.</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Session Details Dialog */}
      <Dialog open={sessionDetailsOpen} onOpenChange={setSessionDetailsOpen}>
        <DialogContent className="max-w-md mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle>Session Details</DialogTitle>
            <DialogDescription>Upcoming live session information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
              <h4 className="font-semibold text-sm sm:text-base">{upcomingSession.title}</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-neutral-500 shrink-0" />
                  <span className="text-sm">{upcomingSession.date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-neutral-500 shrink-0" />
                  <span className="text-sm">{upcomingSession.time}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-neutral-500 shrink-0" />
                  <span className="text-sm">Instructor: {upcomingSession.instructor}</span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <h5 className="font-medium text-sm">Topics Covered</h5>
              <ul className="text-sm text-neutral-600 list-disc list-inside space-y-1">
                <li>Binary Trees & Binary Search Trees</li>
                <li>Tree Traversals (DFS, BFS)</li>
                <li>Graph Representations</li>
                <li>Graph Algorithms Introduction</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h5 className="font-medium text-sm">Prerequisites</h5>
              <p className="text-sm text-neutral-600">Complete "Introduction to Trees" module before the session.</p>
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1"
                size="sm"
                style={{ backgroundColor: 'var(--color-primary)' }}
                onClick={() => { toast.success('Added to calendar'); setSessionDetailsOpen(false); }}
              >
                Add to Calendar
              </Button>
              <Button size="sm" variant="outline" onClick={() => setSessionDetailsOpen(false)}>Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
