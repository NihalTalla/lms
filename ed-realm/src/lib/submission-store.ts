export type SubmissionType = 'problem' | 'course_challenge' | 'test';

export interface SubmissionEvent {
  id: string;
  userId: string;
  type: SubmissionType;
  timestamp: string;
  meta?: Record<string, string>;
}

const STORAGE_KEY = 'codify_submissions';

export const recordSubmission = (event: Omit<SubmissionEvent, 'id' | 'timestamp'>) => {
  const existing = loadSubmissions();
  const entry: SubmissionEvent = {
    id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    ...event,
  };
  existing.push(entry);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  return entry;
};

export const loadSubmissions = (): SubmissionEvent[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as SubmissionEvent[]) : [];
  } catch (error) {
    console.error('Failed to load submissions', error);
    return [];
  }
};

export const getSubmissionCountsByDay = (userId: string, days: number) => {
  const submissions = loadSubmissions().filter(s => s.userId === userId);
  const today = new Date();
  const results: { date: string; count: number }[] = [];

  for (let i = 0; i < days; i += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const key = date.toISOString().slice(0, 10);
    const count = submissions.filter(s => s.timestamp.slice(0, 10) === key).length;
    results.push({ date: key, count });
  }

  return results.reverse();
};
