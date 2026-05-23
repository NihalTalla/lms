import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Trophy, Plus, Clock, Users, Code, Trash2, Eye, ArrowRight, ArrowLeft, Search, CheckCircle2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { useContestNotification } from './ContestNotification';
import { loadContests, saveContests, Contest as StoreContest, Question as StoreQuestion } from '../lib/contest-store';

interface Question {
    id: string;
    title: string;
    description: string;
    difficulty: 'easy' | 'medium' | 'hard';
    topic: string;
    points: number;
    type: 'coding' | 'mcq';
    options?: string[];
    correctAnswer?: string;
    testCases?: { input: string; output: string; hidden?: boolean }[];
    tags?: string[];
}
interface Contest { id: string; name: string; description: string; totalQuestions: number; startTime: string; endTime: string; status: 'draft' | 'scheduled' | 'active' | 'completed'; participants: number; questions: Question[]; createdAt?: string; duration?: string; }

export function CodingContest() {
    const { addNotification } = useContestNotification();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [showQuestionDialog, setShowQuestionDialog] = useState(false);
    const [showNextQuestionPrompt, setShowNextQuestionPrompt] = useState(false);
    const [selectedContest, setSelectedContest] = useState<Contest | null>(null);
    const [currentStep, setCurrentStep] = useState(1);
    const [questionMode, setQuestionMode] = useState<'fetch' | 'create' | null>(null);
    const [newContest, setNewContest] = useState({ name: '', description: '', startTime: '', endTime: '', selectedQuestions: [] as string[] });
    const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
    const [questionSearch, setQuestionSearch] = useState('');
    const [newQuestion, setNewQuestion] = useState({
        title: '',
        description: '',
        difficulty: 'easy' as 'easy' | 'medium' | 'hard',
        topic: '',
        points: 100,
        type: 'coding' as 'coding' | 'mcq',
        options: ['', '', '', ''],
        correctAnswer: '',
        testCases: [] as { input: string; output: string; hidden?: boolean }[],
        tags: [] as string[],
    });

    const [questionBank, setQuestionBank] = useState<Question[]>([]);

    const topicStats = React.useMemo(() => {
        const stats = new Map<string, number>();
        questionBank.forEach(q => {
            const t = q.topic || 'General';
            stats.set(t, (stats.get(t) || 0) + 1);
        });
        return Array.from(stats.entries()).map(([name, total]) => ({ name, total }));
    }, [questionBank]);

    const [contests, setContests] = useState<Contest[]>(() => {
        const stored = loadContests();
        return stored.length > 0 ? (stored as any) : [];
    });

    React.useEffect(() => {
        saveContests(contests as any);
    }, [contests]);

    const filteredContests = contests.filter(c => { const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()); const matchesStatus = statusFilter === 'all' || c.status === statusFilter; return matchesSearch && matchesStatus; });

    const resetForm = () => {
        setNewContest({ name: '', description: '', startTime: '', endTime: '', selectedQuestions: [] });
        setNewQuestion({ title: '', description: '', difficulty: 'easy', topic: '', points: 100, type: 'coding', options: ['', '', '', ''], correctAnswer: '', testCases: [], tags: [] });
        setCurrentStep(1);
        setQuestionMode(null);
        setSelectedTopic(null);
        setQuestionSearch('');
    };

    const handleNextStep = () => { if (!newContest.name || !newContest.startTime || !newContest.endTime) { toast.error('Fill required fields'); return; } if (new Date(newContest.startTime) >= new Date(newContest.endTime)) { toast.error('End time must be after start'); return; } setCurrentStep(2); };

    const handleQuestionFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const text = evt.target?.result as string;
                const parsed = JSON.parse(text);
                const questionsArr = Array.isArray(parsed) ? parsed : (parsed.questions || []);
                if (!Array.isArray(questionsArr) || questionsArr.length === 0) {
                    toast.error('No questions found in file');
                    return;
                }
                const mapped: Question[] = questionsArr.map((q: any, idx: number) => ({
                    id: q.id || `upload-${Date.now()}-${idx}`,
                    title: q.title || `Imported Question ${idx + 1}`,
                    description: q.description || '',
                    difficulty: (q.difficulty || 'medium') as 'easy' | 'medium' | 'hard',
                    topic: q.topic || 'General',
                    points: q.points || 100,
                    type: q.type === 'mcq' ? 'mcq' : 'coding',
                    options: q.options || ['', '', '', ''],
                    correctAnswer: q.correctAnswer || '',
                    testCases: q.testCases || [],
                }));

                setQuestionBank(prev => {
                    const deduped = mapped.filter(m => !prev.some(p => p.id === m.id));
                    return [...prev, ...deduped];
                });
                setNewContest(prev => ({
                    ...prev,
                    selectedQuestions: Array.from(new Set([...(prev.selectedQuestions || []), ...mapped.map(m => m.id)]))
                }));
                toast.success(`Imported ${mapped.length} question(s) from file`);
            } catch {
                toast.error('Unable to read file. Please upload valid JSON with question fields.');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const handleCreateContest = () => {
        if (newContest.selectedQuestions.length === 0) {
            toast.error('Add at least one question');
            return;
        }
        const selectedQs = questionBank.filter(q => newContest.selectedQuestions.includes(q.id));
        const now = new Date();
        const start = new Date(newContest.startTime);
        const end = new Date(newContest.endTime);
        let status: 'draft' | 'scheduled' | 'active' | 'completed' = 'draft';

        if (now >= start && now <= end) status = 'active';
        else if (now < start) status = 'scheduled';
        else if (now > end) status = 'completed';

        const diffMs = end.getTime() - start.getTime();
        const diffHrs = Math.floor(diffMs / 3600000);
        const diffMins = Math.round((diffMs % 3600000) / 60000);
        const duration = diffHrs > 0 ? `${diffHrs}h ${diffMins}m` : `${diffMins}m`;

        const contest: Contest = {
            id: String(Date.now()),
            name: newContest.name,
            description: newContest.description,
            totalQuestions: selectedQs.length,
            startTime: newContest.startTime,
            endTime: newContest.endTime,
            status,
            participants: 0,
            questions: selectedQs,
            createdAt: new Date().toISOString(),
            duration
        };
        setContests([contest, ...contests]);

        // Trigger notification to all students
        addNotification({
            id: contest.id,
            contestId: contest.id,
            contestName: contest.name,
            message: contest.description || 'A new coding contest has been created!',
            type: 'new_contest',
            timestamp: Date.now(),
            read: false
        });

        toast.success('Contest created and students notified!');
        setShowCreateDialog(false);
        resetForm();
    };

    const handleAddNewQuestion = () => {
        if (!newQuestion.title || !newQuestion.topic) {
            toast.error('Fill title and topic');
            return;
        }
        if (newQuestion.type === 'mcq') {
            const options = (newQuestion.options || []).map(o => o.trim()).filter(o => o);
            if (options.length < 2) {
                toast.error('Please add at least two options');
                return;
            }
            if (!newQuestion.correctAnswer) {
                toast.error('Select the correct answer');
                return;
            }
            const q: Question = {
                id: `new-${Date.now()}`,
                title: newQuestion.title,
                description: newQuestion.description,
                difficulty: newQuestion.difficulty,
                topic: newQuestion.topic,
                points: newQuestion.points,
                type: 'mcq',
                options,
                correctAnswer: newQuestion.correctAnswer,
                tags: newQuestion.tags,
            };
            setQuestionBank(prev => [q, ...prev]);
            setNewContest(prev => ({ ...prev, selectedQuestions: [...prev.selectedQuestions, q.id] }));
            toast.success('Question added');
            setNewQuestion({ title: '', description: '', difficulty: 'easy', topic: '', points: 100, type: 'coding', options: ['', '', '', ''], correctAnswer: '', testCases: [], tags: [] });
            setShowNextQuestionPrompt(true);
            return;
        }
        const q: Question = {
            id: `new-${Date.now()}`,
            title: newQuestion.title,
            description: newQuestion.description,
            difficulty: newQuestion.difficulty,
            topic: newQuestion.topic,
            points: newQuestion.points,
            type: 'coding',
            testCases: newQuestion.testCases,
            tags: newQuestion.tags,
        };
        setQuestionBank(prev => [q, ...prev]);
        setNewContest(prev => ({ ...prev, selectedQuestions: [...prev.selectedQuestions, q.id] }));
        toast.success('Question added');
        setNewQuestion({ title: '', description: '', difficulty: 'easy', topic: '', points: 100, type: 'coding', options: ['', '', '', ''], correctAnswer: '', testCases: [], tags: [] });
        setShowNextQuestionPrompt(true);
    };

    const toggleQuestionSelection = (id: string) => { setNewContest(prev => ({ ...prev, selectedQuestions: prev.selectedQuestions.includes(id) ? prev.selectedQuestions.filter(qId => qId !== id) : [...prev.selectedQuestions, id] })); };

    const handleDeleteContest = () => { if (selectedContest) { setContests(contests.filter(c => c.id !== selectedContest.id)); toast.success('Deleted'); setShowDeleteDialog(false); setSelectedContest(null); } };

    const getStatusColor = (s: string) => { switch (s) { case 'active': return 'bg-green-100 text-green-700'; case 'scheduled': return 'bg-blue-100 text-blue-700'; case 'completed': return 'bg-neutral-100 text-neutral-700'; case 'draft': return 'bg-yellow-100 text-yellow-700'; default: return 'bg-neutral-100 text-neutral-700'; } };
    const getDifficultyColor = (d: string) => { switch (d) { case 'easy': return 'bg-green-100 text-green-700'; case 'medium': return 'bg-yellow-100 text-yellow-700'; case 'hard': return 'bg-red-100 text-red-700'; default: return 'bg-neutral-100 text-neutral-700'; } };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 p-6 rounded-2xl bg-gradient-to-r from-purple-50 via-white to-amber-50 border border-neutral-200 shadow-sm">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-bold text-neutral-900">Coding Contest</h2>
                        <p className="text-neutral-600 mt-1">Create and manage coding competitions</p>
                    </div>
                    <Button onClick={() => setShowCreateDialog(true)} className="bg-neutral-900 hover:bg-neutral-800 text-white px-5 py-2 rounded-xl shadow-md font-medium" style={{ color: 'white' }}>
                        <Plus className="w-4 h-4 mr-2" style={{ color: 'white' }} />Create Contest
                    </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="shadow-sm border-neutral-200"><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-neutral-600">Total Contests</p><h3 className="mt-1 text-2xl font-bold">{contests.length}</h3></div><div className="w-12 h-12 rounded-full flex items-center justify-center bg-blue-100"><Trophy className="w-6 h-6 text-blue-600" /></div></div></CardContent></Card>
                    <Card className="shadow-sm border-neutral-200"><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-neutral-600">Active</p><h3 className="mt-1 text-2xl font-bold">{contests.filter(c => c.status === 'active').length}</h3></div><div className="w-12 h-12 rounded-full flex items-center justify-center bg-green-100"><Clock className="w-6 h-6 text-green-600" /></div></div></CardContent></Card>
                    <Card className="shadow-sm border-neutral-200"><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-neutral-600">Participants</p><h3 className="mt-1 text-2xl font-bold">{contests.reduce((sum, c) => sum + c.participants, 0)}</h3></div><div className="w-12 h-12 rounded-full flex items-center justify-center bg-purple-100"><Users className="w-6 h-6 text-purple-600" /></div></div></CardContent></Card>
                    <Card className="shadow-sm border-neutral-200"><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-neutral-600">Questions</p><h3 className="mt-1 text-2xl font-bold">{contests.reduce((sum, c) => sum + c.totalQuestions, 0)}</h3></div><div className="w-12 h-12 rounded-full flex items-center justify-center bg-amber-100"><Code className="w-6 h-6 text-amber-600" /></div></div></CardContent></Card>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" /><Input placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" /></div>
                <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-full md:w-40"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="draft">Draft</SelectItem><SelectItem value="scheduled">Scheduled</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="completed">Completed</SelectItem></SelectContent></Select>
            </div>

            <Card className="shadow-sm border-neutral-200"><CardHeader><CardTitle>Contests</CardTitle></CardHeader><CardContent>
                {filteredContests.length === 0 ? (<div className="text-center py-12"><Trophy className="w-12 h-12 mx-auto text-neutral-300 mb-4" /><p className="text-neutral-600">No contests found</p></div>) : (
                    <Table><TableHeader><TableRow className="bg-neutral-50"><TableHead>Contest</TableHead><TableHead>Questions</TableHead><TableHead>Start</TableHead><TableHead>End</TableHead><TableHead>Participants</TableHead><TableHead>Status</TableHead><TableHead className="text-center">Actions</TableHead></TableRow></TableHeader>
                        <TableBody>{filteredContests.map(c => (<TableRow key={c.id} className="hover:bg-neutral-50 transition">
                            <TableCell className="font-semibold">{c.name}</TableCell>
                            <TableCell>{c.totalQuestions}</TableCell>
                            <TableCell className="text-sm">{c.startTime}</TableCell>
                            <TableCell className="text-sm">{c.endTime}</TableCell>
                            <TableCell>{c.participants}</TableCell>
                            <TableCell><Badge className={getStatusColor(c.status)}>{c.status}</Badge></TableCell>
                            <TableCell className="text-center">
                                <div className="inline-flex gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => { setSelectedContest(c); setShowQuestionDialog(true); }}>
                                        <Eye className="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => { setSelectedContest(c); setShowDeleteDialog(true); }} className="text-red-600">
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>))}</TableBody>
                    </Table>
                )}
            </CardContent></Card>

            <Dialog open={showCreateDialog} onOpenChange={(o) => { setShowCreateDialog(o); if (!o) resetForm(); }}>
                <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
                    <div className="overflow-y-auto flex-1 px-6 pb-2">
                        <DialogHeader className="pt-6">
                            <DialogTitle className="text-2xl font-bold text-neutral-900">Create Contest</DialogTitle>
                            <DialogDescription className="text-neutral-600">
                                Step {currentStep} of 2 · Provide basic details then add questions
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex items-center justify-center mb-6 mt-4">
                            <div className={`w-10 h-10 rounded-full border border-blue-200 flex items-center justify-center font-semibold ${currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-neutral-50 text-neutral-600'}`}>1</div>
                            <div className="flex-1 mx-3 h-1 bg-neutral-200 rounded-full overflow-hidden">
                                <div className={`h-full bg-blue-600 transition-all`} style={{ width: currentStep === 1 ? '50%' : '100%' }} />
                            </div>
                            <div className={`w-10 h-10 rounded-full border border-blue-200 flex items-center justify-center font-semibold ${currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-neutral-50 text-neutral-600'}`}>2</div>
                        </div>

                        {currentStep === 1 && (<div className="space-y-4">
                            <h3 className="font-semibold flex items-center gap-2"><FileText className="w-5 h-5 text-blue-600" />Basic Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium block mb-1">Contest Name *</label>
                                    <Input placeholder="e.g., Weekly Challenge" value={newContest.name} onChange={(e) => setNewContest(p => ({ ...p, name: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="text-sm font-medium block mb-1">Description</label>
                                    <Textarea placeholder="Describe..." value={newContest.description} onChange={(e) => setNewContest(p => ({ ...p, description: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="text-sm font-medium block mb-1">Start *</label>
                                    <Input type="datetime-local" value={newContest.startTime} onChange={(e) => setNewContest(p => ({ ...p, startTime: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="text-sm font-medium block mb-1">End *</label>
                                    <Input type="datetime-local" value={newContest.endTime} onChange={(e) => setNewContest(p => ({ ...p, endTime: e.target.value }))} />
                                </div>
                            </div>
                            <div className="p-3 rounded-lg bg-blue-50 text-blue-800 text-sm border border-blue-100">Tip: keep start and end within the same day for smoother scheduling.</div>
                            <p className="text-sm text-neutral-500">Questions selected: {newContest.selectedQuestions.length}</p>
                        </div>)}

                        {currentStep === 2 && (<div className="space-y-4">
                            <h3 className="font-semibold flex items-center gap-2"><Code className="w-5 h-5 text-blue-600" />Add Questions</h3>
                            <div className="p-4 border-2 border-dashed border-neutral-200 rounded-xl bg-neutral-50">
                                <p className="text-sm font-medium text-neutral-800">Upload questions file</p>
                                <p className="text-xs text-neutral-600 mb-3">JSON array with fields: title, topic, difficulty, points, type, options, correctAnswer.</p>
                                <Input type="file" accept=".json,.txt" onChange={handleQuestionFileUpload} />
                            </div>
                            {!questionMode && (<div className="grid grid-cols-2 gap-4"><Card className="cursor-pointer hover:border-blue-400" onClick={() => setQuestionMode('fetch')}><CardContent className="pt-6 text-center"><Search className="w-10 h-10 mx-auto text-blue-600 mb-2" /><p className="font-semibold">Fetch Existing</p><p className="text-sm text-neutral-500">From question bank</p></CardContent></Card><Card className="cursor-pointer hover:border-purple-400" onClick={() => setQuestionMode('create')}><CardContent className="pt-6 text-center"><Plus className="w-10 h-10 mx-auto text-purple-600 mb-2" /><p className="font-semibold">Create New</p><p className="text-sm text-neutral-500">Add new question</p></CardContent></Card></div>)}
                            {questionMode === 'fetch' && (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
                                        <div className="flex items-center gap-4 flex-1 mr-4">
                                            <div className="relative flex-1">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                                                <Input
                                                    placeholder="Search in question bank..."
                                                    value={questionSearch}
                                                    onChange={(e) => setQuestionSearch(e.target.value)}
                                                    className="pl-10 h-10 rounded-lg"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Badge className="bg-blue-600 text-white px-3 py-1 font-bold">Selected: {newContest.selectedQuestions.length}</Badge>
                                            <Button variant="outline" size="sm" onClick={() => setQuestionMode(null)} className="rounded-lg">
                                                <ArrowLeft className="w-4 h-4 mr-2" />Back
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Topics Library Section */}
                                    <div className="!bg-black border border-neutral-800 rounded-2xl p-6 shadow-lg relative overflow-hidden group">
                                        <div className="flex items-center justify-between mb-6 relative z-10 px-1">
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

                                    <div className="max-h-[450px] overflow-y-auto border border-neutral-200 rounded-xl shadow-inner scrollbar-thin bg-neutral-50/30">
                                        <div className="divide-y divide-neutral-100">
                                            {questionBank
                                                .filter(q => {
                                                    const matchesSearch = q.title.toLowerCase().includes(questionSearch.toLowerCase()) || q.topic.toLowerCase().includes(questionSearch.toLowerCase());
                                                    const matchesTopic = !selectedTopic || q.topic === selectedTopic;
                                                    return matchesSearch && matchesTopic;
                                                })
                                                .map(q => (
                                                    <div
                                                        key={q.id}
                                                        className={`p-4 cursor-pointer transition-all flex justify-between items-center group ${newContest.selectedQuestions.includes(q.id) ? 'bg-blue-50/80 border-l-4 border-l-blue-600' : 'bg-white hover:bg-neutral-50 border-l-4 border-l-transparent'}`}
                                                        onClick={() => toggleQuestionSelection(q.id)}
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${newContest.selectedQuestions.includes(q.id) ? 'bg-blue-600 border-blue-600 text-white scale-110 shadow-md' : 'border-neutral-200 bg-white group-hover:border-blue-300'}`}>
                                                                {newContest.selectedQuestions.includes(q.id) && <CheckCircle2 className="w-4 h-4" />}
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <p className="font-bold text-neutral-800">{q.title}</p>
                                                                    <Badge className="bg-blue-100/50 text-blue-700 border-blue-200 text-[9px] h-4.5 px-2 font-black uppercase tracking-wider">{q.topic}</Badge>
                                                                </div>
                                                                <div className="flex items-center gap-3 mt-0.5">
                                                                    <span className="text-xs text-neutral-500 font-bold">{q.points} Points</span>
                                                                    <div className="w-1 h-1 rounded-full bg-neutral-300" />
                                                                    <span className="text-xs text-neutral-500 capitalize">{q.type}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <Badge className={`${getDifficultyColor(q.difficulty)} px-3 py-1 rounded-full uppercase text-[10px] font-black tracking-widest`}>{q.difficulty}</Badge>
                                                    </div>
                                                ))
                                            }
                                            {questionBank.filter(q => {
                                                const matchesSearch = q.title.toLowerCase().includes(questionSearch.toLowerCase()) || q.topic.toLowerCase().includes(questionSearch.toLowerCase());
                                                const matchesTopic = !selectedTopic || q.topic === selectedTopic;
                                                return matchesSearch && matchesTopic;
                                            }).length === 0 && (
                                                    <div className="py-12 text-center text-neutral-400 italic text-sm">No questions found matching your criteria</div>
                                                )}
                                        </div>
                                    </div>
                                </div>
                            )}
                            {questionMode === 'create' && (
                                <div className="bg-white border border-neutral-200 rounded-2xl p-8 shadow-sm space-y-8 animate-in fade-in duration-300">
                                    <div className="flex justify-between items-center border-b pb-4 border-neutral-100">
                                        <h3 className="text-xl font-bold text-neutral-900">Create New Question</h3>
                                        <Button variant="ghost" size="sm" onClick={() => setQuestionMode(null)} className="h-8 w-8 p-0 hover:bg-neutral-100 rounded-full">
                                            <ArrowLeft className="w-4 h-4" />
                                        </Button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-neutral-400 uppercase tracking-widest pl-1">Question Title</label>
                                            <Input
                                                placeholder="e.g., Bubble Sort Implementation"
                                                value={newQuestion.title}
                                                onChange={(e) => setNewQuestion(p => ({ ...p, title: e.target.value }))}
                                                className="h-12 border-neutral-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all shadow-sm font-medium"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-neutral-400 uppercase tracking-widest pl-1">Question Type</label>
                                            <Select value={newQuestion.type} onValueChange={(v: 'coding' | 'mcq') => setNewQuestion(p => ({ ...p, type: v, options: v === 'mcq' ? ['', '', '', ''] : [] }))}>
                                                <SelectTrigger className="h-12 border-neutral-200 rounded-xl bg-white shadow-sm font-medium">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl shadow-xl border-neutral-100">
                                                    <SelectItem value="coding">Coding</SelectItem>
                                                    <SelectItem value="mcq">MCQ</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-neutral-400 uppercase tracking-widest pl-1">Difficulty</label>
                                            <Select value={newQuestion.difficulty} onValueChange={(v: 'easy' | 'medium' | 'hard') => setNewQuestion(p => ({ ...p, difficulty: v }))}>
                                                <SelectTrigger className="h-12 border-neutral-200 rounded-xl bg-white shadow-sm font-medium">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl shadow-xl border-neutral-100">
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
                                            <Badge variant="outline" className="text-[9px] border-neutral-100 text-neutral-400 font-bold uppercase transition-all">Support Markdown</Badge>
                                        </div>
                                        <Textarea
                                            placeholder="Detailed problem description..."
                                            rows={5}
                                            value={newQuestion.description}
                                            onChange={(e) => setNewQuestion(p => ({ ...p, description: e.target.value }))}
                                            className="border-neutral-200 rounded-2xl bg-neutral-50/30 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all shadow-sm leading-relaxed p-6"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest pl-1">Topic / Category</label>
                                            <Input
                                                placeholder="e.g., Arrays, Strings..."
                                                value={newQuestion.topic}
                                                onChange={(e) => setNewQuestion(p => ({ ...p, topic: e.target.value }))}
                                                className="h-11 border-neutral-200 rounded-xl font-medium"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest pl-1">Category Tags</label>
                                            <Input
                                                placeholder="e.g., dynamic, greedy"
                                                value={newQuestion.tags?.join(', ') || ''}
                                                onChange={(e) => setNewQuestion(p => ({ ...p, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) }))}
                                                className="h-11 border-neutral-200 rounded-xl font-medium"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest pl-1">Points</label>
                                            <Input
                                                type="number"
                                                value={newQuestion.points}
                                                onChange={(e) => setNewQuestion(p => ({ ...p, points: parseInt(e.target.value) || 0 }))}
                                                className="h-11 border-neutral-200 rounded-xl font-medium"
                                            />
                                        </div>
                                    </div>

                                    {newQuestion.type === 'mcq' && (
                                        <div className="space-y-6 pt-4 border-t border-neutral-50">
                                            <div className="flex items-center justify-between">
                                                <label className="text-sm font-black text-neutral-800 uppercase tracking-wide">MCQ Options</label>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setNewQuestion(p => ({ ...p, options: [...(p.options || []), ''] }))}
                                                    className="rounded-full h-8 px-4 font-bold text-xs"
                                                >
                                                    <Plus className="w-3.5 h-3.5 mr-2" />Add Option
                                                </Button>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {(newQuestion.options || []).map((opt, idx) => (
                                                    <div key={idx} className="flex gap-2 items-center">
                                                        <div className="w-6 h-6 rounded-full bg-neutral-100 flex items-center justify-center text-[10px] font-bold text-neutral-400 shrink-0">{String.fromCharCode(65 + idx)}</div>
                                                        <Input
                                                            value={opt}
                                                            onChange={(e) => {
                                                                const options = [...(newQuestion.options || [])];
                                                                options[idx] = e.target.value;
                                                                setNewQuestion(p => ({ ...p, options }));
                                                            }}
                                                            placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                                                            className="border-neutral-200 rounded-lg h-10 shadow-sm"
                                                        />
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => {
                                                                const options = (newQuestion.options || []).filter((_, i) => i !== idx);
                                                                setNewQuestion(p => ({ ...p, options }));
                                                            }}
                                                            className="h-8 w-8 p-0 text-red-400 hover:text-red-500 hover:bg-red-50"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="space-y-3 p-4 bg-green-50/50 rounded-xl border border-green-100/50">
                                                <label className="text-xs font-black text-green-700 uppercase tracking-widest pl-1">Select Correct Answer</label>
                                                <Select value={newQuestion.correctAnswer} onValueChange={(v) => setNewQuestion(p => ({ ...p, correctAnswer: v }))}>
                                                    <SelectTrigger className="border-green-200 rounded-lg bg-white shadow-sm font-bold text-green-700">
                                                        <SelectValue placeholder="Which one is correct?" />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-lg shadow-xl border-neutral-100">
                                                        {(newQuestion.options || [])
                                                            .map(o => o.trim())
                                                            .filter(o => o)
                                                            .map((opt, idx) => (
                                                                <SelectItem key={`${opt}-${idx}`} value={opt} className="font-medium">{opt}</SelectItem>
                                                            ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    )}

                                    {newQuestion.type === 'coding' && (
                                        <div className="space-y-6 pt-6 border-t border-neutral-100">
                                            <div className="flex items-center justify-between">
                                                <label className="text-sm font-black text-neutral-800 uppercase tracking-wide">Test Cases</label>
                                                <Button
                                                    type="button"
                                                    onClick={() => setNewQuestion(p => ({ ...p, testCases: [...p.testCases, { input: '', output: '', hidden: false }] }))}
                                                    className="bg-neutral-50 border border-neutral-200 text-neutral-700 hover:bg-white shadow-sm rounded-full h-9 px-5 font-bold text-xs flex items-center gap-2"
                                                >
                                                    <Plus className="w-4 h-4" /> Add Case
                                                </Button>
                                            </div>

                                            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
                                                {newQuestion.testCases.map((tc, idx) => (
                                                    <div key={idx} className="p-6 bg-neutral-50/50 rounded-2xl border border-neutral-100 shadow-sm space-y-4">
                                                        <div className="flex items-center justify-between">
                                                            <Badge variant="outline" className="text-[10px] font-black tracking-widest uppercase border-neutral-200 text-neutral-400 px-3">Case #{idx + 1}</Badge>
                                                            <div className="flex items-center gap-4">
                                                                <div className="flex items-center gap-2">
                                                                    <input
                                                                        type="checkbox"
                                                                        id={`hidden-${idx}`}
                                                                        checked={tc.hidden}
                                                                        onChange={(e) => {
                                                                            const cases = [...(newQuestion.testCases || [])];
                                                                            cases[idx].hidden = e.target.checked;
                                                                            setNewQuestion(p => ({ ...p, testCases: cases }));
                                                                        }}
                                                                        className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                                                                    />
                                                                    <label htmlFor={`hidden-${idx}`} className="text-xs font-bold text-neutral-500 cursor-pointer">Hidden Case</label>
                                                                </div>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        const cases = (newQuestion.testCases || []).filter((_, i) => i !== idx);
                                                                        setNewQuestion(p => ({ ...p, testCases: cases }));
                                                                    }}
                                                                    className="h-8 w-8 p-0 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="space-y-2">
                                                                <label className="text-[10px] font-black uppercase text-neutral-400 tracking-wider pl-1">Input Data</label>
                                                                <Textarea
                                                                    rows={2}
                                                                    value={tc.input}
                                                                    onChange={(e) => {
                                                                        const cases = [...(newQuestion.testCases || [])];
                                                                        cases[idx].input = e.target.value;
                                                                        setNewQuestion(p => ({ ...p, testCases: cases }));
                                                                    }}
                                                                    placeholder="Standard input"
                                                                    className="border-neutral-200 rounded-xl bg-white font-mono text-xs"
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <label className="text-[10px] font-black uppercase text-neutral-400 tracking-wider pl-1">Expected Output</label>
                                                                <Textarea
                                                                    rows={2}
                                                                    value={tc.output}
                                                                    onChange={(e) => {
                                                                        const cases = [...(newQuestion.testCases || [])];
                                                                        cases[idx].output = e.target.value;
                                                                        setNewQuestion(p => ({ ...p, testCases: cases }));
                                                                    }}
                                                                    placeholder="Standard output"
                                                                    className="border-neutral-200 rounded-xl bg-white font-mono text-xs"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                                {newQuestion.testCases.length === 0 && (
                                                    <div className="py-12 border-2 border-dashed border-neutral-100 rounded-2xl flex flex-col items-center justify-center bg-neutral-50/20 text-neutral-300">
                                                        <Code className="w-10 h-10 mb-2 opacity-10" />
                                                        <p className="text-xs font-bold uppercase tracking-widest opacity-40">No test cases added yet</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex justify-end gap-3 pt-8 border-t border-neutral-100 mt-4">
                                        <Button
                                            variant="outline"
                                            onClick={() => setQuestionMode(null)}
                                            className="rounded-xl h-12 px-8 font-bold text-neutral-600 border-neutral-200 hover:bg-neutral-50 shadow-sm"
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            onClick={handleAddNewQuestion}
                                            className="bg-neutral-900 hover:bg-neutral-800 text-white shadow-xl rounded-xl h-12 px-10 font-black tracking-tight"
                                            style={{ color: 'white' }}
                                        >
                                            Add to Test
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>)}
                    </div>

                    <div className="flex justify-between px-6 py-4 border-t bg-white shrink-0">
                        <Button variant="outline" onClick={currentStep === 2 ? () => setCurrentStep(1) : () => setShowCreateDialog(false)} className="text-neutral-700 border-neutral-200 hover:bg-neutral-50 rounded-xl px-6">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            {currentStep === 1 ? 'Cancel' : 'Previous'}
                        </Button>
                        <button
                            onClick={currentStep === 1 ? handleNextStep : handleCreateContest}
                            style={{
                                backgroundColor: '#171717',
                                color: '#ffffff',
                                borderRadius: '1rem',
                                paddingLeft: '3rem',
                                paddingRight: '3rem',
                                height: '3rem',
                                fontWeight: '900',
                                fontSize: '0.75rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.1em',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                border: 'none',
                                cursor: 'pointer',
                                boxShadow: '0 10px 25px -5px rgba(37,99,235,0.3)',
                            }}
                        >
                            {currentStep === 1 ? 'Next Step' : 'Create Contest'}
                            {currentStep === 1 ? <ArrowRight className="w-4 h-4" /> : <Trophy className="w-4 h-4" />}
                        </button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={showQuestionDialog} onOpenChange={setShowQuestionDialog}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-2xl">{selectedContest?.name} - Questions</DialogTitle>
                    </DialogHeader>
                    {selectedContest && (
                        <div className="space-y-4 mt-4">
                            {selectedContest.questions.map((q, i) => (
                                <div key={q.id} className="p-4 border rounded-xl flex justify-between items-center hover:bg-neutral-50 transition-colors shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <span className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-base">{i + 1}</span>
                                        <div>
                                            <p className="font-bold text-neutral-800 text-lg">{q.title}</p>
                                            <p className="text-sm text-neutral-500 font-medium italic">{q.topic} • {q.points}pts</p>
                                        </div>
                                    </div>
                                    <Badge className={`${getDifficultyColor(q.difficulty)} px-4 py-1.5 rounded-full text-xs font-semibold`}>{q.difficulty}</Badge>
                                </div>
                            ))}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <AlertDialog open={showNextQuestionPrompt} onOpenChange={setShowNextQuestionPrompt}>
                <AlertDialogContent className="max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl flex items-center gap-2">
                            <CheckCircle2 className="w-6 h-6 text-green-600" />
                            Question Added Successfully
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-neutral-600">
                            The question has been added to your contest. Would you like to add another one now?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex gap-3 justify-end mt-4">
                        <AlertDialogCancel onClick={() => { setShowNextQuestionPrompt(false); setQuestionMode('fetch'); }} className="border-neutral-200">
                            No, View All
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={() => { setShowNextQuestionPrompt(false); setQuestionMode('create'); }} className="bg-blue-600 hover:bg-blue-700 text-white" style={{ color: 'white' }}>
                            Yes, Add Another
                        </AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete</AlertDialogTitle>
                        <AlertDialogDescription>Delete "{selectedContest?.name}"?</AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex gap-3 justify-end">
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteContest} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

