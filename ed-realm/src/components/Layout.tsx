import React from 'react';
import { useAuth } from '../lib/auth-context';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Search, Settings, LogOut, Home, BookOpen, FileCode, MessageSquare, Award, Users, BarChart3, Calendar, User, AlertCircle, ChevronDown, Trophy, CreditCard, Send, ClipboardList, TrendingUp, FileText, Menu, Bell, X, CheckCircle2, Clock } from 'lucide-react';
import { Input } from './ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { createPortal } from 'react-dom';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';
import { EdRealmLogo } from './EdRealmLogo';
import { useIsMobile } from './ui/use-mobile';
import { AttendanceSession, loadAttendanceSessions, markAttendanceForStudent } from '../lib/attendance-store';
import { PageId } from '../lib/navigation';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: PageId;
  onNavigate: (page: string) => void;
  hideSidebar?: boolean;
}

export function Layout({ children, currentPage, onNavigate, hideSidebar = false }: LayoutProps) {
  const { currentUser, logout } = useAuth();
  const isMobile = useIsMobile();

  const [isInstitutionsOpen, setIsInstitutionsOpen] = React.useState(false);
  const [isAssessmentsOpen, setIsAssessmentsOpen] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = React.useState(false);
  const notificationRef = React.useRef<HTMLDivElement>(null);

  // Attendance-based notification: check for active sessions the student hasn't marked
  const [attendanceSessions, setAttendanceSessions] = React.useState<AttendanceSession[]>([]);

  React.useEffect(() => {
    const loadSessions = () => {
      setAttendanceSessions(loadAttendanceSessions());
    };
    loadSessions();
    const interval = setInterval(loadSessions, 5000);
    return () => clearInterval(interval);
  }, []);

  // Close notification panel when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Find active attendance sessions student hasn't marked
  const pendingAttendance = currentUser?.role === 'student'
    ? attendanceSessions.filter(s =>
        s.status === 'open' &&
        (!currentUser.batchId || s.batchId === currentUser.batchId) &&
        !s.markedStudentIds?.includes(currentUser.id)
      )
    : [];
  const unreadCount = pendingAttendance.length;

  // Also find sessions where student already marked
  const markedAttendance = currentUser?.role === 'student'
    ? attendanceSessions.filter(s =>
        s.status === 'open' &&
        (!currentUser.batchId || s.batchId === currentUser.batchId) &&
        s.markedStudentIds?.includes(currentUser.id)
      )
    : [];

  const handleQuickMarkAttendance = (sessionId: string) => {
    if (!currentUser) return;
    const selectedSession = attendanceSessions.find((session) => session.id === sessionId);
    if (!selectedSession || selectedSession.markedStudentIds.includes(currentUser.id)) return;
    const next = markAttendanceForStudent(sessionId, currentUser.id);
    setAttendanceSessions(next);
    toast.success('Attendance marked successfully! ✅');
  };

  const [isIssueDialogOpen, setIsIssueDialogOpen] = React.useState(false);
  const [issueTitle, setIssueTitle] = React.useState('');
  const [issueCategory, setIssueCategory] = React.useState('');
  const [issuePriority, setIssuePriority] = React.useState('Medium');
  const [issueDescription, setIssueDescription] = React.useState('');

  const [submittedIssues, setSubmittedIssues] = React.useState<any[]>([]);

  if (!currentUser) return null;

  const handleIssueSubmit = () => {
    if (!issueTitle.trim() || !issueDescription.trim() || !issueCategory.trim()) {
      toast.error('Please provide a title, category, and description for the issue.');
      return;
    }

    setSubmittedIssues([
      {
        id: Date.now(),
        title: issueTitle,
        date: new Date().toISOString().split('T')[0],
        category: issueCategory,
        priority: issuePriority,
        status: 'Open',
        description: 'Support team will review this issue shortly.'
      },
      ...submittedIssues
    ]);

    toast.success('Your issue has been submitted successfully.');
    setIssueTitle('');
    setIssueCategory('');
    setIssuePriority('Medium');
    setIssueDescription('');
  };


  const getNavItems = () => {
    const common = [
      { id: 'dashboard', label: 'Dashboard', icon: Home },
      { id: 'courses', label: 'Courses', icon: BookOpen },
    ];

    if (currentUser.role === 'student') {
      return [
        ...common,
        { id: 'problems', label: 'Problems', icon: FileCode },
        { id: 'contests', label: 'Contests', icon: Trophy },
        { id: 'attendance', label: 'Attendance', icon: Calendar },
        { id: 'messages', label: 'Q&A', icon: MessageSquare },
        { id: 'leaderboard', label: 'Leaderboard', icon: Award },
      ];
    } else if (currentUser.role === 'faculty') {
      return [
        ...common,
        { id: 'batches', label: 'Batches', icon: Users },
        { id: 'messages', label: 'Q&A', icon: MessageSquare },
        { id: 'leaderboard', label: 'Leaderboard', icon: Award },
      ];
    } else if (currentUser.role === 'trainer') {
      return [
        ...common,
        { id: 'batches', label: 'Batches', icon: Users },
        { id: 'messages', label: 'Q&A', icon: MessageSquare },
        { id: 'leaderboard', label: 'Leaderboard', icon: Award },
        { id: 'tests', label: 'Tests', icon: FileCode },
        { id: 'materials', label: 'Materials', icon: FileText },
      ];
    } else {
      return [
        ...common,
        { id: 'users', label: 'Users', icon: Users },
        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        { id: 'leaderboard', label: 'Leaderboard', icon: Award },
        { id: 'trainer-invitation', label: 'Trainer Invitation', icon: Send },
        { id: 'billing', label: 'Billing', icon: CreditCard },
        { id: 'coding-contest', label: 'Coding Contest', icon: Trophy },
        { id: 'tests', label: 'Tests', icon: FileCode },
        { id: 'materials', label: 'Materials', icon: FileText },
      ];

    }
  };

  const navItems = getNavItems();
  const shouldShowSidebar = !hideSidebar;

  const handleNavigateWithClose = (page: string) => {
    onNavigate(page);
    if (isMobile) {
      setIsMobileMenuOpen(false);
    }
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    if (isMobile) {
      setIsMobileMenuOpen(false);
    }
  };

  const renderSidebarContent = (isMobileMenu = false) => {
    const itemsToRender = navItems;
    return (
    <>
      <nav className={`p-4 space-y-1 flex-1 overflow-y-auto overflow-x-hidden ${isMobileMenu ? 'pt-10' : ''}`}>
        {itemsToRender.map(item => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavigateWithClose(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${isActive
                ? 'text-white shadow-md'
                : 'text-neutral-700 hover:bg-neutral-100 hover:shadow-sm'
                }`}
              style={isActive ? { backgroundColor: 'var(--color-primary)' } : {}}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          );
        })}

        {/* Institutions Dropdown for Admin */}
        {currentUser.role === 'admin' && (
          <div className="space-y-1">
            <button
              onClick={() => setIsInstitutionsOpen(!isInstitutionsOpen)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 text-neutral-700 hover:bg-neutral-100 uppercase text-xs font-bold tracking-wider mt-4"
            >
              <span className="flex items-center gap-3">
                <Users className="w-4 h-4" />
                INSTITUTIONS
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isInstitutionsOpen ? 'rotate-180' : ''}`} />
            </button>

            {isInstitutionsOpen && (
              <div className="pl-4 space-y-1">
                <button
                  onClick={() => handleNavigateWithClose('manage-institutions')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 ${currentPage === 'manage-institutions'
                    ? 'bg-neutral-100 text-neutral-900 font-medium'
                    : 'text-neutral-600 hover:bg-neutral-50'
                    }`}
                >
                  <BookOpen className="w-4 h-4" />
                  <span className="text-sm">Manage Institutions</span>
                </button>
                <button
                  onClick={() => handleNavigateWithClose('batch-years')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 ${currentPage === 'batch-years'
                    ? 'bg-neutral-100 text-neutral-900 font-medium'
                    : 'text-neutral-600 hover:bg-neutral-50'
                    }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  <span className="text-sm">Batch Years</span>
                </button>
                <button
                  onClick={() => handleNavigateWithClose('batches')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 ${currentPage === 'batches'
                    ? 'bg-neutral-100 text-neutral-900 font-medium'
                    : 'text-neutral-600 hover:bg-neutral-50'
                    }`}
                >
                  <Users className="w-4 h-4" />
                  <span className="text-sm">Batches</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Assessments Dropdown for Admin */}
        {currentUser.role === 'admin' && (
          <div className="space-y-1">
            <button
              onClick={() => setIsAssessmentsOpen(!isAssessmentsOpen)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 text-neutral-700 hover:bg-neutral-100 uppercase text-xs font-bold tracking-wider"
            >
              <span className="flex items-center gap-3">
                <ClipboardList className="w-4 h-4" />
                ASSESSMENTS
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isAssessmentsOpen ? 'rotate-180' : ''}`} />
            </button>

            {isAssessmentsOpen && (
              <div className="pl-4 space-y-1">
                <button
                  onClick={() => handleNavigateWithClose('assessments-management')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 ${currentPage === 'assessments-management'
                    ? 'bg-neutral-100 text-neutral-900 font-medium'
                    : 'text-neutral-600 hover:bg-neutral-50'
                    }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  <span className="text-sm">Reports</span>
                </button>
                <button
                  onClick={() => handleNavigateWithClose('assessments-management')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 ${currentPage === 'assessments-management'
                    ? 'bg-neutral-100 text-neutral-900 font-medium'
                    : 'text-neutral-600 hover:bg-neutral-50'
                    }`}
                >
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm">Progress</span>
                </button>
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Bottom Profile & Logout Section — hidden for mobile students */}
      <div className="p-4 border-t border-neutral-200 space-y-2">
        <button
          onClick={() => handleNavigateWithClose('profile')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${currentPage === 'profile'
            ? 'text-white shadow-md'
            : 'text-neutral-700 hover:bg-neutral-100 hover:shadow-sm'
            }`}
          style={currentPage === 'profile' ? { backgroundColor: 'var(--color-primary)' } : {}}
        >
          <User className="w-5 h-5" />
          <span className="text-sm font-medium">Profile</span>
        </button>
        <button
          onClick={() => handleNavigateWithClose('settings')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${currentPage === 'settings'
            ? 'text-white shadow-md'
            : 'text-neutral-700 hover:bg-neutral-100 hover:shadow-sm'
            }`}
          style={currentPage === 'settings' ? { backgroundColor: 'var(--color-primary)' } : {}}
        >
          <Settings className="w-5 h-5" />
          <span className="text-sm font-medium">Settings</span>
        </button>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-all duration-200 hover:shadow-sm"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-medium">Logout</span>
        </button>
      </div>
    </>
  );
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-neutral-50 overflow-hidden">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 bg-white border-b border-neutral-200 shadow-sm flex-shrink-0">
        <div className="flex items-center justify-between gap-3 px-3 sm:px-6 py-3">
          <div className="flex items-center min-w-0 gap-2 sm:gap-6">
            {shouldShowSidebar && isMobile && (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={() => setIsMobileMenuOpen(true)}
                aria-label="Open navigation menu"
              >
                <Menu className="w-5 h-5" style={{ color: '#7C3AED' }} />
              </Button>
            )}

            <div
              className="flex items-center gap-2 sm:gap-3 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => onNavigate('dashboard')}
            >
              <EdRealmLogo size="small" />
              <div
                className="hidden sm:block px-2 py-1 rounded text-xs capitalize"
                style={{
                  backgroundColor: currentUser.role === 'student'
                    ? 'rgba(16, 185, 129, 0.1)'
                    : currentUser.role === 'faculty'
                      ? 'rgba(20, 184, 166, 0.1)'
                      : 'rgba(124, 58, 237, 0.1)',
                  color: currentUser.role === 'student'
                    ? 'var(--color-accent)'
                    : currentUser.role === 'faculty'
                      ? 'var(--color-secondary)'
                      : 'var(--color-primary)',
                }}
              >
                {currentUser.role}
              </div>
            </div>

            <div className="relative hidden lg:block w-72 xl:w-96">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <Input
                placeholder="Search courses, problems, or users..."
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Notification Bell */}
            <div className="relative" ref={notificationRef}>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 relative hover:bg-purple-50"
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" style={{ color: '#7C3AED' }} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white rounded-full" style={{ backgroundColor: '#EF4444' }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>

              {/* Notification Dropdown */}
              {isNotificationOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-neutral-200 z-[60] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 bg-neutral-50">
                    <h4 className="text-sm font-semibold text-neutral-900">Attendance Notifications</h4>
                    <button onClick={() => setIsNotificationOpen(false)} className="text-neutral-400 hover:text-neutral-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="max-h-80 overflow-y-auto">
                    {pendingAttendance.length === 0 ? (
                      <div className="px-4 py-8 text-center">
                        <Calendar className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
                        <p className="text-sm text-neutral-500">No pending attendance</p>
                        <p className="text-xs text-neutral-400 mt-1">You're all caught up!</p>
                      </div>
                    ) : (
                      pendingAttendance.map(session => (
                        <div
                          key={session.id}
                          className="px-4 py-3 border-b border-neutral-50 bg-purple-50/30"
                        >
                          <div className="flex items-start gap-3">
                            <div className="mt-1 w-2 h-2 rounded-full flex-shrink-0 bg-purple-500" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-neutral-900">Attendance Request</p>
                              <p className="text-xs text-neutral-600 mt-0.5">{session.courseTitle || 'New attendance session posted'}</p>
                              <p className="text-xs text-neutral-400 mt-1">
                                {session.createdAt ? new Date(session.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                              </p>
                              <button
                                onClick={() => { handleQuickMarkAttendance(session.id); setIsNotificationOpen(false); }}
                                className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-white font-semibold text-xs transition-all duration-200 hover:opacity-90"
                                style={{ backgroundColor: '#10B981' }}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Mark Present
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

        {/* Profile Dropdown - For All Users */}
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button
      variant="ghost"
      className="flex items-center gap-2 px-2 sm:px-3 py-2 h-auto hover:bg-neutral-100 rounded-lg transition-colors"
    >
      <Avatar className="w-8 h-8 shrink-0">
        <AvatarFallback
          className="text-xs font-semibold"
          style={{ backgroundColor: currentUser.role === 'student' ? '#7C3AED' : 'var(--color-primary)', color: 'white' }}
        >
          {currentUser.name.split(' ').map(n => n[0]).join('')}
        </AvatarFallback>
      </Avatar>
      <span className="hidden sm:block text-sm font-medium text-neutral-800 max-w-[120px] truncate">
        {currentUser.name.split(' ')[0]}
      </span>
      <ChevronDown className="hidden sm:block w-3.5 h-3.5 text-neutral-500 shrink-0" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end" className="w-56 p-2 rounded-xl shadow-xl border border-neutral-200 bg-white">
    {/* User identity header */}
    <div className="flex items-center gap-3 px-3 py-3 mb-1 rounded-lg bg-neutral-50 border border-neutral-100">
      <Avatar className="w-9 h-9 shrink-0">
        <AvatarFallback
          className="text-xs font-semibold"
          style={{ backgroundColor: currentUser.role === 'student' ? '#7C3AED' : 'var(--color-primary)', color: 'white' }}
        >
          {currentUser.name.split(' ').map(n => n[0]).join('')}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate text-neutral-900">{currentUser.name}</div>
        <div className="text-xs text-neutral-500 capitalize mt-0.5">{currentUser.role}</div>
      </div>
    </div>

    <DropdownMenuItem
      onClick={() => setIsIssueDialogOpen(true)}
      className="flex items-center gap-3 cursor-pointer px-3 py-3 rounded-lg hover:bg-neutral-100 focus:bg-neutral-100 text-neutral-700 text-sm font-medium transition-colors"
    >
      <AlertCircle className="w-4 h-4 text-neutral-500 shrink-0" />
      Raise an Issue
    </DropdownMenuItem>
    <DropdownMenuItem
      onClick={() => onNavigate('profile')}
      className="flex items-center gap-3 cursor-pointer px-3 py-3 rounded-lg hover:bg-neutral-100 focus:bg-neutral-100 text-neutral-700 text-sm font-medium transition-colors"
    >
      <User className="w-4 h-4 text-neutral-500 shrink-0" />
      View Profile
    </DropdownMenuItem>
    <DropdownMenuItem
      onClick={() => onNavigate('settings')}
      className="flex items-center gap-3 cursor-pointer px-3 py-3 rounded-lg hover:bg-neutral-100 focus:bg-neutral-100 text-neutral-700 text-sm font-medium transition-colors"
    >
      <Settings className="w-4 h-4 text-neutral-500 shrink-0" />
      Settings
    </DropdownMenuItem>

    <div className="my-1.5 h-px bg-neutral-100 mx-1" />

    <DropdownMenuItem
      onClick={handleLogout}
      className="flex items-center gap-3 cursor-pointer px-3 py-3 rounded-lg hover:bg-red-50 focus:bg-red-50 text-red-600 text-sm font-medium transition-colors"
    >
      <LogOut className="w-4 h-4 shrink-0" />
      Logout
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
          </div>
        </div>
      </header>

      {shouldShowSidebar && isMobile && (
        <>
          {/* Mobile sidebar overlay */}
          {isMobileMenuOpen && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 50,
                backgroundColor: 'rgba(0,0,0,0.5)',
              }}
              onClick={() => setIsMobileMenuOpen(false)}
            />
          )}
          {/* Mobile sidebar panel */}
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              bottom: 0,
              width: '280px',
              maxWidth: '85vw',
              zIndex: 51,
              backgroundColor: '#ffffff',
              boxShadow: '4px 0 16px rgba(0,0,0,0.1)',
              transform: isMobileMenuOpen ? 'translateX(0)' : 'translateX(-100%)',
              transition: 'transform 0.3s ease-in-out',
              display: 'flex',
              flexDirection: 'column' as const,
              overflow: 'hidden',
            }}
          >
            {/* Close button */}
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                zIndex: 10,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                color: '#6b7280',
              }}
            >
              <X className="w-5 h-5" />
            </button>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {renderSidebarContent(true)}
            </div>
          </div>
        </>
      )}

      {/* Fixed Sidebar */}
      {shouldShowSidebar && !isMobile && (
        <aside className="fixed left-0 bg-white border-r border-neutral-200 flex flex-col overflow-hidden z-40 transition-all duration-200 w-64 opacity-100 visible" style={{ top: '64px', height: 'calc(100vh - 64px)' }}>
          {renderSidebarContent()}
        </aside>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden transition-all duration-200 min-w-0" style={{ marginLeft: shouldShowSidebar && !isMobile ? '256px' : '0' }}>
        <div className="p-3 sm:p-6 min-h-full max-w-full">
          {children}
        </div>
      </main>
      {/* Issue Modal — custom portal bypasses Radix positioning on mobile */}
      {isIssueDialogOpen && isMobile && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999 }}>
          {/* Backdrop */}
          <div
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }}
            onClick={() => setIsIssueDialogOpen(false)}
          />
          {/* Bottom Sheet */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '92dvh',
            background: 'white',
            borderRadius: '20px 20px 0 0',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}>
            {/* Drag handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 6px', flexShrink: 0 }}>
              <div style={{ width: 40, height: 4, borderRadius: 99, background: '#d1d5db' }} />
            </div>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px 12px', borderBottom: '1px solid #f3f4f6', flexShrink: 0, background: 'white' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 18, color: '#0f172a' }}>Raise an Issue</div>
                <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Report bugs, platform issues, or support requests.</div>
              </div>
              <button
                onClick={() => setIsIssueDialogOpen(false)}
                style={{ marginLeft: 12, padding: 8, borderRadius: '50%', background: '#f3f4f6', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                aria-label="Close"
              >
                <X style={{ width: 16, height: 16, color: '#6b7280' }} />
              </button>
            </div>
            {/* Scrollable body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16, background: '#fafafa' }}>
              {/* Form Card */}
              <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>Submit New Issue</div>
                  <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Share details so support can resolve it faster.</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Issue Title</label>
                    <input
                      placeholder="e.g. Profile image upload fails"
                      style={{ width: '100%', height: 44, borderRadius: 8, border: '1px solid #e5e7eb', background: '#f9fafb', padding: '0 12px', fontSize: 16, boxSizing: 'border-box', outline: 'none' }}
                      value={issueTitle}
                      onChange={(e) => setIssueTitle(e.target.value)}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Category</label>
                      <select
                        style={{ width: '100%', height: 44, borderRadius: 8, border: '1px solid #e5e7eb', background: '#f9fafb', padding: '0 10px', fontSize: 14, boxSizing: 'border-box', outline: 'none' }}
                        value={issueCategory}
                        onChange={(e) => setIssueCategory(e.target.value)}
                      >
                        <option value="" disabled>Category</option>
                        <option value="Academic">Academic</option>
                        <option value="Technical">Technical / Bug</option>
                        <option value="Billing">Billing</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Priority</label>
                      <select
                        style={{ width: '100%', height: 44, borderRadius: 8, border: '1px solid #e5e7eb', background: '#f9fafb', padding: '0 10px', fontSize: 14, boxSizing: 'border-box', outline: 'none' }}
                        value={issuePriority}
                        onChange={(e) => setIssuePriority(e.target.value)}
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Critical">Critical</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Description</label>
                    <textarea
                      placeholder="Describe what happened, expected behavior, and steps to reproduce."
                      style={{ width: '100%', height: 110, borderRadius: 8, border: '1px solid #e5e7eb', background: '#f9fafb', padding: '10px 12px', fontSize: 16, boxSizing: 'border-box', resize: 'none', outline: 'none', fontFamily: 'inherit' }}
                      value={issueDescription}
                      onChange={(e) => setIssueDescription(e.target.value)}
                    />
                  </div>
                </div>
                <button
                  onClick={handleIssueSubmit}
                  style={{ width: '100%', height: 48, borderRadius: 8, background: '#111827', color: 'white', border: 'none', fontWeight: 600, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  <AlertCircle style={{ width: 16, height: 16 }} />
                  Submit Issue
                </button>
              </div>

              {/* History Card */}
              <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', marginBottom: 2 }}>My Issue History</div>
                <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 16 }}>Track your reported issues and statuses.</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {submittedIssues.map((issue) => (
                    <div key={issue.id} style={{ padding: 14, border: '1px solid #f3f4f6', borderRadius: 10, background: 'white' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, gap: 8 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b', flex: 1, lineHeight: 1.4 }}>{issue.title}</div>
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          <span style={{ padding: '2px 8px', borderRadius: 4, background: '#eff6ff', color: '#2563eb', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>{issue.priority}</span>
                          <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', background: issue.status.toLowerCase() === 'open' ? '#fff7ed' : issue.status.toLowerCase() === 'in-progress' ? '#fefce8' : '#f0fdf4', color: issue.status.toLowerCase() === 'open' ? '#ea580c' : issue.status.toLowerCase() === 'in-progress' ? '#ca8a04' : '#16a34a' }}>{issue.status}</span>
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 8 }}>{issue.date} · {issue.category}</div>
                      <div style={{ background: '#f9fafb', borderRadius: 6, padding: '8px 10px', display: 'flex', gap: 8, fontSize: 12, color: '#6b7280' }}>
                        <Settings style={{ width: 13, height: 13, marginTop: 1, color: '#9ca3af', flexShrink: 0 }} />
                        <p style={{ margin: 0, lineHeight: 1.5 }}>{issue.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ height: 24 }} />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Desktop: normal Radix Dialog */}
      {!isMobile && (
        <Dialog open={isIssueDialogOpen} onOpenChange={setIsIssueDialogOpen}>
          <DialogContent className="sm:max-w-[1000px] w-[95vw] h-[90vh] p-0 flex flex-col overflow-hidden bg-white">
            <div className="shrink-0 flex items-center justify-between px-8 py-5 border-b border-neutral-100 bg-white">
              <div>
                <DialogTitle className="text-xl font-bold text-slate-900">Raise an Issue</DialogTitle>
                <DialogDescription className="text-sm text-neutral-500 mt-0.5">Report bugs, platform issues, or support requests.</DialogDescription>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto bg-neutral-50/50">
              <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white rounded-xl border border-neutral-200 shadow-xs p-6 flex flex-col gap-5">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Submit New Issue</h3>
                    <p className="text-xs text-neutral-500 mt-0.5">Share details so support can resolve it faster.</p>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700">Issue Title</label>
                      <Input placeholder="e.g. Profile image upload fails" className="bg-neutral-50 border-neutral-200" value={issueTitle} onChange={(e) => setIssueTitle(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700">Category</label>
                      <select className="flex h-10 w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm" value={issueCategory} onChange={(e) => setIssueCategory(e.target.value)}>
                        <option value="" disabled>Choose category</option>
                        <option value="Academic">Academic</option>
                        <option value="Technical">Technical / Platform Bug</option>
                        <option value="Billing">Billing or Payment</option>
                        <option value="Other">Other Query</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700">Priority</label>
                      <select className="flex h-10 w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm" value={issuePriority} onChange={(e) => setIssuePriority(e.target.value)}>
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Critical">Critical</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700">Description</label>
                      <Textarea placeholder="Describe what happened, expected behavior, and steps to reproduce." className="h-28 bg-neutral-50 border-neutral-200 resize-none" value={issueDescription} onChange={(e) => setIssueDescription(e.target.value)} />
                    </div>
                  </div>
                  <Button onClick={handleIssueSubmit} className="w-full mt-2 font-semibold h-11" style={{ backgroundColor: '#111827', color: 'white' }}>
                    <AlertCircle className="w-4 h-4 mr-2" />Submit Issue
                  </Button>
                </div>
                <div className="bg-white rounded-xl border border-neutral-200 shadow-xs p-6">
                  <div className="mb-5">
                    <h3 className="text-base font-bold text-slate-900">My Issue History</h3>
                    <p className="text-xs text-neutral-500 mt-0.5">Track your reported issues and statuses.</p>
                  </div>
                  <div className="space-y-3">
                    {submittedIssues.map((issue) => (
                      <div key={issue.id} className="p-4 border border-neutral-100 rounded-lg bg-white shadow-xs">
                        <div className="flex justify-between items-start mb-2 gap-2">
                          <h4 className="font-semibold text-slate-800 text-sm flex-1">{issue.title}</h4>
                          <div className="flex gap-2 shrink-0">
                            <span className="px-2.5 py-1 rounded bg-blue-50 text-blue-600 text-xs font-semibold uppercase">{issue.priority}</span>
                            <span className={`px-2.5 py-1 rounded text-xs font-semibold uppercase ${issue.status.toLowerCase() === 'open' ? 'bg-orange-50 text-orange-600' : issue.status.toLowerCase() === 'in-progress' ? 'bg-yellow-50 text-yellow-600' : 'bg-green-50 text-green-600'}`}>{issue.status}</span>
                          </div>
                        </div>
                        <div className="text-xs text-neutral-500 mb-3">{issue.date} · {issue.category}</div>
                        <div className="bg-neutral-50 rounded p-3 flex gap-3 text-sm text-neutral-600">
                          <Settings className="w-4 h-4 mt-0.5 text-neutral-400 shrink-0" />
                          <p>{issue.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
