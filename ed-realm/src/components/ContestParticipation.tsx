import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { Textarea } from './ui/textarea';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Alert, AlertDescription } from './ui/alert';
import {
  Clock,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Minimize2,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  GripHorizontal,
  List,
  Play,
  Trophy,
} from 'lucide-react';
import { toast } from 'sonner';
import { EdRealmLogo } from './EdRealmLogo';

interface Question {
  id: string;
  type: 'coding' | 'mcq';
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
  examples?: { input: string; output: string; explanation?: string }[];
  options?: string[];
  correctOption?: number;
}

interface ContestParticipationProps {
  contest?: {
    id: string;
    title: string;
    duration: number; // minutes
    questions: Question[];
  };
  onSubmit: (answers: Record<string, string>) => void;
  onExit: () => void;
}

export function ContestParticipation({ contest, onSubmit, onExit }: ContestParticipationProps) {
  const questions: Question[] = contest?.questions ?? [];
  const contestTitle = contest?.title || 'Contest';
  const contestDuration = contest?.duration ?? 0;

  // --- STATE ---
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeRemaining, setTimeRemaining] = useState(contestDuration * 60);

  // Resizable State
  const [leftPanelWidth, setLeftPanelWidth] = useState(33.33); // Percentage
  const [bottomPanelHeight, setBottomPanelHeight] = useState(250); // Pixels for test cases
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingBottom, setIsResizingBottom] = useState(false);

  // Monitoring
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [cameraMinimized, setCameraMinimized] = useState(false);
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const [warningCount, setWarningCount] = useState(0);
  const [warningMessage, setWarningMessage] = useState('');

  // Dialogs
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);

  // Progress
  const [score, setScore] = useState(0);
  const [submittedQuestions, setSubmittedQuestions] = useState<Set<string>>(new Set());

  // Camera Dragging
  const [cameraPosition, setCameraPosition] = useState({
    x: typeof window !== 'undefined' ? window.innerWidth - 240 : 20,
    y: 80
  });
  const [isDraggingCamera, setIsDraggingCamera] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleResize = () => {
      setCameraPosition(prev => ({
        x: Math.min(prev.x, window.innerWidth - 240),
        y: Math.min(prev.y, window.innerHeight - 140)
      }));
    };
    setCameraPosition({ x: window.innerWidth - 240, y: 80 });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentQuestion = questions[currentQuestionIndex] ?? {
    id: '',
    type: 'mcq' as const,
    title: 'No questions available',
    description: 'This contest does not have published questions yet.',
    difficulty: 'easy' as const,
    points: 0,
    options: [],
  };
  const isCoding = currentQuestion && currentQuestion.type === 'coding';

  // --- RESIZE LOGIC ---
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isResizingLeft) {
      const newWidth = (e.clientX / window.innerWidth) * 100;
      if (newWidth > 20 && newWidth < 80) setLeftPanelWidth(newWidth);
    }
    if (isResizingBottom) {
      const newHeight = window.innerHeight - e.clientY;
      if (newHeight > 100 && newHeight < 600) setBottomPanelHeight(newHeight);
    }
    if (isDraggingCamera) {
      setCameraPosition({
        x: Math.max(0, Math.min(window.innerWidth - 200, e.clientX - dragOffset.x)),
        y: Math.max(0, Math.min(window.innerHeight - 160, e.clientY - dragOffset.y)),
      });
    }
  }, [isResizingLeft, isResizingBottom, isDraggingCamera, dragOffset]);

  const handleMouseUp = useCallback(() => {
    setIsResizingLeft(false);
    setIsResizingBottom(false);
    setIsDraggingCamera(false);
  }, []);

  const startDraggingCamera = (e: React.MouseEvent) => {
    setIsDraggingCamera(true);
    setDragOffset({ x: e.clientX - cameraPosition.x, y: e.clientY - cameraPosition.y });
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // --- CAMERA INIT ---
  useEffect(() => {
    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        mediaStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Camera access error:', error);
      }
    };
    initCamera();
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // --- TIMER ---
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleFinalSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // --- TAB VISIBILITY ---
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        const newCount = warningCount + 1;
        setWarningCount(newCount);
        setWarningMessage('You switched tabs! This activity has been recorded.');
        setShowWarningDialog(true);
        if (newCount >= 3) {
          toast.error('Maximum warnings reached. Your test will be submitted.');
          handleFinalSubmit();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [warningCount]);

  // --- HELPERS ---
  const toggleVideo = () => {
    if (mediaStreamRef.current) {
      const videoTrack = mediaStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
        if (!videoTrack.enabled) {
          setWarningCount(c => c + 1);
          setWarningMessage('Camera was turned off. Please keep your camera on during the contest.');
          setShowWarningDialog(true);
        }
      }
    }
  };

  const toggleMic = () => {
    if (mediaStreamRef.current) {
      const audioTrack = mediaStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicEnabled(audioTrack.enabled);
      }
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "00:00:00";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleQuestionSubmit = () => {
    if (!answers[currentQuestion.id]) {
      toast.error('Please attempt the question first');
      return;
    }
    const earnedPoints = currentQuestion.type === 'mcq' && currentQuestion.correctOption !== undefined
      ? (answers[currentQuestion.id] === String(currentQuestion.correctOption) ? currentQuestion.points : 0)
      : 0;
    setScore(prev => prev + earnedPoints);
    setSubmittedQuestions(prev => new Set([...prev, currentQuestion.id]));
    toast.success('Response Submitted');
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      setShowSubmitDialog(true);
    }
  };

  const handleFinalSubmit = () => {
    onSubmit(answers);
    toast.success('Contest completed!');
  };

  return (
    <div ref={containerRef} className="fixed inset-0 z-50 w-screen h-screen bg-white text-neutral-900 flex flex-col font-sans overflow-hidden">

      {/* WARNING DIALOGS */}
      <Dialog open={showWarningDialog} onOpenChange={setShowWarningDialog}>
        <DialogContent className="bg-white border-2 border-black max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="w-5 h-5" />
              Warning ({warningCount}/3)
            </DialogTitle>
            <DialogDescription>{warningMessage}</DialogDescription>
          </DialogHeader>
          <DialogFooter><Button onClick={() => setShowWarningDialog(false)} className="bg-black text-white w-full">I Understand</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <DialogContent className="bg-white border-2 border-black max-w-md">
          <DialogHeader><DialogTitle>Exit Contest?</DialogTitle></DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowExitDialog(false)}>Stay</Button>
            <Button onClick={onExit} className="bg-black text-white">Exit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent className="bg-white border-2 border-black max-w-md">
          <DialogHeader><DialogTitle>Submit All?</DialogTitle></DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>Review</Button>
            <Button onClick={handleFinalSubmit} className="bg-green-600 text-white hover:bg-green-700">Finish Contest</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* HEADER */}
      <header className="h-16 bg-white border-b border-neutral-200 px-6 flex items-center justify-between shrink-0 z-50">
        <div className="flex items-center gap-4">
          <EdRealmLogo size="small" />
          <h1 className="font-bold text-lg">{contestTitle}</h1>
          <div className="h-6 w-px bg-neutral-200 mx-2" />
          <Badge variant="secondary" className="bg-neutral-100 text-neutral-600 border-none font-medium">Question {currentQuestionIndex + 1} / {questions.length}</Badge>
        </div>

        <div className="flex items-center gap-6">
          {/* Points */}
          <div className="flex items-center gap-2 bg-neutral-50 px-3 py-1.5 rounded-md border border-neutral-100">
            <Trophy className="w-4 h-4 text-orange-500" />
            <span className="font-bold text-neutral-900">{score}</span>
            <span className="text-xs text-neutral-500">pts</span>
          </div>
          {/* Timer */}
          <div className={`flex items-center gap-2 font-mono font-bold text-lg ${timeRemaining < 300 ? 'text-red-500 animate-pulse' : 'text-neutral-900'}`}>
            <Clock className="w-4 h-4" />
            {formatTime(timeRemaining)}
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowExitDialog(true)} className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 font-bold">Exit</Button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex overflow-hidden relative" onMouseUp={handleMouseUp} onMouseMove={(e) => handleMouseMove(e as any)}>

        {/* SIDEBAR - Only for MCQ */}
        {!isCoding && (
          <aside className="w-64 bg-neutral-50 border-r border-neutral-200 flex flex-col shrink-0">
            <div className="p-4 border-b border-neutral-200">
              <h3 className="font-bold text-neutral-500 text-xs uppercase tracking-widest flex items-center gap-2"><List className="w-4 h-4" /> Questions</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {questions.map((q, idx) => (
                <button
                  key={q.id}
                  onClick={() => setCurrentQuestionIndex(idx)}
                  className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center justify-between group ${currentQuestionIndex === idx ? 'bg-white text-neutral-900 shadow-sm ring-1 ring-neutral-200' : 'text-neutral-500 hover:bg-neutral-100'
                    }`}
                >
                  <span className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${currentQuestionIndex === idx ? 'bg-black text-white' : 'bg-neutral-200 text-neutral-500'}`}>{idx + 1}</span>
                    <span className="truncate w-32">{q.type === 'coding' ? 'Code' : 'MCQ'}</span>
                  </span>
                  {submittedQuestions.has(q.id) && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                </button>
              ))}
            </div>
          </aside>
        )}

        {/* CONTENT */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#F8F9FA] relative">
          {/* MCQ LAYOUT */}
          {!isCoding && (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto p-12">
                <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <Badge className="bg-neutral-900 text-white px-4 py-1 font-bold text-xs uppercase tracking-wider">{currentQuestion.difficulty}</Badge>
                      <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 rounded-full border border-amber-100">
                        <Trophy className="w-3.5 h-3.5 text-amber-600" />
                        <span className="text-amber-800 text-xs font-black uppercase tracking-widest">{currentQuestion.points} Points</span>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h2 className="text-4xl font-black text-neutral-900 leading-tight tracking-tight">{currentQuestion.title}</h2>
                      <div className="p-1 px-4 border-l-4 border-neutral-200 bg-neutral-50/50">
                        <p className="text-xl text-neutral-600 leading-relaxed font-medium">{currentQuestion.description}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <RadioGroup
                      value={answers[currentQuestion.id] || ''}
                      onValueChange={(val) => setAnswers({ ...answers, [currentQuestion.id]: val })}
                      className="space-y-4"
                    >
                      {currentQuestion.options?.map((opt, idx) => {
                        const isSelected = answers[currentQuestion.id] === opt;
                        return (
                          <div
                            key={idx}
                            onClick={() => setAnswers({ ...answers, [currentQuestion.id]: opt })}
                            className={`flex items-center space-x-2 border-2 rounded-[2rem] p-6 transition-all cursor-pointer group hover:shadow-lg ${isSelected ? 'border-neutral-900 bg-neutral-900 text-white ring-4 ring-neutral-100' : 'border-neutral-100 bg-white hover:border-neutral-200'}`}
                          >
                            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${isSelected ? 'border-white bg-white text-neutral-900' : 'border-neutral-200 group-hover:border-neutral-400'}`}>
                              <span className="text-xs font-black">{String.fromCharCode(65 + idx)}</span>
                            </div>
                            <Label htmlFor={`opt-${idx}`} className={`flex-1 cursor-pointer font-bold text-xl ml-4 pointer-events-none ${isSelected ? 'text-white' : 'text-neutral-700'}`}>{opt}</Label>
                            {isSelected && <CheckCircle2 className="w-6 h-6 text-white ml-2 animate-in zoom-in duration-300" />}
                          </div>
                        );
                      })}
                    </RadioGroup>
                  </div>
                </div>
              </div>

              {/* Fixed Footer for MCQ */}
              <footer className="h-24 border-t border-neutral-100 bg-white px-12 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                  <span className="text-xs font-black text-neutral-400 uppercase tracking-widest">Question {currentQuestionIndex + 1} of {questions.length}</span>
                </div>
                <div className="flex items-center gap-4">
           <button
  onClick={handleQuestionSubmit}
  disabled={submittedQuestions.has(currentQuestion.id)}
  className={`h-14 px-10 rounded-2xl font-black text-base shadow-xl transition-all active:scale-95
    ${
      submittedQuestions.has(currentQuestion.id)
        ? 'bg-green-100 text-green-700'
        : answers[currentQuestion.id]
        ? 'bg-black text-white hover:bg-neutral-800'
        : 'bg-gray-300 text-gray-600 cursor-not-allowed'
    }
  `}
>
  {submittedQuestions.has(currentQuestion.id) ? 'Submitted' : 'Submit Answer'}
</button>
                  <Button
                    onClick={handleNext}
                    disabled={!submittedQuestions.has(currentQuestion.id) && currentQuestionIndex === questions.length - 1}
                    className="h-14 px-10 rounded-2xl font-black text-base flex items-center gap-3 shadow-xl transition-all active:scale-95 bg-white border-2 border-neutral-900 text-neutral-900 hover:bg-neutral-50"
                  >
                    {currentQuestionIndex < questions.length - 1 ? (
                      <>Next Question <ChevronRight className="w-5 h-5" /></>
                    ) : (
                      <>Finish Contest <Trophy className="w-5 h-5" /></>
                    )}
                  </Button>
                </div>
              </footer>
            </div>
          )}

          {/* CODING LAYOUT (Split 1/3 - 2/3) */}
          {isCoding && (
            <div className="flex-1 flex overflow-hidden">
              {/* LEFT: Problem (Resizable) */}
              <div style={{ width: `${leftPanelWidth}%` }} className="bg-white border-r border-neutral-200 overflow-y-auto flex flex-col min-w-[300px] relative shrink-0 shadow-[10px_0_30px_rgba(0,0,0,0.02)]">
                {/* Drag Handle */}
                <div
                  onMouseDown={() => setIsResizingLeft(true)}
                  className="absolute right-0 top-0 bottom-0 w-1.5 bg-transparent hover:bg-blue-500 cursor-col-resize z-20 group"
                >
                  <div className="w-0.5 h-full bg-neutral-100 group-hover:bg-blue-500 transition-colors mx-auto" />
                </div>

                <div className="flex-1 p-8 space-y-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Badge className="bg-neutral-900 text-white px-3 py-1 font-bold text-[10px] uppercase tracking-wider">{currentQuestion.difficulty}</Badge>
                      <div className="flex items-center gap-2 px-2.5 py-0.5 bg-neutral-100 rounded-full border border-neutral-200">
                        <Trophy className="w-3 h-3 text-amber-600" />
                        <span className="text-neutral-600 text-[10px] font-black uppercase tracking-widest">{currentQuestion.points} Points</span>
                      </div>
                    </div>
                    <h2 className="text-3xl font-black text-neutral-900 leading-tight tracking-tight">{currentQuestion.title}</h2>
                  </div>

                  <div className="prose prose-neutral max-w-none">
                    <div className="bg-neutral-50/50 rounded-2xl p-6 border border-neutral-100 leading-relaxed text-neutral-600 font-medium whitespace-pre-wrap">
                      {currentQuestion.description}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest pl-1">Examples</h3>
                    {currentQuestion.examples?.map((ex, i) => (
                      <div key={i} className="bg-white rounded-2xl p-5 border border-neutral-200 shadow-sm space-y-3 group hover:border-neutral-300 transition-all">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded bg-neutral-900 text-white flex items-center justify-center text-[10px] font-bold">{i + 1}</div>
                          <p className="font-bold text-neutral-900 text-xs uppercase tracking-wider">Example Instance</p>
                        </div>
                        <div className="space-y-2 font-mono text-sm">
                          <div className="bg-neutral-50 p-2 rounded-lg border border-neutral-100"><span className="text-neutral-400 mr-2 uppercase text-[10px] font-bold">Input</span> <span className="text-neutral-800 font-bold">{ex.input}</span></div>
                          <div className="bg-green-50/50 p-2 rounded-lg border border-green-100/50"><span className="text-green-600 mr-2 uppercase text-[10px] font-bold">Output</span> <span className="text-green-800 font-bold">{ex.output}</span></div>
                        </div>
                        {ex.explanation && <p className="text-xs text-neutral-500 italic mt-2">{ex.explanation}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* RIGHT: Code + Tests */}
              <div className="flex-1 flex flex-col bg-[#0F0F0F] min-w-0">
                {/* Top: Editor Header */}
                <div className="h-12 bg-[#1A1A1A] flex items-center px-6 justify-between border-b border-white/5 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                    <span className="text-neutral-300 text-xs font-black tracking-widest uppercase">Solution.java</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant="outline" className="border-white/10 text-neutral-500 bg-white/5 text-[9px] font-bold uppercase tracking-widest py-0.5">Auto-Saved</Badge>
                  </div>
                </div>

                {/* Editor Content */}
                <div className="flex-1 relative min-h-0 bg-[#0F0F0F]">
                  <Textarea
                    value={answers[currentQuestion.id] || ''}
                    onChange={(e) => setAnswers({ ...answers, [currentQuestion.id]: e.target.value })}
                    className="w-full h-full bg-transparent text-neutral-300 font-mono text-[15px] p-8 border-none resize-none focus:ring-0 focus-visible:ring-0 leading-relaxed custom-scrollbar selection:bg-blue-500/30"
                    placeholder="// Implement your solution here..."
                    spellCheck={false}
                  />
                </div>

                {/* Resize Handle (Vertical) */}
                <div
                  onMouseDown={() => setIsResizingBottom(true)}
                  className="h-1.5 bg-[#1A1A1A] hover:bg-blue-500 cursor-row-resize shrink-0 z-20 transition-colors group flex items-center justify-center"
                >
                  <div className="w-12 h-0.5 bg-white/10 rounded-full group-hover:bg-white/40" />
                </div>

                {/* Bottom Panel: Tests & Console */}
                <div style={{ height: bottomPanelHeight }} className="bg-[#141414] border-t border-white/5 flex flex-col shrink-0">
                  <div className="h-12 bg-[#1A1A1A] flex items-center px-6 justify-between border-b border-white/5 shrink-0">
                    <div className="flex items-center gap-8">
                      <button className="text-[10px] font-black text-white uppercase tracking-widest border-b-2 border-blue-500 h-12 flex items-center transition-all hover:text-white">Test Cases</button>
                      <button className="text-[10px] font-black text-neutral-500 uppercase tracking-widest h-12 flex items-center transition-all hover:text-white">Console</button>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button variant="outline" size="sm" className="h-8 bg-transparent border-white/10 text-neutral-400 hover:text-white hover:bg-white/5 rounded-lg text-xs font-bold transition-all">
                        <Play className="w-3.5 h-3.5 mr-2" /> Run Code
                      </Button>
                      <Button
                        onClick={handleNext}
                        className="h-8 px-6 rounded-lg font-black text-xs uppercase tracking-widest shadow-xl transition-all active:scale-95 bg-white text-black hover:bg-neutral-200"
                      >
                        {currentQuestionIndex < questions.length - 1 ? 'Next' : 'Finish'}
                      </Button>
                    </div>
                  </div>

                  <div className="flex-1 p-8 overflow-y-auto custom-scrollbar-dark">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 text-neutral-500">
                        <div className="w-1.5 h-1.5 rounded-full bg-neutral-700" />
                        <span className="text-xs font-mono italic">Predictions and outputs will appear here after execution...</span>
                      </div>
                      <div className="font-mono text-sm text-neutral-400 opacity-60">
                        {'>'} Waiting for run...
                      </div>
                    </div>
                  </div>

                  {/* Submit Footer */}
                  <div className="p-6 border-t border-white/5 flex justify-between items-center bg-[#1A1A1A]">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-neutral-700" />
                        <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Test Progress: 0/2 Passed</span>
                      </div>
                    </div>
                    <Button
  onClick={handleQuestionSubmit}
  disabled={submittedQuestions.has(currentQuestion.id)}
 className={`h-14 px-10 rounded-2xl font-black text-base shadow-xl transition-all active:scale-95 ${submittedQuestions.has(currentQuestion.id) ? 'bg-green-100 text-green-700' : answers[currentQuestion.id] ? 'bg-neutral-900 text-white hover:bg-neutral-800' : 'bg-neutral-900 text-white opacity-50 cursor-not-allowed pointer-events-none'}`}
>
                      {submittedQuestions.has(currentQuestion.id) ? 'Submitted' : 'Final Submit'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}


        </main>
      </div>

      {/* CAMERA WIDGET - Floating & Draggable */}
      <div
        className={`fixed z-[100] transition-all duration-300 ${cameraMinimized ? 'w-16 h-16' : 'w-56'}`}
        style={{ left: cameraPosition.x, top: cameraPosition.y }}
      >
        <div className="bg-black/90 backdrop-blur-sm rounded-2xl overflow-hidden shadow-2xl border border-white/10">
          {!cameraMinimized && <div className="h-6 bg-white/10 cursor-move flex items-center justify-center" onMouseDown={startDraggingCamera}><GripHorizontal className="w-8 h-8 text-white/20" /></div>}
          <div className="relative aspect-video bg-neutral-900 group">
            {cameraMinimized ? (
              <button onClick={() => setCameraMinimized(false)} className="w-full h-full flex items-center justify-center text-white"><Video className="w-6 h-6" /></button>
            ) : (
              <>
                <video ref={videoRef} autoPlay muted playsInline className={`w-full h-full object-cover ${!isVideoEnabled && 'hidden'}`} />
                {!isVideoEnabled && <div className="absolute inset-0 flex items-center justify-center"><VideoOff className="w-8 h-8 text-neutral-500" /></div>}
                <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={toggleMic} className={`p-1.5 rounded-full ${isMicEnabled ? 'bg-white/20 text-white' : 'bg-red-500 text-white'}`}>{isMicEnabled ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}</button>
                  <button onClick={toggleVideo} className={`p-1.5 rounded-full ${isVideoEnabled ? 'bg-white/20 text-white' : 'bg-red-500 text-white'}`}>{isVideoEnabled ? <Video className="w-3 h-3" /> : <VideoOff className="w-3 h-3" />}</button>
                  <button onClick={() => setCameraMinimized(true)} className="p-1.5 rounded-full bg-white/20 text-white"><Minimize2 className="w-3 h-3" /></button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
