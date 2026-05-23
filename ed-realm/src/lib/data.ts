import { authFetch } from './api';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'faculty' | 'trainer' | 'student';
  avatar?: string;
  batchId?: string;
}

export interface Institution {
  id: string;
  name: string;
  email: string;
  activeUsers: number;
  location: string;
}

export interface Topic {
  id: string;
  title: string;
  content: string;
  questions: TopicQuestion[];
  isLocked?: boolean;
  images?: string[];
  accessDuration?: string;
  durationLocked?: boolean;
}

export interface TopicQuestion {
  id: string;
  question: string;
  title?: string;
  description?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  points?: number;
  options?: string[];
  correctAnswer?: string;
  type?: 'multiple_choice' | 'coding';
  starterCode?: string;
  expectedOutput?: string;
  testCases?: { input: string; expectedOutput: string; hidden?: boolean }[];
  tags?: string[];
  topic?: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  duration: string;
  lessons: number;
  enrolled: number;
  tags: string[];
  thumbnail?: string;
  institutionId?: string;
  batchId?: string;
  topics?: Topic[];
  isLocked?: boolean;
}

export interface Batch {
  id: string;
  name: string;
  year: string;
  courseId: string;
  startDate: string;
  endDate: string;
  students: number;
  faculty: string[];
  schedule: string;
  institutionId?: string;
}

export interface Problem {
  id: string;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  description: string;
  constraints: string[];
  sampleInput: string;
  sampleOutput: string;
  explanation: string;
  testCases: TestCase[];
  starterCode: { [language: string]: string };
  tags: string[];
  points: number;
}

export interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  hidden: boolean;
}

export interface Submission {
  id: string;
  problemId: string;
  userId: string;
  code: string;
  language: string;
  status: 'queued' | 'running' | 'accepted' | 'wrong_answer' | 'time_limit' | 'runtime_error' | 'compile_error';
  testCaseResults: TestCaseResult[];
  executionTime?: number;
  memory?: number;
  timestamp: string;
}

export interface TestCaseResult {
  testCaseId: string;
  passed: boolean;
  actualOutput?: string;
  executionTime?: number;
}

export interface Message {
  id: string;
  threadId: string;
  senderId: string;
  content: string;
  timestamp: string;
  attachments?: string[];
}

export interface Thread {
  id: string;
  title: string;
  studentId: string;
  facultyId?: string;
  status: 'open' | 'answered' | 'closed';
  messages: Message[];
  createdAt: string;
}

export interface Question {
  id: string;
  courseId: string;
  lessonId?: string;
  title: string;
  content: string;
  authorId: string;
  createdAt: string;
  updatedAt: string;
  status: 'unanswered' | 'answered' | 'resolved';
  isAnonymous: boolean;
  upvotes: number;
  tags: string[];
}

export interface Answer {
  id: string;
  questionId: string;
  content: string;
  authorId: string;
  createdAt: string;
  updatedAt: string;
  isAccepted: boolean;
  upvotes: number;
}

export interface QuestionVote {
  id: string;
  questionId: string;
  userId: string;
  isUpvote: boolean;
}

export interface AnswerVote {
  id: string;
  answerId: string;
  userId: string;
  isUpvote: boolean;
}

export interface Assessment {
  id: string;
  name: string;
  category: string;
  description: string;
  batchId: string;
  maxAttempts: number;
  examType: 'single_time' | 'multiple_time' | 'practice';
  cutOffType: 'single' | 'section_wise' | 'percentile';
  password?: string;
  duration: number;
  totalMarks: number;
  scheduledDate?: string;
  status: 'draft' | 'published' | 'active' | 'completed';
  createdBy: string;
  createdAt: string;
  questions: AssessmentQuestion[];
}

export interface AssessmentQuestion {
  id: string;
  assessmentId: string;
  question: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'coding';
  options?: string[];
  correctAnswer: string;
  marks: number;
  explanation?: string;
  tags?: string[];
}

export const users: User[] = [];
export const institutions: Institution[] = [];
export const courses: Course[] = [];
export const batches: Batch[] = [];
export const problems: Problem[] = [];
export const assessments: Assessment[] = [];

async function safeFetch(path: string, opts?: RequestInit) {
  const res = await authFetch(path, opts);
  if (!res.ok) throw new Error(`API request failed: ${res.status} ${res.statusText}`);
  return res.json();
}

export async function getProblems() {
  return safeFetch('/api/problems');
}

export async function getCourses() {
  return safeFetch('/api/courses');
}

export async function getBatches() {
  return safeFetch('/api/batches');
}

export async function getUsers() {
  return safeFetch('/api/users');
}

export async function getAssessments() {
  return safeFetch('/api/assessments');
}

export async function getInstitutions() {
  return safeFetch('/api/institutions');
}

export async function fetchAllInitialData() {
  return Promise.all([getUsers(), getInstitutions(), getCourses(), getBatches(), getProblems(), getAssessments()]).then(
    ([users_, institutions_, courses_, batches_, problems_, assessments_]) => ({ users: users_, institutions: institutions_, courses: courses_, batches: batches_, problems: problems_, assessments: assessments_ })
  );
}

