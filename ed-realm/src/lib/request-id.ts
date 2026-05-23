export function createRequestId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `req-${crypto.randomUUID()}`;
  }

  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
