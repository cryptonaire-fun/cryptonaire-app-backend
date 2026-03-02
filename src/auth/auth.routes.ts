import { Router } from 'express';
import { verifyAuthController } from './auth.controller.ts';
import { validate } from '../middleware/validate.middleware.ts';
import { verifyAuthSchema } from './auth.validation.ts';

const authRouter = Router();

/**
 * POST /auth/verify
 * Verify a Sign In with Solana payload and return JWT + user.
 */
authRouter.post('/verify', validate(verifyAuthSchema), verifyAuthController);

export default authRouter;
