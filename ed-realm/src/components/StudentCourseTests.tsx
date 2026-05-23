import React, { useEffect, useMemo, useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { ArrowLeft, ArrowRight, BarChart3, CheckCircle2, ChevronRight, ClipboardList, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { useAuth } from '../lib/auth-context';
import { batches, Course } from '../lib/data';
import { loadTests, Test } from '../lib/test-store';
import { StudentTestSession } from './StudentTestSession';
import { getLatestResultForTest } from '../lib/test-results-store';
import { saveTestResult } from '../lib/test-results-store';
import { recordSubmission, getSubmissionCountsByDay } from '../lib/submission-store';
import { EdRealmLogo } from './EdRealmLogo';

interface StudentCourseTestsProps {
  course: Course;
  onBack: () => void;
}

const formatDateTime = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
};

export function StudentCourseTests({ course, onBack }: StudentCourseTestsProps) {
  const { currentUser } = useAuth();
  const [tests, setTests] = useState<Test[]>([]);
  const [showResultsDialog, setShowResultsDialog] = useState(false);
  const [showSubmissionsDialog, setShowSubmissionsDialog] = useState(false);
  const [activeTest, setActiveTest] = useState<Test | null>(null);
  const [showTestSession, setShowTestSession] = useState(false);
  const [highlightTestId, setHighlightTestId] = useState<string | null>(null);

  useEffect(() => {
    setTests(loadTests());
  }, []);

  const activeBatchId = course.batchId || currentUser?.batchId || '';
  const activeBatchName = useMemo(() => {
    if (!activeBatchId) return 'Your Batch';
    return batches.find(batch => batch.id === activeBatchId)?.name || 'Your Batch';
  }, [activeBatchId]);

  const filteredTests = useMemo(() => {
    if (!activeBatchId) return [];
    return tests.filter(test => test.batchId === activeBatchId);
  }, [tests, activeBatchId]);

  const orderedTests = useMemo(() => {
    if (filteredTests.length === 0) return [];
    const statusOrder: Record<Test['status'], number> = {
      active: 0,
      scheduled: 1,
      completed: 2,
      draft: 3,
    };
    const sorted = [...filteredTests].sort((a, b) => {
      const statusDiff = statusOrder[a.status] - statusOrder[b.status];
      if (statusDiff !== 0) return statusDiff;
      const dateA = new Date(a.startDate || a.createdAt || 0).getTime();
      const dateB = new Date(b.startDate || b.createdAt || 0).getTime();
      return dateB - dateA;
    });
    const current = sorted.find(test => test.status === 'active') || sorted.find(test => test.status === 'scheduled');
    if (!current) return sorted;
    return [current, ...sorted.filter(test => test.id !== current.id)];
  }, [filteredTests]);

  const statusStyles: Record<Test['status'], string> = {
    active: 'bg-green-100 text-green-700',
    scheduled: 'bg-blue-100 text-blue-700',
    completed: 'bg-neutral-100 text-neutral-700',
    draft: 'bg-neutral-100 text-neutral-700',
  };

  const resultsByTest = useMemo(() => {
    if (!currentUser) return [];
    return orderedTests.map(test => ({
      test,
      result: getLatestResultForTest(test.id, currentUser.id),
    }));
  }, [orderedTests, currentUser]);

  const totalScore = resultsByTest.reduce((sum, item) => sum + (item.result?.score || 0), 0);
  const totalPossible = resultsByTest.reduce((sum, item) => sum + (item.result?.total || item.test.questions.reduce((s, q) => s + q.points, 0)), 0);

  const submissionCounts = useMemo(() => {
    if (!currentUser) return [];
    return getSubmissionCountsByDay(currentUser.id, 7);
  }, [currentUser]);

  const todayCount = submissionCounts.length ? submissionCounts[submissionCounts.length - 1].count : 0;

  const completedCount = resultsByTest.filter(item => !!item.result).length;
  const completionPercent = orderedTests.length === 0 ? 0 : Math.round((completedCount / orderedTests.length) * 100);

  const getActionLabel = (test: Test, hasResult: boolean) => {
    if (test.status === 'scheduled') return 'Starts Soon';
    if (test.status === 'active') return hasResult ? 'Retake Test' : 'Start Test';
    return hasResult ? 'View Result' : 'View Test';
  };

  const handleOpenTest = (test: Test) => {
    if (test.status === 'scheduled') return;
    if (test.status === 'active') {
      setActiveTest(test);
      setShowTestSession(true);
      return;
    }
    setHighlightTestId(test.id);
    setShowResultsDialog(true);
  };

  const handleTestSubmit = (score: number, total: number) => {
    if (!currentUser || !activeTest) return;
    saveTestResult({
      testId: activeTest.id,
      userId: currentUser.id,
      score,
      total,
    });
    recordSubmission({
      userId: currentUser.id,
      type: 'test',
      meta: { testId: activeTest.id },
    });
    setShowTestSession(false);
    setActiveTest(null);
    setShowResultsDialog(true);
  };

  return (
    <div className="min-h-screen w-full bg-white text-neutral-900 font-sans flex flex-col">
      <header className="h-16 bg-white border-b border-neutral-200 flex items-center px-8 flex-shrink-0">
        <div className="flex items-center gap-4">
          <EdRealmLogo size="small" />
          <div className="h-6 w-px bg-neutral-200" />
          <Button variant="ghost" className="text-neutral-500 hover:text-neutral-900 p-0 h-auto" onClick={onBack}>
            <ArrowLeft className="w-5 h-5 mr-1" />
            Back
          </Button>
          <div className="h-6 w-px bg-neutral-200" />
          <div className="flex items-center gap-2 text-sm">
            <span className="text-neutral-500">{course.title}</span>
            <ChevronRight className="w-4 h-4 text-neutral-300" />
            <span className="font-bold text-neutral-900">Tests</span>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight text-neutral-900">{course.title}</h1>
              <p className="text-neutral-500">Track your tests and launch active assessments from one place.</p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setHighlightTestId(null);
                  setShowResultsDialog(true);
                }}
              >
                <ClipboardList className="w-4 h-4 mr-2" />
                Test Results
              </Button>
              <Button variant="outline" onClick={() => setShowSubmissionsDialog(true)}>
                <BarChart3 className="w-4 h-4 mr-2" />
                Submissions / Day
              </Button>
            </div>
          </div>

          <Card className="overflow-hidden border-neutral-200 shadow-sm bg-white">
            <div className="p-6 bg-white border-b border-neutral-100">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Completed Tests</p>
                  <p className="text-2xl font-bold text-neutral-900">{completedCount}/{orderedTests.length || 0}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Total Score</p>
                  <p className="text-2xl font-bold text-neutral-900">{totalScore}/{totalPossible}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Progress</p>
                    <span className="text-xs font-bold text-neutral-700">{completionPercent}%</span>
                  </div>
                  <Progress value={completionPercent} className="h-1.5 bg-neutral-200" indicatorClassName="bg-neutral-900" />
                </div>
              </div>
            </div>
            <CardContent className="p-0">
              {orderedTests.length === 0 ? (
                <div className="text-center py-12 text-neutral-500">
                  No tests published for your batch yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-neutral-50/50">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="px-6 py-3 font-bold text-neutral-500 uppercase text-[10px]">Test</TableHead>
                        <TableHead className="px-6 py-3 font-bold text-neutral-500 uppercase text-[10px]">Window</TableHead>
                        <TableHead className="px-6 py-3 font-bold text-neutral-500 uppercase text-[10px] text-center">Status</TableHead>
                        <TableHead className="px-6 py-3 font-bold text-neutral-500 uppercase text-[10px] text-center">Questions</TableHead>
                        <TableHead className="px-6 py-3 font-bold text-neutral-500 uppercase text-[10px] text-center">Marks</TableHead>
                        <TableHead className="px-6 py-3 font-bold text-neutral-500 uppercase text-[10px] text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orderedTests.map((test, index) => {
                        const result = currentUser ? getLatestResultForTest(test.id, currentUser.id) : null;
                        const totalMarks = test.questions.reduce((sum, question) => sum + question.points, 0);
                        const isCurrent = index === 0 && (test.status === 'active' || test.status === 'scheduled');
                        const actionLabel = getActionLabel(test, !!result);
                        return (
                          <TableRow key={test.id} className="hover:bg-neutral-50/50 transition-colors border-neutral-100">
                            <TableCell className="px-6 py-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-neutral-800">{test.title}</span>
                                  {isCurrent && (
                                    <Badge variant="outline" className="text-[10px] h-5">
                                      Current Test
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-[11px] text-neutral-500 flex items-center gap-3">
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5" />
                                    {test.duration} min
                                  </span>
                                  <span>{formatDateTime(test.startDate)} - {formatDateTime(test.endDate)}</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="px-6 py-4 text-sm text-neutral-600">
                              <div>{formatDateTime(test.startDate)}</div>
                              <div>{formatDateTime(test.endDate)}</div>
                            </TableCell>
                            <TableCell className="px-6 py-4 text-center">
                              <Badge className={statusStyles[test.status]}>
                                {test.status.charAt(0).toUpperCase() + test.status.slice(1)}
                              </Badge>
                            </TableCell>
                            <TableCell className="px-6 py-4 text-center">
                              <span className="text-sm font-semibold">{test.questions.length}</span>
                            </TableCell>
                            <TableCell className="px-6 py-4 text-center">
                              <span className="text-sm font-semibold">{result ? `${result.score}/${totalMarks}` : `-/${totalMarks}`}</span>
                            </TableCell>
                            <TableCell className="px-6 py-4 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={test.status === 'scheduled'}
                                className="h-8 px-4 font-bold text-xs text-orange-600 hover:bg-orange-50 hover:text-orange-700 rounded-full disabled:text-neutral-400 disabled:hover:bg-transparent"
                                onClick={() => handleOpenTest(test)}
                              >
                                {actionLabel}
                                <ArrowRight className="w-3.5 h-3.5 ml-2" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {showTestSession && activeTest && (
        <div className="fixed inset-0 z-[60] bg-white">
          <StudentTestSession
            test={activeTest}
            onCancel={() => {
              setShowTestSession(false);
              setActiveTest(null);
            }}
            onSubmit={handleTestSubmit}
          />
        </div>
      )}

      <Dialog open={showResultsDialog} onOpenChange={setShowResultsDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Test Results</DialogTitle>
            <DialogDescription>
              Marks for each test in this batch.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-neutral-200 p-4">
              <div>
                <div className="text-sm text-neutral-500">Total Score</div>
                <div className="text-2xl font-bold text-neutral-900">{totalScore}</div>
              </div>
              <div>
                <div className="text-sm text-neutral-500">Total Marks</div>
                <div className="text-2xl font-bold text-neutral-900">{totalPossible}</div>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Test</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resultsByTest.map(({ test, result }) => (
                  <TableRow key={test.id} className={highlightTestId === test.id ? 'bg-blue-50' : ''}>
                    <TableCell className="font-medium">{test.title}</TableCell>
                    <TableCell>{result ? result.score : '-'}</TableCell>
                    <TableCell>{result ? result.total : test.questions.reduce((s, q) => s + q.points, 0)}</TableCell>
                    <TableCell>
                      {result ? (
                        <Badge className="bg-green-100 text-green-700">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Submitted
                        </Badge>
                      ) : (
                        <Badge className="bg-neutral-100 text-neutral-700">Not Attempted</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showSubmissionsDialog} onOpenChange={setShowSubmissionsDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Submissions / Day</DialogTitle>
            <DialogDescription>
              Total submissions you have made in the LMS for each day.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border border-neutral-200 p-4 flex items-center justify-between">
              <div>
                <div className="text-sm text-neutral-500">Today</div>
                <div className="text-2xl font-bold text-neutral-900">{todayCount}</div>
              </div>
              <div className="text-sm text-neutral-500">
                {submissionCounts.length ? submissionCounts[submissionCounts.length - 1].date : '-'}
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Submissions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissionCounts.map((row) => (
                  <TableRow key={row.date}>
                    <TableCell>{row.date}</TableCell>
                    <TableCell>{row.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
