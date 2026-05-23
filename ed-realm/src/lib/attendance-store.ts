export interface AttendanceSession {
  id: string;
  courseId: string;
  courseTitle: string;
  batchId?: string;
  createdAt: string;
  markedStudentIds: string[];
  totalStudentIds: string[];
  status: 'open' | 'closed';
}

const STORAGE_KEY = 'attendance_sessions_store';

const canUseStorage = () => typeof window !== 'undefined';

export const loadAttendanceSessions = (): AttendanceSession[] => {
  if (!canUseStorage()) {
    return [];
  }

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AttendanceSession[]) : [];
  } catch {
    return [];
  }
};

export const saveAttendanceSessions = (sessions: AttendanceSession[]) => {
  if (!canUseStorage()) {
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
};

export const upsertAttendanceSession = (session: AttendanceSession) => {
  const existing = loadAttendanceSessions();
  const next = [session, ...existing.filter((item) => item.id !== session.id)];
  saveAttendanceSessions(next);
  return next;
};

export const closeAttendanceSession = (sessionId: string) => {
  const next = loadAttendanceSessions().map((session) =>
    session.id === sessionId ? { ...session, status: 'closed' as const } : session
  );
  saveAttendanceSessions(next);
  return next;
};

export const markAttendanceForStudent = (sessionId: string, studentId: string) => {
  const next = loadAttendanceSessions().map((session) =>
    session.id === sessionId && !session.markedStudentIds.includes(studentId)
      ? { ...session, markedStudentIds: [...session.markedStudentIds, studentId] }
      : session
  );
  saveAttendanceSessions(next);
  return next;
};
