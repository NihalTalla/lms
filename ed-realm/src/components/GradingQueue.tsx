import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Filter,
  Calendar,
  FileCode,
  Eye,
  ThumbsUp,
  ThumbsDown,
  MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';

interface GradingQueueProps {
  onNavigate: (page: string, data?: any) => void;
}

export function GradingQueue({ onNavigate }: GradingQueueProps) {
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [feedbackText, setFeedbackText] = useState('');
  const [scoreValue, setScoreValue] = useState('');

  const pendingSubmissions: any[] = [];

  const gradedSubmissions: any[] = [];

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'var(--color-accent)';
      case 'medium': return 'var(--color-warning)';
      case 'hard': return 'var(--color-danger)';
      default: return 'var(--color-neutral)';
    }
  };

  const handleGradeSubmission = (submission: any, status: 'accept' | 'reject') => {
    if (status === 'accept') {
      if (!scoreValue) {
        toast.error('Please enter a score');
        return;
      }
      toast.success(`Submission accepted! Score: ${scoreValue}/100`);
    } else {
      toast.warning(`Revision requested for ${submission.student}`);
    }
    setSelectedSubmission(null);
    setFeedbackText('');
    setScoreValue('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2>Grading Queue</h2>
        <p className="text-neutral-600 mt-1">
          Review and grade student submissions
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600">Pending</p>
                <h3 className="mt-1">{pendingSubmissions.length}</h3>
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
                <Clock className="w-5 h-5" style={{ color: 'var(--color-warning)' }} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600">Graded Today</p>
                <h3 className="mt-1">18</h3>
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
                <CheckCircle2 className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600">Avg. Time</p>
                <h3 className="mt-1">12m</h3>
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(124, 58, 237, 0.1)' }}>
                <Calendar className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600">Pass Rate</p>
                <h3 className="mt-1">82%</h3>
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(20, 184, 166, 0.1)' }}>
                <FileCode className="w-5 h-5" style={{ color: 'var(--color-secondary)' }} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending" className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="pending">
              Pending ({pendingSubmissions.length})
            </TabsTrigger>
            <TabsTrigger value="graded">
              Graded ({gradedSubmissions.length})
            </TabsTrigger>
          </TabsList>

          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <Input
                placeholder="Search submissions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value="pending" className="space-y-4">
          {!selectedSubmission ? (
            <div className="grid gap-4">
              {pendingSubmissions.map((submission) => (
                <Card key={submission.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-4 flex-1">
                        <Avatar className="w-12 h-12">
                          <AvatarFallback style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
                            {submission.student.split(' ').map((n: string) => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm">{submission.student}</h4>
                            <Badge variant="outline" style={{ borderColor: getDifficultyColor(submission.difficulty), color: getDifficultyColor(submission.difficulty) }}>
                              {submission.difficulty}
                            </Badge>
                          </div>
                          <p className="text-sm text-neutral-600 mb-2">{submission.problem}</p>
                          
                          <div className="flex items-center gap-4 text-xs text-neutral-500">
                            <div className="flex items-center gap-1">
                              <FileCode className="w-3 h-3" />
                              {submission.language}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {submission.timeAgo}
                            </div>
                            <div className="flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              {submission.testCasesPassed}/{submission.totalTestCases} tests passed
                            </div>
                          </div>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        style={{ backgroundColor: 'var(--color-primary)' }}
                        onClick={() => setSelectedSubmission(submission)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Review
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Review Submission</CardTitle>
                    <p className="text-sm text-neutral-600 mt-1">
                      {selectedSubmission.student} • {selectedSubmission.problem}
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => setSelectedSubmission(null)}>
                    Back to Queue
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Submission Details */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-neutral-50 rounded-lg">
                  <div>
                    <p className="text-xs text-neutral-600">Language</p>
                    <p className="text-sm font-medium">{selectedSubmission.language}</p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-600">Difficulty</p>
                    <Badge variant="outline" style={{ borderColor: getDifficultyColor(selectedSubmission.difficulty), color: getDifficultyColor(selectedSubmission.difficulty) }}>
                      {selectedSubmission.difficulty}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-600">Test Cases</p>
                    <p className="text-sm font-medium">
                      {selectedSubmission.testCasesPassed}/{selectedSubmission.totalTestCases}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-600">Submitted</p>
                    <p className="text-sm font-medium">{selectedSubmission.timeAgo}</p>
                  </div>
                </div>

                {/* Code */}
                <div>
                  <h4 className="text-sm mb-2">Submitted Code</h4>
                  <div className="bg-neutral-900 text-neutral-100 p-4 rounded-lg overflow-x-auto">
                    <pre className="text-xs" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                      {selectedSubmission.code}
                    </pre>
                  </div>
                </div>

{/* Feedback Form */}
                  <div>
                    <h4 className="text-sm mb-2">Feedback</h4>
                    <Textarea
                      placeholder="Provide detailed feedback on the code quality, efficiency, and best practices..."
                      rows={4}
                      className="resize-none"
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                    />
                  </div>

                  {/* Grade Input */}
                  <div>
                    <h4 className="text-sm mb-2">Score</h4>
                    <Input 
                      type="number" 
                      min="0" 
                      max="100" 
                      placeholder="Enter score (0-100)" 
                      className="w-32"
                      value={scoreValue}
                      onChange={(e) => setScoreValue(e.target.value)} 
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <Button
                      className="flex-1"
                      style={{ backgroundColor: 'var(--color-accent)' }}
                      onClick={() => handleGradeSubmission(selectedSubmission, 'accept')}
                    >
                      <ThumbsUp className="w-4 h-4 mr-2" />
                      Accept & Grade
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}
                      onClick={() => handleGradeSubmission(selectedSubmission, 'reject')}
                    >
                      <ThumbsDown className="w-4 h-4 mr-2" />
                      Request Revision
                    </Button>
                    <Button variant="outline" onClick={() => setMessageDialogOpen(true)}>
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Message Student
                    </Button>
                  </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="graded" className="space-y-4">
          <div className="grid gap-4">
            {gradedSubmissions.map((submission) => (
              <Card key={submission.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex gap-4 flex-1">
                      <Avatar className="w-12 h-12">
                        <AvatarFallback style={{ backgroundColor: 'var(--color-secondary)', color: 'white' }}>
                          {submission.student.split(' ').map((n: string) => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm">{submission.student}</h4>
                          <Badge className="bg-green-100 text-green-700">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Graded
                          </Badge>
                        </div>
                        <p className="text-sm text-neutral-600 mb-2">{submission.problem}</p>
                        <p className="text-xs text-neutral-500 mb-2">{submission.feedback}</p>
                        
                        <div className="flex items-center gap-4 text-xs text-neutral-500">
                          <div className="flex items-center gap-1">
                            <FileCode className="w-3 h-3" />
                            {submission.language}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Graded: {submission.gradedAt}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div 
                        className="text-2xl font-semibold mb-1"
                        style={{ color: 'var(--color-accent)' }}
                      >
                        {submission.score}
                      </div>
                      <p className="text-xs text-neutral-500">out of 100</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
</TabsContent>
        </Tabs>

        {/* Message Student Dialog */}
        <Dialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Message Student</DialogTitle>
              <DialogDescription>
                Send a message to {selectedSubmission?.student}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea 
                  placeholder="Type your message..." 
                  rows={4}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  className="flex-1" 
                  style={{ backgroundColor: 'var(--color-primary)' }}
                  onClick={() => {
                    if (!messageText) {
                      toast.error('Please enter a message');
                      return;
                    }
                    toast.success(`Message sent to ${selectedSubmission?.student}`);
                    setMessageDialogOpen(false);
                    setMessageText('');
                  }}
                >
                  Send Message
                </Button>
                <Button variant="outline" onClick={() => setMessageDialogOpen(false)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

