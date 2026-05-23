import React, { useState } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { Progress } from './ui/progress';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  ArrowRight,
  Code2,
  ChevronRight,
  FileText,
  Lock,
  ChevronLeft,
  Menu,
  Play,
  Trophy,
} from 'lucide-react';
import { Course, Topic } from '../lib/data';
import { toast } from 'sonner';
import { EdRealmLogo } from './EdRealmLogo';

interface StudentModuleViewProps {
  course: Course;
  selectedModule: Topic;
  onNavigate: (page: string, data?: any) => void;
  onBack: () => void;
}

type ContentType = 'content' | 'practice' | 'assignment';

interface MenuItem {
  id: string;
  title: string;
  duration: string;
  type: ContentType;
  locked: boolean;
  content?: {
    title: string;
    subtitle: string;
    points: string[];
    sections: { title: string; text: string; image?: string }[];
  };
  practice?: {
    outputs: string[];
  };
  assignment?: {
    topics: { title: string; questions: string; status: string; difficulty: string }[];
  };
}

export function StudentModuleView({ course, selectedModule, onNavigate, onBack }: StudentModuleViewProps) {
  const [activeItemId, setActiveItemId] = useState('intro');
  const [completedItems, setCompletedItems] = useState<string[]>([]);
  const [sidebarMinimized, setSidebarMinimized] = useState(false);
  const [isIterationsOpen, setIsIterationsOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const menuItems: MenuItem[] = [
    {
      id: 'intro',
      title: 'Java Programming Basics',
      duration: '5m',
      type: 'content',
      locked: false,
      content: {
        title: 'Java Programming Basics',
        subtitle: 'Iterations',
        points: ['Initialization', 'Condition (when to continue)', 'Post Expression (Step)', 'Block of code'],
        sections: [
          {
            title: 'For Loop',
            text: 'The for loop is used when you know how many times you want to execute the code block. For instance, if you want to execute a code block 10 times',
            image: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=800&auto=format&fit=crop&q=60',
          },
        ],
      },
    },
    {
      id: 'practice-1',
      title: 'Practice - Pattern Output',
      duration: '15m',
      type: 'practice',
      locked: false,
      practice: {
        outputs: [
          '*', '**', '***', '****', '*****',
          '1', '22', '333', '4444', '55555',
          '5', '44', '333', '2222', '11111',
          '5', '54', '543', '5432', '54321',
        ],
      },
    },
    {
      id: 'assign-1',
      title: 'Assignment – 1',
      duration: '1h 40m',
      type: 'assignment',
      locked: false,
      assignment: {
        topics: [
          { title: 'Series – Level 1', questions: '0/3 Completed', status: 'Not Started', difficulty: 'Easy' },
          { title: 'Series – Level 2', questions: '1/2 Completed', status: 'In Progress', difficulty: 'Medium' },
          { title: 'Series – Level 3', questions: '3/3 Completed', status: 'Submitted', difficulty: 'Hard' },
        ],
      },
    },
    { id: 'assign-2', title: 'Assignment – 2', duration: '1h 40m', type: 'assignment', locked: false },
    { id: 'assign-3', title: 'Assignment – 3', duration: '1h 40m', type: 'assignment', locked: false },
    { id: 'assign-4', title: 'Assignment – 4', duration: '1h 40m', type: 'assignment', locked: false },
    { id: 'assign-5', title: 'Assignment – 5', duration: '1h 40m', type: 'assignment', locked: false },
  ];

  const activeItem = menuItems.find(item => item.id === activeItemId) || menuItems[0];

  const handleNext = () => {
    const currentIndex = menuItems.findIndex(item => item.id === activeItemId);
    const currentId = menuItems[currentIndex].id;
    if (!completedItems.includes(currentId)) {
      setCompletedItems([...completedItems, currentId]);
    }
    if (currentIndex < menuItems.length - 1) {
      const nextItem = menuItems[currentIndex + 1];
      setActiveItemId(nextItem.id);
      toast.success(`Navigating to ${nextItem.title}`);
    } else {
      toast.success('Module Completed!');
    }
  };

  const isLocked = (item: MenuItem, index: number) => false;

  // Shared chapter list — used in both desktop and mobile
  const chapterList = (
    <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px' }}>
      <button
        onClick={() => setIsIterationsOpen(!isIterationsOpen)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderRadius: '12px',
          background: isIterationsOpen ? '#fafafa' : 'transparent',
          border: 'none',
          cursor: 'pointer',
          marginBottom: '4px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CheckCircle2 style={{ width: '20px', height: '20px', color: '#22c55e', flexShrink: 0 }} />
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#171717' }}>Iterations</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#a3a3a3', fontFamily: 'monospace' }}>
          <span>8h 25m</span>
          {isIterationsOpen
            ? <ChevronUp style={{ width: '12px', height: '12px' }} />
            : <ChevronDown style={{ width: '12px', height: '12px' }} />
          }
        </div>
      </button>

      {isIterationsOpen && (
        <div style={{ position: 'relative', paddingLeft: '16px' }}>
          <div style={{ position: 'absolute', left: '24px', top: '8px', bottom: '8px', width: '1px', backgroundColor: '#e5e5e5' }} />
          {menuItems.map((item) => {
            const locked = isLocked(item, 0);
            const isActive = activeItemId === item.id;
            return (
              <button
                key={item.id}
                disabled={locked}
                onClick={() => { setActiveItemId(item.id); setIsMobileSidebarOpen(false); }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  background: isActive ? '#fff7ed' : 'transparent',
                  border: 'none',
                  cursor: locked ? 'not-allowed' : 'pointer',
                  opacity: locked ? 0.4 : 1,
                  textAlign: 'left',
                  marginBottom: '2px',
                  position: 'relative',
                }}
              >
                <span style={{ marginTop: '2px', color: isActive ? '#ea580c' : '#a3a3a3', flexShrink: 0 }}>
                  {item.type === 'content' && <FileText style={{ width: '16px', height: '16px' }} />}
                  {item.type === 'practice' && <Code2 style={{ width: '16px', height: '16px' }} />}
                  {item.type === 'assignment' && (
                    locked
                      ? <Lock style={{ width: '16px', height: '16px' }} />
                      : <span style={{ fontSize: '12px', fontWeight: 900, fontFamily: 'monospace' }}>{'</>'}</span>
                  )}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '12px', fontWeight: 700, color: isActive ? '#7c2d12' : '#404040', lineHeight: 1.4, margin: 0 }}>
                    {item.title}
                  </p>
                  <p style={{ fontSize: '11px', color: isActive ? '#fb923c' : '#a3a3a3', marginTop: '3px', fontWeight: 500 }}>
                    {item.duration}
                  </p>
                </div>
                {isActive && (
                  <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#f97316' }} />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', height: '100vh', width: '100%', backgroundColor: 'white', overflow: 'hidden', fontFamily: 'sans-serif', color: '#171717' }}>

      {/* ── DESKTOP SIDEBAR — never shows on mobile ── */}
      <aside
        className="hidden md:flex"
        style={{
          width: sidebarMinimized ? '96px' : '320px',
          flexShrink: 0,
          flexDirection: 'column',
          backgroundColor: 'white',
          borderRight: '2px solid #f5f5f5',
          transition: 'width 0.3s ease',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Collapse toggle */}
        <button
          onClick={() => setSidebarMinimized(!sidebarMinimized)}
          style={{
            position: 'absolute',
            right: '-12px',
            top: '96px',
            width: '24px',
            height: '24px',
            backgroundColor: 'white',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid #d4d4d4',
            zIndex: 10,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            cursor: 'pointer',
          }}
        >
          {sidebarMinimized ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        {/* Logo + Back */}
        <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid #f5f5f5', flexShrink: 0 }}>
          {!sidebarMinimized ? <EdRealmLogo size="small" /> : (
            <div style={{ background: 'black', color: 'white', padding: '4px 8px', borderRadius: '6px', fontSize: '13px', fontWeight: 900, display: 'inline-block' }}>ED</div>
          )}
          {!sidebarMinimized && (
            <button
              onClick={onBack}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#737373', fontSize: '14px', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: '16px' }}
            >
              <ArrowLeft style={{ width: '16px', height: '16px' }} />
              Back to Modules
            </button>
          )}
        </div>

        {/* Course info */}
        {!sidebarMinimized && (
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #f5f5f5', flexShrink: 0 }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#171717', marginBottom: '10px', lineHeight: 1.4 }}>
              Problem-Solving with Iteration
            </h2>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#737373', marginBottom: '6px' }}>
              <span>1 Chapter</span><span>100%</span>
            </div>
            <div style={{ height: '6px', backgroundColor: '#f5f5f5', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: '100%', backgroundColor: '#171717', borderRadius: '3px' }} />
            </div>
          </div>
        )}

        {chapterList}
      </aside>

      {/* ── MOBILE DRAWER — never shows on desktop ── */}
      <div className="md:hidden">
        {/* Backdrop */}
        {isMobileSidebarOpen && (
          <div
            onClick={() => setIsMobileSidebarOpen(false)}
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 70 }}
          />
        )}
        {/* Drawer panel */}
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            bottom: 0,
            width: '300px',
            backgroundColor: 'white',
            zIndex: 80,
            display: 'flex',
            flexDirection: 'column',
            borderRight: '2px solid #f5f5f5',
            transform: isMobileSidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.3s ease',
            boxShadow: isMobileSidebarOpen ? '4px 0 24px rgba(0,0,0,0.15)' : 'none',
          }}
        >
          {/* Drawer header: logo + close */}
          <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #f5f5f5', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <EdRealmLogo size="small" />
              <button
                onClick={() => setIsMobileSidebarOpen(false)}
                style={{
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '8px',
                  background: '#f5f5f5',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#404040',
                }}
              >
                ✕
              </button>
            </div>
            <button
              onClick={() => { onBack(); setIsMobileSidebarOpen(false); }}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#737373', fontSize: '14px', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <ArrowLeft style={{ width: '16px', height: '16px' }} />
              Back to Modules
            </button>
          </div>

          {/* Course info */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f5f5f5', flexShrink: 0 }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#171717', marginBottom: '10px', lineHeight: 1.4 }}>
              Problem-Solving with Iteration
            </h2>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#737373', marginBottom: '6px' }}>
              <span>1 Chapter</span><span>100%</span>
            </div>
            <div style={{ height: '6px', backgroundColor: '#f5f5f5', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: '100%', backgroundColor: '#171717', borderRadius: '3px' }} />
            </div>
          </div>

          {chapterList}
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', backgroundColor: 'white' }}>

        {/* Mobile top bar */}
        <div
          className="md:hidden"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #f5f5f5', backgroundColor: 'white', flexShrink: 0 }}
        >
          <button
            onClick={onBack}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 500, color: '#525252', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <ArrowLeft style={{ width: '16px', height: '16px' }} />
            Back
          </button>

          <span style={{ fontSize: '14px', fontWeight: 600, color: '#171717', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>
            {selectedModule.title}
          </span>

          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <Menu style={{ width: '20px', height: '20px', color: '#404040' }} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', width: '100%' }}>
          <div style={{ width: '100%', maxWidth: '1400px', margin: '0 auto', padding: 'clamp(24px, 4vw, 48px) clamp(16px, 5vw, 64px)', display: 'flex', flexDirection: 'column', minHeight: '100%' }}>

            {/* Desktop breadcrumb */}
            <header className="hidden md:flex" style={{ marginBottom: '56px', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', fontWeight: 500, color: '#737373' }}>
                <button onClick={() => onNavigate('dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#737373', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
                  Dashboard
                </button>
                <ChevronRight style={{ width: '16px', height: '16px', color: '#d4d4d4' }} />
                <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#737373', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
                  {course.title}
                </button>
                <ChevronRight style={{ width: '16px', height: '16px', color: '#d4d4d4' }} />
                <span style={{ color: '#171717', fontWeight: 700 }}>{selectedModule.title}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#171717' }}>Sunday, Nov 30</div>
                <div style={{ fontSize: '14px', fontWeight: 500, color: '#a3a3a3' }}>11:55 PM</div>
              </div>
            </header>

            <div style={{ flex: 1 }}>

              {/* Content Type */}
              {activeItem.type === 'content' && activeItem.content && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-20 items-start">
                    <div className="space-y-12">
                      <div className="space-y-6">
                        <h2 className="text-3xl font-bold text-neutral-800 tracking-tight">{activeItem.content.subtitle}</h2>
                        <ul className="space-y-4">
                          {activeItem.content.points.map((p, i) => (
                            <li key={i} className="flex items-start gap-4 text-lg font-medium text-neutral-700 group">
                              <span className="text-neutral-300 font-mono text-sm mt-1 group-hover:text-red-500 transition-colors">0{i + 1}.</span>
                              {p}
                            </li>
                          ))}
                        </ul>
                      </div>
                      {activeItem.content.sections.map((sec, i) => (
                        <div key={i} className="space-y-6">
                          <h3 className="text-2xl font-bold text-neutral-900">{sec.title}</h3>
                          <p className="text-lg leading-loose text-neutral-600 font-medium text-justify">{sec.text}</p>
                          <div className="pt-4">
                            <h4 className="text-sm font-black text-neutral-900 uppercase tracking-widest mb-4">Syntax</h4>
                            <Card className="bg-neutral-900 border-none shadow-2xl overflow-hidden rounded-2xl">
                              <CardContent className="p-8 font-mono text-sm leading-[2.5] text-white/90">
                                <div>
                                  <span className="text-purple-400 font-bold">for</span> (
                                  <span className="text-yellow-300 mx-1">initialize [,initialize];</span>
                                  <span className="text-blue-300 mx-1 font-bold">condition;</span>
                                </div>
                                <div className="pl-12">
                                  <span className="text-green-300 mx-1">update[,update]</span> ) {'{'}
                                </div>
                                <div className="pl-20">
                                  <span className="text-neutral-400 italic">// code_block to be executed</span>
                                </div>
                                <div className="pl-8">{'}'}</div>
                              </CardContent>
                            </Card>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-8 sticky top-10">
                      {activeItem.content.sections.map((sec, i) => sec.image && (
                        <div key={i} className="rounded-2xl overflow-hidden shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] border-4 border-white transform hover:scale-[1.02] transition-transform duration-500">
                          <img src={sec.image} alt={sec.title} className="w-full h-auto object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Practice Type */}
              {activeItem.type === 'practice' && activeItem.practice && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    <div className="space-y-6">
                      <h2 className="text-2xl font-bold text-neutral-900">Pattern Output Practice</h2>
                      <p className="text-neutral-600 leading-relaxed">Analyze the code execution flow and predict the output.</p>
                    </div>
                    <div className="font-mono text-lg space-y-6 p-10 bg-neutral-900 rounded-[32px] min-h-[500px] border border-neutral-800 shadow-2xl text-green-400">
                      {activeItem.practice.outputs.map((line, i) => (
                        <div key={i} className="tracking-[0.2em] animate-in fade-in duration-700" style={{ transitionDelay: `${i * 50}ms` }}>
                          {line}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Assignment Type */}
              {activeItem.type === 'assignment' && activeItem.assignment && (
                <div className="animate-in fade-in slide-in-from-bottom-6 duration-1000 space-y-10">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h2 className="text-3xl font-black text-neutral-900 tracking-tight">{activeItem.title}</h2>
                      <p className="text-neutral-500 font-medium">Complete all topics to master this module.</p>
                    </div>
                    <div className="flex items-center gap-6 bg-white p-4 rounded-3xl border border-neutral-100 shadow-sm">
                      {(() => {
                        const topics = activeItem.assignment!.topics;
                        const allSubmitted = topics.every(t => t.status === 'Submitted');
                        const submittedCount = topics.filter(t => t.status === 'Submitted').length;
                        return (
                          <div className="flex items-center gap-4">
                            <div className="flex flex-col items-end">
                              <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Progress</span>
                              <span className="text-sm font-bold text-neutral-900">{submittedCount}/{topics.length} Done</span>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-neutral-50 flex items-center justify-center relative">
                              <span
                                className={`absolute inset-0 rounded-2xl border-2 transition-all ${allSubmitted ? 'border-green-500' : 'border-blue-500'}`}
                                style={{ clipPath: `inset(${100 - (submittedCount / topics.length) * 100}% 0 0 0)` }}
                              />
                              {allSubmitted ? <Trophy className="w-6 h-6 text-green-500" /> : <Play className="w-6 h-6 text-blue-500" />}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {activeItem.assignment.topics.map((t, i) => {
                      const navigateToChallenge = () => onNavigate('student-coding', {
                        challenge: {
                          id: `challenge-${i}`,
                          title: t.title,
                          question: t.title,
                          difficulty: t.difficulty,
                          description: 'Solve the following algorithmic problem to demonstrate your understanding of the concepts discussed in this module.',
                          examples: [{ id: 'ex-1', input: 'Sample Input 1', output: 'Expected Output 1' }],
                          testCases: [
                            { id: 'tc-1', input: 'Input 1', expectedOutput: 'Output 1', hidden: false },
                            { id: 'tc-2', input: 'Input 2', expectedOutput: 'Output 2', hidden: true },
                          ],
                        },
                        module: selectedModule,
                        course: course,
                      });
                      const isSubmitted = t.status === 'Submitted';
                      const isInProgress = t.status === 'In Progress';
                      return (
                        <div
                          key={i}
                          onClick={navigateToChallenge}
                          className="group relative bg-white border border-neutral-100 p-6 rounded-[2rem] hover:shadow-2xl hover:border-neutral-200 transition-all duration-500 cursor-pointer overflow-hidden"
                        >
                          <div className="absolute top-0 right-0 w-32 h-32 bg-neutral-50 rounded-full -mr-16 -mt-16 transition-all group-hover:scale-150 duration-700 opacity-50" />
                          <div className="flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-4 md:gap-6">
                              <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center text-xl font-black shadow-sm transition-all group-hover:scale-110 ${isSubmitted ? 'bg-green-50 text-green-600' : isInProgress ? 'bg-amber-50 text-amber-600' : 'bg-neutral-50 text-neutral-400'}`}>
                                {i + 1}
                              </div>
                              <div className="space-y-1">
                                <h4 className="text-base md:text-xl font-bold text-neutral-800 group-hover:text-neutral-900 transition-colors">{t.title}</h4>
                                <div className="flex items-center gap-3">
                                  <Badge variant="outline" className={`text-[9px] font-black uppercase tracking-widest px-2 py-0 border-none ${t.difficulty === 'Easy' ? 'text-green-500 bg-green-50' : t.difficulty === 'Medium' ? 'text-amber-500 bg-amber-50' : 'text-red-500 bg-red-50'}`}>
                                    {t.difficulty}
                                  </Badge>
                                  <span className="text-neutral-300">•</span>
                                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{t.questions} Questions</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 md:gap-8">
                              <div className="hidden md:flex flex-col items-center">
                                <span className="text-[9px] font-black text-neutral-300 uppercase tracking-[0.2em] mb-1">Status</span>
                                <Badge className={`text-[10px] font-black uppercase tracking-wider px-4 py-1.5 rounded-full shadow-sm ${isSubmitted ? 'bg-green-500 text-white hover:bg-green-600' : isInProgress ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-neutral-100 text-neutral-400 hover:bg-neutral-200'}`}>
                                  {t.status}
                                </Badge>
                              </div>
                              <Button variant="ghost" className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-neutral-50 group-hover:bg-neutral-900 group-hover:text-white transition-all">
                                <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginTop: '80px', display: 'flex', justifyContent: 'flex-end', paddingBottom: '40px', borderTop: '1px solid #fafafa', paddingTop: '40px' }}>
              <Button
                onClick={handleNext}
                className="text-white text-base font-bold rounded-2xl px-10 py-7 h-auto shadow-2xl active:scale-95 transition-all flex items-center gap-3"
                style={{ backgroundColor: '#000' }}
              >
                <span className="text-white">Next Chapter</span>
                <ArrowRight className="w-5 h-5 text-white" />
              </Button>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}