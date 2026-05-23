import { describe, expect, it } from 'vitest';
import { canAccessPage, normalizePageId } from './navigation';

describe('navigation helpers', () => {
  it('normalizes legacy aliases into routed pages', () => {
    expect(normalizePageId('batch')).toBe('batches');
    expect(normalizePageId('assessment')).toBe('assessments-management');
    expect(normalizePageId('unknown-page')).toBe('dashboard');
  });

  it('enforces role-based access while preserving student mobile parity routes', () => {
    expect(canAccessPage('student', 'attendance')).toBe(true);
    expect(canAccessPage('student', 'problems')).toBe(true);
    expect(canAccessPage('student', 'users')).toBe(false);
    expect(canAccessPage('admin', 'users')).toBe(true);
    expect(canAccessPage('trainer', 'materials')).toBe(true);
  });
});
