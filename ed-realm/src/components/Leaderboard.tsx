import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Trophy, Medal, Award, TrendingUp, Flame, Code, CheckCircle2, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { useAuth } from '../lib/auth-context';
import { batches } from '../lib/data';
import { toast } from 'sonner';
import { exportToCSV, exportToPDF } from '../lib/exportUtils';

export function Leaderboard() {
  const { currentUser } = useAuth();
  const [selectedBatch, setSelectedBatch] = useState<string>('all');

  const canViewAllBatches = currentUser && ['admin', 'faculty', 'trainer'].includes(currentUser.role);

  const globalLeaderboard: any[] = [];

  const weeklyLeaderboard: any[] = [];

  const achievementBadges: any[] = [];

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
    return <span className="w-5 h-5 flex items-center justify-center text-sm text-neutral-600">{rank}</span>;
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'bg-neutral-100 text-neutral-700';
      case 'rare': return 'bg-blue-100 text-blue-700';
      case 'epic': return 'bg-purple-100 text-purple-700';
      case 'legendary': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-neutral-100 text-neutral-700';
    }
  };

  const exportLeaderboard = (format: 'excel' | 'pdf') => {
    const data = globalLeaderboard;
    const headers = ['Rank', 'Name', 'Points', 'Solved', 'Streak', 'Badges'];
    const rows = data.map(user => [user.rank, user.name, user.points, user.solved, user.streak, user.badges]);
    const filenameBase = `leaderboard_${selectedBatch === 'all' ? 'all_batches' : selectedBatch}_${new Date().toISOString().split('T')[0]}`;
    if (format === 'pdf') {
      exportToPDF(filenameBase, 'Leaderboard', headers, rows);
      toast.success('PDF export started');
    } else {
      exportToCSV(filenameBase, headers, rows);
      toast.success('Excel export started');
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900">Leaderboard</h2>
          <p className="text-sm text-neutral-600 mt-1">
            {canViewAllBatches
              ? 'View rankings across all batches and export data'
              : 'Compete with fellow learners and track your progress'}
          </p>
        </div>
        {canViewAllBatches && (
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={selectedBatch} onValueChange={setSelectedBatch}>
              <SelectTrigger className="w-40 sm:w-48">
                <SelectValue placeholder="Select Batch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Batches</SelectItem>
                {batches.map(batch => (
                  <SelectItem key={batch.id} value={batch.id}>{batch.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => exportLeaderboard('excel')}>
                  <FileSpreadsheet className="w-3 h-3 mr-2" /> Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportLeaderboard('pdf')}>
                  <FileText className="w-3 h-3 mr-2" /> PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* ── Your Stats Card ── */}
      <Card style={{ borderColor: 'var(--color-primary)', borderWidth: 2 }}>
        <CardContent className="pt-5 pb-5">
          {/* Top row: avatar + name + rank */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--color-primary)' }}>
              <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
            <div>
              <p className="text-xs text-neutral-500 font-medium uppercase tracking-wide">Your Rank</p>
              <h3 className="text-2xl font-bold text-neutral-900">-</h3>
              <p className="text-sm text-neutral-600">{currentUser?.name || 'Current user'}</p>
            </div>
          </div>

          {/* Stats row — 4 equal columns */}
          <div className="grid grid-cols-4 gap-2 sm:gap-6">
            <div className="bg-neutral-50 rounded-xl p-2 sm:p-3 text-center">
              <p className="text-[10px] sm:text-xs text-neutral-500 mb-1">Points</p>
              <p className="font-mono font-bold text-sm sm:text-base text-neutral-900">0</p>
            </div>
            <div className="bg-neutral-50 rounded-xl p-2 sm:p-3 text-center">
              <p className="text-[10px] sm:text-xs text-neutral-500 mb-1">Solved</p>
              <p className="font-mono font-bold text-sm sm:text-base text-neutral-900">0</p>
            </div>
            <div className="bg-neutral-50 rounded-xl p-2 sm:p-3 text-center">
              <p className="text-[10px] sm:text-xs text-neutral-500 mb-1">Streak</p>
              <div className="flex items-center justify-center gap-1">
                <Flame className="w-3 h-3 sm:w-4 sm:h-4" style={{ color: 'var(--color-warning)' }} />
                <p className="font-mono font-bold text-sm sm:text-base text-neutral-900">0</p>
              </div>
            </div>
            <div className="bg-neutral-50 rounded-xl p-2 sm:p-3 text-center">
              <p className="text-[10px] sm:text-xs text-neutral-500 mb-1">Badges</p>
              <p className="font-mono font-bold text-sm sm:text-base text-neutral-900">0</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Main content grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">

        {/* Rankings card */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-0">
            <CardTitle>Rankings</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="global">
              <TabsList className="mb-4 w-full sm:w-auto">
                <TabsTrigger value="global" className="flex-1 sm:flex-none">Global</TabsTrigger>
                <TabsTrigger value="weekly" className="flex-1 sm:flex-none">This Week</TabsTrigger>
                <TabsTrigger value="batch" className="flex-1 sm:flex-none">My Batch</TabsTrigger>
              </TabsList>

              {/* Global tab */}
              <TabsContent value="global" className="space-y-2">
                {globalLeaderboard.map((user, index) => (
                  <div
                    key={user.rank}
                    className={`rounded-xl p-3 sm:p-4 transition-colors ${
                      user.rank <= 3
                        ? 'bg-gradient-to-r from-yellow-50 to-transparent border border-yellow-200'
                        : index === 2
                        ? 'bg-purple-50 border border-purple-200'
                        : 'bg-neutral-50 hover:bg-neutral-100'
                    }`}
                  >
                    {/* Mobile layout */}
                    <div className="flex items-center gap-3 sm:hidden">
                      {/* Rank icon */}
                      <div className="w-7 flex justify-center shrink-0">
                        {getRankIcon(user.rank)}
                      </div>
                      {/* Avatar */}
                      <Avatar className="w-8 h-8 shrink-0">
                        <AvatarFallback className="text-xs" style={{
                          backgroundColor: user.rank <= 3 ? 'var(--color-primary)' : '#e5e5e5',
                          color: user.rank <= 3 ? 'white' : '#525252',
                        }}>
                          {user.name.split(' ').map((n: string) => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      {/* Name + stats */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-semibold text-sm text-neutral-900 truncate">{user.name}</p>
                          {index === 2 && <Badge variant="outline" className="text-[10px] px-1.5 py-0">You</Badge>}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-neutral-500">
                          <span>✓ {user.solved}</span>
                          <span>🔥 {user.streak}d</span>
                          <span>🏅 {user.badges}</span>
                        </div>
                      </div>
                      {/* Points */}
                      <div className="text-right shrink-0">
                        <p className="font-mono font-bold text-sm text-neutral-900">{user.points.toLocaleString()}</p>
                        <p className="text-[10px] text-neutral-400">pts</p>
                      </div>
                    </div>

                    {/* Desktop layout */}
                    <div className="hidden sm:flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-10 flex justify-center">
                          {getRankIcon(user.rank)}
                        </div>
                        <Avatar>
                          <AvatarFallback style={{
                            backgroundColor: user.rank <= 3 ? 'var(--color-primary)' : 'var(--color-neutral-200)',
                            color: user.rank <= 3 ? 'white' : 'var(--color-neutral-700)',
                          }}>
                            {user.name.split(' ').map((n: string) => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{user.name}</p>
                            {index === 2 && <Badge variant="outline">You</Badge>}
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm text-neutral-600">
                            <div className="flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />{user.solved} solved
                            </div>
                            <div className="flex items-center gap-1">
                              <Flame className="w-3 h-3" />{user.streak} day streak
                            </div>
                            <div className="flex items-center gap-1">
                              <Award className="w-3 h-3" />{user.badges} badges
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="font-mono">{user.points.toLocaleString()}</p>
                          <p className="text-xs text-neutral-600">points</p>
                        </div>
                        {user.change !== 0 && (
                          <div className={`flex items-center gap-1 ${user.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            <TrendingUp className={`w-4 h-4 ${user.change < 0 ? 'rotate-180' : ''}`} />
                            <span className="text-sm">{Math.abs(user.change)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </TabsContent>

              {/* Weekly tab */}
              <TabsContent value="weekly" className="space-y-2">
                {weeklyLeaderboard.map((user) => (
                  <div
                    key={user.rank}
                    className="flex items-center justify-between p-3 sm:p-4 rounded-xl bg-neutral-50 hover:bg-neutral-100"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 sm:w-10 flex justify-center shrink-0">
                        {getRankIcon(user.rank)}
                      </div>
                      <Avatar className="w-8 h-8 sm:w-10 sm:h-10">
                        <AvatarFallback style={{ backgroundColor: 'var(--color-secondary)', color: 'white' }}>
                          {user.name.split(' ').map((n: string) => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm sm:text-base">{user.name}</p>
                        <p className="text-xs text-neutral-500">{user.solved} problems this week</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4">
                      <p className="font-mono text-sm font-bold">{user.points} pts</p>
                      {user.change === 'new' && <Badge className="bg-green-100 text-green-700 text-[10px]">New</Badge>}
                      {user.change === 'up' && <TrendingUp className="w-4 h-4 text-green-600" />}
                      {user.change === 'down' && <TrendingUp className="w-4 h-4 text-red-600 rotate-180" />}
                    </div>
                  </div>
                ))}
              </TabsContent>

              {/* Batch tab */}
              <TabsContent value="batch">
                <p className="text-sm text-neutral-600 text-center py-8">Batch leaderboard coming soon</p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* ── Right column: Achievements + Progress ── */}
        <div className="space-y-4 sm:space-y-6">

          {/* Achievements */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base sm:text-lg">Achievements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 sm:space-y-3">
              {achievementBadges.map((badge) => (
                <div
                  key={badge.name}
                  className="p-2.5 sm:p-3 rounded-lg border border-neutral-200 hover:border-neutral-300 transition-colors"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="text-xl sm:text-2xl shrink-0">{badge.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                        <p className="text-sm font-medium">{badge.name}</p>
                        <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${getRarityColor(badge.rarity)}`}>
                          {badge.rarity}
                        </Badge>
                      </div>
                      <p className="text-xs text-neutral-500 leading-relaxed">{badge.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Progress This Month */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base sm:text-lg">Progress This Month</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-neutral-600">Problems Solved</span>
                  <span className="font-mono font-medium">8 / 15</span>
                </div>
                <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: '53%', backgroundColor: 'var(--color-primary)' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-neutral-600">Learning Hours</span>
                  <span className="font-mono font-medium">24 / 40</span>
                </div>
                <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: '60%', backgroundColor: 'var(--color-secondary)' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-neutral-600">Streak Goal</span>
                  <span className="font-mono font-medium">7 / 30</span>
                </div>
                <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: '23%', backgroundColor: 'var(--color-warning)' }} />
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
