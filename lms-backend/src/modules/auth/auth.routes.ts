import { Router } from 'express';
import { z } from 'zod';

import { authenticate } from '@/middleware/auth';
import { authLimiter } from '@/middleware/rateLimiter';
import { validate } from '@/middleware/validate';

import { authController } from './auth.controller';

export const authRouter = Router();

const loginSchema = z.object({
	email: z.string().email(),
	password: z.string().min(1)
});

const changePasswordSchema = z.object({
	oldPassword: z.string().min(1),
	newPassword: z.string().min(8)
});

authRouter.post('/login', authLimiter, validate(loginSchema), authController.login);

// Refresh uses httpOnly cookie; do not require access token here.
authRouter.post('/refresh', authLimiter, authController.refresh);

authRouter.post('/logout', authenticate, authLimiter, authController.logout);

authRouter.post(
	'/change-password',
	authenticate,
	authLimiter,
	validate(changePasswordSchema),
	authController.changePassword
);
