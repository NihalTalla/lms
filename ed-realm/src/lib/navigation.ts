import type { Course, Problem, Topic, TopicQuestion, User } from './data';

export const pageIds = [
  'dashboard',
  'courses',
  'course-modules',
  'course-tests',
  'student-module',
  'assignment-listing',
  'topic-details',
  'coding-challenge-ui',
  'student-coding',
  'problems',
  'problem',
  'editor',
  'code-practice',
  'contests',
  'contest-play',
  'attendance',
  'messages',
  'leaderboard',
  'profile',
  'settings',
  'batches',
  'users',
  'analytics',
  'trainer-invitation',
  'send-invitation',
  'billing',
  'coding-contest',
  'tests',
  'materials',
  'manage-institutions',
  'batch-years',
  'assessments-management',
  'test-monitoring',
  'trainer-compiler',
  'grading',
] as const;

export type PageId = (typeof pageIds)[number];
export type UserRole = User['role'];

export interface StudentModulePayload {
  course: Course;
  module: Topic;
}

export interface AssignmentListingPayload {
  assignment: TopicQuestion;
  moduleName: string;
  courseName: string;
  previousData: StudentModulePayload;
}

export interface TopicDetailsPayload {
  assignment: TopicQuestion;
  moduleName: string;
  courseName: string;
  topic: {
    id: string;
    title: string;
    difficulty?: string;
    content: string;
  };
}

export interface CodingChallengePayload {
  topicTitle: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | string;
  problemDescription: string;
  examples: Array<{
    id: string;
    input: string;
    output: string;
    explanation?: string;
  }>;
  testCases: Array<{
    id: string;
    input: string;
    expectedOutput: string;
    hidden: boolean;
  }>;
  previousData?: AssignmentListingPayload | StudentModulePayload | Record<string, unknown>;
}

export interface ContestPlayPayload {
  contest: Record<string, unknown>;
}

export interface CourseTestsPayload {
  course: Course;
}

export interface StudentCodingPayload {
  challenge: Record<string, unknown>;
  module: Topic;
  course: Course;
}

export interface TestMonitoringPayload {
  testName: string;
  batch: string;
}

export interface BatchFiltersPayload {
  institutionId?: string;
  year?: string;
  [key: string]: unknown;
}

export type NavigationPayloadMap = {
  dashboard: undefined;
  courses: undefined;
  'course-modules': Course;
  'course-tests': CourseTestsPayload;
  'student-module': StudentModulePayload;
  'assignment-listing': AssignmentListingPayload;
  'topic-details': TopicDetailsPayload;
  'coding-challenge-ui': CodingChallengePayload;
  'student-coding': StudentCodingPayload;
  problems: undefined;
  problem: Problem;
  editor: Problem | undefined;
  'code-practice': undefined;
  contests: undefined;
  'contest-play': ContestPlayPayload;
  attendance: undefined;
  messages: undefined;
  leaderboard: undefined;
  profile: undefined;
  settings: undefined;
  batches: BatchFiltersPayload | undefined;
  users: undefined;
  analytics: undefined;
  'trainer-invitation': undefined;
  'send-invitation': undefined;
  billing: undefined;
  'coding-contest': undefined;
  tests: undefined;
  materials: undefined;
  'manage-institutions': undefined;
  'batch-years': undefined;
  'assessments-management': undefined;
  'test-monitoring': TestMonitoringPayload;
  'trainer-compiler': undefined;
  grading: undefined;
};

export type NavigationPayload = NavigationPayloadMap[keyof NavigationPayloadMap];

const pageIdSet = new Set<string>(pageIds);

export const isPageId = (value: string): value is PageId => pageIdSet.has(value);

export const normalizePageId = (value: string): PageId => {
  if (value === 'assessment') {
    return 'assessments-management';
  }

  if (value === 'batch') {
    return 'batches';
  }

  return isPageId(value) ? value : 'dashboard';
};

const accessByRole: Record<UserRole, PageId[]> = {
  student: [
    'dashboard',
    'courses',
    'course-modules',
    'course-tests',
    'student-module',
    'assignment-listing',
    'topic-details',
    'coding-challenge-ui',
    'student-coding',
    'problems',
    'problem',
    'editor',
    'code-practice',
    'contests',
    'contest-play',
    'attendance',
    'messages',
    'leaderboard',
    'profile',
    'settings',
  ],
  faculty: [
    'dashboard',
    'courses',
    'course-modules',
    'batches',
    'messages',
    'leaderboard',
    'profile',
    'settings',
    'test-monitoring',
    'grading',
  ],
  trainer: [
    'dashboard',
    'courses',
    'course-modules',
    'batches',
    'messages',
    'leaderboard',
    'profile',
    'settings',
    'tests',
    'materials',
    'trainer-compiler',
    'test-monitoring',
  ],
  admin: [
    'dashboard',
    'courses',
    'batches',
    'users',
    'analytics',
    'leaderboard',
    'profile',
    'settings',
    'trainer-invitation',
    'send-invitation',
    'billing',
    'coding-contest',
    'tests',
    'materials',
    'manage-institutions',
    'batch-years',
    'assessments-management',
  ],
};

export const canAccessPage = (role: UserRole, page: PageId) => accessByRole[role].includes(page);
