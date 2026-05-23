import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Video, Mic, Code2, AlertCircle, Check, X, Eye, EyeOff, ArrowLeft, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Avatar, AvatarFallback } from './ui/avatar';

interface StudentTestSession {
  id: string;
  studentName: string;
  studentId: string;
  avatar?: string;
  status: 'active' | 'paused' | 'completed';
  cameraStatus: 'on' | 'off' | 'interrupted';
  micStatus: 'on' | 'off' | 'interrupted';
  code: string;
  timeRemaining: number;
  progress: number;
  flags: string[];
}

interface TestMonitoringProps {
  testName: string;
  batch: string;
  onNavigate: (page: string, data?: any) => void;
  userRole: 'faculty' | 'trainer';
}

export function TestMonitoring({ testName, batch, onNavigate, userRole }: TestMonitoringProps) {
  const [sessions, setSessions] = useState<StudentTestSession[]>([]);

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const selectedSession = sessions.find(s => s.id === selectedSessionId);

  const handleFlagStudent = (sessionId: string, flag: string) => {
    setSessions(sessions.map(s =>
      s.id === sessionId
        ? { ...s, flags: [...s.flags, flag] }
        : s
    ));
    toast.success('Flag added for student');
  };

  const handleCameraToggle = (sessionId: string) => {
    setSessions(sessions.map(s =>
      s.id === sessionId
        ? { ...s, cameraStatus: s.cameraStatus === 'on' ? 'off' : 'on' }
        : s
    ));
  };

  const handleMicToggle = (sessionId: string) => {
    setSessions(sessions.map(s =>
      s.id === sessionId
        ? { ...s, micStatus: s.micStatus === 'on' ? 'off' : 'on' }
        : s
    ));
  };

  const handleEndSession = (sessionId: string) => {
    setSessions(sessions.map(s =>
      s.id === sessionId
        ? { ...s, status: 'completed' }
        : s
    ));
    toast.success('Session ended');
  };

  const flaggedStudents = sessions.filter(s => s.flags.length > 0).length;
  const activeCount = sessions.filter(s => s.status === 'active').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-0">
      {/* Header Bar */}
      <div className="sticky top-0 z-50 bg-white border-b border-neutral-200 shadow-sm">
        <div className="max-w-full px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onNavigate('dashboard')}
              className="text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-neutral-900">{testName}</h1>
              <p className="text-sm text-neutral-500">{batch}</p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span className="text-sm font-semibold text-neutral-900">{activeCount} Active</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <span className="text-sm font-semibold text-neutral-900">{flaggedStudents} Flagged</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Monitoring Layout */}
      <div className="flex gap-6 p-6 h-[calc(100vh-100px)] max-w-full">
        {/* Left Sidebar - Student List */}
        <div className="w-96 bg-white rounded-xl shadow-md border border-neutral-200 flex flex-col overflow-hidden">
          {/* Sidebar Header */}
          <div className="px-6 py-4 border-b border-neutral-200 bg-gradient-to-r from-slate-50 to-slate-100">
            <h2 className="font-bold text-neutral-900">Test Participants</h2>
            <p className="text-sm text-neutral-600 mt-1">{sessions.length} students</p>
          </div>

          {/* Student List */}
          <div className="flex-1 overflow-y-auto">
            {sessions.map(session => {
              const isSelected = selectedSessionId === session.id;
              const hasFlagged = session.flags.length > 0;

              return (
                <div
                  key={session.id}
                  onClick={() => setSelectedSessionId(session.id)}
                  className={`px-4 py-3 border-b border-neutral-200 cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-blue-50 border-l-4 border-l-blue-600'
                      : 'hover:bg-neutral-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar with Status Indicator */}
                    <div className="relative">
                      <Avatar className="w-10 h-10 rounded-full ring-2 ring-offset-2"
                        style={{
                          borderColor: session.status === 'active' ? '#10b981' : session.status === 'paused' ? '#f59e0b' : '#d1d5db',
                        }}
                      >
                        <AvatarFallback className="font-bold text-sm">
                          {session.studentName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white"
                        style={{
                          backgroundColor: session.status === 'active' ? '#10b981' : session.status === 'paused' ? '#f59e0b' : '#d1d5db',
                        }}
                      />
                    </div>

                    {/* Student Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-sm text-neutral-900 truncate">{session.studentName}</p>
                        {hasFlagged && (
                          <AlertTriangle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-neutral-500 mb-2">{session.studentId}</p>

                      {/* Quick Status Icons */}
                      <div className="flex items-center gap-2">
                        <div
                          className="w-1.5 h-1.5 rounded-full"
                          style={{
                            backgroundColor: session.cameraStatus === 'on' ? '#10b981' : session.cameraStatus === 'interrupted' ? '#f59e0b' : '#ef4444',
                          }}
                          title={`Camera: ${session.cameraStatus}`}
                        />
                        <div
                          className="w-1.5 h-1.5 rounded-full"
                          style={{
                            backgroundColor: session.micStatus === 'on' ? '#10b981' : session.micStatus === 'interrupted' ? '#f59e0b' : '#ef4444',
                          }}
                          title={`Mic: ${session.micStatus}`}
                        />
                        <span className="text-xs text-neutral-500 ml-auto font-semibold">
                          {session.progress}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Panel - Student Details */}
        <div className="flex-1 flex flex-col gap-6">
          {selectedSession ? (
            <>
              {/* Top Card - Student Info & Status */}
              <Card className="shadow-md border border-neutral-200 rounded-xl overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="w-14 h-14 ring-2 ring-white">
                        <AvatarFallback className="text-lg font-bold bg-blue-700">
                          {selectedSession.studentName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-bold text-lg">{selectedSession.studentName}</h3>
                        <p className="text-blue-100 text-sm">{selectedSession.studentId}</p>
                      </div>
                    </div>
                    <Badge
                      className={`text-sm font-semibold capitalize px-4 py-1 ${
                        selectedSession.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : selectedSession.status === 'paused'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-neutral-200 text-neutral-800'
                      }`}
                    >
                      {selectedSession.status}
                    </Badge>
                  </div>
                </div>

                <CardContent className="pt-6 grid grid-cols-3 gap-4">
                  {/* Camera Status Card */}
                  <div
                    className="p-4 rounded-lg border-2 transition-all"
                    style={{
                      borderColor: selectedSession.cameraStatus === 'on' ? '#10b981' : '#ef4444',
                      backgroundColor: selectedSession.cameraStatus === 'on' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="p-2 rounded-lg"
                        style={{
                          backgroundColor: selectedSession.cameraStatus === 'on' ? '#10b981' : '#ef4444',
                        }}
                      >
                        <Video className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-neutral-600 font-semibold">Camera</p>
                        <p className="text-sm font-bold capitalize" style={{
                          color: selectedSession.cameraStatus === 'on' ? '#10b981' : '#ef4444',
                        }}>
                          {selectedSession.cameraStatus}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Mic Status Card */}
                  <div
                    className="p-4 rounded-lg border-2 transition-all"
                    style={{
                      borderColor: selectedSession.micStatus === 'on' ? '#10b981' : '#ef4444',
                      backgroundColor: selectedSession.micStatus === 'on' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="p-2 rounded-lg"
                        style={{
                          backgroundColor: selectedSession.micStatus === 'on' ? '#10b981' : '#ef4444',
                        }}
                      >
                        <Mic className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-neutral-600 font-semibold">Microphone</p>
                        <p className="text-sm font-bold capitalize" style={{
                          color: selectedSession.micStatus === 'on' ? '#10b981' : '#ef4444',
                        }}>
                          {selectedSession.micStatus}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Time Remaining Card */}
                  <div
                    className="p-4 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-300"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-purple-600">
                        <Clock className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-neutral-600 font-semibold">Time Remaining</p>
                        <p className="text-sm font-bold text-purple-700">
                          {selectedSession.timeRemaining} min
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Progress Bar */}
              <div className="px-0">
                <div className="flex justify-between items-center mb-3">
                  <p className="text-sm font-semibold text-neutral-900">Test Progress</p>
                  <span className="text-sm font-bold text-blue-600">{selectedSession.progress}%</span>
                </div>
                <div className="w-full h-2.5 bg-neutral-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all rounded-full"
                    style={{ width: `${selectedSession.progress}%` }}
                  />
                </div>
              </div>

              {/* Code and Flags Section */}
              <Tabs defaultValue="code" className="flex-1 flex flex-col">
                <TabsList className="grid w-full grid-cols-2 bg-neutral-100 rounded-lg p-1 mb-4">
                  <TabsTrigger value="code" className="rounded-md data-[state=active]:bg-white">
                    <Code2 className="w-4 h-4 mr-2" />
                    Code
                  </TabsTrigger>
                  <TabsTrigger value="flags" className="rounded-md data-[state=active]:bg-white">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Flags ({selectedSession.flags.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="code" className="flex-1 flex flex-col m-0">
                  <Card className="flex-1 border border-neutral-200 rounded-xl overflow-hidden">
                    <div className="bg-neutral-950 text-neutral-50 p-4 font-mono text-xs leading-relaxed overflow-auto h-64 rounded-xl">
                      <pre className="whitespace-pre-wrap break-words">
                        <span className="text-green-400">{selectedSession.code || '// No code written yet'}</span>
                      </pre>
                    </div>
                  </Card>
                </TabsContent>

                <TabsContent value="flags" className="flex-1 flex flex-col m-0 gap-4">
                  {selectedSession.flags.length === 0 ? (
                    <div className="flex items-center justify-center h-32 bg-green-50 rounded-xl border-2 border-dashed border-green-300">
                      <div className="text-center">
                        <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                        <p className="text-green-800 font-semibold">No flags yet</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 overflow-y-auto">
                      {selectedSession.flags.map((flag, idx) => (
                        <div key={idx} className="p-4 bg-red-50 border-l-4 border-l-red-600 rounded-lg flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-red-800 font-medium">{flag}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Quick Flag Buttons */}
                  <div className="border-t border-neutral-200 pt-4 mt-auto">
                    <p className="text-xs font-bold text-neutral-700 mb-3 uppercase tracking-wide">Add Flag</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs font-medium border-red-300 text-red-700 hover:bg-red-50"
                        onClick={() => handleFlagStudent(selectedSession.id, 'Suspicious activity detected')}
                      >
                        Suspicious Activity
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs font-medium border-red-300 text-red-700 hover:bg-red-50"
                        onClick={() => handleFlagStudent(selectedSession.id, 'Multiple tabs opened')}
                      >
                        Multiple Tabs
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs font-medium border-red-300 text-red-700 hover:bg-red-50"
                        onClick={() => handleFlagStudent(selectedSession.id, 'Person off-screen')}
                      >
                        Off-Screen
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs font-medium border-red-300 text-red-700 hover:bg-red-50"
                        onClick={() => handleFlagStudent(selectedSession.id, 'Noise/Distraction')}
                      >
                        Noise
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-4">
                <Button
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg"
                  onClick={() => setSelectedSessionId(null)}
                >
                  Monitoring Active
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 border-red-300 text-red-700 hover:bg-red-50 font-semibold rounded-lg"
                  onClick={() => handleEndSession(selectedSession.id)}
                >
                  End Session
                </Button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full bg-white rounded-xl border-2 border-dashed border-neutral-300">
              <div className="text-center">
                <Eye className="w-12 h-12 text-neutral-400 mx-auto mb-3" />
                <p className="text-neutral-700 font-semibold">Select a student to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
