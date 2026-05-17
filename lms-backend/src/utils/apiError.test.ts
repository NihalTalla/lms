import { describe, expect, it } from 'vitest';

import { badRequest, conflict, forbidden, notFound, unauthorized } from './apiError';

describe('api errors', () => {
  it('creates typed http errors', () => {
    expect(badRequest('Bad').statusCode).toBe(400);
    expect(unauthorized().statusCode).toBe(401);
    expect(forbidden().statusCode).toBe(403);
    expect(notFound().statusCode).toBe(404);
    expect(conflict().statusCode).toBe(409);
  });
});
