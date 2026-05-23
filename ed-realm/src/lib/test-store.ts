export type TestQuestionType = 'coding' | 'mcq';

export interface TestCase {
  input: string;
  expectedOutput: string;
  isHidden: boolean;
}

export interface TestQuestion {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topic?: string;
  tags?: string[];
  points: number;
  type: TestQuestionType;
  testCases?: TestCase[];
  options?: string[];
  correctAnswer?: string;
}

export interface Test {
  id: string;
  title: string;
  batchId: string;
  batchName: string;
  duration: number; // in minutes
  questions: TestQuestion[];
  status: 'draft' | 'scheduled' | 'active' | 'completed';
  startDate?: string;
  endDate?: string;
  students: number;
  flagged: number;
  createdAt?: string;
}

const STORAGE_KEY = 'codify_tests';

export const loadTests = (): Test[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed as Test[];
  } catch (error) {
    console.error('Error loading tests:', error);
    return [];
  }
};

export const saveTests = (tests: Test[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tests));
  } catch (error) {
    console.error('Error saving tests:', error);
  }
};
