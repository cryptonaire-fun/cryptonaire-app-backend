import { z } from 'zod/v4';

/**
 * Query params for GET /leaderboard
 */
export const getLeaderboardSchema = z.object({
    limit: z
        .string()
        .optional()
        .transform((v) => (v ? parseInt(v, 10) : 100))
        .pipe(z.number().int().min(1).max(500)),
    offset: z
        .string()
        .optional()
        .transform((v) => (v ? parseInt(v, 10) : 0))
        .pipe(z.number().int().min(0)),
});

/**
 * Request body for PUT /leaderboard/:address
 * Updates the points for a given wallet address.
 * Rank is auto-recalculated after the update.
 */
export const updateLeaderboardSchema = z.object({
    points: z.number().int().min(0, 'Points must be a non-negative integer'),
});

export type GetLeaderboardQuery = z.infer<typeof getLeaderboardSchema>;
export type UpdateLeaderboardInput = z.infer<typeof updateLeaderboardSchema>;
