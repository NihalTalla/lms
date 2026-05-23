import { describe, expect, it } from 'vitest';
import { AttendanceSession, loadAttendanceSessions, markAttendanceForStudent, saveAttendanceSessions } from './attendance-store';

describe('attendance store', () => {
  it('persists and updates attendance sessions through shared helpers', () => {
    const session: AttendanceSession = {
      id: 'session-1',
      courseId: 'course-1',
      courseTitle: 'DSA Basics',
      batchId: 'batch-1',
      createdAt: '2026-03-16T10:00:00.000Z',
      markedStudentIds: [],
      totalStudentIds: ['student-1'],
      status: 'open',
    };

    saveAttendanceSessions([session]);
    expect(loadAttendanceSessions()).toHaveLength(1);

    const updated = markAttendanceForStudent('session-1', 'student-1');
    expect(updated[0].markedStudentIds).toContain('student-1');
    expect(loadAttendanceSessions()[0].markedStudentIds).toContain('student-1');
  });
});
