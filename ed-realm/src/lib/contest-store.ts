export type ContestStatus = 'draft' | 'scheduled' | 'active' | 'completed';
export type QuestionType = 'coding' | 'mcq';

export interface Question {
    id: string;
    title: string;
    description: string;
    difficulty: 'easy' | 'medium' | 'hard';
    topic: string;
    points: number;
    type: QuestionType;
    options?: string[];
    correctAnswer?: string;
    testCases?: { input: string; output: string; hidden?: boolean }[];
}

export interface Contest {
    id: string;
    name: string;
    description: string;
    totalQuestions: number;
    startTime: string;
    endTime: string;
    status: ContestStatus;
    participants: number;
    questions: Question[];
    createdAt: string;
    duration?: string;
    prize?: string;
    enrolled?: boolean;
}

const STORAGE_KEY = 'codify_contests';

export const loadContests = (): Contest[] => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return [];
        const parsed = JSON.parse(stored);
        if (!Array.isArray(parsed)) return [];
        return parsed as Contest[];
    } catch (error) {
        console.error('Error loading contests:', error);
        return [];
    }
};

export const saveContests = (contests: Contest[]) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(contests));
    } catch (error) {
        console.error('Error saving contests:', error);
    }
};

export const addContest = (contest: Contest) => {
    const contests = loadContests();
    saveContests([contest, ...contests]);
};
