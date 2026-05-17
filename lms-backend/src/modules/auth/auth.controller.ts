import { env } from '@/config/env';
import { asyncHandler } from '@/utils/asyncHandler';
import { unauthorized } from '@/utils/apiError';

import {
  changePassword,
  login,
  logout,
  refresh,
  REFRESH_COOKIE_NAME
} from './auth.service';

function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000
  };
}

export const authController = {
  login: asyncHandler(async (req, res) => {
    // req.body is validated by validate(loginSchema) in auth.routes.ts
    const body = req.body as { email: string; password: string };
    const result = await login(body.email, body.password);

    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, refreshCookieOptions());

    return res.status(200).json({
      accessToken: result.accessToken,
      user: result.user
    });
  }),

  refresh: asyncHandler(async (req, res) => {
    const cookieValue = req.cookies?.[REFRESH_COOKIE_NAME];
    const token = typeof cookieValue === 'string' ? cookieValue : undefined;
    if (!token) throw unauthorized('No refresh token');

    const result = await refresh(token);
    return res.status(200).json(result);
  }),

  logout: asyncHandler(async (req, res) => {
    const cookieValue = req.cookies?.[REFRESH_COOKIE_NAME];
    const token = typeof cookieValue === 'string' ? cookieValue : undefined;
    if (token) {
      await logout(token);
    }

    res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions());
    return res.status(200).json({ status: 'ok' });
  }),

  changePassword: asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();

    // req.body is validated by validate(changePasswordSchema) in auth.routes.ts
    const body = req.body as { oldPassword: string; newPassword: string };
    await changePassword(req.user.id, body.oldPassword, body.newPassword);

    res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions());
    return res.status(200).json({ status: 'ok' });
  })
};
