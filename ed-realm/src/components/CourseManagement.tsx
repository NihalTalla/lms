import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import {
  Plus, Edit, Trash2, Eye, Clock, BookOpen,
  ChevronRight, ArrowLeft, Image as ImageIcon, Lock, Unlock,
  FileText, Code, CheckCircle
} from 'lucide-react';
import { courses as initialCourses, Topic, TopicQuestion } from '../lib/data';
import { toast } from 'sonner';

// Extended interfaces for local state management
interface ExtendedTopic extends Topic {
  durationLocked?: boolean;
  accessDuration?: string;
}

interface ExtendedCourse extends Omit<typeof initialCourses[0], 'topics'> {
  topics?: ExtendedTopic[];
}

interface TempTestCase {
  id: string;
  input: string;
  expectedOutput: string;
  hidden: boolean;
}

type ViewState = 'courses' | 'topics' | 'topic-details' | 'questions';

export function CourseManagement() {
  const [courseList, setCourseList] = useState<ExtendedCourse[]>(initialCourses);
  const [currentView, setCurrentView] = useState<ViewState>('courses');

  // Selection State
  const [selectedCourse, setSelectedCourse] = useState<ExtendedCourse | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<ExtendedTopic | null>(null);

  // Dialog States
  const [isCreateCourseOpen, setIsCreateCourseOpen] = useState(false);
  const [isCreateTopicOpen, setIsCreateTopicOpen] = useState(false);
  const [isQuestionFormOpen, setIsQuestionFormOpen] = useState(false);
  const [isViewTreeOpen, setIsViewTreeOpen] = useState(false);

  // Form States
  const [newCourse, setNewCourse] = useState({
    title: '',
    description: '',
    level: 'beginner',
    duration: '',
    lessons: 0,
    tags: '',
  });

  const [newTopic, setNewTopic] = useState({
    title: '',
    content: '',
    accessDuration: '',
    durationLocked: false,
  });

  const [newQuestion, setNewQuestion] = useState<{
    type: 'multiple_choice' | 'coding';
    question: string;
    options: string[];
    correctAnswer: string;
    starterCode: string;
    testCases: TempTestCase[];
  }>({
    type: 'multiple_choice',
    question: '',
    options: ['', '', '', ''],
    correctAnswer: '',
    starterCode: '',
    testCases: [{ id: `tc-${Date.now()}`, input: '', expectedOutput: '', hidden: false }]
  });

  // --- Navigation Helpers ---

  const navigateToTopics = (course: ExtendedCourse) => {
    setSelectedCourse(course);
    setCurrentView('topics');
  };

  const navigateToTopicDetails = (topic: ExtendedTopic) => {
    setSelectedTopic(topic);
    setCurrentView('topic-details');
  };

  const navigateToQuestions = () => {
    setCurrentView('questions');
  };

  const goBack = () => {
    if (currentView === 'questions') setCurrentView('topic-details');
    else if (currentView === 'topic-details') setCurrentView('topics');
    else if (currentView === 'topics') {
      setSelectedCourse(null);
      setCurrentView('courses');
    }
  };

  // --- Course Handlers ---

  const handleCreateCourse = () => {
    if (!newCourse.title) {
      toast.error('Title is required');
      return;
    }
    const course: ExtendedCourse = {
      id: `course-${Date.now()}`,
      title: newCourse.title,
      description: newCourse.description,
      level: newCourse.level as any,
      duration: newCourse.duration,
      lessons: newCourse.lessons,
      enrolled: 0,
      tags: newCourse.tags.split(',').map(t => t.trim()).filter(t => t),
      topics: [],
      isLocked: false
    };
    setCourseList([...courseList, course]);
    // Also push into the shared course templates so it appears across views
    initialCourses.push(course as any);
    setSelectedCourse(course);
    setCurrentView('topics');
    setIsCreateCourseOpen(false);
    setNewCourse({ title: '', description: '', level: 'beginner', duration: '', lessons: 0, tags: '' });
    toast.success('Course created and added to templates');
  };

  const handleDeleteCourse = (id: string) => {
    setCourseList(courseList.filter(c => c.id !== id));
    toast.success('Course deleted');
  };

  // --- Topic Handlers ---

  const handleCreateTopic = () => {
    if (!selectedCourse || !newTopic.title) return;

    const topic: ExtendedTopic = {
      id: `topic-${Date.now()}`,
      title: newTopic.title,
      content: newTopic.content,
      questions: [],
      images: [],
      accessDuration: newTopic.accessDuration,
      durationLocked: newTopic.durationLocked,
      isLocked: false
    };

    const updatedCourse = {
      ...selectedCourse,
      topics: [...(selectedCourse.topics || []), topic]
    };

    updateCourseInList(updatedCourse);
    setSelectedCourse(updatedCourse);
    setIsCreateTopicOpen(false);
    setNewTopic({ title: '', content: '', accessDuration: '', durationLocked: false });
    toast.success('Topic created');
  };

  const updateCourseInList = (updatedCourse: ExtendedCourse) => {
    setCourseList(courseList.map(c => c.id === updatedCourse.id ? updatedCourse : c));
  };

  const handleUpdateTopic = (updatedTopic: ExtendedTopic) => {
    if (!selectedCourse) return;
    const updatedTopics = selectedCourse.topics?.map(t => t.id === updatedTopic.id ? updatedTopic : t) || [];
    const updatedCourse = { ...selectedCourse, topics: updatedTopics };
    updateCourseInList(updatedCourse);
    setSelectedCourse(updatedCourse);
    if (selectedTopic?.id === updatedTopic.id) {
      setSelectedTopic(updatedTopic);
    }
    toast.success('Topic updated');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && selectedTopic) {
      // Simulate upload by creating a fake URL
      const file = e.target.files[0];
      const fakeUrl = URL.createObjectURL(file);
      const updatedTopic = {
        ...selectedTopic,
        images: [...(selectedTopic.images || []), fakeUrl]
      };
      handleUpdateTopic(updatedTopic);
      toast.success('Image uploaded');
    }
  };

  // --- Question Handlers ---

  const handleAddQuestion = () => {
    if (!selectedTopic || !newQuestion.question) return;

    const question: TopicQuestion = {
      id: `q-${Date.now()}`,
      question: newQuestion.question,
      type: newQuestion.type,
      options: newQuestion.options?.filter(o => o),
      correctAnswer: newQuestion.correctAnswer,
      starterCode: newQuestion.starterCode,
      testCases: newQuestion.testCases.map(({ id, ...rest }) => rest),
    };

    const updatedTopic = {
      ...selectedTopic,
      questions: [...(selectedTopic.questions || []), question]
    };

    handleUpdateTopic(updatedTopic);
    setIsQuestionFormOpen(false);
    setNewQuestion({
      type: 'multiple_choice',
      question: '',
      options: ['', '', '', ''],
      correctAnswer: '',
      starterCode: '',
      testCases: [{ id: `tc-${Date.now()}`, input: '', expectedOutput: '', hidden: false }]
    });
    toast.success('Question added');
  };

  // --- Render Functions ---

  const renderCourses = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-neutral-900">Course Management</h2>
          <p className="text-neutral-600 mt-1">Manage courses, topics, and assessments</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsViewTreeOpen(true)}>
            <Eye className="w-4 h-4 mr-2" />
            View All Content
          </Button>
          <Dialog open={isCreateCourseOpen} onOpenChange={setIsCreateCourseOpen}>
            <DialogTrigger asChild>
              <Button style={{ backgroundColor: 'var(--color-primary)' }}>
                <Plus className="w-4 h-4 mr-2" />
                Create Course
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Course</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Title</Label>
                  <Input value={newCourse.title} onChange={e => setNewCourse({ ...newCourse, title: e.target.value })} />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea value={newCourse.description} onChange={e => setNewCourse({ ...newCourse, description: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Level</Label>
                    <Select value={newCourse.level} onValueChange={v => setNewCourse({ ...newCourse, level: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Duration</Label>
                    <Input value={newCourse.duration} onChange={e => setNewCourse({ ...newCourse, duration: e.target.value })} />
                  </div>
                </div>
                <Button onClick={handleCreateCourse} className="w-full">Create Course</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courseList.map(course => (
          <Card key={course.id} className="cursor-pointer hover:shadow-md transition-all" onClick={() => navigateToTopics(course)}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <Badge variant="outline">{course.level}</Badge>
                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDeleteCourse(course.id); }}>
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
              <CardTitle className="mt-2">{course.title}</CardTitle>
              <CardDescription className="line-clamp-2">{course.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 text-sm text-neutral-500">
                <div className="flex items-center gap-1">
                  <BookOpen className="w-4 h-4" />
                  {course.lessons} Lessons
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {course.duration}
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-neutral-50 p-4">
              <div className="flex justify-between w-full items-center text-sm text-neutral-500">
                <span>{course.topics?.length || 0} Topics</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderTopics = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={goBack}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <div>
            <h2 className="text-2xl font-bold">{selectedCourse?.title}</h2>
            <p className="text-neutral-600">Manage Topics</p>
          </div>
        </div>
        <Dialog open={isCreateTopicOpen} onOpenChange={setIsCreateTopicOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" /> Add Topic
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Topic</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Topic Title</Label>
                <Input value={newTopic.title} onChange={e => setNewTopic({ ...newTopic, title: e.target.value })} />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={newTopic.content} onChange={e => setNewTopic({ ...newTopic, content: e.target.value })} />
              </div>
              <div>
                <Label>Duration (Access Time)</Label>
                <Input value={newTopic.accessDuration} onChange={e => setNewTopic({ ...newTopic, accessDuration: e.target.value })} placeholder="e.g. 2 hours" />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={newTopic.durationLocked}
                  onCheckedChange={checked => setNewTopic({ ...newTopic, durationLocked: checked })}
                />
                <Label>Lock Duration (Deny Access)</Label>
              </div>
              <Button onClick={handleCreateTopic} className="w-full">Add Topic</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {selectedCourse?.topics?.map((topic, index) => (
          <Card key={topic.id} className="hover:border-primary transition-colors cursor-pointer shadow-sm w-full" onClick={() => navigateToTopicDetails(topic)}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-xl font-bold text-neutral-900">{topic.title}</h3>
                <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                  <Badge className="bg-emerald-100/60 text-emerald-700 shadow-none hover:bg-emerald-100/60 border-none font-medium flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-200">
                    <CheckCircle className="w-3.5 h-3.5" /> Published
                  </Badge>
                </div>
              </div>

              <div className="text-xs text-neutral-500 mb-5 flex items-center gap-1.5">
                <span>Module {index + 1}</span>
                <span>&bull;</span>
                <span>{topic.accessDuration || '12 weeks'}</span>
                <span>&bull;</span>
                <span>100% complete</span>
              </div>

              <p className="text-sm text-neutral-700 mb-6 line-clamp-2">
                {topic.content || 'Arrays are fundamental data structures that store elements of the same type in contiguous memory locations. In this topic, we will cover array initialization, traversal, and basic operations.'}
              </p>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="bg-emerald-100/50 text-emerald-700 font-medium border-emerald-200/50 px-3 py-1.5 hover:bg-emerald-100/50 flex items-center gap-1.5 rounded-md">
                    <BookOpen className="w-4 h-4" />
                    Content - 1
                  </Badge>
                  <Badge variant="secondary" className="bg-orange-100/50 text-orange-700 font-medium border-orange-200/50 px-3 py-1.5 hover:bg-orange-100/50 flex items-center gap-1.5 rounded-md">
                    <Code className="w-4 h-4" />
                    Assignment - {topic.questions?.length > 0 ? topic.questions.length : 1}
                  </Badge>
                </div>

                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                  <Button
                    size="sm"
                    variant={topic.durationLocked ? "destructive" : "outline"}
                    onClick={() => handleUpdateTopic({ ...topic, durationLocked: !topic.durationLocked })}
                    title={topic.durationLocked ? "Unlock Access" : "Lock Access"}
                  >
                    {topic.durationLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                  </Button>
                  <Button size="sm" variant="ghost">
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {(!selectedCourse?.topics || selectedCourse.topics.length === 0) && (
          <div className="text-center py-12 text-neutral-500">
            No topics found. Create one to get started.
          </div>
        )}
      </div>
    </div>
  );

  const renderTopicDetails = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={goBack}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <div>
            <h2 className="text-2xl font-bold">{selectedTopic?.title}</h2>
            <p className="text-neutral-600">Edit Details & Content</p>
          </div>
        </div>
        <Button onClick={navigateToQuestions}>
          Manage Questions <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                className="min-h-[200px]"
                value={selectedTopic?.content}
                onChange={e => selectedTopic && handleUpdateTopic({ ...selectedTopic, content: e.target.value })}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Topic Images</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {selectedTopic?.images?.map((img, idx) => (
                  <div key={idx} className="relative aspect-video rounded-md overflow-hidden bg-neutral-100">
                    <img src={img} alt={`Topic ${idx}`} className="object-cover w-full h-full" />
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-neutral-50 hover:bg-neutral-100">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <ImageIcon className="w-8 h-8 mb-2 text-neutral-500" />
                    <p className="text-sm text-neutral-500">Click to upload image</p>
                  </div>
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                </label>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  const renderQuestions = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={goBack}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <div>
            <h2 className="text-2xl font-bold">Questions</h2>
            <p className="text-neutral-600">Manage MCQs and Coding Problems</p>
          </div>
        </div>
        <Dialog open={isQuestionFormOpen} onOpenChange={setIsQuestionFormOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" /> Add Question
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Question</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div>
                <Label>Question Type</Label>
                <Select
                  value={newQuestion.type}
                  onValueChange={(v: any) => setNewQuestion({ ...newQuestion, type: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="multiple_choice">Multiple Choice (MCQ)</SelectItem>
                    <SelectItem value="coding">Coding Problem</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Question Text</Label>
                <Textarea
                  value={newQuestion.question}
                  onChange={e => setNewQuestion({ ...newQuestion, question: e.target.value })}
                  placeholder="Enter the question here..."
                />
              </div>

              {newQuestion.type === 'multiple_choice' ? (
                <div className="space-y-4">
                  <Label>Options</Label>
                  {newQuestion.options?.map((opt, idx) => (
                    <div key={idx} className="flex gap-2">
                      <div className="flex items-center justify-center w-8 h-10 bg-neutral-100 rounded text-sm font-bold">
                        {String.fromCharCode(65 + idx)}
                      </div>
                      <Input
                        value={opt}
                        onChange={e => {
                          const newOpts = [...(newQuestion.options || [])];
                          newOpts[idx] = e.target.value;
                          setNewQuestion({ ...newQuestion, options: newOpts });
                        }}
                        placeholder={`Option ${idx + 1}`}
                      />
                      <Button
                        variant={newQuestion.correctAnswer === opt && opt !== '' ? "default" : "outline"}
                        size="icon"
                        onClick={() => setNewQuestion({ ...newQuestion, correctAnswer: opt })}
                        title="Mark as Correct"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <Label>Starter Code</Label>
                    <div className="mt-2 border rounded-md overflow-hidden">
                      <Textarea
                        className="font-mono bg-neutral-900 text-neutral-100 border-0"
                        value={newQuestion.starterCode}
                        onChange={e => setNewQuestion({ ...newQuestion, starterCode: e.target.value })}
                        placeholder="// Enter starter code here..."
                        rows={6}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Test Cases</Label>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setNewQuestion({
                          ...newQuestion,
                          testCases: [...(newQuestion.testCases || []), { id: `tc-${Date.now()}`, input: '', expectedOutput: '', hidden: false }]
                        })}
                      >
                        <Plus className="w-4 h-4 mr-2" /> Add Test Case
                      </Button>
                    </div>
                    <div className="space-y-4">
                      {newQuestion.testCases?.map((tc, idx) => (
                        <Card key={tc.id}>
                          <CardContent className="p-4 space-y-4">
                            <div className="flex justify-between items-center">
                              <span className="font-semibold text-sm">Test Case #{idx + 1}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-500"
                                onClick={() => {
                                  const newTCs = [...(newQuestion.testCases || [])];
                                  newTCs.splice(idx, 1);
                                  setNewQuestion({ ...newQuestion, testCases: newTCs });
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label className="text-xs">Input</Label>
                                <Textarea
                                  className="font-mono text-sm mt-1"
                                  value={tc.input}
                                  onChange={e => {
                                    const newTCs = [...(newQuestion.testCases || [])];
                                    newTCs[idx].input = e.target.value;
                                    setNewQuestion({ ...newQuestion, testCases: newTCs });
                                  }}
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Expected Output</Label>
                                <Textarea
                                  className="font-mono text-sm mt-1"
                                  value={tc.expectedOutput}
                                  onChange={e => {
                                    const newTCs = [...(newQuestion.testCases || [])];
                                    newTCs[idx].expectedOutput = e.target.value;
                                    setNewQuestion({ ...newQuestion, testCases: newTCs });
                                  }}
                                />
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={tc.hidden}
                                onCheckedChange={checked => {
                                  const newTCs = [...(newQuestion.testCases || [])];
                                  newTCs[idx].hidden = checked;
                                  setNewQuestion({ ...newQuestion, testCases: newTCs });
                                }}
                              />
                              <Label className="text-sm text-neutral-600">Hidden Test Case (Secret)</Label>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <Button onClick={handleAddQuestion} className="w-full mt-6">Save Question</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {selectedTopic?.questions?.map((q, idx) => (
          <Card key={q.id}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={q.type === 'coding' ? 'default' : 'secondary'}>
                      {q.type === 'coding' ? <Code className="w-3 h-3 mr-1" /> : <CheckCircle className="w-3 h-3 mr-1" />}
                      {q.type === 'coding' ? 'Coding' : 'MCQ'}
                    </Badge>
                    <span className="font-semibold text-lg">Question {idx + 1}</span>
                  </div>
                  <p className="text-neutral-700 line-clamp-2">{q.question}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm">
                    <Edit className="w-4 h-4 text-neutral-500" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              {q.type === 'coding' && (
                <div className="mt-4 bg-neutral-50 p-3 rounded-md">
                  <p className="text-xs text-neutral-500 font-semibold mb-2">TEST CASES:</p>
                  <div className="flex gap-2">
                    {q.testCases?.map((tc, i) => (
                      <Badge key={i} variant="outline" className={tc.hidden ? "border-yellow-500 text-yellow-700" : ""}>
                        {tc.hidden ? "Hidden" : "Visible"}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {(!selectedTopic?.questions || selectedTopic.questions.length === 0) && (
          <div className="text-center py-12 text-neutral-500">
            No questions added yet.
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {currentView === 'courses' && renderCourses()}
      {currentView === 'topics' && renderTopics()}
      {currentView === 'topic-details' && renderTopicDetails()}
      {currentView === 'questions' && renderQuestions()}

      {/* View Tree Modal */}
      <Dialog open={isViewTreeOpen} onOpenChange={setIsViewTreeOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Content Overview</DialogTitle>
            <DialogDescription>Full hierarchy of courses, topics, and questions</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {courseList.map(course => (
              <div key={course.id} className="border rounded-lg p-4">
                <div className="flex items-center gap-2 font-bold text-lg mb-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  {course.title}
                </div>
                <div className="pl-6 space-y-3">
                  {course.topics && course.topics.length > 0 ? course.topics.map(topic => (
                    <div key={topic.id} className="border-l-2 border-neutral-200 pl-4">
                      <div className="flex items-center gap-2 font-medium">
                        <FileText className="w-4 h-4 text-neutral-500" />
                        {topic.title}
                        {topic.durationLocked && <Lock className="w-3 h-3 text-red-500" />}
                      </div>
                      <div className="pl-6 mt-2 space-y-1">
                        {topic.questions && topic.questions.length > 0 ? topic.questions.map((q, qIdx) => (
                          <div key={q.id} className="text-sm text-neutral-600 flex items-center gap-2">
                            {q.type === 'coding' ? <Code className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                            Question {qIdx + 1}: {q.question.substring(0, 50)}...
                          </div>
                        )) : <div className="text-sm text-neutral-400 italic">No questions</div>}
                      </div>
                    </div>
                  )) : <div className="text-sm text-neutral-400 italic">No topics</div>}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}


