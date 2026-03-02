import { Router } from 'express';
import {
    getLeaderboardController,
    getLeaderboardEntryController,
    updateLeaderboardController,
    removeLeaderboardController,
} from './leaderboard.controller.ts';
import { validate } from '../middleware/validate.middleware.ts';
import { validateQuery } from '../middleware/validateQuery.middleware.ts';
import { authMiddleware } from '../middleware/auth.middleware.ts';
import {
    updateLeaderboardSchema,
    getLeaderboardSchema,
} from './leaderboard.validation.ts';

const leaderboardRouter = Router();

/**
 * GET /leaderboard
 * Public — returns the full ranked list with optional pagination.
 * Query params: ?limit=50&offset=0
 */
leaderboardRouter.get(
    '/',
    validateQuery(getLeaderboardSchema),
    getLeaderboardController
);

/**
 * GET /leaderboard/:address
 * Public — returns a single entry by wallet address.
 */
leaderboardRouter.get('/:address', getLeaderboardEntryController);

/**
 * PUT /leaderboard/:address
 * Protected — update (or create) a wallet's points and auto re-rank.
 */
leaderboardRouter.put(
    '/:address',
    authMiddleware,
    validate(updateLeaderboardSchema),
    updateLeaderboardController
);

/**
 * DELETE /leaderboard/:address
 * Protected — remove entry and re-rank remaining entries.
 */
leaderboardRouter.delete(
    '/:address',
    authMiddleware,
    removeLeaderboardController
);

export default leaderboardRouter;
