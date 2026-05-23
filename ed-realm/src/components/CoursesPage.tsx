import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { BookOpen, Clock, Users, Award, ArrowRight, Star, Plus, Edit, Trash2, Eye, Lock, Unlock, ChevronDown, ChevronRight, Code, Play, Download, FileText, ArrowLeft, Image as ImageIcon, Search, Calendar, CheckCircle2, MessageSquare } from 'lucide-react';
import { courses, institutions, batches, users, Topic, TopicQuestion } from '../lib/data';
import { CodePracticeConsole } from './CodePracticeConsole';
import { useAuth } from '../lib/auth-context';
import { toast } from 'sonner';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { AttendanceSession, loadAttendanceSessions, saveAttendanceSessions } from '../lib/attendance-store';

interface CoursesPageProps {
  onNavigate: (page: string, data?: any) => void;
}

export function CoursesPage({ onNavigate }: CoursesPageProps) {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';
  const [courseList, setCourseList] = useState(courses);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [newCourse, setNewCourse] = useState({
    title: '',
    description: '',
    level: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
    duration: '',
    lessons: 0,
    tags: '',
    institutionId: '',
    batchId: '',
    topics: [] as Topic[],
  });

  const [currentTopic, setCurrentTopic] = useState({
    title: '',
    content: '',
    images: [] as string[],
  });

  const [currentQuestion, setCurrentQuestion] = useState({
    title: '',
    question: '',
    description: '',
    difficulty: 'easy' as 'easy' | 'medium' | 'hard',
    points: 10,
    options: ['', '', '', ''],
    correctAnswer: '',
    type: 'mcq' as 'mcq' | 'coding',
    starterCode: '',
    expectedOutput: '',
    testCases: [] as { input: string; expectedOutput: string; hidden: boolean }[],
    tags: [] as string[],
  });

  // State for adding existing questions
  const [allQuestions, setAllQuestions] = useState<TopicQuestion[]>([]);
  const [questionSearch, setQuestionSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [activeTopicIndex, setActiveTopicIndex] = useState<number>(-1);

  const tagStats = useMemo(() => {
    const stats = new Map<string, number>();
    allQuestions.forEach(q => {
      q.tags?.forEach(tag => {
        stats.set(tag, (stats.get(tag) || 0) + 1);
      });
    });
    return Array.from(stats.entries()).map(([name, total]) => ({ name, total }));
  }, [allQuestions]);

  const topicStats = useMemo(() => {
    const stats = new Map<string, number>();
    allQuestions.forEach(q => {
      const t = (q.topic || '').trim() || 'General';
      stats.set(t, (stats.get(t) || 0) + 1);
    });
    return Array.from(stats.entries()).map(([name, total]) => ({ name, total }));
  }, [allQuestions]);

  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [codeTemplate, setCodeTemplate] = useState('');

  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [viewCourse, setViewCourse] = useState<any>(null);

  const [isStudentFeedbackOpen, setIsStudentFeedbackOpen] = useState(false);
  const [studentFeedbackCourse, setStudentFeedbackCourse] = useState<any>(null);

  // Management Templates State
  const [mgmtStep, setMgmtStep] = useState<'list' | 'topics' | 'details' | 'assessment' | 'question-library' | 'attendance' | 'feedback'>('list');
  const [activeMgmtCourse, setActiveMgmtCourse] = useState<any>(null);
  const [activeMgmtTopic, setActiveMgmtTopic] = useState<any>(null);
  const [activeMgmtTopicIndex, setActiveMgmtTopicIndex] = useState<number>(-1);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [topicSearch, setTopicSearch] = useState('');
  const [attendanceSessions, setAttendanceSessions] = useState<AttendanceSession[]>([]);
  const [activeAttendance, setActiveAttendance] = useState<AttendanceSession | null>(null);

  // Feedback State
  const [feedbackQuestions, setFeedbackQuestions] = useState<any[]>([
    { id: 'fq1', type: 'rating', question: 'How would you rate the trainer\'s overall teaching?' },
    { id: 'fq2', type: 'mcq', question: 'Is the pace of the course appropriate?', options: ['Too Fast', 'Just Right', 'Too Slow'] }
  ]);
  const [currentFeedbackQ, setCurrentFeedbackQ] = useState({ type: 'mcq' as 'mcq' | 'rating' | 'text', question: '', options: ['', ''] });
  const [isFeedbackPublished, setIsFeedbackPublished] = useState(false);

  const attendanceStudents = useMemo(() => {
    if (!activeMgmtCourse) return [];
    return users.filter(u =>
      u.role === 'student' &&
      (!activeMgmtCourse.batchId || u.batchId === activeMgmtCourse.batchId)
    );
  }, [activeMgmtCourse]);

  // Guard against stale selections causing blank screens
  useEffect(() => {
    if ((mgmtStep === 'topics' || mgmtStep === 'details' || mgmtStep === 'assessment' || mgmtStep === 'question-library' || mgmtStep === 'attendance' || mgmtStep === 'feedback') && activeMgmtCourse) {
      const exists = courseList.find(c => c.id === activeMgmtCourse.id);
      if (!exists) {
        setMgmtStep('list');
        setActiveMgmtCourse(null);
        setActiveMgmtTopic(null);
        setActiveMgmtTopicIndex(-1);
      }
    }
    if ((mgmtStep === 'details' || mgmtStep === 'assessment' || mgmtStep === 'question-library') && !activeMgmtTopic) {
      setMgmtStep('topics');
      setActiveMgmtTopicIndex(-1);
    }
  }, [courseList, activeMgmtCourse, activeMgmtTopic, mgmtStep]);

  useEffect(() => {
    setAttendanceSessions(loadAttendanceSessions());
  }, []);

  useEffect(() => {
    saveAttendanceSessions(attendanceSessions);
  }, [attendanceSessions]);

  useEffect(() => {
    if (mgmtStep !== 'attendance') return;
    const interval = setInterval(() => {
      const next = loadAttendanceSessions();
      setAttendanceSessions(next);
      if (activeMgmtCourse) {
        const openSession = next.find(s => s.courseId === activeMgmtCourse.id && s.status === 'open');
        setActiveAttendance(openSession || null);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [mgmtStep, activeMgmtCourse]);

  const handleTopicToggleLock = (topicIndex: number) => {
    const updatedTopics = newCourse.topics.map((t, i) =>
      i === topicIndex ? { ...t, isLocked: !t.isLocked } : t
    );
    setNewCourse(prev => ({ ...prev, topics: updatedTopics }));
    toast.success(`Topic ${updatedTopics[topicIndex].isLocked ? 'locked' : 'unlocked'}`);
  };

  const handleAddTopic = () => {
    if (!currentTopic.title || !currentTopic.content) {
      toast.error('Please fill in topic title and content');
      return;
    }
    const topic: Topic = {
      id: `topic-${Date.now()}`,
      title: currentTopic.title,
      content: currentTopic.content,
      questions: [],
      isLocked: false,
      images: currentTopic.images,
    };
    setNewCourse(prev => ({ ...prev, topics: [...prev.topics, topic] }));
    setCurrentTopic({ title: '', content: '', images: [] });
    toast.success('Topic added');
  };

  const handleAddQuestion = (topicIndex: number) => {
    if (!currentQuestion.question) {
      toast.error('Please fill in question');
      return;
    }

    let question: TopicQuestion;
    if (currentQuestion.type === 'mcq') {
      if (!currentQuestion.title && !currentQuestion.question) {
        toast.error('Please fill in title or question');
        return;
      }
      if (!currentQuestion.correctAnswer) {
        toast.error('Please fill in correct answer');
        return;
      }
      question = {
        id: `q-${Date.now()}`,
        title: currentQuestion.title,
        question: currentQuestion.question || currentQuestion.title,
        description: currentQuestion.description,
        difficulty: currentQuestion.difficulty,
        points: currentQuestion.points,
        options: currentQuestion.options.filter(o => o.trim() !== ''),
        correctAnswer: currentQuestion.correctAnswer,
        type: 'multiple_choice',
        tags: currentQuestion.tags
      };
      question.type = 'multiple_choice';
    } else {
      if (!currentQuestion.starterCode) {
        toast.error('Please fill in starter code');
        return;
      }
      question = {
        id: `q-${Date.now()}`,
        title: currentQuestion.title,
        question: currentQuestion.question || currentQuestion.title,
        description: currentQuestion.description,
        difficulty: currentQuestion.difficulty,
        points: currentQuestion.points,
        starterCode: currentQuestion.starterCode,
        expectedOutput: currentQuestion.expectedOutput,
        testCases: currentQuestion.testCases,
        type: 'coding',
        tags: currentQuestion.tags
      };
    }

    const updatedTopics = newCourse.topics.map((t, i) =>
      i === topicIndex ? { ...t, questions: [...t.questions, question] } : t
    );
    setNewCourse(prev => ({ ...prev, topics: updatedTopics }));
    setCurrentQuestion({
      title: '',
      question: '',
      description: '',
      difficulty: 'easy',
      points: 10,
      options: ['', '', '', ''],
      correctAnswer: '',
      type: 'mcq',
      starterCode: '',
      expectedOutput: '',
      testCases: [],
      tags: [],
    });
    toast.success('Question added to topic');
  };

  const handleRemoveQuestion = (topicIndex: number, questionIndex: number) => {
    const updatedTopics = newCourse.topics.map((t, i) =>
      i === topicIndex ? { ...t, questions: t.questions.filter((_, qIdx) => qIdx !== questionIndex) } : t
    );
    setNewCourse(prev => ({ ...prev, topics: updatedTopics }));
    toast.success('Question removed from topic');
  };

  const openExistingQuestionDialog = (topicIndex: number) => {
    const questions: TopicQuestion[] = [];
    courseList.forEach(c => {
      c.topics?.forEach(t => {
        t.questions?.forEach(q => {
          // Simple duplicate check by unique combination of question text + id
          if (!questions.find(existing => existing.id === q.id)) {
            questions.push({ ...q, topic: (t.title || '').trim() || 'General' });
          }
        });
      });
    });

    if (questions.length === 0) {
      questions.push(
        { id: 'mk-1', question: 'What is React?', type: 'multiple_choice', options: ['Lib', 'Frame', 'Lang', 'None'], correctAnswer: 'Lib' },
        { id: 'mk-2', question: 'Write a sum function', type: 'coding', starterCode: 'function sum(a,b) {}', testCases: [] }
      );
    }

    setAllQuestions(questions);
    setActiveTopicIndex(topicIndex);
    setQuestionSearch('');
    setSelectedTag(null);
    setSelectedTopic(null);
    setMgmtStep('question-library');
  };

  const handleSelectExistingQuestion = (question: TopicQuestion) => {
    // Clone question to give it a new ID so it's treated as a new instance
    const newQ = { ...question, id: `q-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` };

    if ((mgmtStep === 'assessment' || mgmtStep === 'question-library') && activeMgmtTopic) {
      const updatedMgmtTopic = {
        ...activeMgmtTopic,
        questions: [...(activeMgmtTopic.questions || []), newQ],
      };
      setActiveMgmtTopic(updatedMgmtTopic);

      if (activeMgmtCourse && activeMgmtTopicIndex >= 0) {
        const updatedTopics = (activeMgmtCourse.topics || []).map((t: any, i: number) =>
          i === activeMgmtTopicIndex ? updatedMgmtTopic : t
        );
        const updatedCourse = { ...activeMgmtCourse, topics: updatedTopics };
        setActiveMgmtCourse(updatedCourse);
        setCourseList(prev => prev.map(c => c.id === updatedCourse.id ? updatedCourse : c));
      }
    } else {
      const updatedTopics = newCourse.topics.map((t, i) =>
        i === activeTopicIndex ? { ...t, questions: [...t.questions, newQ] } : t
      );
      setNewCourse(prev => ({ ...prev, topics: updatedTopics }));
    }

    setMgmtStep('assessment');
    toast.success('Question added successfully');
  };

  const handleAddTestCase = () => {
    setCurrentQuestion({
      ...currentQuestion,
      testCases: [...currentQuestion.testCases, { input: '', expectedOutput: '', hidden: false }]
    });
  };

  const handleRemoveTestCase = (index: number) => {
    const newTestCases = [...currentQuestion.testCases];
    newTestCases.splice(index, 1);
    setCurrentQuestion({ ...currentQuestion, testCases: newTestCases });
  };

  const handleTestCaseChange = (index: number, field: 'input' | 'expectedOutput' | 'hidden', value: any) => {
    const newTestCases = [...currentQuestion.testCases];
    // @ts-ignore
    newTestCases[index][field] = value;
    setCurrentQuestion({ ...currentQuestion, testCases: newTestCases });
  };

  const handleToggleLock = (courseId: string) => {
    const updated = courseList.map(c =>
      c.id === courseId ? { ...c, isLocked: !c.isLocked } : c
    );
    setCourseList(updated);
    toast.success('Course lock status updated');
  };

  const handleCreateCourse = () => {
    if (!newCourse.title || !newCourse.institutionId || !newCourse.batchId) {
      toast.error('Please fill in required fields (Title, Institution, Batch)');
      return;
    }

    const course = {
      id: `course-${Date.now()}`,
      title: newCourse.title,
      description: newCourse.description,
      level: newCourse.level,
      duration: newCourse.duration,
      lessons: newCourse.lessons,
      enrolled: 0,
      tags: newCourse.tags.split(',').map(t => t.trim()).filter(t => t),
      institutionId: newCourse.institutionId,
      batchId: newCourse.batchId,
      topics: newCourse.topics,
      isLocked: false,
    };

    setCourseList([...courseList, course]);
    setIsCreateDialogOpen(false);
    setNewCourse({
      title: '',
      description: '',
      level: 'beginner',
      duration: '',
      lessons: 0,
      tags: '',
      institutionId: '',
      batchId: '',
      topics: []
    });
    toast.success('Course created successfully!');
  };

  const handleEditCourse = (course: any) => {
    setSelectedCourse(course);
    setNewCourse({
      title: course.title,
      description: course.description,
      level: course.level,
      duration: course.duration,
      lessons: course.lessons,
      tags: course.tags.join(', '),
      institutionId: course.institutionId || '',
      batchId: course.batchId || '',
      topics: course.topics || [],
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateCourse = () => {
    if (!selectedCourse) return;

    const updated = courseList.map(c =>
      c.id === selectedCourse.id
        ? {
          ...c,
          title: newCourse.title,
          description: newCourse.description,
          level: newCourse.level,
          duration: newCourse.duration,
          lessons: newCourse.lessons,
          tags: newCourse.tags.split(',').map(t => t.trim()).filter(t => t),
          institutionId: newCourse.institutionId,
          batchId: newCourse.batchId,
          topics: newCourse.topics,
        }
        : c
    );

    setCourseList(updated);
    setIsEditDialogOpen(false);
    setSelectedCourse(null);
    setNewCourse({
      title: '',
      description: '',
      level: 'beginner',
      duration: '',
      lessons: 0,
      tags: '',
      institutionId: '',
      batchId: '',
      topics: []
    });
    toast.success('Course updated successfully!');
  };

  const handleDeleteCourse = (courseId: string) => {
    setCourseList(courseList.filter(c => c.id !== courseId));
    toast.success('Course deleted successfully');
  };

  const getLevelBadge = (level: string) => {
    const styles = {
      beginner: 'bg-green-100 text-green-700 border-green-300',
      intermediate: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      advanced: 'bg-red-100 text-red-700 border-red-300',
    };

    return (
      <Badge variant="outline" className={styles[level as keyof typeof styles]}>
        {level.charAt(0).toUpperCase() + level.slice(1)}
      </Badge>
    );
  };

  const handleBackToCourses = () => {
    setMgmtStep('list');
    setActiveMgmtCourse(null);
  };

  const handleBackToTopics = () => {
    setMgmtStep('topics');
    setActiveMgmtTopic(null);
  };

  const handleBackToDetails = () => {
    setMgmtStep('details');
  };

  const handleOpenCourseTopics = (course: any) => {
    setActiveMgmtCourse(course);
    setMgmtStep('topics');
  };

  const handleOpenTopicDetails = (topic: any, index: number) => {
    setActiveMgmtTopic(topic);
    setActiveMgmtTopicIndex(index);
    setMgmtStep('details');
  };

  const handleOpenAssessment = () => {
    setMgmtStep('assessment');
  };

  const handleOpenAttendance = () => {
    if (!activeMgmtCourse) return;
    const openSession = attendanceSessions.find(s => s.courseId === activeMgmtCourse.id && s.status === 'open');
    setActiveAttendance(openSession || null);
    setMgmtStep('attendance');
  };

  const handlePostAttendance = () => {
    if (!activeMgmtCourse) return;
    const existing = attendanceSessions.find(s => s.courseId === activeMgmtCourse.id && s.status === 'open');
    if (existing) {
      setActiveAttendance(existing);
      toast.info('Attendance already active for this course');
      return;
    }
    const session: AttendanceSession = {
      id: `att-${Date.now()}`,
      courseId: activeMgmtCourse.id,
      courseTitle: activeMgmtCourse.title,
      batchId: activeMgmtCourse.batchId,
      createdAt: new Date().toISOString(),
      markedStudentIds: [],
      totalStudentIds: attendanceStudents.map(s => s.id),
      status: 'open',
    };
    const next = [session, ...attendanceSessions];
    setAttendanceSessions(next);
    setActiveAttendance(session);
    toast.success('Attendance posted');
  };

  const handleCloseAttendance = () => {
    if (!activeAttendance) return;
    const next = attendanceSessions.map(s =>
      s.id === activeAttendance.id ? { ...s, status: 'closed' as const } : s
    );
    setAttendanceSessions(next);
    setActiveAttendance(null);
    toast.success('Attendance closed');
  };

  const filteredTopics = useMemo(() => {
    if (!activeMgmtCourse?.topics) return [];
    return activeMgmtCourse.topics.filter((t: Topic) =>
      t.title.toLowerCase().includes(topicSearch.toLowerCase())
    );
  }, [activeMgmtCourse, topicSearch]);

  const filteredLibraryQuestions = useMemo(() => {
    return allQuestions.filter(q => {
      const title = q.title?.toLowerCase() || '';
      const question = q.question?.toLowerCase() || '';
      const query = questionSearch.toLowerCase();
      const matchesSearch = title.includes(query) || question.includes(query);
      const matchesTag = !selectedTag || q.tags?.includes(selectedTag);
      const questionTopic = (q.topic || '').trim() || 'General';
      const matchesTopic = !selectedTopic || questionTopic === selectedTopic;
      return matchesSearch && matchesTag && matchesTopic;
    });
  }, [allQuestions, questionSearch, selectedTag, selectedTopic]);


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-neutral-900">Courses</h2>
          <p className="text-neutral-600 mt-1">
            {isAdmin
              ? 'Manage courses and explore available courses'
              : 'Explore and enroll in courses to advance your skills'}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => {
            setNewCourse({
              title: '',
              description: '',
              level: 'beginner',
              duration: '',
              lessons: 0,
              tags: '',
              institutionId: '',
              batchId: '',
              topics: [],
            });
            setIsCreateDialogOpen(true);
          }} style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
            <Plus className="w-4 h-4 mr-2" />
            Create New Course
          </Button>
        )}
      </div>

      {/* Admin Management Drill-down */}
      {
        isAdmin && mgmtStep === 'list' && (
          <Card className="shadow-lg border-none bg-gradient-to-br from-white to-neutral-50/50">
            <CardHeader className="flex flex-row items-center justify-between pb-6">
              <div>
                <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-neutral-900 to-neutral-600">Course Management</CardTitle>
                <CardDescription className="text-neutral-500">Manage your curriculum, topics, and assessments in one place</CardDescription>
              </div>
              <div className="flex gap-3">
                <div className="relative group">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-primary transition-colors" />
                  <Input placeholder="Search courses..." className="pl-10 w-72 bg-white/50 backdrop-blur-sm focus:bg-white transition-all shadow-sm" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-neutral-100">
                    <TableHead className="font-bold text-neutral-400 uppercase text-[10px] tracking-widest">Course Information</TableHead>
                    <TableHead className="font-bold text-neutral-400 uppercase text-[10px] tracking-widest">Batch details</TableHead>
                    <TableHead className="font-bold text-neutral-400 uppercase text-[10px] tracking-widest">Level</TableHead>
                    <TableHead className="font-bold text-neutral-400 uppercase text-[10px] tracking-widest">Visibility</TableHead>
                    <TableHead className="text-right font-bold text-neutral-400 uppercase text-[10px] tracking-widest">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courseList.map((course) => (
                    <TableRow key={course.id} className="group cursor-pointer hover:bg-neutral-50/80 transition-all border-neutral-100" onClick={() => handleOpenCourseTopics(course)}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
                            {course.title.charAt(0)}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-neutral-900 group-hover:text-primary transition-colors">{course.title}</span>
                            <span className="text-xs text-neutral-500 flex items-center gap-1">
                              <BookOpen className="w-3 h-3" /> {course.topics?.length || 0} Modules
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant="outline" className="w-fit text-[10px] h-5 bg-white border-neutral-200 font-medium">
                            {institutions.find(i => i.id === course.institutionId)?.name || 'General Access'}
                          </Badge>
                          <span className="text-[10px] text-neutral-400 ml-1">{batches.find(b => b.id === course.batchId)?.name || 'Open Enrollment'}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getLevelBadge(course.level)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`h-6 gap-1.5 ${course.isLocked ? "bg-red-50 text-red-600 border-red-100" : "bg-green-50 text-green-600 border-green-100"}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${course.isLocked ? 'bg-red-500' : 'bg-green-500'} animate-pulse`} />
                          {course.isLocked ? 'Locked' : 'Active'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => { setViewCourse(course); setIsViewDialogOpen(true); }}>
                            <Eye className="w-4 h-4 text-neutral-500 hover:text-primary" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleEditCourse(course)}>
                            <Edit className="w-4 h-4 text-neutral-500 hover:text-primary" />
                          </Button>
                          <Button size="sm" className="h-8 px-3 rounded-full font-semibold flex items-center gap-1 text-white" style={{ backgroundColor: '#000' }} onClick={() => handleOpenCourseTopics(course)}>
                            Manage <ChevronRight className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )
      }

      {
        isAdmin && mgmtStep === 'topics' && activeMgmtCourse && (
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <Button variant="outline" size="sm" onClick={handleBackToCourses} className="rounded-full h-9 bg-white shadow-sm border-neutral-200">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
                <div>
                  <h2 className="text-xl font-bold text-neutral-800">{activeMgmtCourse.title} <span className="text-neutral-400 font-normal">/ Topics</span></h2>
                  <p className="text-sm text-neutral-500">Search topics and track question counts like LeetCode.</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <Input
                    placeholder="Search topics..."
                    value={topicSearch}
                    onChange={(e) => setTopicSearch(e.target.value)}
                    className="pl-9 w-64 bg-white"
                  />
                </div>
                <Button variant="outline" size="sm" className="rounded-full h-9" onClick={handleOpenAttendance}>
                  <Calendar className="w-4 h-4 mr-2" /> Attendance
                </Button>
                <Button variant="outline" size="sm" className="rounded-full h-9 shadow-sm" onClick={() => setMgmtStep('feedback')}>
                  <MessageSquare className="w-4 h-4 mr-2" /> Trainer Feedback
                </Button>
                <Button size="sm" className="bg-primary text-primary-foreground shadow-md hover:shadow-lg transition-all rounded-full h-9" onClick={() => {
                  const newTopic: Topic = {
                    id: `topic-${Date.now()}`,
                    title: 'New Topic',
                    content: '',
                    questions: [],
                    isLocked: false,
                    durationLocked: false,
                    images: [],
                  };
                  const updatedTopics = [...(activeMgmtCourse.topics || []), newTopic];
                  const updatedCourse = { ...activeMgmtCourse, topics: updatedTopics };
                  setActiveMgmtCourse(updatedCourse);
                  setCourseList(courseList.map(c => c.id === updatedCourse.id ? updatedCourse : c));
                  handleOpenTopicDetails(newTopic, updatedTopics.length - 1);
                  toast.success('New topic added');
                }}>
                  <Plus className="w-4 h-4 mr-2" /> New Topic
                </Button>
              </div>
            </div>

            <div className="rounded-xl bg-transparent">
              <div className="flex items-center justify-between mb-4 px-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-neutral-500" />
                  <span className="font-semibold text-neutral-700">Topics</span>
                </div>
                <span className="text-xs text-neutral-500">{filteredTopics.length} topics</span>
              </div>
              <div className="space-y-4">
                {filteredTopics.map((topic: Topic, idx: number) => {
                  const realIndex = activeMgmtCourse.topics.findIndex((t: Topic) => t.id === topic.id);
                  return (
                    <Card key={topic.id} className="hover:border-primary transition-colors cursor-pointer shadow-sm w-full" onClick={() => handleOpenTopicDetails(topic, realIndex)}>
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-xl font-bold text-neutral-900">{topic.title}</h3>
                          <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                            <Badge className="bg-emerald-100/60 text-emerald-700 shadow-none hover:bg-emerald-100/60 border-none font-medium flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Published
                            </Badge>
                          </div>
                        </div>

                        <div className="text-xs text-neutral-500 mb-5 flex items-center gap-1.5">
                          <span>Module {idx + 1}</span>
                          <span>&bull;</span>
                          <span>12 weeks</span>
                          <span>&bull;</span>
                          <span>100% complete</span>
                        </div>

                        <p className="text-sm text-neutral-700 mb-6 line-clamp-2">
                          {topic.content || 'Data structure concepts and implementations.'}
                        </p>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge variant="secondary" className="bg-emerald-100/50 text-emerald-700 font-medium border-emerald-200/50 px-3 py-1.5 hover:bg-emerald-100/50 flex items-center gap-1.5 rounded-md">
                              <BookOpen className="w-4 h-4" />
                              Content - 1
                            </Badge>
                            <Badge variant="secondary" className="bg-orange-100/50 text-orange-700 font-medium border-orange-200/50 px-3 py-1.5 hover:bg-orange-100/50 flex items-center gap-1.5 rounded-md">
                              <Code className="w-4 h-4" />
                              Assignment - {topic.questions?.length || 1}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-neutral-500 hover:text-neutral-900"
                              onClick={() => {
                                const updated = activeMgmtCourse.topics.map((t: any, i: number) =>
                                  i === realIndex ? { ...t, isLocked: !t.isLocked } : t
                                );
                                const updatedCourse = { ...activeMgmtCourse, topics: updated };
                                setActiveMgmtCourse(updatedCourse);
                                setCourseList(courseList.map(c => c.id === updatedCourse.id ? updatedCourse : c));
                                toast.success(`Topic ${updated[realIndex].isLocked ? 'locked' : 'unlocked'}`);
                              }}
                            >
                              {topic.isLocked ? <Lock className="w-4 h-4 text-red-500" /> : <Unlock className="w-4 h-4" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-neutral-500 hover:text-red-500"
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this topic? This action cannot be undone.')) {
                                  const updatedTopics = activeMgmtCourse.topics.filter((_: any, i: number) => i !== realIndex);
                                  const updatedCourse = { ...activeMgmtCourse, topics: updatedTopics };
                                  setActiveMgmtCourse(updatedCourse);
                                  setCourseList(courseList.map(c => c.id === updatedCourse.id ? updatedCourse : c));
                                  toast.success('Topic deleted successfully');
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-neutral-500">
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {filteredTopics.length === 0 && (
                  <div className="text-sm text-neutral-400 p-4 border rounded-xl bg-white text-center">No topics found. Try another search.</div>
                )}
              </div>
            </div>
          </div>
        )
      }

      {isAdmin && mgmtStep === 'attendance' && activeMgmtCourse && (
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={handleBackToTopics} className="rounded-full h-9 bg-white shadow-sm border-neutral-200">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Topics
              </Button>
              <div>
                <h2 className="text-xl font-bold text-neutral-800">Attendance <span className="text-neutral-400 font-normal">/ {activeMgmtCourse.title}</span></h2>
                <p className="text-sm text-neutral-500">Post attendance and view live student responses.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="rounded-full h-9" onClick={handlePostAttendance}>
                <CheckCircle2 className="w-4 h-4 mr-2" /> Post Attendance
              </Button>
              <Button variant="outline" size="sm" className="rounded-full h-9" onClick={handleCloseAttendance} disabled={!activeAttendance}>
                Close Attendance
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-base">Live Report</CardTitle>
                <CardDescription>Real-time attendance status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg border bg-neutral-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-neutral-600">Session Status</span>
                    <Badge className={activeAttendance ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-600'}>
                      {activeAttendance ? 'Active' : 'Not Started'}
                    </Badge>
                  </div>
                  <p className="text-xs text-neutral-500">
                    {activeAttendance ? new Date(activeAttendance.createdAt).toLocaleString() : 'Post attendance to start'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg border bg-white">
                    <p className="text-xs text-neutral-500">Total Students</p>
                    <p className="text-xl font-bold">{activeAttendance?.totalStudentIds.length || attendanceStudents.length}</p>
                  </div>
                  <div className="p-3 rounded-lg border bg-white">
                    <p className="text-xs text-neutral-500">Marked</p>
                    <p className="text-xl font-bold text-green-600">{activeAttendance?.markedStudentIds.length || 0}</p>
                  </div>
                  <div className="p-3 rounded-lg border bg-white col-span-2">
                    <p className="text-xs text-neutral-500">Pending</p>
                    <p className="text-lg font-semibold">
                      {(activeAttendance?.totalStudentIds.length || attendanceStudents.length) - (activeAttendance?.markedStudentIds.length || 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Student Attendance</CardTitle>
                <CardDescription>Live list of students who marked attendance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                  {attendanceStudents.length === 0 && (
                    <div className="p-6 text-center text-neutral-500">No students found for this batch.</div>
                  )}
                  {attendanceStudents.map(student => {
                    const marked = activeAttendance?.markedStudentIds.includes(student.id);
                    return (
                      <div key={student.id} className="flex items-center justify-between p-3 rounded-lg border border-neutral-200 bg-white">
                        <div>
                          <p className="text-sm font-medium text-neutral-900">{student.name}</p>
                          <p className="text-xs text-neutral-500">{student.email}</p>
                        </div>
                        <Badge className={marked ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-600'}>
                          {marked ? 'Present' : 'Not Marked'}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {isAdmin && mgmtStep === 'feedback' && activeMgmtCourse && (
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={handleBackToTopics} className="rounded-full h-9 bg-white shadow-sm border-neutral-200">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Topics
              </Button>
              <div>
                <h2 className="text-xl font-bold text-neutral-800">Trainer Feedback <span className="text-neutral-400 font-normal">/ {activeMgmtCourse.title}</span></h2>
                <p className="text-sm text-neutral-500">Create a Google-forms style feedback survey for students about their trainer.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant={isFeedbackPublished ? "secondary" : "default"} size="sm" className="rounded-full h-9" onClick={() => {
                setIsFeedbackPublished(!isFeedbackPublished);
                toast.success(isFeedbackPublished ? "Feedback Form Unpublished" : "Feedback Form Published to Students");
              }}>
                {isFeedbackPublished ? 'Unpublish Form' : 'Publish Feedback Form'}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex justify-between items-center text-lg">
                    <span>Feedback Form Preview</span>
                    {isFeedbackPublished && <Badge className="bg-green-100 text-green-700">Live</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {feedbackQuestions.map((q, i) => (
                    <div key={q.id} className="p-4 border border-neutral-200 rounded-lg bg-neutral-50/50 relative group">
                      <div className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500" onClick={() => {
                          setFeedbackQuestions(feedbackQuestions.filter(x => x.id !== q.id));
                        }}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <h3 className="font-semibold text-neutral-800 mb-3 text-sm">{i + 1}. {q.question}</h3>
                      {q.type === 'mcq' && (
                        <div className="space-y-2 pl-4">
                          {q.options?.map((opt: string, oi: number) => (
                            <div key={oi} className="flex items-center gap-2">
                              <div className="w-3.5 h-3.5 rounded-full border border-neutral-300"></div>
                              <span className="text-sm text-neutral-600">{opt}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {q.type === 'rating' && (
                        <div className="flex gap-2 text-neutral-300 pl-4">
                          {[1, 2, 3, 4, 5].map(star => <Star key={star} className="w-5 h-5" />)}
                        </div>
                      )}
                      {q.type === 'text' && (
                        <div className="pl-4">
                          <Textarea disabled placeholder="Student will enter text here..." className="bg-white/50 min-h-[80px]" />
                        </div>
                      )}
                    </div>
                  ))}
                  {feedbackQuestions.length === 0 && (
                    <div className="text-center text-neutral-400 py-8 text-sm">No feedback questions added yet.</div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card className="sticky top-6">
                <CardHeader>
                  <CardTitle className="text-lg">Add Question</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-xs">Question Type</Label>
                    <Select value={currentFeedbackQ.type} onValueChange={(val: any) => setCurrentFeedbackQ({ ...currentFeedbackQ, type: val })}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rating">Rating (5 Stars)</SelectItem>
                        <SelectItem value="mcq">Multiple Choice</SelectItem>
                        <SelectItem value="text">Long Text Answer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Question Text</Label>
                    <Input
                      value={currentFeedbackQ.question}
                      onChange={e => setCurrentFeedbackQ({ ...currentFeedbackQ, question: e.target.value })}
                      placeholder="E.g. How is the trainer explaining concepts?"
                    />
                  </div>
                  {currentFeedbackQ.type === 'mcq' && (
                    <div className="space-y-2 border-t pt-2">
                      <Label className="text-xs">Options</Label>
                      {currentFeedbackQ.options.map((opt, i) => (
                        <div key={i} className="flex gap-2">
                          <Input
                            value={opt}
                            onChange={e => {
                              const newOpts = [...currentFeedbackQ.options];
                              newOpts[i] = e.target.value;
                              setCurrentFeedbackQ({ ...currentFeedbackQ, options: newOpts });
                            }}
                            placeholder={`Option ${i + 1}`}
                            className="h-8 text-xs"
                          />
                          <Button variant="ghost" size="sm" className="h-8 w-8 px-0 text-red-500 outline-none" onClick={() => {
                            const newOpts = [...currentFeedbackQ.options];
                            newOpts.splice(i, 1);
                            setCurrentFeedbackQ({ ...currentFeedbackQ, options: newOpts });
                          }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      <Button variant="ghost" size="sm" className="w-full text-xs h-8 justify-start" onClick={() => {
                        setCurrentFeedbackQ({ ...currentFeedbackQ, options: [...currentFeedbackQ.options, ''] });
                      }}>
                        <Plus className="w-3 h-3 mr-1" /> Add Option
                      </Button>
                    </div>
                  )}
                  <Button className="w-full mt-2" onClick={() => {
                    if (!currentFeedbackQ.question) return toast.error("Enter a question text");
                    if (currentFeedbackQ.type === 'mcq' && currentFeedbackQ.options.filter(o => o.trim()).length < 2) {
                      return toast.error("MCQ requires at least 2 options");
                    }
                    const newQ = {
                      id: `fq-${Date.now()}`,
                      type: currentFeedbackQ.type,
                      question: currentFeedbackQ.question,
                      options: currentFeedbackQ.type === 'mcq' ? currentFeedbackQ.options.filter(o => o.trim()) : []
                    };
                    setFeedbackQuestions([...feedbackQuestions, newQ]);
                    setCurrentFeedbackQ({ type: 'rating', question: '', options: ['', ''] });
                    toast.success("Question Added to Form");
                  }}>
                    Add to Form
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {
        isAdmin && mgmtStep === 'details' && activeMgmtTopic && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={handleBackToTopics} className="rounded-full h-9 bg-white shadow-sm border-neutral-200">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Modules
              </Button>
              <h2 className="text-xl font-bold text-neutral-800">Topic Configuration <span className="text-neutral-400 font-normal">/ {activeMgmtTopic.title}</span></h2>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="rounded-full h-9" onClick={() => {
                const deadline = prompt('Enter deadline for this topic (e.g., 2024-12-31):', activeMgmtTopic.deadline || '');
                if (deadline) {
                  const updated = activeMgmtCourse.topics.map((t: any, i: number) =>
                    i === activeMgmtTopicIndex ? { ...t, deadline } : t
                  );
                  const updatedCourse = { ...activeMgmtCourse, topics: updated };
                  setActiveMgmtCourse(updatedCourse);
                  setActiveMgmtTopic({ ...activeMgmtTopic, deadline });
                  setCourseList(courseList.map(c => c.id === updatedCourse.id ? updatedCourse : c));
                  toast.success(`Deadline set to ${deadline}`);
                }
              }}>
                <Clock className="w-4 h-4 mr-2" /> Set Deadlines
              </Button>
              <Button size="sm" onClick={handleOpenAssessment} className="!bg-black hover:!bg-neutral-900 !text-white shadow-md hover:shadow-lg transition-all rounded-full h-9 px-6">
                Manage Assessment <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card className="border-none shadow-lg overflow-hidden">
                  <CardHeader className="bg-neutral-900 text-white pb-8">
                    <div className="flex justify-between items-center mb-4">
                      <Badge className="bg-white/20 text-white border-none backdrop-blur-md">Module Content</Badge>
                      <div className="flex items-center gap-4">
                        <span className="text-xs font-medium text-neutral-400">Status:</span>
                        <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full cursor-pointer hover:bg-white/20 transition-all"
                          onClick={() => {
                            const updated = activeMgmtCourse.topics.map((t: any, i: number) =>
                              i === activeMgmtTopicIndex ? { ...t, isLocked: !t.isLocked } : t
                            );
                            const updatedCourse = { ...activeMgmtCourse, topics: updated };
                            setActiveMgmtCourse(updatedCourse);
                            setActiveMgmtTopic({ ...activeMgmtTopic, isLocked: !activeMgmtTopic.isLocked });
                            toast.success(`Module ${!activeMgmtTopic.isLocked ? 'Locked' : 'Unlocked'}`);
                          }}>
                          {activeMgmtTopic.isLocked ? (
                            <><Lock className="w-4 h-4 text-red-400" /> <span className="text-xs font-bold text-red-400">LOCKED</span></>
                          ) : (
                            <><Unlock className="w-4 h-4 text-green-400" /> <span className="text-xs font-bold text-green-400">ACCESSIBLE</span></>
                          )}
                        </div>
                        <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full cursor-pointer hover:bg-white/20 transition-all border border-white/10"
                          onClick={() => {
                            const updated = activeMgmtCourse.topics.map((t: any, i: number) =>
                              i === activeMgmtTopicIndex ? { ...t, durationLocked: !t.durationLocked } : t
                            );
                            const updatedCourse = { ...activeMgmtCourse, topics: updated };
                            setActiveMgmtCourse(updatedCourse);
                            setActiveMgmtTopic({ ...activeMgmtTopic, durationLocked: !activeMgmtTopic.durationLocked });
                            toast.success(`Duration ${!activeMgmtTopic.durationLocked ? 'Locked' : 'Unlocked'}`);
                          }}>
                          {activeMgmtTopic.durationLocked ? (
                            <><Lock className="w-3.5 h-3.5 text-orange-400" /> <span className="text-[10px] font-bold text-orange-400">DURATION LOCKED</span></>
                          ) : (
                            <><Unlock className="w-3.5 h-3.5 text-green-400" /> <span className="text-[10px] font-bold text-green-400">DURATION OPEN</span></>
                          )}
                        </div>
                      </div>
                    </div>
                    <CardTitle className="text-2xl font-bold">{activeMgmtTopic.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-8">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold uppercase tracking-widest text-neutral-400">Detailed Description</Label>
                        <Badge variant="outline" className="text-[9px] border-neutral-200">Supports Markdown</Badge>
                      </div>
                      <Textarea
                        value={activeMgmtTopic.content}
                        onChange={(e) => setActiveMgmtTopic({ ...activeMgmtTopic, content: e.target.value })}
                        placeholder="Enter detailed topic description, learning objectives, and key takeaways..."
                        rows={12}
                        className="leading-relaxed border-neutral-100 bg-neutral-50/50 focus:bg-white transition-all text-neutral-700 resize-none scrollbar-thin"
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-neutral-400">
                          <ImageIcon className="w-4 h-4" /> Reference & Concept Images
                        </Label>
                        <Button variant="secondary" size="sm" className="h-8 text-xs font-bold rounded-full" onClick={() => {
                          toast.error("Image upload is not connected yet");
                        }}>
                          <Plus className="w-3.5 h-3.5 mr-1" /> Add Image
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {activeMgmtTopic.images?.map((img: string, i: number) => (
                          <div key={i} className="relative group rounded-xl overflow-hidden border shadow-sm h-40">
                            <img src={img} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-white hover:bg-white/20" onClick={() => window.open(img)}>
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-white hover:bg-red-500/80" onClick={() => {
                                const updated = activeMgmtTopic.images.filter((_: any, idx: number) => idx !== i);
                                setActiveMgmtTopic({ ...activeMgmtTopic, images: updated });
                              }}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        {(!activeMgmtTopic.images || activeMgmtTopic.images.length === 0) && (
                          <div className="col-span-full py-12 border-2 border-dashed border-neutral-100 rounded-xl flex flex-col items-center justify-center text-neutral-300 bg-neutral-50/50">
                            <ImageIcon className="w-10 h-10 mb-2 opacity-20" />
                            <p className="text-xs font-medium uppercase tracking-wider">No concept images added</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                  <div className="p-6 bg-neutral-50/80 border-t flex justify-end gap-3">
                    <Button variant="ghost" onClick={handleBackToTopics} className="font-bold text-xs uppercase tracking-widest text-neutral-600">Discard</Button>
                    <Button onClick={() => {
                      const updatedTopics = activeMgmtCourse.topics.map((t: any, i: number) =>
                        i === activeMgmtTopicIndex ? activeMgmtTopic : t
                      );
                      const updatedCourse = { ...activeMgmtCourse, topics: updatedTopics };
                      setActiveMgmtCourse(updatedCourse);
                      setCourseList(courseList.map(c => c.id === updatedCourse.id ? updatedCourse : c));
                      toast.success("Topic configuration synced");
                      handleBackToTopics();
                    }} className="px-8 font-bold text-white" style={{ color: 'white' }}>Save Module</Button>
                  </div>
                </Card>
              </div>

              <div className="space-y-6">
                <Card className="border-none shadow-lg">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold uppercase tracking-widest text-neutral-400">Topic Stats</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-between">
                      <span className="text-xs font-medium text-neutral-600">Total Questions</span>
                      <span className="text-xl font-bold text-primary">{activeMgmtTopic.questions?.length || 0}</span>
                    </div>
                    <div className="p-4 rounded-xl bg-orange-50 border border-orange-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-neutral-600">Access Duration</span>
                        <span className="text-sm font-bold text-orange-600">{activeMgmtTopic.accessDuration || 'Unlimited'}</span>
                      </div>
                      <Input
                        placeholder="e.g. 2h 30m"
                        value={activeMgmtTopic.accessDuration || ''}
                        onChange={(e) => setActiveMgmtTopic({ ...activeMgmtTopic, accessDuration: e.target.value })}
                        className="h-7 text-[10px] bg-white border-orange-200"
                      />
                    </div>
                    <div className="p-4 rounded-xl bg-green-50 border border-green-100 flex items-center justify-between">
                      <span className="text-xs font-medium text-neutral-600">Estimated Effort</span>
                      <span className="text-sm font-bold text-green-600">45 Minutes</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-lg !bg-black text-white overflow-hidden relative">
                  <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
                  <CardHeader>
                    <CardTitle className="text-lg font-bold">Manage Assessment</CardTitle>
                    <CardDescription className="text-white/70">Create MCQs and Coding problems for this module</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="secondary" className="w-full !bg-black hover:!bg-neutral-900 !text-white font-bold shadow-md hover:shadow-lg transition-all" onClick={handleOpenAssessment}>
                      Open Question Builder
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div >
        )
      }

      {
        isAdmin && mgmtStep === 'assessment' && activeMgmtTopic && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={handleBackToDetails}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Topic Details
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => openExistingQuestionDialog(activeMgmtTopicIndex)}>
                  <Plus className="w-4 h-4 mr-2" /> Add Existing Question
                </Button>
                <Button size="sm" onClick={() => {
                  // Scroll to create section or open dialog
                  setCurrentQuestion({
                    title: '',
                    question: '',
                    description: '',
                    difficulty: 'easy',
                    points: 10,
                    options: ['', '', '', ''],
                    correctAnswer: '',
                    type: 'mcq',
                    starterCode: '',
                    expectedOutput: '',
                    testCases: [],
                    tags: [],
                  });
                  toast.info("Prepare to create a new question below");
                }}>
                  <Plus className="w-4 h-4 mr-2" /> Create New Question
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Existing Questions ({activeMgmtTopic.questions?.length || 0})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {activeMgmtTopic.questions?.map((q: TopicQuestion, i: number) => (
                        <div key={q.id} className="p-4 border rounded-lg hover:border-primary transition-colors bg-neutral-50 shadow-sm relative group">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline" className="capitalize">{q.type?.replace('_', ' ')}</Badge>
                                <span className="text-xs text-neutral-500 italic">Question {i + 1}</span>
                              </div>
                              <p className="font-medium text-neutral-800">{q.title || q.question}</p>

                              {q.type === 'multiple_choice' && q.options && (
                                <div className="mt-3 grid grid-cols-2 gap-2">
                                  {q.options.map((opt, idx) => (
                                    <div key={idx} className={`p-2 rounded text-xs border ${opt === q.correctAnswer ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-neutral-200 text-neutral-600'}`}>
                                      {opt}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {q.type === 'coding' && (
                                <div className="mt-3 space-y-2">
                                  <div className="text-[10px] font-mono bg-neutral-800 text-white p-2 rounded overflow-x-auto">
                                    {q.starterCode?.substring(0, 100)}...
                                  </div>
                                  <div className="flex gap-2">
                                    <Badge variant="secondary" className="text-[10px] h-5">{q.testCases?.length || 0} Test Cases</Badge>
                                    <Badge variant="outline" className="text-[10px] h-5 border-yellow-200 text-yellow-700">{q.testCases?.filter(tc => tc.hidden).length || 0} Hidden</Badge>
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col gap-1 ml-4" onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => {
                                setEditingQuestionId(q.id);
                                setCurrentQuestion({
                                  title: q.title || '',
                                  question: q.question,
                                  description: q.description || '',
                                  difficulty: q.difficulty || 'easy',
                                  points: q.points || 10,
                                  options: q.options || ['', '', '', ''],
                                  correctAnswer: q.correctAnswer || '',
                                  type: q.type === 'multiple_choice' ? 'mcq' : 'coding',
                                  starterCode: q.starterCode || '',
                                  expectedOutput: q.expectedOutput || '',
                                  testCases: (q.testCases || []).map((tc: any) => ({
                                    input: tc.input || '',
                                    expectedOutput: tc.expectedOutput || '',
                                    hidden: !!tc.hidden
                                  })),
                                  tags: q.tags || [],
                                });
                              }}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500" onClick={() => {
                                const updatedQs = activeMgmtTopic.questions.filter((_: any, idx: number) => idx !== i);
                                setActiveMgmtTopic({ ...activeMgmtTopic, questions: updatedQs });
                                toast.info("Question removed from assessment");
                              }}><Trash2 className="w-4 h-4" /></Button>
                            </div>
                          </div>
                        </div>
                      ))}
                      {(!activeMgmtTopic.questions || activeMgmtTopic.questions.length === 0) && (
                        <div className="text-center py-12 text-neutral-400">
                          <FileText className="w-12 h-12 mx-auto mb-2 opacity-20" />
                          <p>No questions added to this assessment yet</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <Card className="sticky top-6 border border-neutral-200 shadow-xl rounded-3xl overflow-hidden">
                  <CardHeader className="bg-neutral-900 text-white p-6">
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                      <Plus className="w-5 h-5 text-blue-400" />
                      {editingQuestionId ? 'Update Question' : 'Create Question'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-8 space-y-6 max-h-[70vh] overflow-y-auto scrollbar-thin">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-neutral-400">Type</Label>
                        <Select
                          value={currentQuestion.type}
                          onValueChange={(val: any) => setCurrentQuestion({ ...currentQuestion, type: val === 'mcq' ? 'mcq' : 'coding' })}
                        >
                          <SelectTrigger className="h-11 rounded-xl border-neutral-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl shadow-2xl">
                            <SelectItem value="mcq">MCQ</SelectItem>
                            <SelectItem value="coding">Coding</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-neutral-400">Difficulty</Label>
                        <Select
                          value={currentQuestion.difficulty}
                          onValueChange={(val: any) => setCurrentQuestion({ ...currentQuestion, difficulty: val })}
                        >
                          <SelectTrigger className="h-11 rounded-xl border-neutral-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl shadow-2xl">
                            <SelectItem value="easy">Easy</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="hard">Hard</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-neutral-400">Question Title</Label>
                      <Input
                        className="h-11 rounded-xl border-neutral-200 focus:ring-2 focus:ring-primary/20"
                        value={currentQuestion.title}
                        onChange={(e) => setCurrentQuestion({ ...currentQuestion, title: e.target.value })}
                        placeholder="e.g., Variable Scope in Java"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label className="text-[10px] font-black uppercase text-neutral-400">Description</Label>
                        <Badge variant="outline" className="text-[8px] border-neutral-100 uppercase text-neutral-400">Markdown enabled</Badge>
                      </div>
                      <Textarea
                        className="min-h-[120px] rounded-2xl border-neutral-200 bg-neutral-50/30 focus:bg-white transition-all leading-relaxed p-4"
                        value={currentQuestion.description}
                        onChange={(e) => setCurrentQuestion({ ...currentQuestion, description: e.target.value })}
                        placeholder="Explain the problem or question context..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-neutral-400">Category Tags</Label>
                        <Input
                          className="h-11 rounded-xl border-neutral-200"
                          value={currentQuestion.tags?.join(', ') || ''}
                          onChange={(e) => setCurrentQuestion({ ...currentQuestion, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
                          placeholder="e.g., arrays, java"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-neutral-400">Points</Label>
                        <Input
                          type="number"
                          className="h-11 rounded-xl border-neutral-200"
                          value={currentQuestion.points}
                          onChange={(e) => setCurrentQuestion({ ...currentQuestion, points: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                    </div>

                    {currentQuestion.type === 'mcq' ? (
                      <div className="space-y-4 pt-4 border-t border-neutral-100">
                        <Label className="text-[10px] font-black uppercase text-neutral-400 flex items-center justify-between">
                          Options
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 text-[9px] rounded-full px-3 font-black"
                            onClick={() => setCurrentQuestion({ ...currentQuestion, options: [...currentQuestion.options, ''] })}
                          >
                            <Plus className="w-2.5 h-2.5 mr-1" /> Add
                          </Button>
                        </Label>
                        {currentQuestion.options.map((opt, i) => (
                          <div key={i} className="flex gap-2 group">
                            <div className="w-11 h-11 rounded-xl bg-neutral-100 flex items-center justify-center shrink-0 text-sm font-black text-neutral-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                              {String.fromCharCode(65 + i)}
                            </div>
                            <Input
                              value={opt}
                              placeholder={`Option ${String.fromCharCode(65 + i)}`}
                              className="h-11 rounded-xl border-neutral-200 bg-neutral-50/10 focus:bg-white"
                              onChange={(e) => {
                                const updated = [...currentQuestion.options];
                                updated[i] = e.target.value;
                                setCurrentQuestion({ ...currentQuestion, options: updated });
                              }}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-11 w-11 p-0 rounded-xl text-red-400 hover:text-red-600 hover:bg-red-50"
                              onClick={() => {
                                const updated = currentQuestion.options.filter((_, idx) => idx !== i);
                                setCurrentQuestion({ ...currentQuestion, options: updated });
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                        <div className="pt-4 p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                          <Label className="text-[10px] font-black uppercase text-blue-900 mb-3 block tracking-widest pl-1">Correct Answer</Label>
                          <Select
                            value={currentQuestion.correctAnswer}
                            onValueChange={(val) => setCurrentQuestion({ ...currentQuestion, correctAnswer: val })}
                          >
                            <SelectTrigger className="h-10 rounded-xl border-blue-200 bg-white shadow-sm font-bold text-blue-900">
                              <SelectValue placeholder="Mark the right one" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl shadow-2xl">
                              {currentQuestion.options.filter(o => o.trim()).map((opt, i) => (
                                <SelectItem key={i} value={opt} className="font-medium">
                                  Option {String.fromCharCode(65 + i)}: {opt}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6 pt-4 border-t border-neutral-100">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase text-neutral-400">Starter Code (Template)</Label>
                          <div className="rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-900 shadow-xl ring-4 ring-neutral-50">
                            <Textarea
                              className="font-mono text-[11px] min-h-[160px] bg-neutral-900 text-green-400 border-none focus:ring-0 p-6 leading-relaxed selection:bg-green-500/20"
                              value={currentQuestion.starterCode}
                              onChange={(e) => setCurrentQuestion({ ...currentQuestion, starterCode: e.target.value })}
                              placeholder="// Start coding here..."
                            />
                          </div>
                        </div>

                        <div className="space-y-4 pt-6 border-t border-neutral-100">
                          <div className="flex items-center justify-between mb-4">
                            <Label className="text-sm font-black text-neutral-900 uppercase tracking-wide">Test Cases</Label>
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-white border-neutral-200 rounded-full h-8 px-4 font-bold text-[10px] hover:bg-neutral-50 shadow-sm"
                              onClick={handleAddTestCase}
                            >
                              <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Case
                            </Button>
                          </div>
                          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
                            {currentQuestion.testCases.map((tc, i) => (
                              <div key={i} className="p-5 border border-neutral-200 rounded-2xl bg-white space-y-4 shadow-sm hover:shadow-md transition-all">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest pl-1">Case #{i + 1}</span>
                                  <div className="flex items-center gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                      <div className={`w-8 h-4 rounded-full transition-all relative ${tc.hidden ? 'bg-amber-400' : 'bg-neutral-200'}`}>
                                        <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${tc.hidden ? 'right-0.5' : 'left-0.5'}`} />
                                      </div>
                                      <input
                                        type="checkbox"
                                        className="hidden"
                                        checked={tc.hidden}
                                        onChange={(e) => handleTestCaseChange(i, 'hidden', e.target.checked)}
                                      />
                                      <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Hidden</span>
                                    </label>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 rounded-xl text-red-500 hover:bg-red-50" onClick={() => handleRemoveTestCase(i)}>
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-1.5">
                                    <Label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest pl-2">Input</Label>
                                    <Input
                                      placeholder="e.g. 5 10"
                                      className="h-10 rounded-xl text-xs font-mono bg-neutral-50/50"
                                      value={tc.input}
                                      onChange={(e) => handleTestCaseChange(i, 'input', e.target.value)}
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <Label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest pl-2">Output</Label>
                                    <Input
                                      placeholder="e.g. 15"
                                      className="h-10 rounded-xl text-xs font-mono bg-neutral-50/50"
                                      value={tc.expectedOutput}
                                      onChange={(e) => handleTestCaseChange(i, 'expectedOutput', e.target.value)}
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                            {currentQuestion.testCases.length === 0 && (
                              <div className="py-12 border-2 border-dashed border-neutral-100 rounded-2xl flex flex-col items-center justify-center text-neutral-300 bg-neutral-50/10 italic text-xs">
                                No test cases specified.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <Button className="w-full h-14 !bg-black hover:!bg-neutral-900 !text-white shadow-2xl rounded-2xl font-black uppercase tracking-widest text-xs mt-6 transition-all active:scale-[0.98]" onClick={() => {
                      if (!currentQuestion.title && !currentQuestion.question) return toast.error("Please enter a question or title");

                      let finalQ: TopicQuestion = {
                        id: editingQuestionId || `q-${Date.now()}`,
                        title: currentQuestion.title,
                        question: currentQuestion.question || currentQuestion.title,
                        description: currentQuestion.description,
                        difficulty: currentQuestion.difficulty,
                        points: currentQuestion.points,
                        type: currentQuestion.type === 'mcq' ? 'multiple_choice' : 'coding',
                        tags: currentQuestion.tags
                      };

                      if (currentQuestion.type === 'mcq') {
                        if (!currentQuestion.correctAnswer) return toast.error("Please select a correct answer");
                        finalQ.options = currentQuestion.options.filter(o => o.trim());
                        finalQ.correctAnswer = currentQuestion.correctAnswer;
                      } else {
                        if (!currentQuestion.starterCode) return toast.error("Please enter starter code");
                        finalQ.starterCode = currentQuestion.starterCode;
                        finalQ.testCases = currentQuestion.testCases;
                      }

                      let updatedQs;
                      if (editingQuestionId) {
                        updatedQs = activeMgmtTopic.questions.map((q: any) => q.id === editingQuestionId ? finalQ : q);
                        toast.success("Question updated");
                      } else {
                        updatedQs = [...(activeMgmtTopic.questions || []), finalQ];
                        toast.success("Question created and added to topic");
                      }

                      setActiveMgmtTopic({ ...activeMgmtTopic, questions: updatedQs });

                      // Reset current question
                      setCurrentQuestion({
                        title: '',
                        question: '',
                        description: '',
                        difficulty: 'easy',
                        points: 10,
                        options: ['', '', '', ''],
                        correctAnswer: '',
                        type: 'mcq',
                        starterCode: '',
                        expectedOutput: '',
                        testCases: [],
                        tags: [],
                      });
                      setEditingQuestionId(null);
                    }}>
                      {editingQuestionId ? 'Update Question' : 'Add to Assessment'}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t sticky bottom-0 bg-neutral-100 p-4 -mx-6 rounded-b-lg shadow-inner">
              <Button variant="outline" onClick={handleBackToDetails}>Finish Later</Button>
              <Button className="bg-primary text-white" onClick={() => {
                const updatedTopics = activeMgmtCourse.topics.map((t: any, i: number) =>
                  i === activeMgmtTopicIndex ? activeMgmtTopic : t
                );
                const updatedCourse = { ...activeMgmtCourse, topics: updatedTopics };
                setActiveMgmtCourse(updatedCourse);
                setCourseList(courseList.map(c => c.id === updatedCourse.id ? updatedCourse : c));
                toast.success("Assessment configuration saved");
                handleBackToTopics();
              }}>Complete Setup</Button>
            </div>
          </div>
        )
      }

      {
        isAdmin && mgmtStep === 'question-library' && activeMgmtTopic && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={() => setMgmtStep('assessment')} className="rounded-full h-9 bg-white shadow-sm border-neutral-200">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Assessment
              </Button>
              <p className="text-sm text-neutral-500 font-medium hidden sm:block">
                Question Library / <span className="text-neutral-800 font-semibold">{activeMgmtTopic.title}</span>
              </p>
            </div>

            <Card className="border border-neutral-200 shadow-lg overflow-hidden">
              <div className="p-5 sm:p-6 lg:p-8 bg-neutral-900 text-white">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-3 text-white">
                      <div className="w-10 h-10 rounded-2xl bg-blue-500/20 flex items-center justify-center border border-blue-500/10">
                        <Search className="w-5 h-5 text-blue-400" />
                      </div>
                      Question Library
                    </h3>
                    <p className="text-white/80 mt-1 font-medium">
                      Fetch from the existing LMS question bank and add directly to this assessment.
                    </p>
                  </div>
                  <Button
                    onClick={() => setMgmtStep('assessment')}
                    className="!bg-[#0b122b] hover:!bg-[#111c3b] !text-white border border-white/30 shadow-sm"
                  >
                    Done
                  </Button>
                </div>
              </div>

              <div className="flex flex-col lg:flex-row min-h-[70vh]">
                <div className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-neutral-200 bg-neutral-50 p-6 flex flex-col gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em] pl-1">Filters</label>
                    <div className="relative group">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-primary transition-colors" />
                      <Input
                        placeholder="Search title..."
                        value={questionSearch}
                        onChange={(e) => setQuestionSearch(e.target.value)}
                        className="pl-10 h-11 border-neutral-200 rounded-2xl bg-white shadow-sm focus:bg-white transition-all text-sm font-medium text-neutral-900"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em] pl-1">Popular Tags</label>
                      {selectedTag && (
                        <button onClick={() => setSelectedTag(null)} className="text-[9px] font-bold text-blue-600 hover:underline">Clear all</button>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5 max-h-[38vh] overflow-y-auto pr-2 scrollbar-thin">
                      <button
                        onClick={() => setSelectedTag(null)}
                        className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${!selectedTag ? 'bg-neutral-900 text-white shadow-lg' : 'bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-200'}`}
                      >
                        All Questions
                      </button>
                      {tagStats.map(tag => (
                        <button
                          key={tag.name}
                          onClick={() => setSelectedTag(selectedTag === tag.name ? null : tag.name)}
                          className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${selectedTag === tag.name ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-200'}`}
                        >
                          <span className="truncate flex-1">{tag.name}</span>
                          <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[9px] ${selectedTag === tag.name ? 'bg-blue-500/50' : 'bg-neutral-100 text-neutral-500'}`}>{tag.total}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-auto pt-6 border-t border-neutral-200">
                    <div
                      className="p-4 rounded-2xl bg-white shadow-md relative overflow-hidden border border-neutral-200"
                    >
                      <div className="relative z-10">
                        <p className="text-[10px] font-black uppercase tracking-widest mb-1 text-neutral-900">Library Strength</p>
                        <p className="text-2xl font-black text-neutral-900">{allQuestions.length}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex-1 p-4 sm:p-6 lg:p-8 bg-white">
                  <div className="bg-white border border-neutral-300 rounded-2xl p-6 shadow-sm relative overflow-hidden mb-6">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-50" />
                    <div className="flex items-center justify-between mb-8 relative z-10 px-1">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-6 bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.6)]" />
                        <span className="text-sm font-black text-neutral-900 uppercase tracking-[0.15em]">Topics Library</span>
                      </div>
                      <button
                        onClick={() => setSelectedTopic(null)}
                        className={`text-[10px] font-black uppercase tracking-widest transition-all py-2 px-6 rounded-2xl border ${selectedTopic ? 'text-neutral-900 border-blue-300 bg-blue-100 hover:bg-blue-200' : 'text-neutral-900 border-neutral-300 bg-neutral-100 cursor-default'}`}
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
                          className={`flex items-center gap-3 px-5 py-2.5 rounded-2xl border transition-all duration-300 ${selectedTopic === topic.name
                            ? 'bg-blue-100 border-blue-300 text-neutral-900 shadow-sm scale-[1.01]'
                            : 'bg-white border-neutral-300 text-neutral-900 hover:border-blue-300 hover:bg-neutral-50'
                            }`}
                        >
                          <span className="text-[13px] font-bold tracking-tight text-neutral-900">{topic.name || 'General'}</span>
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black min-w-[28px] text-center transition-all ${selectedTopic === topic.name
                            ? 'bg-blue-200 text-neutral-900'
                            : 'bg-neutral-200 text-neutral-900'
                            }`}>
                            {topic.total}
                          </span>
                        </button>
                      ))}
                      {topicStats.length === 0 && (
                        <div className="w-full py-12 text-center">
                          <p className="text-neutral-500 font-bold uppercase tracking-widest text-[10px]">No topics available</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="max-h-[50vh] lg:max-h-[55vh] overflow-y-auto pr-2 scrollbar-thin">
                    <div className="grid grid-cols-1 gap-4">
                      {filteredLibraryQuestions.map((q) => (
                        <div key={q.id} className="group p-6 border border-neutral-200 rounded-[1.5rem] bg-neutral-50 hover:bg-white hover:border-blue-200 hover:shadow-xl hover:shadow-blue-200/20 transition-all duration-300 relative overflow-hidden">
                          <div className="flex items-start justify-between relative z-10">
                            <div className="flex-1 mr-6">
                              <div className="flex items-center gap-3 mb-3">
                                <Badge className={`${q.type === 'coding' ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'} border-none rounded-lg text-[9px] font-black uppercase px-2 h-5 tracking-wide`}>
                                  {q.type === 'coding' ? 'Coding' : 'MCQ'}
                                </Badge>
                                <div className="flex gap-1.5">
                                  {q.tags?.slice(0, 3).map((tag, i) => (
                                    <span key={i} className="text-[9px] font-bold text-neutral-500 bg-white border border-neutral-200 px-2 py-0.5 rounded-full">#{tag}</span>
                                  ))}
                                  {(q.tags?.length || 0) > 3 && <span className="text-[9px] font-bold text-neutral-400">+{q.tags!.length - 3} more</span>}
                                </div>
                              </div>
                              <h4 className="text-base font-black text-neutral-900 leading-tight mb-2">
                                {q.title || q.question}
                              </h4>
                              <p className="text-xs text-neutral-600 line-clamp-2 leading-relaxed">
                                {q.description || (q.type === 'multiple_choice' ? 'Multiple choice assessment question.' : 'Technical coding challenge.')}
                              </p>
                              <div className="flex items-center gap-4 mt-4">
                                <div className="flex items-center gap-1.5">
                                  <div className={`w-1.5 h-1.5 rounded-full ${q.difficulty === 'hard' ? 'bg-red-500' : q.difficulty === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                                  <span className="text-[10px] font-black uppercase text-neutral-600 tracking-wider font-mono">{q.difficulty || 'medium'}</span>
                                </div>
                                <span className="text-[10px] font-black uppercase text-neutral-500 tracking-wider font-mono">{q.points || 10} Points</span>
                              </div>
                            </div>
                            <Button
                              onClick={() => handleSelectExistingQuestion(q)}
                              className="!bg-black hover:!bg-neutral-900 !text-white rounded-2xl h-11 px-6 font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shrink-0"
                            >
                              Select
                            </Button>
                          </div>
                        </div>
                      ))}
                      {filteredLibraryQuestions.length === 0 && (
                        <div className="p-20 flex flex-col items-center justify-center text-center">
                          <div className="w-20 h-20 bg-neutral-50 rounded-[2.5rem] flex items-center justify-center mb-6">
                            <Search className="w-8 h-8 text-neutral-300" />
                          </div>
                          <p className="text-lg font-black text-neutral-900">No questions found</p>
                          <p className="text-sm text-neutral-500 mt-1 max-w-xs">Try changing search text or clearing filters.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )
      }


      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Course</DialogTitle>
            <DialogDescription>
              Update course information and curriculum
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 pr-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-institution">Institution</Label>
                <Select value={newCourse.institutionId} onValueChange={(val) => setNewCourse({ ...newCourse, institutionId: val, batchId: '' })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Institution" />
                  </SelectTrigger>
                  <SelectContent>
                    {institutions.map(inst => (
                      <SelectItem key={inst.id} value={inst.id}>{inst.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-batch">Batch</Label>
                <Select
                  value={newCourse.batchId}
                  onValueChange={(val) => setNewCourse({ ...newCourse, batchId: val })}
                  disabled={!newCourse.institutionId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Batch" />
                  </SelectTrigger>
                  <SelectContent>
                    {batches.map(batch => (
                      <SelectItem key={batch.id} value={batch.id}>{batch.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="edit-title">Course Title</Label>
              <Input
                id="edit-title"
                value={newCourse.title}
                onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={newCourse.description}
                onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-level">Level</Label>
                <Select value={newCourse.level} onValueChange={(value: any) => setNewCourse({ ...newCourse, level: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-duration">Duration</Label>
                <Input
                  id="edit-duration"
                  value={newCourse.duration}
                  onChange={(e) => setNewCourse({ ...newCourse, duration: e.target.value })}
                />
              </div>
            </div>

            {/* Topics Management in Edit */}
            <div className="border rounded-lg p-4 bg-neutral-50 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Course Curriculum
              </h3>

              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <Label>New Topic Title</Label>
                    <Input
                      value={currentTopic.title}
                      onChange={(e) => setCurrentTopic({ ...currentTopic, title: e.target.value })}
                      placeholder="e.g., Introduction to React Hooks"
                    />
                  </div>
                  <div>
                    <Label>Topic Content</Label>
                    <Textarea
                      value={currentTopic.content}
                      onChange={(e) => setCurrentTopic({ ...currentTopic, content: e.target.value })}
                      placeholder="Brief overview of what will be covered..."
                      rows={2}
                    />
                  </div>
                  <Button type="button" variant="outline" size="sm" className="w-fit" onClick={handleAddTopic}>
                    <Plus className="w-4 h-4 mr-2" /> Add Topic
                  </Button>
                </div>
              </div>

              {newCourse.topics.length > 0 && (
                <Accordion type="single" collapsible className="w-full">
                  {newCourse.topics.map((topic, tIdx) => (
                    <AccordionItem key={topic.id} value={topic.id}>
                      <AccordionTrigger className="text-sm py-2">
                        <div className="flex items-center gap-2">
                          {topic.isLocked ? (
                            <Lock className="w-3 h-3 text-red-500" />
                          ) : (
                            <Unlock className="w-3 h-3 text-green-500" />
                          )}
                          {topic.title} ({topic.questions.length} Qs)
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4 pt-2">
                        <div className="flex items-center justify-between bg-neutral-100 p-2 rounded mb-2">
                          <span className="text-xs font-medium">Topic Status: {topic.isLocked ? 'Locked' : 'Unlocked'}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[10px]"
                            onClick={() => handleTopicToggleLock(tIdx)}
                          >
                            {topic.isLocked ? 'Unlock Topic' : 'Lock Topic'}
                          </Button>
                        </div>
                        <p className="text-xs text-neutral-600 mb-4">{topic.content}</p>

                        <div className="border-t pt-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-bold uppercase tracking-wider text-neutral-500">Add Assessment Question</Label>
                            <Select
                              value={currentQuestion.type}
                              onValueChange={(val: 'mcq' | 'coding') => setCurrentQuestion({ ...currentQuestion, type: val })}
                            >
                              <SelectTrigger className="h-6 w-32 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="mcq">MCQ</SelectItem>
                                <SelectItem value="coding">Coding</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <Input
                            placeholder="Question Text"
                            className="text-sm"
                            value={currentQuestion.question}
                            onChange={(e) => setCurrentQuestion({ ...currentQuestion, question: e.target.value })}
                          />

                          <Input
                            placeholder="Category Tags (comma-separated, e.g. arrays, strings)"
                            className="text-sm"
                            value={currentQuestion.tags?.join(', ') || ''}
                            onChange={(e) => setCurrentQuestion({ ...currentQuestion, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
                          />

                          {currentQuestion.type === 'mcq' ? (
                            <>
                              <div className="grid grid-cols-2 gap-2">
                                {currentQuestion.options.map((opt, oIdx) => (
                                  <Input
                                    key={oIdx}
                                    placeholder={`Option ${oIdx + 1}`}
                                    className="text-xs h-8"
                                    value={opt}
                                    onChange={(e) => {
                                      const newOpts = [...currentQuestion.options];
                                      newOpts[oIdx] = e.target.value;
                                      setCurrentQuestion({ ...currentQuestion, options: newOpts });
                                    }}
                                  />
                                ))}
                              </div>
                              <Input
                                placeholder="Correct Answer (must match one option)"
                                className="text-xs h-8"
                                value={currentQuestion.correctAnswer}
                                onChange={(e) => setCurrentQuestion({ ...currentQuestion, correctAnswer: e.target.value })}
                              />
                            </>
                          ) : (
                            <div className="space-y-4">
                              <Textarea
                                placeholder="Starter Code"
                                className="text-xs font-mono"
                                rows={3}
                                value={currentQuestion.starterCode}
                                onChange={(e) => setCurrentQuestion({ ...currentQuestion, starterCode: e.target.value })}
                              />

                              <div className="space-y-2 bg-neutral-100 p-2 rounded">
                                <div className="flex items-center justify-between">
                                  <Label className="text-xs font-bold">Test Cases</Label>
                                  <Button type="button" size="sm" variant="ghost" className="h-6 text-xs" onClick={handleAddTestCase}>
                                    <Plus className="w-3 h-3 mr-1" /> Add Case
                                  </Button>
                                </div>
                                {currentQuestion.testCases.map((tc, tcIdx) => (
                                  <div key={tcIdx} className="grid grid-cols-12 gap-2 items-start text-xs border-b border-neutral-200 pb-2 mb-2 last:border-0 last:pb-0 last:mb-0">
                                    <div className="col-span-5 space-y-1">
                                      <Input
                                        placeholder="Input"
                                        className="h-7 text-xs"
                                        value={tc.input}
                                        onChange={(e) => handleTestCaseChange(tcIdx, 'input', e.target.value)}
                                      />
                                      <div className="flex items-center gap-1">
                                        <input
                                          type="checkbox"
                                          id={`edit-hidden-${tcIdx}`}
                                          checked={tc.hidden}
                                          onChange={(e) => handleTestCaseChange(tcIdx, 'hidden', e.target.checked)}
                                        />
                                        <label htmlFor={`edit-hidden-${tcIdx}`} className="text-[10px] text-neutral-500">Hidden Case</label>
                                      </div>
                                    </div>
                                    <div className="col-span-5">
                                      <Input
                                        placeholder="Expected Output"
                                        className="h-7 text-xs"
                                        value={tc.expectedOutput}
                                        onChange={(e) => handleTestCaseChange(tcIdx, 'expectedOutput', e.target.value)}
                                      />
                                    </div>
                                    <div className="col-span-2 flex justify-end">
                                      <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => handleRemoveTestCase(tcIdx)}>
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="w-full h-8 text-xs"
                            onClick={() => handleAddQuestion(tIdx)}
                          >
                            Add {currentQuestion.type === 'mcq' ? 'MCQ' : 'Coding'} Question
                          </Button>
                        </div>

                        {topic.questions.length > 0 && (
                          <div className="mt-4 space-y-2">
                            <p className="text-[10px] font-bold uppercase text-neutral-400">Current Questions ({topic.questions.length})</p>
                            <div className="space-y-2">
                              {topic.questions.map((q, qIdx) => (
                                <div key={q.id} className="text-xs p-2 bg-white border rounded flex justify-between items-start">
                                  <span>{qIdx + 1}. {q.question}</span>
                                  <Badge variant="secondary" className="text-[9px] h-4">
                                    Ans: {q.correctAnswer}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateCourse} style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Course</DialogTitle>
            <DialogDescription>
              Set up a new course with curriculum and assessments
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 pr-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="create-institution">Institution</Label>
                <Select value={newCourse.institutionId} onValueChange={(val) => setNewCourse({ ...newCourse, institutionId: val, batchId: '' })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Institution" />
                  </SelectTrigger>
                  <SelectContent>
                    {institutions.map(inst => (
                      <SelectItem key={inst.id} value={inst.id}>{inst.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="create-batch">Batch</Label>
                <Select
                  value={newCourse.batchId}
                  onValueChange={(val) => setNewCourse({ ...newCourse, batchId: val })}
                  disabled={!newCourse.institutionId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Batch" />
                  </SelectTrigger>
                  <SelectContent>
                    {batches.map(batch => (
                      <SelectItem key={batch.id} value={batch.id}>{batch.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="create-title">Course Title</Label>
              <Input
                id="create-title"
                value={newCourse.title}
                onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="create-description">Description</Label>
              <Textarea
                id="create-description"
                value={newCourse.description}
                onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="create-level">Level</Label>
                <Select value={newCourse.level} onValueChange={(value: any) => setNewCourse({ ...newCourse, level: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="create-duration">Duration</Label>
                <Input
                  id="create-duration"
                  value={newCourse.duration}
                  onChange={(e) => setNewCourse({ ...newCourse, duration: e.target.value })}
                />
              </div>
            </div>

            {/* Topics Management in Create */}
            <div className="border rounded-lg p-4 bg-neutral-50 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Course Curriculum
              </h3>

              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <Label>New Topic Title</Label>
                    <Input
                      value={currentTopic.title}
                      onChange={(e) => setCurrentTopic({ ...currentTopic, title: e.target.value })}
                      placeholder="e.g., Introduction to React Hooks"
                    />
                  </div>
                  <div>
                    <Label>Topic Content</Label>
                    <Textarea
                      value={currentTopic.content}
                      onChange={(e) => setCurrentTopic({ ...currentTopic, content: e.target.value })}
                      placeholder="Brief overview of what will be covered..."
                      rows={2}
                    />
                  </div>
                  <Button type="button" variant="outline" size="sm" className="w-fit" onClick={handleAddTopic}>
                    <Plus className="w-4 h-4 mr-2" /> Add Topic
                  </Button>
                </div>
              </div>

              {newCourse.topics.length > 0 && (
                <Accordion type="single" collapsible className="w-full">
                  {newCourse.topics.map((topic, tIdx) => (
                    <AccordionItem key={topic.id} value={topic.id}>
                      <AccordionTrigger className="text-sm py-2">
                        <div className="flex items-center gap-2">
                          {topic.isLocked ? (
                            <Lock className="w-3 h-3 text-red-500" />
                          ) : (
                            <Unlock className="w-3 h-3 text-green-500" />
                          )}
                          {topic.title} ({topic.questions.length} Qs)
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4 pt-2">
                        <div className="flex items-center justify-between bg-neutral-100 p-2 rounded mb-2">
                          <span className="text-xs font-medium">Topic Status: {topic.isLocked ? 'Locked' : 'Unlocked'}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[10px]"
                            onClick={() => handleTopicToggleLock(tIdx)}
                          >
                            {topic.isLocked ? 'Unlock Topic' : 'Lock Topic'}
                          </Button>
                        </div>
                        <p className="text-xs text-neutral-600 mb-4">{topic.content}</p>

                        <div className="border-t pt-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-bold uppercase tracking-wider text-neutral-500">Add Assessment Question</Label>
                            <Select
                              value={currentQuestion.type}
                              onValueChange={(value) => setCurrentQuestion({ ...currentQuestion, type: value as 'mcq' | 'coding' })}
                            >
                              <SelectTrigger className="w-32 h-8">
                                <SelectValue placeholder="Type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="mcq">MCQ</SelectItem>
                                <SelectItem value="coding">Coding</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label className="text-xs">Question</Label>
                            <Textarea
                              value={currentQuestion.question}
                              onChange={(e) => setCurrentQuestion({ ...currentQuestion, question: e.target.value })}
                              placeholder="Enter your question..."
                              rows={2}
                              className="text-sm"
                            />
                          </div>

                          <div>
                            <Label className="text-xs">Category Tags</Label>
                            <Input
                              value={currentQuestion.tags?.join(', ') || ''}
                              onChange={(e) => setCurrentQuestion({ ...currentQuestion, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
                              placeholder="comma-separated e.g. loops, math"
                              className="text-sm h-8"
                            />
                          </div>

                          {currentQuestion.type === 'mcq' ? (
                            <div className="space-y-2">
                              <Label className="text-xs">Options</Label>
                              {currentQuestion.options.map((opt, idx) => (
                                <div key={idx} className="flex gap-2">
                                  <Input
                                    value={opt}
                                    onChange={(e) => {
                                      const newOpts = [...currentQuestion.options];
                                      newOpts[idx] = e.target.value;
                                      setCurrentQuestion({ ...currentQuestion, options: newOpts });
                                    }}
                                    placeholder={`Option ${idx + 1}`}
                                    className="text-sm"
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      const newOpts = currentQuestion.options.filter((_, i) => i !== idx);
                                      setCurrentQuestion({ ...currentQuestion, options: newOpts });
                                    }}
                                    className="px-2"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              ))}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentQuestion({ ...currentQuestion, options: [...currentQuestion.options, ''] })}
                                className="w-fit"
                              >
                                <Plus className="w-3 h-3 mr-1" /> Add Option
                              </Button>
                              <div>
                                <Label className="text-xs">Correct Answer</Label>
                                <Select
                                  value={currentQuestion.correctAnswer}
                                  onValueChange={(value) => setCurrentQuestion({ ...currentQuestion, correctAnswer: value })}
                                >
                                  <SelectTrigger className="h-8">
                                    <SelectValue placeholder="Select correct answer" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {currentQuestion.options.map((opt, idx) => (
                                      <SelectItem key={idx} value={opt}>{opt || `Option ${idx + 1}`}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div>
                                <Label className="text-xs">Starter Code</Label>
                                <Textarea
                                  value={currentQuestion.starterCode || ''}
                                  onChange={(e) => setCurrentQuestion({ ...currentQuestion, starterCode: e.target.value })}
                                  placeholder="Provide starter code..."
                                  rows={3}
                                  className="font-mono text-sm"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Expected Output</Label>
                                <Textarea
                                  value={currentQuestion.expectedOutput || ''}
                                  onChange={(e) => setCurrentQuestion({ ...currentQuestion, expectedOutput: e.target.value })}
                                  placeholder="Expected output..."
                                  rows={2}
                                  className="font-mono text-sm"
                                />
                              </div>
                            </div>
                          )}

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddQuestion(tIdx)}
                            className="w-fit"
                          >
                            <Plus className="w-3 h-3 mr-1" /> Add Question
                          </Button>

                          {topic.questions.length > 0 && (
                            <div className="border-t pt-3 space-y-2">
                              <Label className="text-xs font-bold uppercase tracking-wider text-neutral-500">Questions ({topic.questions.length})</Label>
                              <div className="space-y-2">
                                {topic.questions.map((q, qIdx) => (
                                  <div key={qIdx} className="flex items-start justify-between p-2 bg-white rounded border">
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-sm">{q.question}</p>
                                      <div className="flex gap-2 items-center mt-1">
                                        <Badge variant="outline" className="text-[10px] h-5">{q.type === 'coding' ? 'Coding' : 'MCQ'}</Badge>
                                        {q.type === 'multiple_choice' && <span className="text-xs text-neutral-500">Ans: {q.correctAnswer}</span>}
                                      </div>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRemoveQuestion(tIdx, qIdx)}
                                      className="ml-2 h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateCourse} style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
                Create Course
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog >

      {/* Enrolled Courses */}
      {
        !isAdmin && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 mb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate('dashboard')}
                className="text-neutral-500 hover:text-neutral-900"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>
            <h3 className="mb-4 text-2xl font-bold">My Courses</h3>
            <div className={`grid gap-6 ${currentUser?.role === 'student' ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
              {(currentUser?.role === 'student' ? courses.slice(0, 1) : courses.slice(0, 2)).map((course) => (
                <Card key={course.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <CardTitle>{course.title}</CardTitle>
                        <CardDescription className="mt-2">{course.description}</CardDescription>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          course.level === 'beginner'
                            ? 'border-green-300 text-green-700'
                            : course.level === 'intermediate'
                              ? 'border-yellow-300 text-yellow-700'
                              : 'border-red-300 text-red-700'
                        }
                      >
                        {course.level}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-neutral-600">Course Progress</span>
                        <span>65%</span>
                      </div>
                      <Progress value={65} />
                    </div>

                    <div className="grid grid-cols-3 gap-4 py-3 border-y border-neutral-200">
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-sm text-neutral-600 mb-1">
                          <Clock className="w-4 h-4" />
                          <span>Duration</span>
                        </div>
                        <p className="text-sm">{course.duration}</p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-sm text-neutral-600 mb-1">
                          <BookOpen className="w-4 h-4" />
                          <span>Lessons</span>
                        </div>
                        <p className="text-sm">{course.lessons}</p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-sm text-neutral-600 mb-1">
                          <Users className="w-4 h-4" />
                          <span>Students</span>
                        </div>
                        <p className="text-sm">{course.enrolled}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {course.tags.map((tag) => (
                        <Badge key={tag} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    <div className={`grid gap-2 ${currentUser?.role === 'student' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                      {currentUser?.role === 'faculty' || currentUser?.role === 'trainer' ? (
                        <Button
                          className="w-full"
                          variant="outline"
                          onClick={() => onNavigate('course-modules', course)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Course
                        </Button>
                      ) : (
                        <Button className="w-full" style={{ backgroundColor: 'var(--color-primary)', color: 'white' }} onClick={() => onNavigate('course-modules', course)}>
                          View Modules
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      )}
                      {currentUser?.role === 'student' && (
                        <>
                          <Button
                            className="w-full"
                            variant="outline"
                            onClick={() => onNavigate('course-tests', { course })}
                          >
                            View Tests
                          </Button>
                          <Button
                            className="w-full md:col-span-2 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 border-none shadow-sm"
                            variant="outline"
                            onClick={() => {
                              setStudentFeedbackCourse(course);
                              setIsStudentFeedbackOpen(true);
                            }}
                          >
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Evaluate Trainer
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )
      }

      {/* View Course Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewCourse?.title}</DialogTitle>
            <DialogDescription>{viewCourse?.description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-neutral-500 font-medium uppercase">Level</span>
                {viewCourse && getLevelBadge(viewCourse.level)}
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-neutral-500 font-medium uppercase">Duration</span>
                <div className="flex items-center gap-1 text-sm">
                  <Clock className="w-4 h-4" />
                  {viewCourse?.duration}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-neutral-500 font-medium uppercase">Enrolled</span>
                <div className="flex items-center gap-1 text-sm">
                  <Users className="w-4 h-4" />
                  {viewCourse?.enrolled}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Course Curriculum
              </h3>
              {viewCourse?.topics && viewCourse.topics.length > 0 ? (
                <Accordion type="single" collapsible className="w-full">
                  {viewCourse.topics.map((topic: Topic) => (
                    <AccordionItem key={topic.id} value={topic.id}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-2">
                          {topic.isLocked ? (
                            <Lock className="w-4 h-4 text-red-500" />
                          ) : (
                            <Unlock className="w-4 h-4 text-green-500" />
                          )}
                          <span>{topic.title}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="p-0">
                        <div className="flex flex-col gap-6 p-4">

                          {/* 1. Precise Topic Content */}
                          <div className="space-y-2">
                            <h4 className="text-sm font-bold uppercase tracking-wider text-primary border-b pb-1">Topic Overview</h4>
                            <div className="bg-neutral-50 p-4 rounded-lg border text-sm text-neutral-700 leading-relaxed shadow-sm">
                              {topic.content}
                            </div>
                            {topic.images && topic.images.length > 0 && (
                              <div className="flex gap-4 overflow-x-auto py-2">
                                {topic.images.map((img, i) => (
                                  <img key={i} src={img} alt={`Topic Reference ${i + 1}`} className="h-48 rounded-lg border shadow-sm object-cover" />
                                ))}
                              </div>
                            )}
                          </div>


                          {/* 2. Assessment / Questions */}
                          {topic.questions.length > 0 && (
                            <div className="space-y-3">
                              <h4 className="text-sm font-bold uppercase tracking-wider text-primary border-b pb-1">Assessment ({topic.questions.length} Questions)</h4>
                              <div className="grid gap-4">
                                {topic.questions.map((q, idx) => (
                                  <Card key={q.id} className="border-neutral-200">
                                    <CardContent className="pt-4">
                                      <div className="flex gap-2">
                                        <Badge variant="outline" className="h-6 w-6 rounded-full flex items-center justify-center p-0 shrink-0 bg-neutral-100">
                                          {idx + 1}
                                        </Badge>
                                        <div className="flex-1 space-y-3">
                                          <p className="font-medium text-sm">{q.question}</p>

                                          {/* MCQ Options */}
                                          {q.options && q.options.length > 0 ? (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                              {q.options.map((opt, oIdx) => (
                                                <div
                                                  key={oIdx}
                                                  className={`text-xs p-3 rounded-md border flex items-center gap-2 ${opt === q.correctAnswer
                                                    ? 'bg-green-50 border-green-200 text-green-800'
                                                    : 'bg-white hover:bg-neutral-50'
                                                    }`}
                                                >
                                                  <div className={`w-3 h-3 rounded-full border ${opt === q.correctAnswer ? 'bg-green-500 border-green-500' : 'border-neutral-300'}`} />
                                                  {opt}
                                                  {opt === q.correctAnswer && <span className="ml-auto text-[10px] uppercase font-bold text-green-600">Correct</span>}
                                                </div>
                                              ))}
                                            </div>
                                          ) : (
                                            /* Coding Question Details */
                                            <div className="space-y-2 bg-neutral-900 text-neutral-300 p-3 rounded-md text-xs font-mono">
                                              <div>
                                                <span className="text-neutral-500 uppercase text-[10px]">Starter Code:</span>
                                                <pre className="mt-1 overflow-x-auto text-green-400">{q.starterCode}</pre>
                                              </div>
                                              <div className="border-t border-neutral-800 pt-2 mt-2">
                                                <span className="text-neutral-500 uppercase text-[10px]">Expected Output:</span>
                                                <pre className="mt-1 text-yellow-400">{q.expectedOutput}</pre>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 3. Practice Code Template (Like Programiz) */}
                          <div className="pt-4 border-t">
                            <h4 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-primary mb-4">
                              <Code className="w-4 h-4" />
                              Practice Playground
                            </h4>
                            <div className="border rounded-lg overflow-hidden shadow-sm">
                              <CodePracticeConsole className="min-h-[400px]" />
                            </div>
                          </div>

                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>

              ) : (
                <p className="text-sm text-neutral-500 italic">No topics added to this course yet.</p>
              )}
            </div>
          </div>
          <div className="flex justify-end pt-4 border-t">
            <Button onClick={() => setIsViewDialogOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={isStudentFeedbackOpen} onOpenChange={setIsStudentFeedbackOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Trainer Feedback <span className="text-neutral-400 font-normal">/ {studentFeedbackCourse?.title}</span></DialogTitle>
            <DialogDescription>Your feedback is anonymous and helps us improve the learning experience.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4 max-h-[60vh] overflow-y-auto pr-2">
            {!isFeedbackPublished ? (
              <div className="text-center py-8 text-neutral-500">
                <MessageSquare className="w-12 h-12 mx-auto text-neutral-300 mb-3" />
                No feedback form is currently active for this course.
              </div>
            ) : (
              <div className="space-y-8">
                {feedbackQuestions.map((q, i) => (
                  <div key={q.id} className="space-y-3">
                    <Label className="text-sm font-medium text-neutral-900">{i + 1}. {q.question}</Label>
                    {q.type === 'mcq' && (
                      <div className="space-y-2">
                        {q.options?.map((opt: string, oi: number) => (
                          <label key={oi} className="flex items-center gap-3 p-3 border border-neutral-200 rounded-lg hover:bg-neutral-50 cursor-pointer transition-colors group">
                            <div className="relative flex items-center justify-center">
                              <input type="radio" name={`student-fq-${q.id}`} value={opt} className="peer sr-only" />
                              <div className="w-4 h-4 rounded-full border-2 border-neutral-300 peer-checked:border-primary peer-checked:border-[5px] transition-all"></div>
                            </div>
                            <span className="text-sm text-neutral-700 font-medium group-hover:text-neutral-900">{opt}</span>
                          </label>
                        ))}
                      </div>
                    )}
                    {q.type === 'rating' && (
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map(star => (
                          <Star key={star} className="w-8 h-8 text-neutral-200 hover:text-yellow-400 hover:fill-yellow-400 cursor-pointer transition-colors" />
                        ))}
                      </div>
                    )}
                    {q.type === 'text' && (
                      <Textarea placeholder="Share your detailed thoughts..." className="bg-neutral-50/50" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-end pt-4 border-t gap-2">
            <Button variant="ghost" onClick={() => setIsStudentFeedbackOpen(false)}>Cancel</Button>
            {isFeedbackPublished && (
              <Button className="bg-primary text-white" onClick={() => {
                toast.success("Thank you! Your feedback has been dynamically submitted.");
                setIsStudentFeedbackOpen(false);
              }}>Submit Feedback</Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div >
  );
}
