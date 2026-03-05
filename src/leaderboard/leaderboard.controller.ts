import type { Request, Response, NextFunction } from 'express';
import {
    getLeaderboard,
    getLeaderboardEntry,
    upsertLeaderboardEntry,
    removeLeaderboardEntry,
} from './leaderboard.service.ts';
import type {
    GetLeaderboardQuery,
    UpdateLeaderboardInput,
} from './leaderboard.validation.ts';

/**
 * GET /leaderboard
 * Returns the sorted leaderboard with pagination.
 */
export async function getLeaderboardController(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const query = (req as any).validatedQuery as GetLeaderboardQuery;
        const result = await getLeaderboard(query);

        res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * GET /leaderboard/:address
 * Returns a single leaderboard entry by wallet address.
 */
export async function getLeaderboardEntryController(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const address = req.params['address'] as string;
        const entry = await getLeaderboardEntry(address);

        if (!entry) {
            res.status(404).json({
                success: false,
                error: 'Leaderboard entry not found',
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: entry,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * PUT /leaderboard/:address
 * Upsert a leaderboard entry and re-rank the entire board.
 * Protected — requires a valid JWT (auth middleware applied in router).
 */
export async function updateLeaderboardController(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const address = req.params['address'] as string;
        const input = req.body as UpdateLeaderboardInput;

        const entry = await upsertLeaderboardEntry(address, input);

        res.status(200).json({
            success: true,
            data: entry,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * DELETE /leaderboard/:address
 * Remove an entry from the leaderboard and re-rank remaining entries.
 * Protected — requires a valid JWT (auth middleware applied in router).
 */
export async function removeLeaderboardController(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const address = req.params['address'] as string;
        const deleted = await removeLeaderboardEntry(address);

        if (!deleted) {
            res.status(404).json({
                success: false,
                error: 'Leaderboard entry not found',
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: 'Entry removed and leaderboard re-ranked',
        });
    } catch (error) {
        next(error);
    }
}
