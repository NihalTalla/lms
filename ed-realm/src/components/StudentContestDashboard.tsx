import React, { useState } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { toast } from 'sonner';
import { ContestParticipation } from './ContestParticipation';
import { loadContests, Contest as StoreContest } from '../lib/contest-store';
import {
  Calendar,
  Clock,
  Trophy,
  AlertCircle,
  Zap,
} from 'lucide-react';

interface Question {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
  points: number;
  type: 'coding' | 'mcq';
}

interface Contest {
  id: string;
  name: string;
  description: string;
  totalQuestions: number;
  startTime: string;
  endTime: string;
  status: 'draft' | 'scheduled' | 'active' | 'completed';
  participants: number;
  questions: Question[];
  createdAt: string;
  duration: string;
  prize?: string;
  enrolled?: boolean;
}

export function StudentContestDashboard({
  onNavigate,
}: {
  onNavigate?: (page: string, data?: any) => void;
}) {
  const [activeTab, setActiveTab] = useState<'live' | 'upcoming' | 'past'>('live');
  const [showEnrollDialog, setShowEnrollDialog] = useState(false);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [isContestMode, setIsContestMode] = useState(false);
  const [selectedContest, setSelectedContest] = useState<Contest | null>(null);
  const [activeContest, setActiveContest] = useState<Contest | null>(null);

  const defaultContests: Contest[] = [
    {
      id: '1',
      name: 'Dynamic Programming Contest',
      description: 'Master the art of DP with this intensive challenge.',
      totalQuestions: 5,
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 3 * 3600000).toISOString(),
      status: 'active',
      participants: 840,
      duration: '3h',
      prize: '₹10,000',
      enrolled: true,
      questions: [
        { id: 'q1', title: 'Edit Distance', description: 'Transform one string to another.', difficulty: 'medium', topic: 'DP', points: 100, type: 'coding' },
      ],
      createdAt: new Date().toISOString(),
    },
    {
      id: '2',
      name: 'Weekly DSA Challenge #12',
      description: 'Test your data structures and algorithms knowledge.',
      totalQuestions: 4,
      startTime: new Date(Date.now() + 86400000).toISOString(),
      endTime: new Date(Date.now() + 90000000).toISOString(),
      status: 'scheduled',
      participants: 0,
      duration: '1.5h',
      prize: '₹2,000',
      enrolled: false,
      questions: [],
      createdAt: new Date().toISOString(),
    },
  ];

  const [contests, setContests] = useState<Contest[]>(() => {
    const stored = loadContests();
    // Merge stored contests with default ones, filter out duplicates by id
    const merged = [...(stored as any)];
    defaultContests.forEach(dc => {
      if (!merged.find(mc => mc.id === dc.id)) {
        merged.push(dc);
      }
    });
    return merged;
  });

  const liveContests = contests.filter(c => c.status === 'active');
  const upcomingContests = contests.filter(c => c.status === 'scheduled');

  const handleEnterContest = (c: Contest) => {
    setSelectedContest(c);
    setShowPermissionDialog(true);
  };

  const enrollAndEnter = () => {
    if (!selectedContest) return;
    // Mark contest as enrolled in state
    setContests(prev =>
      prev.map(contest =>
        contest.id === selectedContest.id ? { ...contest, enrolled: true } : contest
      )
    );
    const enrolledContest = { ...selectedContest, enrolled: true };
    setSelectedContest(enrolledContest);
    setShowEnrollDialog(false);
    setShowPermissionDialog(true);
    toast.success('You are registered. Review permissions to start.');
  };

  const startContest = () => {
    setShowPermissionDialog(false);
    // If parent provided navigation handler, delegate to App to render full-screen contest
    if (onNavigate && selectedContest) {
      onNavigate('contest-play', { contest: selectedContest });
      return;
    }

    setIsContestMode(true);
    if (selectedContest) {
      setActiveContest(selectedContest);
    }
  };

  if (activeContest && isContestMode) {
    return (
      <div className="min-h-screen w-full bg-white">
        <ContestParticipation
          contest={{
            id: activeContest.id,
            title: activeContest.name,
            duration: 180,
            questions: activeContest.questions,
          }}
          onSubmit={() => {
            setActiveContest(null);
            setIsContestMode(false);
          }}
          onExit={() => {
            setActiveContest(null);
            setIsContestMode(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Coding Contests</h1>
            <p className="text-slate-500">Compete with your peers and improve your ranking.</p>
          </div>
          <div className="flex gap-4">
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Global Rank</p>
                <p className="text-xl font-bold text-slate-900">#128</p>
              </div>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="bg-white border border-slate-200 p-1 mb-8 rounded-xl h-auto shadow-sm inline-flex">
            <TabsTrigger
              value="live"
              className="px-6 py-2.5 rounded-lg text-sm font-medium data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-900 data-[state=inactive]:text-slate-600 data-[state=inactive]:hover:bg-slate-50 transition-all font-bold border border-transparent data-[state=active]:border-indigo-200"
            >
              Live Contests
            </TabsTrigger>
            <TabsTrigger
              value="upcoming"
              className="px-6 py-2.5 rounded-lg text-sm font-medium data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-900 data-[state=inactive]:text-slate-600 data-[state=inactive]:hover:bg-slate-50 transition-all font-bold border border-transparent data-[state=active]:border-indigo-200"
            >
              Upcoming
            </TabsTrigger>
            <TabsTrigger
              value="past"
              className="px-6 py-2.5 rounded-lg text-sm font-medium data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-900 data-[state=inactive]:text-slate-600 data-[state=inactive]:hover:bg-slate-50 transition-all font-bold border border-transparent data-[state=active]:border-indigo-200"
            >
              Past
            </TabsTrigger>
          </TabsList>

          <TabsContent value="live" className="space-y-6">
            {liveContests.map(c => (
              <Card key={c.id} className="overflow-hidden border-slate-200 shadow-md hover:shadow-lg transition-shadow bg-white rounded-2xl">
                <div className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-8">
                  <div className="space-y-4 flex-1">
                    <div className="flex items-center gap-3">
                      <Badge className="bg-red-50 text-red-600 hover:bg-red-50 border-red-100 uppercase text-[10px] font-bold px-3 py-1">
                        <span className="relative flex h-2 w-2 mr-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                        </span>
                        Live Now
                      </Badge>
                      <span className="text-xs text-slate-400 font-medium">• {c.participants} participants active</span>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900 mb-2">{c.name}</h2>
                      <p className="text-slate-500">{c.description}</p>
                    </div>
                    <div className="flex flex-wrap gap-6 text-sm">
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg">
                        <Clock className="w-4 h-4 text-slate-500" />
                        <span className="font-semibold text-slate-700">{c.duration}</span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 rounded-lg">
                        <Zap className="w-4 h-4 text-amber-500" />
                        <span className="font-semibold text-amber-700">{c.prize} Prize Pool</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 min-w-[240px]">
                    <Button
                      className="w-full py-6 rounded-xl font-bold text-base transition-all bg-amber-300 hover:bg-amber-400 text-black shadow-amber-100 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 border border-amber-400"
                      onClick={() => {
                        if (c.enrolled) handleEnterContest(c);
                        else { setSelectedContest(c); setShowEnrollDialog(true); }
                      }}
                    >
                      {c.enrolled ? 'Enter Contest Arena' : 'Register Now'}
                    </Button>
                    <p className="text-xs font-semibold text-center uppercase text-indigo-600 bg-indigo-50 py-2 rounded-lg">
                      Ends in 02:45:12
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="upcoming" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingContests.map(c => (
              <Card key={c.id} className="p-6 border-slate-200 shadow-sm hover:shadow-md transition-all bg-white rounded-2xl flex flex-col h-full group">
                <div className="space-y-4 flex-1">
                  <div className="flex justify-between items-start">
                    <Badge variant="secondary" className="bg-indigo-50 text-indigo-600 border-indigo-100 uppercase text-[10px] font-bold">Scheduled</Badge>
                    <Badge variant="outline" className="border-slate-200 text-slate-500 text-[10px]">{c.duration}</Badge>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{c.name}</h3>
                    <p className="text-sm mt-2 text-slate-500 line-clamp-2">{c.description}</p>
                  </div>
                </div>
                <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>Starts in 24h</span>
                  </div>
                  <Button variant="outline" className="text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-black">
                    View Details
                  </Button>
                </div>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>

      {/* Permission Dialog */}
      <Dialog open={showPermissionDialog} onOpenChange={setShowPermissionDialog}>
        <DialogContent className="sm:max-w-[480px] bg-white border-0 shadow-2xl rounded-2xl p-0 overflow-hidden">
          <div className="bg-amber-50 p-6 border-b border-amber-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <AlertCircle className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-amber-900">
                  Contest Environment
                </DialogTitle>
                <DialogDescription className="text-amber-700 font-medium mt-1">
                  Important instructions before you begin
                </DialogDescription>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm text-slate-600 space-y-3">
              <p className="flex gap-2">
                <span className="text-slate-900 font-bold">•</span>
                Your screen and audio will be monitored during the contest.
              </p>
              <p className="flex gap-2">
                <span className="text-slate-900 font-bold">•</span>
                Switching tabs or minimizing the window will result in a warning.
              </p>
              <p className="flex gap-2">
                <span className="text-slate-900 font-bold">•</span>
                Plagiarism of any form will lead to immediate disqualification.
              </p>
            </div>
            <p className="text-sm text-slate-500 text-center px-4">
              By clicking "Start Contest", you agree to follow the code of conduct.
            </p>
          </div>

          <DialogFooter className="p-6 pt-0 bg-white flex gap-3">
            <Button
              variant="outline"
              className="flex-1 font-bold h-12 rounded-xl text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-black"
              onClick={() => setShowPermissionDialog(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-amber-400 hover:bg-amber-500 font-bold h-12 rounded-xl border border-amber-500"
              style={{ color: '#000' }}
              onClick={startContest}
            >
              I Agree, Start
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEnrollDialog} onOpenChange={setShowEnrollDialog}>
        <DialogContent className="bg-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Register for Contest</DialogTitle>
            <DialogDescription>Confirm your enrollment for {selectedContest?.name}.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Confirmation Email</Label>
              <Input placeholder="Enter your email" className="rounded-xl h-12" />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEnrollDialog(false)}
              className="rounded-xl h-11 text-black border-slate-200 hover:bg-slate-50"
            >
              Cancel
            </Button>
            <Button
              className="bg-indigo-100 hover:bg-indigo-200 border border-indigo-200 rounded-xl h-11 font-bold"
              style={{ color: '#000' }}
              onClick={enrollAndEnter}
            >
              Confirm Registration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
