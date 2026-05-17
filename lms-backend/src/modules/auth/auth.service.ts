import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';

import { env, roleEnum } from '@/config/env';
import { prisma } from '@/config/db';
import { redis } from '@/config/redis';
import { unauthorized } from '@/utils/apiError';

const accessTokenPayloadSchema = z.object({
  id: z.string().min(1),
  role: roleEnum,
  email: z.string().email()
});

type AccessTokenPayload = z.infer<typeof accessTokenPayloadSchema>;

const refreshTokenPayloadSchema = z.object({
  id: z.string().min(1),
  jti: z.string().uuid()
});

type RefreshTokenPayload = z.infer<typeof refreshTokenPayloadSchema>;

export const REFRESH_COOKIE_NAME = 'refreshToken';
export const REFRESH_TOKEN_EXPIRES_IN = '7d';

function parseDurationToSeconds(value: string): number {
  // Supports simple forms like: 900s, 15m, 7d
  const match = /^(\d+)([smhd])$/.exec(value.trim());
  if (!match) {
    throw new Error(`Unsupported duration format: ${value}`);
  }

  const amount = Number(match[1]);
  const unit = match[2];

  const multipliers: Record<string, number> = {
    s: 1,
    m: 60,
    h: 60 * 60,
    d: 60 * 60 * 24
  };

  return amount * multipliers[unit];
}

function signAccessToken(payload: AccessTokenPayload) {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: parseDurationToSeconds(env.JWT_EXPIRES_IN)
  });
}

function signRefreshToken(payload: RefreshTokenPayload) {
  return jwt.sign(payload, env.REFRESH_TOKEN_SECRET, {
    expiresIn: parseDurationToSeconds(REFRESH_TOKEN_EXPIRES_IN)
  });
}

function blacklistKey(jti: string) {
  return `session:blacklist:${jti}`;
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      avatarUrl: true,
      passwordHash: true,
      isActive: true
    }
  });

  // Avoid user enumeration: same error for missing/wrong password/inactive.
  if (!user || !user.isActive) {
    throw unauthorized('Invalid credentials');
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    throw unauthorized('Invalid credentials');
  }

  const accessToken = signAccessToken({ id: user.id, role: user.role, email: user.email });
  const jti = uuid();
  const refreshToken = signRefreshToken({ id: user.id, jti });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl
    }
  };
}

export async function refresh(refreshToken: string) {
  let decoded: unknown;

  try {
    decoded = jwt.verify(refreshToken, env.REFRESH_TOKEN_SECRET);
  } catch {
    throw unauthorized('Invalid token');
  }

  const payload = refreshTokenPayloadSchema.parse(decoded);

  const isBlacklisted = await redis.get(blacklistKey(payload.jti));
  if (isBlacklisted) {
    throw unauthorized('Invalid token');
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.id },
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true
    }
  });

  if (!user || !user.isActive) {
    throw unauthorized('Invalid token');
  }

  const accessToken = signAccessToken({ id: user.id, role: user.role, email: user.email });
  return { accessToken };
}

export async function logout(refreshToken: string) {
  let decoded: unknown;

  try {
    decoded = jwt.verify(refreshToken, env.REFRESH_TOKEN_SECRET);
  } catch {
    // If the token is already invalid/expired, treat as logged out.
    return;
  }

  const payload = refreshTokenPayloadSchema.parse(decoded);

  const exp = z
    .object({ exp: z.number().int().positive().optional() })
    .passthrough()
    .parse(decoded).exp;

  const nowSeconds = Math.floor(Date.now() / 1000);
  const ttlSeconds = exp ? Math.max(0, exp - nowSeconds) : 60 * 60 * 24 * 7;

  if (ttlSeconds > 0) {
    await redis.setex(blacklistKey(payload.jti), ttlSeconds, '1');
  }
}

export async function changePassword(userId: string, oldPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, passwordHash: true, isActive: true }
  });

  if (!user || !user.isActive) {
    throw unauthorized('Invalid credentials');
  }

  const ok = await bcrypt.compare(oldPassword, user.passwordHash);
  if (!ok) {
    throw unauthorized('Invalid credentials');
  }

  const newHash = await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: newHash }
  });
}
