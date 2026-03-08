import { Router } from 'express';
import { UserController } from './user.controller.ts';
import { authMiddleware } from '../middleware/auth.middleware.ts';

const router = Router();

// Retrieve User Details
router.get(
    '/me',
    authMiddleware,
    UserController.getUserDetailsHandler
);

// Retrieve User Points
router.get(
    '/me/points',
    authMiddleware,
    UserController.getUserPointsHandler
);

// Retrieve User Tokens
router.get(
    '/me/tokens',
    authMiddleware,
    UserController.getUserTokensHandler
);

// Retrieve User Progress (level, questions answered, questions to next level)
router.get(
    '/me/progress',
    authMiddleware,
    UserController.getUserProgressHandler
);

// Update Username
router.patch(
    '/me/username',
    authMiddleware,
    UserController.updateUsernameHandler
);

// Withdraw SKR tokens to wallet
router.post(
    '/me/withdraw',
    authMiddleware,
    UserController.withdrawSkrHandler
);

export default router;
