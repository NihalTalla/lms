export interface TestResult {
  id: string;
  testId: string;
  userId: string;
  score: number;
  total: number;
  submittedAt: string;
}

const STORAGE_KEY = 'codify_test_results';

export const saveTestResult = (result: Omit<TestResult, 'id' | 'submittedAt'>) => {
  const existing = loadTestResults();
  const entry: TestResult = {
    id: `test-result-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    submittedAt: new Date().toISOString(),
    ...result,
  };
  existing.push(entry);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  return entry;
};

export const loadTestResults = (): TestResult[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as TestResult[]) : [];
  } catch (error) {
    console.error('Failed to load test results', error);
    return [];
  }
};

export const getLatestResultForTest = (testId: string, userId: string) => {
  const results = loadTestResults()
    .filter(r => r.testId === testId && r.userId === userId)
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  return results[0];
};
