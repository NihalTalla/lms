import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';
import {
  Users,
  Calendar,
  Clock,
  TrendingUp,
  Plus,
  Search,
  MoreVertical,
  Settings,
  Video,
  FileText,
  Award,
  Trash2,
  Eye,
  EyeOff,
  UserPlus,
  ClipboardList,
  Building2,
  Flame,
  Activity
} from 'lucide-react';
import api from '../lib/api';
import { toast } from 'sonner';
import { CSVBatchDialog } from './CSVBatchDialog';

interface BatchManagementProps {
  onNavigate: (page: string, data?: any) => void;
  role?: 'admin' | 'faculty' | 'trainer' | 'student';
  initialFilters?: { institutionId?: string; year?: string };
}

export function BatchManagement({ onNavigate, role = 'faculty', initialFilters }: BatchManagementProps) {
  const [selectedInstitution, setSelectedInstitution] = useState<string>(initialFilters?.institutionId || '');
  const [selectedYear, setSelectedYear] = useState<string>(initialFilters?.year || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [batchesData, setBatchesData] = useState<any[]>([]);
  const [coursesData, setCoursesData] = useState<any[]>([]);
  const [usersData, setUsersData] = useState<any[]>([]);
  const [institutionsData, setInstitutionsData] = useState<any[]>([]);
  const [problemsData, setProblemsData] = useState<any[]>([]);
  const [batchStudentsRaw, setBatchStudentsRaw] = useState<Array<{ user: any }>>([]);

  // Dialog states
  const [assignFacultyDialogOpen, setAssignFacultyDialogOpen] = useState(false);
  const [addProblemDialogOpen, setAddProblemDialogOpen] = useState(false);
  const [assessmentDialogOpen, setAssessmentDialogOpen] = useState(false);
  const [activeSubView, setActiveSubView] = useState<'none' | 'leaderboard' | 'streaks' | 'insights'>('none');
  const [problemMode, setProblemMode] = useState<'select' | 'existing' | 'create'>('select');
  const [selectedFaculty, setSelectedFaculty] = useState<string[]>([]);
  const [selectedExistingProblem, setSelectedExistingProblem] = useState('');
  const [newProblemData, setNewProblemData] = useState({
    title: '',
    difficulty: 'easy' as 'easy' | 'medium' | 'hard',
    description: '',
    constraints: '',
    sampleInput: '',
    sampleOutput: '',
    explanation: '',
    tags: '',
    points: '',
  });
  const [testCases, setTestCases] = useState([{ input: '', expectedOutput: '', hidden: false }]);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        const [batchesRes, coursesRes, problemsRes] = await Promise.all([
          api.getBatches(),
          api.getCourses(),
          api.getProblems()
        ]);

        if (!mounted) return;
        setBatchesData(Array.isArray(batchesRes) ? batchesRes : []);
        setCoursesData(Array.isArray(coursesRes) ? coursesRes : []);
        setProblemsData(Array.isArray(problemsRes) ? problemsRes : []);
      } catch (error) {
        if (!mounted) return;
        toast.error('Failed to load batch data');
      }

      try {
        const institutionsRes = await api.getInstitutions();
        if (!mounted) return;
        setInstitutionsData(Array.isArray(institutionsRes) ? institutionsRes : []);
      } catch {
        // institutions endpoint is admin-only; derive a minimal fallback list from batches.
      }

      try {
        const usersRes = await api.getUsers();
        if (!mounted) return;
        const list = Array.isArray(usersRes)
          ? usersRes
          : Array.isArray((usersRes as any)?.items)
            ? (usersRes as any).items
            : [];
        setUsersData(list);
      } catch {
        // users endpoint is admin-only; keep staff assignment empty for non-admin roles.
      }
    };

    void loadData();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    if (!selectedBatch?.id) {
      setBatchStudentsRaw([]);
      return;
    }

    const loadBatchStudents = async () => {
      try {
        const students = await api.getBatchStudents(selectedBatch.id);
        if (!mounted) return;
        setBatchStudentsRaw(Array.isArray(students) ? students : []);
      } catch {
        if (!mounted) return;
        setBatchStudentsRaw([]);
      }
    };

    void loadBatchStudents();
    return () => {
      mounted = false;
    };
  }, [selectedBatch?.id]);

  // Get unique years for the selected institution
  const availableYears = Array.from(
    new Set(
      batchesData
        .filter((b) => !selectedInstitution || b.institutionId === selectedInstitution)
        .map((b: any) => {
          if (b.year) return String(b.year);
          const dateCandidate = b.startDate || b.createdAt;
          return dateCandidate ? String(new Date(dateCandidate).getFullYear()) : '';
        })
        .filter(Boolean)
    )
  ).sort((a, b) => b.localeCompare(a));

  const effectiveInstitutions = useMemo(() => {
    if (institutionsData.length > 0) return institutionsData;

    const seen = new Set<string>();
    return batchesData
      .filter((batch) => !!batch.institutionId)
      .map((batch) => batch.institutionId as string)
      .filter((id) => {
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      })
      .map((id) => ({
        id,
        name: `Institution ${id.slice(0, 8)}`,
        email: '',
        activeUsers: 0,
        location: ''
      }));
  }, [institutionsData, batchesData]);

  const filteredBatches = batchesData.filter((batch: any) => {
    const matchesInstitution = !selectedInstitution || batch.institutionId === selectedInstitution;
    const batchYear = batch.year
      ? String(batch.year)
      : batch.startDate || batch.createdAt
        ? String(new Date(batch.startDate || batch.createdAt).getFullYear())
        : '';
    const matchesYear = !selectedYear || batchYear === selectedYear;
    const matchesSearch = batch.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesInstitution && matchesYear && matchesSearch;
  });

  const batchesWithDetails = filteredBatches.map(batch => {
    const course = coursesData.find(c => (batch as any).courseId && c.id === (batch as any).courseId);
    const start = batch.startDate ? new Date(batch.startDate) : null;
    const end = batch.endDate ? new Date(batch.endDate) : null;
    const totalDays = start && end ? Math.max(1, Math.ceil((+end - +start) / (1000 * 60 * 60 * 24))) : 0;
    const elapsedDays = start ? Math.max(0, Math.ceil((Date.now() - +start) / (1000 * 60 * 60 * 24))) : 0;
    const progress = totalDays > 0 ? Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100))) : 0;

    return {
      ...batch,
      course,
      progress,
      attendance: progress > 0 ? Math.min(100, Math.max(0, 70 + Math.round(progress * 0.2))) : 0,
      students: batchStudentsRaw.length,
      schedule: 'Schedule TBD'
    };
  });

  const handleAssignFaculty = () => {
    if (selectedFaculty.length === 0) {
      toast.error('Please select at least one faculty or trainer');
      return;
    }
    toast.success(`Assigned ${selectedFaculty.length} faculty/trainer(s) to ${selectedBatch.name}`);
    setAssignFacultyDialogOpen(false);
    setSelectedFaculty([]);
  };

  const handleAddTestCase = () => {
    setTestCases([...testCases, { input: '', expectedOutput: '', hidden: false }]);
  };

  const handleRemoveTestCase = (index: number) => {
    if (testCases.length > 1) {
      setTestCases(testCases.filter((_, i) => i !== index));
    }
  };

  const handleTestCaseChange = (index: number, field: 'input' | 'expectedOutput' | 'hidden', value: string | boolean) => {
    const updated = [...testCases];
    updated[index] = { ...updated[index], [field]: value };
    setTestCases(updated);
  };

  const handleAddExistingProblem = () => {
    if (!selectedExistingProblem) {
      toast.error('Please select a problem');
      return;
    }
    const problem = problemsData.find(p => p.id === selectedExistingProblem);
    toast.success(`Problem "${problem?.title}" added to ${selectedBatch.name}`);
    setAddProblemDialogOpen(false);
    setProblemMode('select');
    setSelectedExistingProblem('');
  };

  const handleCreateNewProblem = () => {
    if (!newProblemData.title || !newProblemData.description || !newProblemData.points) {
      toast.error('Please fill all required fields');
      return;
    }
    toast.success(`Problem "${newProblemData.title}" created and added to ${selectedBatch.name}`);
    setAddProblemDialogOpen(false);
    resetProblemDialog();
  };

  const resetProblemDialog = () => {
    setProblemMode('select');
    setSelectedExistingProblem('');
    setNewProblemData({
      title: '',
      difficulty: 'easy',
      description: '',
      constraints: '',
      sampleInput: '',
      sampleOutput: '',
      explanation: '',
      tags: '',
      points: '',
    });
    setTestCases([{ input: '', expectedOutput: '', hidden: false }]);
  };

  const batchStudents = batchStudentsRaw
    .map((entry) => entry.user)
    .map((u, i) => ({
      ...u,
      rank: i + 1,
      points: Math.max(0, 2000 - i * 120),
      streak: Math.max(0, 10 - i),
      solved: Math.max(0, 25 - i),
      accuracy: Math.max(50, 95 - i * 3),
      progress: Math.max(30, 90 - i * 4),
      activity: [4, 7, 5, 8, 6, 9, 7]
    }));

  const isSelectionMade = !!selectedInstitution && !!selectedYear;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-neutral-900">Batch Management</h2>
          <p className="text-neutral-600 mt-1">
            {role === 'admin' ? 'Manage all batches across the platform' : 'Manage your assigned batches'}
          </p>
        </div>
        {role === 'admin' && <CSVBatchDialog />}
      </div>

      <div className="flex flex-wrap gap-4 bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
        <div className="flex-1 min-w-[200px] space-y-1.5">
          <Label>Select Institution</Label>
          <Select value={selectedInstitution} onValueChange={(val) => { setSelectedInstitution(val); setSelectedYear(''); }}>
            <SelectTrigger>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-neutral-400" />
                <SelectValue placeholder="Choose Institution" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {effectiveInstitutions.map(inst => (
                <SelectItem key={inst.id} value={inst.id}>{inst.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 min-w-[200px] space-y-1.5">
          <Label>Select Year</Label>
          <Select value={selectedYear} onValueChange={setSelectedYear} disabled={!selectedInstitution}>
            <SelectTrigger>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-neutral-400" />
                <SelectValue placeholder="Choose Year" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {availableYears.map(year => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isSelectionMade && (
          <div className="flex-1 min-w-[200px] space-y-1.5">
            <Label>Search Batches</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <Input
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        )}
      </div>

      {!isSelectionMade ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-dashed border-neutral-300">
          <Users className="w-12 h-12 text-neutral-300 mb-4" />
          <h3 className="text-lg font-medium text-neutral-900">Select Institution and Year</h3>
          <p className="text-neutral-500">Please select both filters above to view the batches.</p>
        </div>
      ) : !selectedBatch ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {batchesWithDetails.length > 0 ? (
            batchesWithDetails.map((batch) => (
              <Card key={batch.id} className="hover:shadow-lg transition-all duration-200 cursor-pointer hover:scale-[1.01]" onClick={() => setSelectedBatch(batch)}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{batch.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {batch.course?.title}
                      </CardDescription>
                    </div>
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                      Active
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm text-neutral-600">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span>{batch.students} students</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>{batch.schedule}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-neutral-600">Course Progress</span>
                      <span className="font-medium">{batch.progress}%</span>
                    </div>
                    <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${batch.progress}%` }} />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" className="flex-1" size="sm">
                      <Video className="w-4 h-4 mr-2" />
                      Join Session
                    </Button>
                    <Button variant="outline" size="sm">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full text-center py-10">
              <p className="text-neutral-500">No batches found matching your search.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => { setSelectedBatch(null); setActiveSubView('none'); }}>
              ← Back to Batches
            </Button>
            <div className="flex gap-2">
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
                <Video className="w-4 h-4 mr-2" />
                Start Session
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl">{selectedBatch.name}</CardTitle>
                  <CardDescription className="text-base mt-1">
                    {selectedBatch.course?.title}
                  </CardDescription>
                  <div className="flex items-center gap-4 mt-3 text-sm text-neutral-500">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      {selectedBatch.startDate ? new Date(selectedBatch.startDate).toLocaleDateString() : 'TBD'} to {selectedBatch.endDate ? new Date(selectedBatch.endDate).toLocaleDateString() : 'TBD'}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      {selectedBatch.schedule}
                    </div>
                  </div>
                </div>
                <Badge className="px-4 py-1.5 bg-indigo-600 text-white border-0">Active</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total Students', value: selectedBatch.students, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                  { label: 'Avg. Progress', value: `${selectedBatch.progress}%`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                  { label: 'Attendance', value: `${selectedBatch.attendance}%`, icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50' },
                  { label: 'Batch Health', value: 'Good', icon: Award, color: 'text-amber-600', bg: 'bg-amber-50' },
                ].map((stat, i) => (
                  <div key={i} className={`p-4 rounded-xl ${stat.bg} text-center`}>
                    <stat.icon className={`w-5 h-5 mx-auto mb-2 ${stat.color}`} />
                    <p className="text-2xl font-bold text-neutral-900">{stat.value}</p>
                    <p className="text-xs text-neutral-600 font-medium uppercase tracking-wider">{stat.label}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-neutral-900">
                    {activeSubView === 'none' ? 'Student Management' : (
                      activeSubView === 'leaderboard' ? 'Batch Leaderboard' :
                        activeSubView === 'streaks' ? 'Student Streaks' : 'Performance Insights'
                    )}
                  </h3>
                  {activeSubView !== 'none' && (
                    <Button variant="ghost" size="sm" onClick={() => setActiveSubView('none')}>
                      Back to Controls
                    </Button>
                  )}
                </div>

                {activeSubView === 'none' ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {role === 'trainer' || role === 'faculty' ? (
                      <>
                        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveSubView('leaderboard')}>
                          <CardContent className="pt-6">
                            <div className="flex items-start gap-4">
                              <div className="p-3 bg-amber-50 rounded-lg">
                                <Award className="w-6 h-6 text-amber-600" />
                              </div>
                              <div>
                                <h4 className="font-bold text-neutral-900">Leaderboard</h4>
                                <p className="text-sm text-neutral-600">Ranking & performance</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveSubView('streaks')}>
                          <CardContent className="pt-6">
                            <div className="flex items-start gap-4">
                              <div className="p-3 bg-orange-50 rounded-lg">
                                <Flame className="w-6 h-6 text-orange-600" />
                              </div>
                              <div>
                                <h4 className="font-bold text-neutral-900">Student Streaks</h4>
                                <p className="text-sm text-neutral-600">Engagement insights</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveSubView('insights')}>
                          <CardContent className="pt-6">
                            <div className="flex items-start gap-4">
                              <div className="p-3 bg-indigo-50 rounded-lg">
                                <Activity className="w-6 h-6 text-indigo-600" />
                              </div>
                              <div>
                                <h4 className="font-bold text-neutral-900">Batch Insights</h4>
                                <p className="text-sm text-neutral-600">Performance analytics</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </>
                    ) : (
                      <>
                        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setAssignFacultyDialogOpen(true)}>
                          <CardContent className="pt-6">
                            <div className="flex items-start gap-4">
                              <div className="p-3 bg-indigo-50 rounded-lg">
                                <UserPlus className="w-6 h-6 text-indigo-600" />
                              </div>
                              <div>
                                <h4 className="font-bold text-neutral-900">Assign Staff</h4>
                                <p className="text-sm text-neutral-600">Faculty & trainers</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveSubView('leaderboard')}>
                          <CardContent className="pt-6">
                            <div className="flex items-start gap-4">
                              <div className="p-3 bg-emerald-50 rounded-lg">
                                <Award className="w-6 h-6 text-emerald-600" />
                              </div>
                              <div>
                                <h4 className="font-bold text-neutral-900">Leaderboard</h4>
                                <p className="text-sm text-neutral-600">View batch rankings</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setAddProblemDialogOpen(true)}>
                          <CardContent className="pt-6">
                            <div className="flex items-start gap-4">
                              <div className="p-3 bg-blue-50 rounded-lg">
                                <FileText className="w-6 h-6 text-blue-600" />
                              </div>
                              <div>
                                <h4 className="font-bold text-neutral-900">Add Problems</h4>
                                <p className="text-sm text-neutral-600">DSA & Coding tasks</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </>
                    )}
                  </div>
                ) : activeSubView === 'leaderboard' ? (
                  <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-neutral-50 border-b border-neutral-200">
                          <tr>
                            <th className="px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Rank</th>
                            <th className="px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Student</th>
                            <th className="px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Problems Solved</th>
                            <th className="px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Streak</th>
                            <th className="px-6 py-3 text-xs font-semibold text-neutral-500 uppercase text-right">Points</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200">
                          {batchStudents.map((student, i) => (
                            <tr key={student.id} className="hover:bg-neutral-50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${i === 0 ? 'bg-yellow-100 text-yellow-700' :
                                    i === 1 ? 'bg-neutral-100 text-neutral-600' :
                                      i === 2 ? 'bg-amber-100 text-amber-700' : 'text-neutral-500'
                                  }`}>
                                  {i + 1}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-3">
                                  <Avatar className="w-8 h-8">
                                    <AvatarFallback>{student.name.split(' ').map((n: string) => n[0]).join('')}</AvatarFallback>
                                  </Avatar>
                                  <span className="font-medium text-neutral-900">{student.name}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-neutral-600">
                                {student.solved}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-1.5 text-orange-600 font-medium">
                                  <Flame className="w-4 h-4" />
                                  {student.streak}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-indigo-600 font-mono">
                                {student.points.toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : activeSubView === 'streaks' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {batchStudents.map(student => (
                      <Card key={student.id}>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Avatar className="w-10 h-10">
                                <AvatarFallback>{student.name.split(' ').map((n: string) => n[0]).join('')}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-bold text-neutral-900">{student.name}</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <Flame className={`w-4 h-4 ${student.streak >= 10 ? 'text-orange-500 animate-pulse' : 'text-orange-400'}`} />
                                  <span className="text-sm font-bold text-orange-600">{student.streak} Day Streak</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-neutral-500 uppercase tracking-tighter">Status</p>
                              <Badge className="bg-emerald-50 text-emerald-700 border-0">On Fire</Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Class Distribution</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-48 flex items-end justify-between gap-2 px-2">
                          {['Points', 'Solved', 'Streak', 'Accuracy'].map((label, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center">
                              <div
                                className="w-full bg-indigo-600 rounded-t-lg transition-all duration-500"
                                style={{ height: `${[75, 60, 45, 90][i]}%` }}
                              />
                              <span className="text-[10px] font-medium text-neutral-500 mt-2 uppercase">{label}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Student Performance</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {batchStudents.slice(0, 3).map(student => (
                          <div key={student.id} className="space-y-1.5">
                            <div className="flex justify-between text-sm">
                              <span className="text-neutral-600">{student.name}</span>
                              <span className="font-bold text-indigo-600">{student.accuracy}%</span>
                            </div>
                            <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-600" style={{ width: `${student.accuracy}%` }} />
                            </div>
                          </div>
                        ))}
                        <p className="text-center text-xs text-neutral-500 mt-2">Top performers accuracy metrics</p>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Dialogs */}
      <Dialog open={assignFacultyDialogOpen} onOpenChange={setAssignFacultyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Faculty & Trainer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Staff Members</Label>
              <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-2">
                {usersData.filter(u => u.role === 'faculty' || u.role === 'trainer').map(staff => (
                  <div key={staff.id} className="flex items-center gap-3 p-2 hover:bg-neutral-50 rounded-md">
                    <input
                      type="checkbox"
                      checked={selectedFaculty.includes(staff.id)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedFaculty([...selectedFaculty, staff.id]);
                        else setSelectedFaculty(selectedFaculty.filter(id => id !== staff.id));
                      }}
                      className="rounded border-neutral-300 text-indigo-600"
                    />
                    <div>
                      <p className="text-sm font-medium">{staff.name}</p>
                      <p className="text-xs text-neutral-500 uppercase">{staff.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <Button className="w-full bg-indigo-600 hover:bg-indigo-700" onClick={handleAssignFaculty}>
              Save Assignments
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={addProblemDialogOpen} onOpenChange={(open) => { if (!open) resetProblemDialog(); setAddProblemDialogOpen(open); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Problem to Batch</DialogTitle>
          </DialogHeader>

          {problemMode === 'select' ? (
            <div className="grid grid-cols-2 gap-4 py-6">
              <button onClick={() => setProblemMode('existing')} className="p-6 border-2 border-dashed rounded-xl hover:border-indigo-600 hover:bg-indigo-50 transition-all text-center group">
                <Search className="w-8 h-8 mx-auto mb-3 text-neutral-400 group-hover:text-indigo-600" />
                <span className="font-bold text-neutral-900">Existing Problem</span>
              </button>
              <button onClick={() => setProblemMode('create')} className="p-6 border-2 border-dashed rounded-xl hover:border-emerald-600 hover:bg-emerald-50 transition-all text-center group">
                <Plus className="w-8 h-8 mx-auto mb-3 text-neutral-400 group-hover:text-emerald-600" />
                <span className="font-bold text-neutral-900">Create New</span>
              </button>
            </div>
          ) : problemMode === 'existing' ? (
            <div className="space-y-4 py-4">
              <Select value={selectedExistingProblem} onValueChange={setSelectedExistingProblem}>
                <SelectTrigger><SelectValue placeholder="Search problems..." /></SelectTrigger>
                <SelectContent>
                  {problemsData.map(p => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setProblemMode('select')}>Back</Button>
                <Button className="bg-indigo-600" onClick={handleAddExistingProblem}>Add Problem</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <Input placeholder="Problem Title" value={newProblemData.title} onChange={e => setNewProblemData({ ...newProblemData, title: e.target.value })} />
              <Textarea placeholder="Description" value={newProblemData.description} onChange={e => setNewProblemData({ ...newProblemData, description: e.target.value })} />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setProblemMode('select')}>Back</Button>
                <Button className="bg-emerald-600 text-white" onClick={handleCreateNewProblem}>Create & Add</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={assessmentDialogOpen} onOpenChange={setAssessmentDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Assessment</DialogTitle>
            <DialogDescription>Create a new assessment with coding problems.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label>Assessment Title</Label>
              <Input placeholder="e.g. Mid-Term Coding Exam" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea placeholder="Instructions for students..." />
            </div>

            <div className="space-y-4 border rounded-lg p-4 bg-neutral-50">
              <div className="flex justify-between items-center">
                <h4 className="font-semibold">Questions</h4>
                <Button size="sm" variant="secondary" onClick={() => setAddProblemDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" /> Add Question from Problems
                </Button>
              </div>
              <div className="text-center py-8 text-neutral-500 text-sm">
                No questions added yet. Add existing problems or create new ones.
              </div>
            </div>

            <Button className="w-full bg-indigo-600 hover:bg-indigo-700" onClick={() => {
              toast.success('Assessment created successfully');
              setAssessmentDialogOpen(false);
            }}>
              Create Assessment
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
