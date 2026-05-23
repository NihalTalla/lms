import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import {
  Play,
  Send,
  Settings,
  Moon,
  Sun,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Info,
  FileCode,
  Save,
  Download,
  FolderOpen,
  Trash2
} from 'lucide-react';
import { Problem, Submission, TestCaseResult } from '../lib/data';
import api from '../lib/api';
import { toast } from 'sonner';
import Editor from '@monaco-editor/react';
import { FileManager, SavedFile } from '../lib/fileManager';
import { useAuth } from '../lib/auth-context';
import { recordSubmission } from '../lib/submission-store';
import { createRequestId } from '../lib/request-id';
import { EdRealmLogo } from './EdRealmLogo';
import { useIsMobile } from './ui/use-mobile';
import { submissionLifecycleManager } from '../lib/submission-lifecycle-manager';

interface CodeEditorProps {
  problem: Problem;
  onBack: () => void;
}

export function CodeEditor({ problem, onBack }: CodeEditorProps) {
  const { currentUser, accessToken } = useAuth();
  const isMobile = useIsMobile();
  const mobileTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const mobileGutterRef = useRef<HTMLDivElement | null>(null);
  const mobileEditorSectionRef = useRef<HTMLDivElement | null>(null);
  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState(
    problem.starterCode[language] || problem.starterCode.python || '// Write your solution here'
  );
  const allowedLanguages = ['python', 'java', 'cpp', 'c'];
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [output, setOutput] = useState<string>('');
  const [testResults, setTestResults] = useState<TestCaseResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<Submission['status'] | null>(null);
  const [recentSubmissions, setRecentSubmissions] = useState<Array<{
    id: string;
    status: string;
    verdict?: string | null;
    passedTests?: number | null;
    totalTests?: number | null;
    execTimeMs?: number | null;
    createdAt?: string;
  }>>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [memory, setMemory] = useState<number | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showFilesDialog, setShowFilesDialog] = useState(false);
  const [fileName, setFileName] = useState(`${problem.title} - Solution`);
  const [savedFiles, setSavedFiles] = useState<SavedFile[]>([]);

  const getStarterCode = (lang: string) => {
    return (
      problem.starterCode[lang] ||
      problem.starterCode.python ||
      '// Write your solution here'
    );
  };

  useEffect(() => {
    setCode(getStarterCode(language));
    loadSavedFiles();
  }, [language, problem]);

  useEffect(() => {
    let mounted = true;
    const loadRecentSubmissions = async () => {
      if (!accessToken) return;

      try {
        setLoadingSubmissions(true);
        const body: any = await api.getSubmissions(`?limit=5&problemId=${encodeURIComponent(problem.id)}`);
        const items = body?.data?.items ?? body?.items ?? body;
        if (!mounted) return;
        setRecentSubmissions(Array.isArray(items) ? items : []);
      } catch (err) {
        // swallow — UI shows empty state
      } finally {
        if (mounted) setLoadingSubmissions(false);
      }
    };

    void loadRecentSubmissions();

    return () => { mounted = false; };
  }, [accessToken, problem.id, submissionStatus]);

  const loadSavedFiles = () => {
    const files = FileManager.getFilesByProblem(problem.id);
    setSavedFiles(files);
  };

  const runCode = async () => {
    setIsRunning(true);
    setOutput('Running...\n');

    try {
      const compilerBase = (import.meta as any).env?.VITE_COMPILER_URL ?? '';
      const url = compilerBase ? `${compilerBase}/execute` : 'http://localhost:4000/execute';

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-Id': createRequestId()
        },
        body: JSON.stringify({
          language,
          code,
          stdin: '',
          timeoutMs: 5000,
          memoryMb: 128
        })
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        const requestId = res.headers.get('x-request-id') ?? undefined;
        const friendlyMessage = getFriendlyRunErrorMessage(res.status, res.statusText, text, requestId);
        setOutput(friendlyMessage);
        toast.error('Run failed', {
          description: friendlyMessage
        });
        setIsRunning(false);
        return;
      }

      const body = await res.json().catch(() => ({} as any));
      const stdout = typeof body.stdout === 'string' ? body.stdout : '';
      const stderr = typeof body.stderr === 'string' ? body.stderr : '';
      const execTime = typeof body.execTimeMs === 'number' ? body.execTimeMs : null;

      setOutput((stdout || '') + (stderr ? `\n--- STDERR ---\n${stderr}` : ''));
      setExecutionTime(execTime);
      setMemory(null);
      setIsRunning(false);
      toast.success('Run completed');
    } catch (err) {
      setOutput(`Execution error: ${err instanceof Error ? err.message : String(err)}`);
      setIsRunning(false);
      toast.error('Run failed');
    }
  };

  const saveFile = () => {
    if (!fileName.trim()) {
      toast.error('Please enter a file name');
      return;
    }

    try {
      FileManager.saveFile(fileName, code, language, problem.id);
      toast.success(`Solution saved as "${fileName}"`);
      setShowSaveDialog(false);
      loadSavedFiles();
    } catch (error) {
      toast.error('Error saving file');
    }
  };

  const downloadFile = (file: SavedFile) => {
    try {
      FileManager.downloadFile(file);
      toast.success(`Downloaded ${file.name}`);
    } catch (error) {
      toast.error('Error downloading file');
    }
  };

  const deleteFile = (id: string, name: string) => {
    if (FileManager.deleteFile(id)) {
      toast.success(`File "${name}" deleted`);
      loadSavedFiles();
    } else {
      toast.error('Error deleting file');
    }
  };

  const loadFile = (file: SavedFile) => {
    const nextLanguage = allowedLanguages.includes(file.language) ? file.language : 'python';
    setCode(file.code);
    setLanguage(nextLanguage);
    setShowFilesDialog(false);
    toast.success(`Loaded "${file.name}"`);
  };

  const refreshRecentSubmissions = async () => {
    if (!accessToken) return;
    try {
      const body: any = await api.getSubmissions(`?limit=5&problemId=${encodeURIComponent(problem.id)}`);
      const items = body?.data?.items ?? body?.items ?? body;
      if (Array.isArray(items)) setRecentSubmissions(items);
    } catch (err) {
      // ignore
    }
  };

  const submitCode = async () => {
    if (!accessToken) {
      toast.error('Please sign in again before submitting');
      return;
    }

    if (isSubmitting) {
      toast.info('Submission already in progress');
      return;
    }

    setIsSubmitting(true);
    setSubmissionStatus('queued');
    setOutput('Queued: creating submission...\n');
    toast.info('Submission queued...');

    try {
      const created: any = await api.createSubmission({ problemId: problem.id, language, code });
      const submissionId = typeof created.submissionId === 'string' ? created.submissionId : (created?.id ?? null);
      if (!submissionId) {
        throw new Error('Submission response missing submissionId');
      }

      toast.info('Submission created; waiting for worker...');
      setSubmissionStatus('running');
      setOutput(`Running tests for submission ${submissionId}...\n`);

      const unsubscribe = submissionLifecycleManager.subscribe((event) => {
        if (event.submissionId !== submissionId || !event.submission) return;
        if (!event.lifecycle?.isTerminal) {
          setOutput(`${event.lifecycle?.uiState === 'queued' ? 'Queued' : 'Running tests'}: submission ${submissionId}...\n`);
        }
      });

      let submission: any;
      try {
        submission = await submissionLifecycleManager.pollSubmission(submissionId, {
          problemId: problem.id,
          intervalMs: 1500,
          maxAttempts: 40
        });
      } finally {
        unsubscribe();
      }

      const status = (submission as { status?: string }).status;
      const verdict = (submission as { verdict?: string }).verdict;

      setSubmissionStatus(verdict === 'accepted' ? 'accepted' : 'wrong_answer');

        const passedTests = typeof (submission as { passedTests?: number }).passedTests === 'number'
          ? (submission as { passedTests?: number }).passedTests!
          : 0;
        const totalTests = typeof (submission as { totalTests?: number }).totalTests === 'number'
          ? (submission as { totalTests?: number }).totalTests!
          : problem.testCases.length;
        const stdout = typeof (submission as { stdout?: string }).stdout === 'string'
          ? (submission as { stdout?: string }).stdout!
          : '';
        const stderr = typeof (submission as { stderr?: string }).stderr === 'string'
          ? (submission as { stderr?: string }).stderr!
          : '';
        const execTimeMs = typeof (submission as { execTimeMs?: number }).execTimeMs === 'number'
          ? (submission as { execTimeMs?: number }).execTimeMs!
          : null;

        setOutput(
          `Submission Results:\n` +
          `Submission ID: ${submissionId}\n` +
          `Status: ${status ?? 'unknown'}\n` +
          `Verdict: ${verdict ?? 'unknown'}\n` +
          `Passed: ${passedTests}/${totalTests}\n` +
          `Execution Time: ${execTimeMs ?? 'n/a'}ms\n` +
          `${stdout ? `\n--- STDOUT ---\n${stdout}` : ''}` +
          `${stderr ? `\n--- STDERR ---\n${stderr}` : ''}`
        );

        if (currentUser) {
          recordSubmission({
            userId: currentUser.id,
            type: 'problem',
            meta: { problemId: problem.id, submissionId }
          });
        }

        if (verdict === 'accepted') {
          toast.success(`Accepted! +${problem.points} points`, {
            description: `All ${totalTests} test cases passed`
          });
        } else {
          toast.error('Wrong Answer', {
            description: `${passedTests}/${totalTests} test cases passed`
          });
        }

        setTestResults(
          problem.testCases.map((tc) => ({
            testCaseId: tc.id,
            passed: verdict === 'accepted',
            actualOutput: tc.expectedOutput,
            executionTime: execTimeMs ?? 0
          }))
        );

        void refreshRecentSubmissions();

      setIsSubmitting(false);
      return;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setOutput(`Submission failed: ${message}`);
      toast.error('Submission failed', {
        description: message
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  function getFriendlyRunErrorMessage(status: number, statusText: string, responseText: string, requestId?: string) {
    const normalized = `${statusText} ${responseText}`.toLowerCase();

    if (status === 429 || normalized.includes('too many requests')) {
      return appendRequestId('Too many requests. Please wait a few seconds and try again.', requestId);
    }

    if (status === 401) {
      return appendRequestId('Your session expired. Please sign in again and retry.', requestId);
    }

    if (status === 403) {
      return appendRequestId('You do not have permission to run code right now.', requestId);
    }

    if (normalized.includes('compiler service unavailable') || normalized.includes('econnrefused')) {
      return appendRequestId('Compiler temporarily unavailable. Please try again in a moment.', requestId);
    }

    return appendRequestId(`Run failed: ${status} ${statusText}`, requestId);
  }

  async function readErrorResponse(res: Response, context: string) {
    const text = await res.text().catch(() => '');
    let parsed: Record<string, unknown> | null = null;

    try {
      parsed = text ? (JSON.parse(text) as Record<string, unknown>) : null;
    } catch {
      parsed = null;
    }

    const requestId = res.headers.get('x-request-id') ?? (parsed && typeof parsed.requestId === 'string' ? parsed.requestId : undefined);
    const responseText = typeof parsed?.error === 'string'
      ? parsed.error
      : typeof parsed?.message === 'string'
        ? parsed.message
        : text;

    const friendlyMessage = getFriendlySubmissionErrorMessage(res.status, res.statusText, responseText, requestId, context);
    return { friendlyMessage, requestId };
  }

  function getFriendlySubmissionErrorMessage(
    status: number,
    statusText: string,
    responseText: string,
    requestId: string | undefined,
    context: string
  ) {
    const normalized = `${statusText} ${responseText}`.toLowerCase();

    if (status === 429 || normalized.includes('too many requests')) {
      return appendRequestId('Too many submissions right now. Please wait a few seconds and try again.', requestId);
    }

    if (status === 401) {
      return appendRequestId('Your session expired. Please sign in again and retry.', requestId);
    }

    if (status === 403) {
      return appendRequestId('You are not allowed to submit this problem.', requestId);
    }

    if (status === 422 && normalized.includes('invalid uuid')) {
      return appendRequestId('This problem cannot be submitted yet because its ID is invalid. Please reopen the problem and try again.', requestId);
    }

    if (normalized.includes('compiler service unavailable') || normalized.includes('econnrefused')) {
      return appendRequestId('Compiler temporarily unavailable. Please try again in a moment.', requestId);
    }

    if (context === 'poll submission') {
      return appendRequestId(`Could not refresh submission status: ${status} ${statusText}`, requestId);
    }

    return appendRequestId(`Submission failed: ${status} ${statusText}`, requestId);
  }

  function appendRequestId(message: string, requestId?: string) {
    return requestId ? `${message} (Request ${requestId})` : message;
  }

  const getDifficultyColor = () => {
    switch (problem.difficulty) {
      case 'easy':
        return 'text-green-600 bg-green-100';
      case 'medium':
        return 'text-yellow-700 bg-yellow-100';
      case 'hard':
        return 'text-red-600 bg-red-100';
    }
  };

  const mobileLineNumbers = useMemo(() => {
    const lines = Math.max(1, code.split('\n').length);
    return Array.from({ length: lines }, (_, i) => i + 1).join('\n');
  }, [code]);

  return (
    <div className={isMobile ? 'min-h-[calc(100vh-80px)] flex flex-col overflow-y-auto' : 'h-[calc(100vh-80px)] flex flex-col'}>
      {/* Top Toolbar */}
      {isMobile ? (
        <div className="bg-white border-b border-neutral-200 px-3 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <EdRealmLogo size="small" />
              <Button variant="ghost" size="sm" onClick={onBack} className="px-2">
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSidebar(!showSidebar)}
              title={showSidebar ? 'Hide question' : 'Show question'}
            >
              {showSidebar ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </Button>
          </div>

          <div className="mt-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h4 className="leading-tight truncate">{problem.title}</h4>
              <div className="mt-1 flex items-center gap-2">
                <Badge className={getDifficultyColor()}>{problem.difficulty}</Badge>
                <span className="text-sm text-neutral-600">{problem.points} pts</span>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </div>

          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="python">Python</SelectItem>
                <SelectItem value="java">Java</SelectItem>
                <SelectItem value="cpp">C++</SelectItem>
                <SelectItem value="c">C</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={() => setShowSaveDialog(true)}>
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>

            <Button variant="outline" size="sm" onClick={() => setShowFilesDialog(true)}>
              <FolderOpen className="w-4 h-4 mr-2" />
              Files ({savedFiles.length})
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                mobileEditorSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                // ensure focus after scroll for mobile keyboards
                setTimeout(() => mobileTextareaRef.current?.focus(), 250);
              }}
            >
              Write code
            </Button>

            <div className="flex-1" />

            <Button variant="outline" size="sm" onClick={runCode} disabled={isRunning || isSubmitting}>
              {isRunning ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              Run
            </Button>

            <Button
              size="sm"
              onClick={submitCode}
              disabled={isRunning || isSubmitting}
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Submit
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-white border-b border-neutral-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <EdRealmLogo size="small" />
            <Separator orientation="vertical" className="h-6" />
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-3">
              <h4>{problem.title}</h4>
              <Badge className={getDifficultyColor()}>
                {problem.difficulty}
              </Badge>
              <span className="text-sm text-neutral-600">{problem.points} points</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="python">Python</SelectItem>
                <SelectItem value="java">Java</SelectItem>
                <SelectItem value="cpp">C++</SelectItem>
                <SelectItem value="c">C</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSidebar(!showSidebar)}
            >
              {showSidebar ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </Button>

            <Separator orientation="vertical" className="h-6" />

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSaveDialog(true)}
              title="Save your solution"
            >
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilesDialog(true)}
              title="View saved solutions"
            >
              <FolderOpen className="w-4 h-4 mr-2" />
              Files ({savedFiles.length})
            </Button>

            <Separator orientation="vertical" className="h-6" />

            <Button
              variant="outline"
              onClick={runCode}
              disabled={isRunning || isSubmitting}
            >
              {isRunning ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              Run
            </Button>

            <Button
              onClick={submitCode}
              disabled={isRunning || isSubmitting}
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Submit
            </Button>
          </div>
        </div>
      )}

      {isMobile ? (
        <div className="flex flex-col">
          {/* Question first (LeetCode-style) */}
          {showSidebar && (
            <div className="w-full bg-white border-b border-neutral-200">
              <Tabs defaultValue="description" className="flex flex-col">
                <TabsList className="w-full justify-start rounded-none border-b">
                  <TabsTrigger value="description">Description</TabsTrigger>
                  <TabsTrigger value="submissions">Submissions</TabsTrigger>
                  <TabsTrigger value="solutions">Solutions</TabsTrigger>
                </TabsList>

                <TabsContent value="description" className="m-0">
                  <div className="p-5 space-y-6">
                    <div>
                      <h4 className="mb-3">Problem Description</h4>
                      <p className="text-neutral-700 whitespace-pre-wrap">{problem.description}</p>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="mb-3">Constraints</h4>
                      <ul className="space-y-2">
                        {problem.constraints.map((constraint, i) => (
                          <li key={i} className="flex gap-2 text-sm text-neutral-700">
                            <span className="text-neutral-400">•</span>
                            <span>{constraint}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="mb-3">Example</h4>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm mb-2">Input:</p>
                          <code className="block bg-neutral-100 p-3 rounded text-sm overflow-x-auto">
                            {problem.sampleInput}
                          </code>
                        </div>
                        <div>
                          <p className="text-sm mb-2">Output:</p>
                          <code className="block bg-neutral-100 p-3 rounded text-sm overflow-x-auto">
                            {problem.sampleOutput}
                          </code>
                        </div>
                        <div>
                          <p className="text-sm mb-2">Explanation:</p>
                          <p className="text-sm text-neutral-700">{problem.explanation}</p>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="mb-3">Tags</h4>
                      <div className="flex flex-wrap gap-2">
                        {problem.tags.map(tag => (
                          <Badge key={tag} variant="outline">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="submissions" className="p-5">
                    {loadingSubmissions ? (
                      <p className="text-sm text-neutral-600">Loading submissions...</p>
                    ) : recentSubmissions.length === 0 ? (
                      <p className="text-sm text-neutral-600">Your previous submissions will appear here</p>
                    ) : (
                      <div className="space-y-2">
                        {recentSubmissions.map((submission) => (
                          <Card key={submission.id}>
                            <CardContent className="p-4 space-y-1">
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-sm font-medium">{submission.verdict ?? submission.status}</span>
                                <span className="text-xs text-neutral-500">{submission.createdAt ? new Date(submission.createdAt).toLocaleString() : ''}</span>
                              </div>
                              <p className="text-xs text-neutral-600">
                                Passed {submission.passedTests ?? 0}/{submission.totalTests ?? 0}
                                {typeof submission.execTimeMs === 'number' ? ` · ${submission.execTimeMs}ms` : ''}
                              </p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                </TabsContent>

                <TabsContent value="solutions" className="p-5">
                  <div className="flex items-start gap-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <Info className="w-4 h-4 text-blue-600 mt-0.5" />
                    <p className="text-sm text-blue-900">
                      Solutions will be unlocked after you solve the problem or make 3 submission attempts.
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}

          {/* Editor below question */}
          <div ref={mobileEditorSectionRef} className="border-b border-neutral-200 scroll-mt-24">
            <div className="bg-white px-4 py-3 border-b border-neutral-200">
              <h4>Code</h4>
              <p className="text-sm text-neutral-600">Write your solution below</p>
            </div>
            <div className="h-[70vh] min-h-[520px] bg-[#1e1e1e] flex flex-col">
              <div className="h-10 shrink-0 flex items-center justify-end px-3">
                <div className="flex items-center gap-2 bg-black/60 backdrop-blur px-3 py-1 rounded text-xs text-neutral-200">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  Auto-saving
                </div>
              </div>

              <div className="flex-1 min-h-0 w-full flex">
                <div
                  ref={mobileGutterRef}
                  className="w-12 shrink-0 border-r border-white/10 bg-black/10 overflow-hidden"
                  aria-hidden="true"
                >
                  <pre className="text-right text-xs leading-6 text-white/40 px-2 py-3 select-none">
                    {mobileLineNumbers}
                  </pre>
                </div>

                <textarea
                  ref={mobileTextareaRef}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  onScroll={(e) => {
                    const top = (e.currentTarget as HTMLTextAreaElement).scrollTop;
                    if (mobileGutterRef.current) {
                      mobileGutterRef.current.scrollTop = top;
                    }
                  }}
                  spellCheck={false}
                  autoCapitalize="none"
                  autoCorrect="off"
                  className="flex-1 min-h-0 bg-transparent text-neutral-100 font-mono text-sm leading-6 px-4 py-3 outline-none resize-none overflow-auto"
                  style={{ fontFamily: 'JetBrains Mono, Fira Code, Consolas, monospace' }}
                />
              </div>
            </div>
          </div>

          {/* Console below editor */}
          <div className="h-[30vh] min-h-[14rem] bg-white">
            <Tabs defaultValue="testcases" className="h-full flex flex-col">
              <TabsList className="w-full justify-start rounded-none border-b bg-white">
                <TabsTrigger value="testcases">Test Cases</TabsTrigger>
                <TabsTrigger value="output">Output</TabsTrigger>
                <TabsTrigger value="results">
                  Results
                  {submissionStatus && (
                    <div className="ml-2">
                      {submissionStatus === 'accepted' && (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      )}
                      {submissionStatus === 'wrong_answer' && (
                        <XCircle className="w-4 h-4 text-red-600" />
                      )}
                      {(submissionStatus === 'queued' || submissionStatus === 'running') && (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      )}
                    </div>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="testcases" className="flex-1 overflow-auto m-0 p-4">
                <div className="space-y-3">
                  {problem.testCases.filter(tc => !tc.hidden).map((tc, i) => (
                    <Card key={tc.id}>
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <p className="text-sm">Test Case {i + 1}</p>
                          <div>
                            <p className="text-xs text-neutral-600 mb-1">Input:</p>
                            <code className="block text-xs bg-neutral-100 p-2 rounded">
                              {tc.input}
                            </code>
                          </div>
                          <div>
                            <p className="text-xs text-neutral-600 mb-1">Expected Output:</p>
                            <code className="block text-xs bg-neutral-100 p-2 rounded">
                              {tc.expectedOutput}
                            </code>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="output" className="flex-1 overflow-auto m-0 p-4">
                <pre className="text-sm font-mono whitespace-pre-wrap text-neutral-700">
                  {output || 'Run your code to see the output...'}
                </pre>
              </TabsContent>

              <TabsContent value="results" className="flex-1 overflow-auto m-0 p-4">
                {submissionStatus ? (
                  <div className="space-y-4">
                    <div className={`p-4 rounded-lg border-2 ${submissionStatus === 'accepted'
                        ? 'bg-green-50 border-green-200'
                        : submissionStatus === 'wrong_answer'
                          ? 'bg-red-50 border-red-200'
                          : 'bg-blue-50 border-blue-200'
                      }`}>
                      <div className="flex items-center gap-3">
                        {submissionStatus === 'accepted' && (
                          <>
                            <CheckCircle2 className="w-8 h-8 text-green-600" />
                            <div>
                              <h4 className="text-green-900">Accepted!</h4>
                              <p className="text-sm text-green-700">All test cases passed</p>
                            </div>
                          </>
                        )}
                        {submissionStatus === 'wrong_answer' && (
                          <>
                            <XCircle className="w-8 h-8 text-red-600" />
                            <div>
                              <h4 className="text-red-900">Wrong Answer</h4>
                              <p className="text-sm text-red-700">
                                {testResults.filter(r => r.passed).length}/{testResults.length} test cases passed
                              </p>
                            </div>
                          </>
                        )}
                        {(submissionStatus === 'queued' || submissionStatus === 'running') && (
                          <>
                            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                            <div>
                              <h4 className="text-blue-900">
                                {submissionStatus === 'queued' ? 'Queued' : 'Running...'}
                              </h4>
                              <p className="text-sm text-blue-700">Please wait</p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {executionTime && memory && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-neutral-50 rounded-lg">
                          <div className="flex items-center gap-2 text-sm text-neutral-600 mb-1">
                            <Clock className="w-4 h-4" />
                            Execution Time
                          </div>
                          <p className="font-mono">{executionTime}ms</p>
                        </div>
                        <div className="p-3 bg-neutral-50 rounded-lg">
                          <div className="flex items-center gap-2 text-sm text-neutral-600 mb-1">
                            <FileCode className="w-4 h-4" />
                            Memory
                          </div>
                          <p className="font-mono">{memory}MB</p>
                        </div>
                      </div>
                    )}

                    {testResults.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm">Test Case Results</h4>
                        {testResults.map((result, i) => (
                          <div
                            key={i}
                            className={`p-3 rounded-lg border ${result.passed
                                ? 'bg-green-50 border-green-200'
                                : 'bg-red-50 border-red-200'
                              }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {result.passed ? (
                                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-red-600" />
                                )}
                                <span className="text-sm">
                                  Test Case {i + 1}
                                  {i >= problem.testCases.filter(tc => !tc.hidden).length && (
                                    <Badge variant="outline" className="ml-2 text-xs">Hidden</Badge>
                                  )}
                                </span>
                              </div>
                              <span className="text-xs text-neutral-600">
                                {result.executionTime}ms
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-neutral-600">
                    Submit your code to see detailed results
                  </p>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Problem Description Sidebar */}
          {showSidebar && (
            <div className="w-[500px] bg-white border-r border-neutral-200 flex flex-col">
              <Tabs defaultValue="description" className="flex-1 flex flex-col">
                <TabsList className="w-full justify-start rounded-none border-b">
                  <TabsTrigger value="description">Description</TabsTrigger>
                  <TabsTrigger value="submissions">Submissions</TabsTrigger>
                  <TabsTrigger value="solutions">Solutions</TabsTrigger>
                </TabsList>

                <TabsContent value="description" className="flex-1 overflow-hidden m-0">
                  <ScrollArea className="h-full">
                    <div className="p-6 space-y-6">
                      <div>
                        <h4 className="mb-3">Problem Description</h4>
                        <p className="text-neutral-700 whitespace-pre-wrap">{problem.description}</p>
                      </div>

                      <Separator />

                      <div>
                        <h4 className="mb-3">Constraints</h4>
                        <ul className="space-y-2">
                          {problem.constraints.map((constraint, i) => (
                            <li key={i} className="flex gap-2 text-sm text-neutral-700">
                              <span className="text-neutral-400">•</span>
                              <span>{constraint}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <Separator />

                      <div>
                        <h4 className="mb-3">Example</h4>
                        <div className="space-y-3">
                          <div>
                            <p className="text-sm mb-2">Input:</p>
                            <code className="block bg-neutral-100 p-3 rounded text-sm">
                              {problem.sampleInput}
                            </code>
                          </div>
                          <div>
                            <p className="text-sm mb-2">Output:</p>
                            <code className="block bg-neutral-100 p-3 rounded text-sm">
                              {problem.sampleOutput}
                            </code>
                          </div>
                          <div>
                            <p className="text-sm mb-2">Explanation:</p>
                            <p className="text-sm text-neutral-700">{problem.explanation}</p>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <div>
                        <h4 className="mb-3">Tags</h4>
                        <div className="flex flex-wrap gap-2">
                          {problem.tags.map(tag => (
                            <Badge key={tag} variant="outline">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="submissions" className="flex-1 p-6">
                  {loadingSubmissions ? (
                    <p className="text-sm text-neutral-600">Loading submissions...</p>
                  ) : recentSubmissions.length === 0 ? (
                    <p className="text-sm text-neutral-600">Your previous submissions will appear here</p>
                  ) : (
                    <div className="space-y-2">
                      {recentSubmissions.map((submission) => (
                        <Card key={submission.id}>
                          <CardContent className="p-4 space-y-1">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-sm font-medium">{submission.verdict ?? submission.status}</span>
                              <span className="text-xs text-neutral-500">{submission.createdAt ? new Date(submission.createdAt).toLocaleString() : ''}</span>
                            </div>
                            <p className="text-xs text-neutral-600">
                              Passed {submission.passedTests ?? 0}/{submission.totalTests ?? 0}
                              {typeof submission.execTimeMs === 'number' ? ` · ${submission.execTimeMs}ms` : ''}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="solutions" className="flex-1 p-6">
                  <div className="flex items-start gap-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <Info className="w-4 h-4 text-blue-600 mt-0.5" />
                    <p className="text-sm text-blue-900">
                      Solutions will be unlocked after you solve the problem or make 3 submission attempts.
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}

          {/* Editor and Console */}
          <div className="flex-1 flex flex-col">
            {/* Monaco Editor */}
            <div className="flex-1 relative">
              <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
                <div className="flex items-center gap-2 bg-neutral-900 px-3 py-1 rounded text-xs text-neutral-400">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  Auto-saving
                </div>
              </div>
              <Editor
                height="100%"
                language={language}
                theme={theme === 'dark' ? 'vs-dark' : 'light'}
                value={code}
                onChange={(value) => setCode(value || '')}
                options={{
                  fontSize: 14,
                  fontFamily: 'JetBrains Mono, Fira Code, Consolas, monospace',
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  lineNumbers: 'on',
                  renderLineHighlight: 'all',
                  automaticLayout: true,
                }}
              />
            </div>

            {/* Console/Output */}
            <div className="h-64 border-t border-neutral-200 bg-white">
              <Tabs defaultValue="testcases" className="h-full flex flex-col">
                <TabsList className="w-full justify-start rounded-none border-b">
                  <TabsTrigger value="testcases">Test Cases</TabsTrigger>
                  <TabsTrigger value="output">Output</TabsTrigger>
                  <TabsTrigger value="results">
                    Results
                    {submissionStatus && (
                      <div className="ml-2">
                        {submissionStatus === 'accepted' && (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        )}
                        {submissionStatus === 'wrong_answer' && (
                          <XCircle className="w-4 h-4 text-red-600" />
                        )}
                        {(submissionStatus === 'queued' || submissionStatus === 'running') && (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        )}
                      </div>
                    )}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="testcases" className="flex-1 overflow-auto m-0 p-4">
                  <div className="space-y-3">
                    {problem.testCases.filter(tc => !tc.hidden).map((tc, i) => (
                      <Card key={tc.id}>
                        <CardContent className="p-4">
                          <div className="space-y-2">
                            <p className="text-sm">Test Case {i + 1}</p>
                            <div>
                              <p className="text-xs text-neutral-600 mb-1">Input:</p>
                              <code className="block text-xs bg-neutral-100 p-2 rounded">
                                {tc.input}
                              </code>
                            </div>
                            <div>
                              <p className="text-xs text-neutral-600 mb-1">Expected Output:</p>
                              <code className="block text-xs bg-neutral-100 p-2 rounded">
                                {tc.expectedOutput}
                              </code>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="output" className="flex-1 overflow-auto m-0 p-4">
                  <pre className="text-sm font-mono whitespace-pre-wrap text-neutral-700">
                    {output || 'Run your code to see the output...'}
                  </pre>
                </TabsContent>

                <TabsContent value="results" className="flex-1 overflow-auto m-0 p-4">
                  {submissionStatus ? (
                    <div className="space-y-4">
                      {/* Status Header */}
                      <div className={`p-4 rounded-lg border-2 ${submissionStatus === 'accepted'
                          ? 'bg-green-50 border-green-200'
                          : submissionStatus === 'wrong_answer'
                            ? 'bg-red-50 border-red-200'
                            : 'bg-blue-50 border-blue-200'
                        }`}>
                        <div className="flex items-center gap-3">
                          {submissionStatus === 'accepted' && (
                            <>
                              <CheckCircle2 className="w-8 h-8 text-green-600" />
                              <div>
                                <h4 className="text-green-900">Accepted!</h4>
                                <p className="text-sm text-green-700">All test cases passed</p>
                              </div>
                            </>
                          )}
                          {submissionStatus === 'wrong_answer' && (
                            <>
                              <XCircle className="w-8 h-8 text-red-600" />
                              <div>
                                <h4 className="text-red-900">Wrong Answer</h4>
                                <p className="text-sm text-red-700">
                                  {testResults.filter(r => r.passed).length}/{testResults.length} test cases passed
                                </p>
                              </div>
                            </>
                          )}
                          {(submissionStatus === 'queued' || submissionStatus === 'running') && (
                            <>
                              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                              <div>
                                <h4 className="text-blue-900">
                                  {submissionStatus === 'queued' ? 'Queued' : 'Running...'}
                                </h4>
                                <p className="text-sm text-blue-700">Please wait</p>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Metrics */}
                      {executionTime && memory && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-3 bg-neutral-50 rounded-lg">
                            <div className="flex items-center gap-2 text-sm text-neutral-600 mb-1">
                              <Clock className="w-4 h-4" />
                              Execution Time
                            </div>
                            <p className="font-mono">{executionTime}ms</p>
                          </div>
                          <div className="p-3 bg-neutral-50 rounded-lg">
                            <div className="flex items-center gap-2 text-sm text-neutral-600 mb-1">
                              <FileCode className="w-4 h-4" />
                              Memory
                            </div>
                            <p className="font-mono">{memory}MB</p>
                          </div>
                        </div>
                      )}

                      {/* Test Results */}
                      {testResults.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm">Test Case Results</h4>
                          {testResults.map((result, i) => (
                            <div
                              key={i}
                              className={`p-3 rounded-lg border ${result.passed
                                  ? 'bg-green-50 border-green-200'
                                  : 'bg-red-50 border-red-200'
                                }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {result.passed ? (
                                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                                  ) : (
                                    <XCircle className="w-4 h-4 text-red-600" />
                                  )}
                                  <span className="text-sm">
                                    Test Case {i + 1}
                                    {i >= problem.testCases.filter(tc => !tc.hidden).length && (
                                      <Badge variant="outline" className="ml-2 text-xs">Hidden</Badge>
                                    )}
                                  </span>
                                </div>
                                <span className="text-xs text-neutral-600">
                                  {result.executionTime}ms
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-neutral-600">
                      Submit your code to see detailed results
                    </p>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      )}

      {/* Save Solution Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Solution</DialogTitle>
            <DialogDescription>
              Save your solution for this problem. You can download or reload it later.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Input
              placeholder="Enter file name"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveFile()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={saveFile}>Save Solution</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Saved Files Dialog */}
      <Dialog open={showFilesDialog} onOpenChange={setShowFilesDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Your Saved Solutions</DialogTitle>
            <DialogDescription>
              Manage solutions for {problem.title}
            </DialogDescription>
          </DialogHeader>

          {savedFiles.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-neutral-500">No saved solutions for this problem yet. Save your first solution to get started!</p>
            </div>
          ) : (
            <ScrollArea className="h-96">
              <div className="space-y-2 pr-4">
                {savedFiles.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-neutral-50">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{file.name}</h4>
                      <p className="text-sm text-neutral-500">
                        {file.language} • {FileManager.formatDate(file.lastModified)}
                      </p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => loadFile(file)}
                        title="Load this solution"
                      >
                        Load
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadFile(file)}
                        title="Download solution"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteFile(file.id, file.name)}
                        title="Delete solution"
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
