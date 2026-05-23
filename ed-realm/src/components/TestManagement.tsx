import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Plus, Eye, Edit, Trash2, Video, AlertCircle, CheckCircle2, Clock, Users, FileCode, Search, ArrowLeft } from 'lucide-react';
import { useAuth } from '../lib/auth-context';
import { batches } from '../lib/data';
import { loadTests, saveTests, Test, TestCase, TestQuestion } from '../lib/test-store';
import { toast } from 'sonner';

interface TestManagementProps {
  onNavigate?: (page: string, data?: any) => void;
}

export function TestManagement({ onNavigate }: TestManagementProps) {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';
  const isTrainer = currentUser?.role === 'trainer';

  const [tests, setTests] = useState<Test[]>(() => loadTests());

  const [questionBank] = useState<TestQuestion[]>([]);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState<TestQuestion[]>([]);
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [showNextQuestionPrompt, setShowNextQuestionPrompt] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [questionSearch, setQuestionSearch] = useState('');

  const topicStats = React.useMemo(() => {
    const stats = new Map<string, number>();
    questionBank.forEach(q => {
      const t = q.topic || 'General';
      stats.set(t, (stats.get(t) || 0) + 1);
    });
    return Array.from(stats.entries()).map(([name, total]) => ({ name, total }));
  }, [questionBank]);

  const [newQuestion, setNewQuestion] = useState<Partial<TestQuestion>>({
    title: '',
    description: '',
    difficulty: 'easy',
    points: 10,
    type: 'coding',
    testCases: [],
    options: ['', '', '', ''],
    correctAnswer: '',
  });

  const [newTest, setNewTest] = useState({
    title: '',
    batchId: '',
    duration: 120,
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    saveTests(tests);
  }, [tests]);

  const handleAddExistingQuestion = (question: TestQuestion) => {
    if (selectedQuestions.find(q => q.id === question.id)) {
      toast.error('Question already added to test');
      return;
    }
    setSelectedQuestions([...selectedQuestions, question]);
    toast.success('Question added from bank');
  };

  const handleAddNewQuestion = () => {
    if (!newQuestion.title || !newQuestion.description) {
      toast.error('Please fill in question title and description');
      return;
    }

    if (newQuestion.type === 'mcq') {
      const options = (newQuestion.options || []).map(o => o.trim()).filter(o => o);
      if (options.length < 2) {
        toast.error('Please add at least two options');
        return;
      }
      if (!newQuestion.correctAnswer) {
        toast.error('Please select the correct answer');
        return;
      }
      const question: TestQuestion = {
        id: `new-q-${Date.now()}`,
        title: newQuestion.title as string,
        description: newQuestion.description as string,
        difficulty: newQuestion.difficulty as any,
        topic: newQuestion.topic || 'General',
        points: newQuestion.points as number,
        type: 'mcq',
        options,
        correctAnswer: newQuestion.correctAnswer as string,
      };
      setSelectedQuestions([...selectedQuestions, question]);
      setNewQuestion({
        title: '',
        description: '',
        difficulty: 'easy',
        topic: '',
        points: 10,
        type: 'coding',
        testCases: [],
        options: ['', '', '', ''],
        correctAnswer: '',
      });
      // setIsAddingQuestion(false);
      setShowNextQuestionPrompt(true);
      toast.success('New question created and added');
      return;
    }

    const question: TestQuestion = {
      id: `new-q-${Date.now()}`,
      title: newQuestion.title as string,
      description: newQuestion.description as string,
      difficulty: newQuestion.difficulty as any,
      topic: newQuestion.topic || 'General',
      points: newQuestion.points as number,
      type: 'coding',
      testCases: newQuestion.testCases as TestCase[],
    };

    setSelectedQuestions([...selectedQuestions, question]);
    setNewQuestion({
      title: '',
      description: '',
      difficulty: 'easy',
      topic: '',
      points: 10,
      type: 'coding',
      testCases: [],
      options: ['', '', '', ''],
      correctAnswer: '',
    });
    // setIsAddingQuestion(false);
    setShowNextQuestionPrompt(true);
    toast.success('New question created and added');
  };

  const handleAddTestCase = () => {
    const testCases = [...(newQuestion.testCases || []), { input: '', expectedOutput: '', isHidden: false }];
    setNewQuestion({ ...newQuestion, testCases });
  };

  const handleUpdateTestCase = (index: number, field: keyof TestCase, value: any) => {
    const testCases = [...(newQuestion.testCases || [])];
    testCases[index] = { ...testCases[index], [field]: value };
    setNewQuestion({ ...newQuestion, testCases });
  };

  const handleRemoveTestCase = (index: number) => {
    const testCases = (newQuestion.testCases || []).filter((_, i) => i !== index);
    setNewQuestion({ ...newQuestion, testCases });
  };

  const handleTestQuestionFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const parsed = JSON.parse(text);
        const items = Array.isArray(parsed) ? parsed : parsed.questions || [];
        if (!Array.isArray(items) || items.length === 0) {
          toast.error('No questions found in file');
          return;
        }
        const mapped: TestQuestion[] = items.map((q: any, idx: number) => ({
          id: q.id || `upload-${Date.now()}-${idx}`,
          title: q.title || `Imported Question ${idx + 1}`,
          description: q.description || '',
          difficulty: (q.difficulty || 'easy') as any,
          points: q.points || 10,
          type: q.type === 'mcq' ? 'mcq' : 'coding',
          options: q.type === 'mcq' ? (q.options || ['', '', '', '']) : undefined,
          correctAnswer: q.correctAnswer,
          testCases: q.type === 'coding'
            ? (q.testCases || [{ input: '', expectedOutput: '', isHidden: false }])
            : undefined,
        }));
        setSelectedQuestions(prev => {
          const deduped = mapped.filter(m => !prev.some(p => p.id === m.id));
          return [...prev, ...deduped];
        });
        toast.success(`Imported ${mapped.length} question(s)`);
      } catch {
        toast.error('Upload failed. Please use a JSON file with question fields.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCreateTest = () => {
    if (!newTest.title || !newTest.batchId) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (selectedQuestions.length === 0) {
      toast.error('Please add at least one question to the test');
      return;
    }

    const batchName = batches.find(b => b.id === newTest.batchId)?.name || 'Selected Batch';
    const now = new Date();
    const startDate = newTest.startDate ? new Date(newTest.startDate) : null;
    const endDate = newTest.endDate ? new Date(newTest.endDate) : null;
    let status: Test['status'] = 'draft';
    if (startDate) {
      if (endDate && endDate < now) {
        status = 'completed';
      } else if (startDate > now) {
        status = 'scheduled';
      } else {
        status = 'active';
      }
    }

    const studentCount = batches.find(b => b.id === newTest.batchId)?.students || 0;
    const test: Test = {
      id: `test-${Date.now()}`,
      title: newTest.title,
      batchId: newTest.batchId,
      batchName,
      duration: newTest.duration,
      questions: selectedQuestions,
      status,
      startDate: newTest.startDate,
      endDate: newTest.endDate,
      students: studentCount,
      flagged: 0,
      createdAt: new Date().toISOString(),
    };

    setTests([...tests, test]);
    setIsCreateDialogOpen(false);
    setNewTest({ title: '', batchId: '', duration: 120, startDate: '', endDate: '' });
    setSelectedQuestions([]);
    toast.success('Test created successfully!');
  };

  const handleMonitorTest = (test: Test) => {
    if (onNavigate) {
      onNavigate('test-monitoring', { testName: test.title, batch: test.batchName });
    } else {
      toast.info(`Opening monitoring dashboard for ${test.title}`);
    }
  };

  const handleDeleteTest = (testId: string) => {
    setTests(tests.filter(t => t.id !== testId));
    toast.success('Test deleted successfully');
  };

  const getStatusBadge = (status: Test['status']) => {
    const styles = {
      draft: 'bg-neutral-100 text-neutral-700',
      scheduled: 'bg-blue-100 text-blue-700',
      active: 'bg-green-100 text-green-700',
      completed: 'bg-gray-100 text-gray-700',
    };

    const icons = {
      draft: Clock,
      scheduled: Clock,
      active: CheckCircle2,
      completed: CheckCircle2,
    };

    const Icon = icons[status];

    return (
      <Badge className={styles[status]}>
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-neutral-900">Test Management</h2>
          <p className="text-neutral-600 mt-1">
            {isAdmin
              ? 'Create and manage coding tests with proctoring features'
              : 'Monitor active tests and track student activity'}
          </p>
        </div>
        {isAdmin && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-neutral-900 hover:bg-neutral-800 text-white shadow-xl rounded-xl" style={{ color: 'white', backgroundColor: 'var(--color-primary)' }}>
                <Plus className="w-4 h-4 mr-2" style={{ color: 'white' }} />
                Create Test
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Test</DialogTitle>
                <DialogDescription>
                  Create a new coding test with multiple questions and proctoring features
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-4">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Test Title</Label>
                    <Input
                      id="title"
                      value={newTest.title}
                      onChange={(e) => setNewTest({ ...newTest, title: e.target.value })}
                      placeholder="e.g., DSA Midterm Exam"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="batch">Select Batch</Label>
                    <Select value={newTest.batchId} onValueChange={(value) => setNewTest({ ...newTest, batchId: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a batch" />
                      </SelectTrigger>
                      <SelectContent>
                        {batches.map((batch) => (
                          <SelectItem key={batch.id} value={batch.id}>
                            {batch.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration (minutes)</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={newTest.duration}
                      onChange={(e) => setNewTest({ ...newTest, duration: parseInt(e.target.value) || 120 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date & Time</Label>
                    <Input
                      id="startDate"
                      type="datetime-local"
                      value={newTest.startDate}
                      onChange={(e) => setNewTest({ ...newTest, startDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date & Time</Label>
                    <Input
                      id="endDate"
                      type="datetime-local"
                      value={newTest.endDate}
                      onChange={(e) => setNewTest({ ...newTest, endDate: e.target.value })}
                    />
                  </div>
                </div>

                <hr />

                {/* Selected Questions */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Questions ({selectedQuestions.length})</h3>
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Plus className="w-4 h-4 mr-2" />
                            From Bank
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0 border-none shadow-2xl">
                          <DialogHeader className="p-6 bg-neutral-900 text-white">
                            <DialogTitle className="text-xl font-bold flex items-center gap-2">
                              <Search className="w-5 h-5 text-blue-400" />
                              Question Bank Library
                            </DialogTitle>
                          </DialogHeader>
                          <div className="p-6 space-y-6 flex-1 overflow-y-auto bg-neutral-50/50">
                            <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-neutral-200 shadow-sm">
                              <Search className="w-4 h-4 text-neutral-400 ml-2" />
                              <Input
                                placeholder="Search by title, topic or tags..."
                                value={questionSearch}
                                onChange={(e) => setQuestionSearch(e.target.value)}
                                className="border-none focus-visible:ring-0 h-9 font-medium"
                              />
                            </div>

                            {/* Topics Library Section - Improved visibility with dark theme and high contrast */}
                            <div className="!bg-black border border-neutral-800 rounded-3xl p-8 shadow-xl relative overflow-hidden group">
                              <div className="flex items-center justify-between mb-6 relative z-10 px-1">
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-2 h-6 bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.6)]" />
                                    <span className="text-sm font-black text-white uppercase tracking-[0.15em]">Topics Library</span>
                                  </div>
                                  <button
                                    onClick={() => setSelectedTopic(null)}
                                    className={`text-[10px] font-black uppercase tracking-widest transition-all py-2 px-5 rounded-xl border ${selectedTopic ? 'text-blue-400 border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 hover:text-blue-300' : 'text-neutral-500 border-neutral-800 opacity-40 cursor-default'}`}
                                    disabled={!selectedTopic}
                                  >
                                    Reset Filter
                                  </button>
                                </div>
                                <div className="flex flex-wrap gap-3 max-h-[220px] overflow-y-auto scrollbar-hide pr-2 relative z-10">
                                  {topicStats.map(topic => (
                                    <button
                                      key={topic.name}
                                      onClick={() => setSelectedTopic(selectedTopic === topic.name ? null : topic.name)}
                                      className={`flex items-center gap-3 px-5 py-2.5 rounded-2xl border transition-all duration-300 group/topic ${selectedTopic === topic.name
                                        ? 'bg-blue-600 border-blue-500 text-white shadow-xl shadow-blue-500/30 scale-[1.03]'
                                        : 'bg-white/5 border-neutral-800 text-neutral-300 hover:border-blue-500/50 hover:bg-white/10 hover:text-white'
                                        }`}
                                    >
                                      <span className="text-[13px] font-bold tracking-tight">
                                        {topic.name}
                                      </span>
                                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black min-w-[28px] text-center transition-all ${selectedTopic === topic.name
                                        ? 'bg-white/20 text-white'
                                        : 'bg-neutral-800 text-neutral-400 group-hover/topic:bg-neutral-700 group-hover/topic:text-neutral-200'
                                        }`}>
                                        {topic.total}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div className="grid grid-cols-1 gap-4">
                                {questionBank
                                  .filter(q => {
                                    const matchesSearch = q.title.toLowerCase().includes(questionSearch.toLowerCase()) || (q.topic?.toLowerCase().includes(questionSearch.toLowerCase()));
                                    const matchesTopic = !selectedTopic || q.topic === selectedTopic;
                                    return matchesSearch && matchesTopic;
                                  })
                                  .map((q) => (
                                    <div key={q.id} className="bg-white p-4 rounded-2xl border border-neutral-200 hover:border-blue-300 hover:shadow-md transition-all group relative overflow-hidden">
                                      <div className="flex items-center justify-between relative z-10">
                                        <div className="flex-1 mr-4">
                                          <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-bold text-neutral-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{q.title}</h4>
                                            <Badge className="bg-blue-100/50 text-blue-700 border-blue-200 text-[9px] h-4.5 px-2 font-black uppercase tracking-wider">{q.topic || 'General'}</Badge>
                                          </div>
                                          <div className="flex flex-wrap gap-2">
                                            <Badge className={`${q.difficulty === 'easy' ? 'bg-green-100 text-green-700' : q.difficulty === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'} text-[9px] font-bold border-none h-5`}>
                                              {q.difficulty}
                                            </Badge>
                                            <Badge variant="outline" className="text-[9px] font-bold h-5 border-neutral-100 bg-neutral-50 text-neutral-500">
                                              {q.type === 'mcq' ? 'MCQ' : 'Coding'}
                                            </Badge>
                                            <span className="text-xs font-bold text-neutral-400">{q.points} Points</span>
                                          </div>
                                        </div>
                                        <Button
                                          size="sm"
                                          onClick={() => handleAddExistingQuestion(q)}
                                          className="bg-blue-600 hover:bg-blue-700 text-white shadow-md rounded-lg h-9 px-5 transition-all active:scale-95 shrink-0 font-bold"
                                        >
                                          Select
                                        </Button>
                                      </div>
                                      <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50/0 group-hover:bg-blue-50/50 rounded-full -mr-12 -mt-12 transition-all duration-500 blur-2xl z-0" />
                                    </div>
                                  ))}
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Button variant="outline" size="sm" onClick={() => setIsAddingQuestion(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        New Question
                      </Button>
                      <div className="relative">
                        <input id="test-question-upload" type="file" className="hidden" accept=".json,.txt" onChange={handleTestQuestionFileUpload} />
                        <Button variant="outline" size="sm" asChild>
                          <label htmlFor="test-question-upload" className="flex items-center gap-2 cursor-pointer">
                            <FileCode className="w-4 h-4" />
                            Upload
                          </label>
                        </Button>
                      </div>
                    </div>
                  </div>

                  {selectedQuestions.length > 0 ? (
                    <div className="space-y-2">
                      {selectedQuestions.map((q, idx) => (
                        <div key={q.id} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg border">
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-neutral-400">#{idx + 1}</span>
                            <div>
                              <p className="font-medium">{q.title}</p>
                              <p className="text-xs text-neutral-500">{q.difficulty} • {q.points} points • {q.type === 'mcq' ? 'MCQ' : 'Coding'}</p>
                              {q.type === 'mcq' && q.correctAnswer && (
                                <p className="text-xs text-neutral-400">Answer: {q.correctAnswer}</p>
                              )}
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => setSelectedQuestions(selectedQuestions.filter(sq => sq.id !== q.id))}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 border-2 border-dashed rounded-lg bg-neutral-50 text-neutral-500">
                      No questions added yet. Add from bank or create a new one.
                    </div>
                  )}
                </div>

                {/* New Question Form */}
                {isAddingQuestion && (
                  <div className="bg-white border border-neutral-200 rounded-3xl p-8 shadow-sm space-y-8 animate-in slide-in-from-top-4 duration-500">
                    <div className="flex justify-between items-center border-b pb-4 border-neutral-100">
                      <h3 className="text-xl font-bold text-neutral-900">Create New Question</h3>
                      <Button variant="ghost" size="sm" onClick={() => setIsAddingQuestion(false)} className="h-10 w-10 p-0 hover:bg-neutral-100 rounded-full">
                        <ArrowLeft className="w-5 h-5" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-neutral-400 uppercase tracking-widest pl-1">Question Title</label>
                        <Input
                          placeholder="e.g., Bubble Sort Implementation"
                          value={newQuestion.title}
                          onChange={(e) => setNewQuestion({ ...newQuestion, title: e.target.value })}
                          className="h-12 border-neutral-200 rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-neutral-400 uppercase tracking-widest pl-1">Question Type</label>
                        <Select
                          value={newQuestion.type || 'coding'}
                          onValueChange={(v) =>
                            setNewQuestion({
                              ...newQuestion,
                              type: v as any,
                              options: v === 'mcq' ? (newQuestion.options?.length ? newQuestion.options : ['', '', '', '']) : newQuestion.options,
                              testCases: v === 'coding' ? (newQuestion.testCases || []) : [],
                            })
                          }
                        >
                          <SelectTrigger className="h-12 border-neutral-200 rounded-2xl bg-white font-medium">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl shadow-xl border-neutral-100">
                            <SelectItem value="coding">Coding</SelectItem>
                            <SelectItem value="mcq">MCQ</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-neutral-400 uppercase tracking-widest pl-1">Difficulty</label>
                        <Select
                          value={newQuestion.difficulty}
                          onValueChange={(v) => setNewQuestion({ ...newQuestion, difficulty: v as any })}
                        >
                          <SelectTrigger className="h-12 border-neutral-200 rounded-2xl bg-white font-medium">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl shadow-xl border-neutral-100">
                            <SelectItem value="easy">Easy</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="hard">Hard</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center pl-1">
                        <label className="text-xs font-black text-neutral-400 uppercase tracking-widest">Description</label>
                        <Badge variant="outline" className="text-[9px] border-neutral-100 text-neutral-400 font-bold uppercase">Rich Text Support</Badge>
                      </div>
                      <Textarea
                        placeholder="Detailed problem description..."
                        rows={4}
                        value={newQuestion.description}
                        onChange={(e) => setNewQuestion({ ...newQuestion, description: e.target.value })}
                        className="border-neutral-200 rounded-3xl bg-neutral-50/40 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all leading-relaxed p-6"
                      />
                    </div>

                    <div className="max-w-md grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-neutral-400 uppercase tracking-widest pl-1">Topic</label>
                        <Input
                          placeholder="e.g., Arrays"
                          value={newQuestion.topic}
                          onChange={(e) => setNewQuestion({ ...newQuestion, topic: e.target.value })}
                          className="h-10 border-neutral-200 rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-neutral-400 uppercase tracking-widest pl-1">Points</label>
                        <Input
                          type="number"
                          value={newQuestion.points}
                          onChange={(e) => setNewQuestion({ ...newQuestion, points: parseInt(e.target.value) || 0 })}
                          className="h-10 border-neutral-200 rounded-xl"
                        />
                      </div>
                    </div>

                    {newQuestion.type === 'mcq' ? (
                      <div className="space-y-6 pt-4 border-t border-neutral-50">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-black text-neutral-800 uppercase tracking-wide">MCQ Options</label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setNewQuestion({ ...newQuestion, options: [...(newQuestion.options || []), ''] })}
                            className="rounded-full h-8 px-4 font-bold text-xs"
                          >
                            <Plus className="w-3.5 h-3.5 mr-2" />Add Option
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {(newQuestion.options || []).map((opt, idx) => (
                            <div key={idx} className="flex gap-2 items-center">
                              <div className="w-6 h-6 rounded-full bg-neutral-100 flex items-center justify-center text-[10px] font-black text-neutral-400 shrink-0">{String.fromCharCode(65 + idx)}</div>
                              <Input
                                value={opt}
                                onChange={(e) => {
                                  const options = [...(newQuestion.options || [])];
                                  options[idx] = e.target.value;
                                  setNewQuestion({ ...newQuestion, options });
                                }}
                                placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                                className="border-neutral-200 rounded-xl h-10 shadow-sm"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const options = (newQuestion.options || []).filter((_, i) => i !== idx);
                                  setNewQuestion({ ...newQuestion, options });
                                }}
                                className="h-8 w-8 p-0 text-red-500 hover:bg-neutral-100"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                        <div className="space-y-3 p-4 bg-blue-50/30 rounded-2xl border border-blue-100">
                          <label className="text-[10px] font-black text-blue-800 uppercase tracking-widest pl-1">Select Correct Answer</label>
                          <Select
                            value={newQuestion.correctAnswer || ''}
                            onValueChange={(value) => setNewQuestion({ ...newQuestion, correctAnswer: value })}
                          >
                            <SelectTrigger className="border-blue-200 rounded-xl bg-white font-bold text-blue-900">
                              <SelectValue placeholder="Mark which one is right" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl shadow-xl border-neutral-100">
                              {(newQuestion.options || [])
                                .map(o => o.trim())
                                .filter(o => o)
                                .map((opt, idx) => (
                                  <SelectItem key={`${opt}-${idx}`} value={opt} className="font-medium">
                                    Option {String.fromCharCode(65 + idx)}: {opt}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6 pt-6 border-t border-neutral-100">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-black text-neutral-800 uppercase tracking-wide">Test Cases</label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleAddTestCase}
                            className="bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50 shadow-sm rounded-full h-9 px-5 font-bold text-xs flex items-center gap-2"
                          >
                            <Plus className="w-4 h-4" /> Add Case
                          </Button>
                        </div>
                        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
                          {newQuestion.testCases?.map((tc, idx) => (
                            <div key={idx} className="p-6 border border-neutral-200 rounded-3xl bg-neutral-50/30 space-y-4 shadow-sm hover:shadow-md transition-all">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest pl-1">Test Case #{idx + 1}</span>
                                <div className="flex items-center gap-4">
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <div className={`w-8 h-4 rounded-full transition-all relative ${tc.isHidden ? 'bg-amber-400' : 'bg-neutral-200'}`}>
                                      <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${tc.isHidden ? 'right-0.5' : 'left-0.5'}`} />
                                    </div>
                                    <input
                                      type="checkbox"
                                      className="hidden"
                                      checked={tc.isHidden}
                                      onChange={(e) => handleUpdateTestCase(idx, 'isHidden', e.target.checked)}
                                    />
                                    <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Hidden</span>
                                  </label>
                                  <Button variant="ghost" size="sm" onClick={() => handleRemoveTestCase(idx)} className="h-8 w-8 rounded-full">
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                  </Button>
                                </div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                  <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest pl-2">Input</label>
                                  <Input
                                    placeholder="Input data"
                                    value={tc.input}
                                    onChange={(e) => handleUpdateTestCase(idx, 'input', e.target.value)}
                                    className="bg-white border-neutral-200 rounded-2xl h-10 font-mono text-sm"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest pl-2">Output</label>
                                  <Input
                                    placeholder="Expected output"
                                    value={tc.expectedOutput}
                                    onChange={(e) => handleUpdateTestCase(idx, 'expectedOutput', e.target.value)}
                                    className="bg-white border-neutral-200 rounded-2xl h-10 font-mono text-sm"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                          {(!newQuestion.testCases || newQuestion.testCases.length === 0) && (
                            <div className="py-12 border-2 border-dashed border-neutral-200 rounded-3xl flex flex-col items-center justify-center bg-neutral-50/10 text-neutral-400 italic text-sm">
                              No test cases added for this question.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="flex justify-end gap-3 pt-6 border-t border-neutral-100">
                      <Button variant="outline" onClick={() => setIsAddingQuestion(false)} className="rounded-xl px-8 h-12 font-bold text-neutral-600">Cancel</Button>
                      <Button onClick={handleAddNewQuestion} className="bg-neutral-900 hover:bg-neutral-800 text-white shadow-xl rounded-xl px-10 h-12 font-bold" style={{ color: 'white' }}>Add to Test</Button>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-4 pt-8 border-t border-neutral-100">
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                    className="rounded-2xl px-10 h-14 font-black uppercase text-xs tracking-widest border-neutral-200 text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900 shadow-sm transition-all"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateTest}
                    className="!bg-black hover:!bg-neutral-900 !text-white shadow-2xl shadow-black/20 rounded-2xl px-14 h-14 font-black uppercase text-xs tracking-widest transition-all active:scale-95"
                  >
                    Create New Test
                  </Button>
                </div>
              </div>
            </DialogContent>

          </Dialog>
        )}
      </div>

      {/* Tests List */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>All Tests</CardTitle>
          <CardDescription>
            {isAdmin
              ? 'Manage all tests across batches'
              : 'View and monitor tests assigned to your batches'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Test Name</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Questions</TableHead>
                <TableHead>Students</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Flagged</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tests.map((test) => (
                <TableRow key={test.id}>
                  <TableCell className="font-medium">{test.title}</TableCell>
                  <TableCell>{test.batchName}</TableCell>
                  <TableCell>{test.duration} min</TableCell>
                  <TableCell>{test.questions.length}</TableCell>
                  <TableCell>

                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4 text-neutral-500" />
                      {test.students}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(test.status)}</TableCell>
                  <TableCell>
                    {test.flagged > 0 ? (
                      <Badge variant="outline" className="border-red-300 text-red-700">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        {test.flagged}
                      </Badge>
                    ) : (
                      <span className="text-neutral-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={test.status !== 'active'}
                        onClick={() => handleMonitorTest(test)}
                        className={test.status !== 'active' ? 'opacity-60 cursor-not-allowed' : ''}
                      >
                        <Video className="w-4 h-4 mr-1" />
                        Monitor
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => toast.info(`Viewing ${test.title} details`)}>
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      {isAdmin && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => toast.info(`Editing ${test.title}`)}>
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteTest(test.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Test Features Info */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Test Proctoring Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border border-neutral-200">
              <div className="flex items-center gap-2 mb-2">
                <Video className="w-5 h-5 text-blue-600" />
                <h4 className="font-medium">Camera & Microphone Access</h4>
              </div>
              <p className="text-sm text-neutral-600">
                Students must grant camera and microphone access. All sessions are recorded for review.
              </p>
            </div>
            <div className="p-4 rounded-lg border border-neutral-200">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <h4 className="font-medium">Tab Switching Detection</h4>
              </div>
              <p className="text-sm text-neutral-600">
                System automatically detects when students switch tabs or open new windows during the test.
              </p>
            </div>
            <div className="p-4 rounded-lg border border-neutral-200">
              <div className="flex items-center gap-2 mb-2">
                <FileCode className="w-5 h-5 text-purple-600" />
                <h4 className="font-medium">AI Usage Detection</h4>
              </div>
              <p className="text-sm text-neutral-600">
                Advanced monitoring detects potential AI tool usage and suspicious activity patterns.
              </p>
            </div>
            <div className="p-4 rounded-lg border border-neutral-200">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <h4 className="font-medium">Auto-End on Cheating</h4>
              </div>
              <p className="text-sm text-neutral-600">
                Tests are automatically ended if cheating is detected. Only trainers/admins can restore access.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showNextQuestionPrompt} onOpenChange={setShowNextQuestionPrompt}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
              Question Added
            </DialogTitle>
            <DialogDescription>
              The question has been added to this test. Would you like to add another one?
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 justify-end mt-4">
            <Button variant="outline" onClick={() => { setShowNextQuestionPrompt(false); setIsAddingQuestion(false); }}>
              Done for Now
            </Button>
            <Button onClick={() => setShowNextQuestionPrompt(false)} className="bg-blue-600 hover:bg-blue-700 text-white" style={{ color: 'white' }}>
              Add Another
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}



