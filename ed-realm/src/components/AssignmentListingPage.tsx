import React, { useState } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Progress } from './ui/progress';
import {
  ArrowLeft,
  ChevronRight,
  ArrowRight,
  ChevronDown,
  CheckCircle2,
  Clock,
  Layout,
  Search,
} from 'lucide-react';
import { TopicQuestion } from '../lib/data';
import { EdRealmLogo } from './EdRealmLogo';

interface AssignmentListingPageProps {
  assignment: TopicQuestion;
  moduleName: string;
  courseName: string;
  onSelectTopic: (topic: any) => void;
  onBack: () => void;
}

interface Assignment {
  id: string;
  title: string;
  status: 'completed' | 'in-progress' | 'pending';
  dueDate?: string;
  topics: Topic[];
}

interface Topic {
  id: string;
  title: string;
  questionsCompleted: number;
  totalQuestions: number;
  status: 'submitted' | 'in-progress' | 'pending';
  submittedDate: string | null;
  difficulty: string;
  duration: string;
  hasAttempted: boolean;
}

export function AssignmentListingPage({
  assignment,
  moduleName,
  courseName,
  onSelectTopic,
  onBack,
}: AssignmentListingPageProps) {
  const [expandedAssignments, setExpandedAssignments] = useState<{ [key: string]: boolean }>({
    'assign-1': true,
  });

  const assignments: Assignment[] = [
    {
      id: 'assign-1',
      title: 'Assignment – 1',
      status: 'completed',
      dueDate: 'Sunday, Nov 30, 2025',
      topics: [
        { id: 't1', title: 'Series – Level 1', questionsCompleted: 3, totalQuestions: 3, status: 'submitted', submittedDate: '2024-11-20', difficulty: 'Easy', duration: '15m', hasAttempted: true },
        { id: 't2', title: 'Series – Level 2', questionsCompleted: 2, totalQuestions: 2, status: 'submitted', submittedDate: '2024-11-21', difficulty: 'Medium', duration: '25m', hasAttempted: true },
        { id: 't3', title: 'Series – Level 3', questionsCompleted: 0, totalQuestions: 3, status: 'pending', submittedDate: null, difficulty: 'Hard', duration: '30m', hasAttempted: false },
      ],
    },
    {
      id: 'assign-2',
      title: 'Assignment – 2',
      status: 'pending',
      topics: [],
    },
  ];

  const calculateProgress = (assign: Assignment) => {
    if (assign.topics.length === 0) return 0;
    const completed = assign.topics.filter(t => t.status === 'submitted').length;
    return Math.round((completed / assign.topics.length) * 100);
  };

  return (
    <div className="fixed inset-0 z-50 w-screen h-screen bg-neutral-50 overflow-hidden text-neutral-900 font-sans flex flex-col">
      <header className="h-20 bg-white border-b border-neutral-100 flex items-center px-12 shrink-0 shadow-sm z-10 transition-all">
        <div className="flex items-center gap-6">
          <EdRealmLogo size="small" />
          <div className="h-8 w-px bg-neutral-200" />
          <Button variant="ghost" className="text-neutral-500 hover:text-neutral-900 px-3 py-2 h-auto rounded-xl hover:bg-neutral-50 flex items-center transition-all active:scale-95" onClick={onBack}>
            <ArrowLeft className="w-5 h-5 mr-2" />
            <span className="font-bold">Back</span>
          </Button>
          <div className="h-8 w-px bg-neutral-200" />
          <div className="flex items-center gap-3 text-sm">
            <span className="text-neutral-400 font-medium uppercase tracking-widest text-[10px]">{courseName}</span>
            <ChevronRight className="w-3 h-3 text-neutral-300" />
            <span className="font-black text-neutral-900 uppercase tracking-widest text-[10px]">{moduleName}</span>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-10">
        <div className="max-w-none mx-auto space-y-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-neutral-900">{moduleName}</h1>
            <p className="text-neutral-500">Track and complete your assignments for this module.</p>
          </div>

          <div className="space-y-4">
            {assignments.map((assign) => (
              <Card key={assign.id} className="overflow-hidden border-neutral-200 shadow-sm">
                <div
                  className="p-6 flex items-center justify-between bg-white cursor-pointer hover:bg-neutral-50 transition-colors"
                  onClick={() => setExpandedAssignments(prev => ({ ...prev, [assign.id]: !prev[assign.id] }))}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                      <Layout className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-neutral-900">{assign.title}</h3>
                      <div className="flex items-center gap-3 text-xs text-neutral-500 mt-1">
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                          {assign.topics.filter(t => t.status === 'submitted').length}/{assign.topics.length} Completed
                        </span>
                        {assign.dueDate && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            Due {assign.dueDate}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="flex flex-col items-end gap-1.5 min-w-[120px]">
                      <span className="text-xs font-bold text-neutral-600">{calculateProgress(assign)}%</span>
                      <Progress value={calculateProgress(assign)} className="h-1.5 w-full bg-neutral-100" />
                    </div>
                    <ChevronDown className={`w-5 h-5 text-neutral-400 transition-transform ${expandedAssignments[assign.id] ? '' : '-rotate-90'}`} />
                  </div>
                </div>

                {expandedAssignments[assign.id] && assign.topics.length > 0 && (
                  <div className="border-t border-neutral-100">
                    <Table>
                      <TableHeader className="bg-neutral-50/50">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="px-6 py-3 font-bold text-neutral-500 uppercase text-[10px]">Topic</TableHead>
                          <TableHead className="px-6 py-3 font-bold text-neutral-500 uppercase text-[10px] text-center">Status</TableHead>
                          <TableHead className="px-6 py-3 font-bold text-neutral-500 uppercase text-[10px] text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {assign.topics.map((topic) => (
                          <TableRow key={topic.id} className="hover:bg-neutral-50/50 transition-colors border-neutral-100">
                            <TableCell className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="font-bold text-neutral-800">{topic.title}</span>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-medium border-neutral-200 bg-neutral-100 text-neutral-600">
                                    {topic.difficulty}
                                  </Badge>
                                  <span className="text-[10px] text-neutral-400">{topic.duration}</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="px-6 py-4 text-center">
                              {topic.status === 'submitted' ? (
                                <Badge className="bg-green-50 text-green-600 hover:bg-green-50 border-green-100 px-3 py-1 font-bold text-[10px] uppercase rounded-full">
                                  Submitted
                                </Badge>
                              ) : (
                                <Badge className="bg-neutral-100 text-neutral-500 hover:bg-neutral-100 border-neutral-200 px-3 py-1 font-bold text-[10px] uppercase rounded-full">
                                  Pending
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="px-6 py-4 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-4 font-bold text-xs text-orange-600 hover:bg-orange-50 hover:text-orange-700 rounded-full"
                                onClick={() => onSelectTopic(topic)}
                              >
                                {topic.hasAttempted ? 'Retake Test' : 'Start Test'}
                                <ArrowRight className="w-3.5 h-3.5 ml-2" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
