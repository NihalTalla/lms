import api from './api';
import { isSubmissionTerminal, normalizeSubmissionLifecycle, NormalizedSubmissionLifecycle, UiSubmissionState } from './submission-lifecycle';

export type ManagedSubmission = {
  id: string;
  problemId?: string;
  status?: string | null;
  verdict?: string | null;
  passedTests?: number | null;
  totalTests?: number | null;
  execTimeMs?: number | null;
  createdAt?: string;
  [key: string]: unknown;
};

type SubmissionLifecycleEventType = 'discovered' | 'updated' | 'terminal' | 'error';

export type SubmissionLifecycleEvent = {
  type: SubmissionLifecycleEventType;
  submissionId: string;
  submission?: ManagedSubmission;
  lifecycle?: NormalizedSubmissionLifecycle;
  error?: unknown;
};

type Subscription = (event: SubmissionLifecycleEvent) => void;

type SubmissionClient = {
  getSubmission: (id: string) => Promise<unknown>;
  getRecoveredSubmissions: () => Promise<unknown>;
};

type PollOptions = {
  problemId?: string;
  intervalMs?: number;
  maxAttempts?: number;
};

type ManagerOptions = {
  tabId?: string;
  channelName?: string;
  ownershipTtlMs?: number;
};

type PersistedSubmission = {
  id: string;
  problemId?: string;
  createdAt?: string;
  lastKnownState: UiSubmissionState;
};

const DEFAULT_POLL_INTERVAL_MS = 1500;
const DEFAULT_MAX_ATTEMPTS = 40;
const DEFAULT_OWNERSHIP_TTL_MS = 15_000;
const ACTIVE_SUBMISSIONS_STORAGE_KEY = 'codify_active_submissions';
const CHANNEL_NAME = 'codify-submission-lifecycle';
const OWNER_KEY_PREFIX = 'codify_submission_poll_owner:';

export class SubmissionLifecycleManager {
  private active = new Map<string, ManagedSubmission>();
  private polling = new Map<string, Promise<ManagedSubmission>>();
  private following = new Map<string, Promise<ManagedSubmission>>();
  private subscribers = new Set<Subscription>();
  private readonly tabId: string;
  private readonly ownershipTtlMs: number;
  private readonly channel: BroadcastChannel | null;

  constructor(private readonly client: SubmissionClient, options: ManagerOptions = {}) {
    this.tabId = options.tabId ?? createTabId();
    this.ownershipTtlMs = options.ownershipTtlMs ?? DEFAULT_OWNERSHIP_TTL_MS;
    this.channel = createChannel(options.channelName ?? CHANNEL_NAME);

    if (this.channel) {
      this.channel.onmessage = (message) => {
        const payload = message.data as { sourceTabId?: string; event?: SubmissionLifecycleEvent };
        if (payload?.sourceTabId === this.tabId || !payload?.event) return;
        this.applyRemoteEvent(payload.event);
      };
    }
  }

  subscribe(subscription: Subscription) {
    this.subscribers.add(subscription);
    return () => {
      this.subscribers.delete(subscription);
    };
  }

  getActiveSubmissions(problemId?: string) {
    const values = Array.from(this.active.values());
    return problemId ? values.filter((submission) => submission.problemId === problemId) : values;
  }

  register(submission: ManagedSubmission, type: SubmissionLifecycleEventType = 'updated') {
    this.active.set(submission.id, submission);
    const lifecycle = normalizeSubmissionLifecycle(submission);
    const eventType = lifecycle.isTerminal ? 'terminal' : type;

    if (lifecycle.isTerminal) {
      this.active.delete(submission.id);
      this.removePersisted(submission.id);
    } else {
      this.persistActive(submission, lifecycle.uiState);
    }

    this.emit({
      type: eventType,
      submissionId: submission.id,
      submission,
      lifecycle
    });
  }

  async restorePersisted(options: PollOptions = {}) {
    const entries = this.readPersisted();
    const filtered = options.problemId ? entries.filter((entry) => entry.problemId === options.problemId) : entries;
    const restored: ManagedSubmission[] = [];

    for (const entry of filtered) {
      try {
        const body = await this.client.getSubmission(entry.id);
        const submission = normalizeSubmission(body);
        restored.push(submission);
        this.register(submission, 'discovered');

        if (!isSubmissionTerminal(submission)) {
          void this.pollSubmission(submission.id, options);
        }
      } catch (error) {
        this.removePersisted(entry.id);
        this.emit({ type: 'error', submissionId: entry.id, error });
      }
    }

    return restored;
  }

  async recover(options: PollOptions = {}) {
    const body = await this.client.getRecoveredSubmissions();
    const items = normalizeRecovered(body);
    const filtered = options.problemId ? items.filter((item) => item.problemId === options.problemId) : items;

    for (const item of filtered) {
      this.register(item, 'discovered');
      void this.pollSubmission(item.id, options);
    }

    return filtered;
  }

  pollSubmission(submissionId: string, options: PollOptions = {}) {
    const existing = this.polling.get(submissionId);
    if (existing) return existing;

    if (!this.acquirePollingOwnership(submissionId)) {
      return this.followSubmission(submissionId, options);
    }

    const promise = this.pollUntilTerminal(submissionId, options).finally(() => {
      this.polling.delete(submissionId);
      this.releasePollingOwnership(submissionId);
    });

    this.polling.set(submissionId, promise);
    return promise;
  }

  private async pollUntilTerminal(submissionId: string, options: PollOptions) {
    const intervalMs = options.intervalMs ?? DEFAULT_POLL_INTERVAL_MS;
    const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
    let lastSubmission: ManagedSubmission | null = null;
    let delayMs = intervalMs;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        this.refreshPollingOwnership(submissionId);
        const body = await this.client.getSubmission(submissionId);
        const submission = normalizeSubmission(body);
        lastSubmission = submission;
        this.register(submission);

        if (isSubmissionTerminal(submission)) {
          return submission;
        }

        delayMs = intervalMs;
      } catch (error) {
        this.emit({ type: 'error', submissionId, error });
        delayMs = Math.min(delayMs * 2, 10_000);
      }

      await sleep(delayMs);
    }

    throw new Error(`Timed out waiting for submission ${submissionId}`);
  }

  private emit(event: SubmissionLifecycleEvent, broadcast = true) {
    for (const subscriber of this.subscribers) {
      subscriber(event);
    }

    if (broadcast && this.channel) {
      this.channel.postMessage({
        sourceTabId: this.tabId,
        event
      });
    }
  }

  private applyRemoteEvent(event: SubmissionLifecycleEvent) {
    if (event.submission) {
      const lifecycle = event.lifecycle ?? normalizeSubmissionLifecycle(event.submission);
      if (lifecycle.isTerminal) {
        this.active.delete(event.submission.id);
        this.removePersisted(event.submission.id);
      } else {
        this.active.set(event.submission.id, event.submission);
        this.persistActive(event.submission, lifecycle.uiState);
      }
    }

    this.emit(event, false);
  }

  private followSubmission(submissionId: string, options: PollOptions = {}) {
    const existing = this.following.get(submissionId);
    if (existing) return existing;

    const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
    const intervalMs = options.intervalMs ?? DEFAULT_POLL_INTERVAL_MS;

    const promise = new Promise<ManagedSubmission>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        unsubscribe();
        reject(new Error(`Timed out waiting for submission ${submissionId}`));
      }, maxAttempts * intervalMs + intervalMs);

      const unsubscribe = this.subscribe((event) => {
        if (event.submissionId !== submissionId || event.type !== 'terminal' || !event.submission) return;
        window.clearTimeout(timeout);
        unsubscribe();
        resolve(event.submission);
      });
    }).finally(() => {
      this.following.delete(submissionId);
    });

    this.following.set(submissionId, promise);
    return promise;
  }

  private acquirePollingOwnership(submissionId: string) {
    if (typeof window === 'undefined') return true;

    const now = Date.now();
    const key = ownerKey(submissionId);
    const current = readOwner(key);
    if (current && current.tabId !== this.tabId && current.expiresAt > now) {
      return false;
    }

    writeOwner(key, {
      tabId: this.tabId,
      expiresAt: now + this.ownershipTtlMs
    });
    return true;
  }

  private refreshPollingOwnership(submissionId: string) {
    if (typeof window === 'undefined') return;
    writeOwner(ownerKey(submissionId), {
      tabId: this.tabId,
      expiresAt: Date.now() + this.ownershipTtlMs
    });
  }

  private releasePollingOwnership(submissionId: string) {
    if (typeof window === 'undefined') return;
    const key = ownerKey(submissionId);
    const current = readOwner(key);
    if (current?.tabId === this.tabId) {
      localStorage.removeItem(key);
    }
  }

  private persistActive(submission: ManagedSubmission, lastKnownState: UiSubmissionState) {
    const entries = this.readPersisted().filter((entry) => entry.id !== submission.id);
    entries.push({
      id: submission.id,
      ...(submission.problemId ? { problemId: submission.problemId } : {}),
      ...(typeof submission.createdAt === 'string' ? { createdAt: submission.createdAt } : {}),
      lastKnownState
    });
    writePersisted(entries);
  }

  private removePersisted(submissionId: string) {
    writePersisted(this.readPersisted().filter((entry) => entry.id !== submissionId));
  }

  private readPersisted() {
    return readPersisted();
  }
}

function normalizeRecovered(body: unknown): ManagedSubmission[] {
  const value = unwrapData(body);
  return Array.isArray(value) ? value.filter(isManagedSubmission) : [];
}

function normalizeSubmission(body: unknown): ManagedSubmission {
  const value = unwrapData(body);
  if (!isManagedSubmission(value)) {
    throw new Error('Submission response malformed');
  }
  return value;
}

function unwrapData(body: unknown): unknown {
  if (body && typeof body === 'object' && 'data' in body) {
    return (body as { data: unknown }).data;
  }
  return body;
}

function isManagedSubmission(value: unknown): value is ManagedSubmission {
  return !!value && typeof value === 'object' && typeof (value as { id?: unknown }).id === 'string';
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readPersisted(): PersistedSubmission[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = localStorage.getItem(ACTIVE_SUBMISSIONS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isPersistedSubmission) : [];
  } catch {
    localStorage.removeItem(ACTIVE_SUBMISSIONS_STORAGE_KEY);
    return [];
  }
}

function writePersisted(entries: PersistedSubmission[]) {
  if (typeof window === 'undefined') return;

  if (entries.length === 0) {
    localStorage.removeItem(ACTIVE_SUBMISSIONS_STORAGE_KEY);
    return;
  }

  localStorage.setItem(ACTIVE_SUBMISSIONS_STORAGE_KEY, JSON.stringify(entries));
}

function isPersistedSubmission(value: unknown): value is PersistedSubmission {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<PersistedSubmission>;
  return typeof record.id === 'string' &&
    typeof record.lastKnownState === 'string' &&
    (!record.problemId || typeof record.problemId === 'string') &&
    (!record.createdAt || typeof record.createdAt === 'string');
}

function createTabId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `tab-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createChannel(channelName: string) {
  if (typeof BroadcastChannel === 'undefined') return null;
  return new BroadcastChannel(channelName);
}

function ownerKey(submissionId: string) {
  return `${OWNER_KEY_PREFIX}${submissionId}`;
}

function readOwner(key: string): { tabId: string; expiresAt: number } | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { tabId?: unknown; expiresAt?: unknown };
    if (typeof parsed.tabId !== 'string' || typeof parsed.expiresAt !== 'number') return null;
    return { tabId: parsed.tabId, expiresAt: parsed.expiresAt };
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

function writeOwner(key: string, owner: { tabId: string; expiresAt: number }) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(owner));
}

export const submissionLifecycleManager = new SubmissionLifecycleManager(api);
