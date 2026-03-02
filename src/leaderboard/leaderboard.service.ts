import { LeaderboardModel } from './leaderboard.model.ts';
import type {
    GetLeaderboardQuery,
    UpdateLeaderboardInput,
} from './leaderboard.validation.ts';

/**
 * Fetch the leaderboard, sorted by rank ascending (rank 1 = highest points).
 */
export async function getLeaderboard(query: GetLeaderboardQuery) {
    const { limit, offset } = query;

    const [entries, total] = await Promise.all([
        LeaderboardModel.find()
            .sort({ rank: 1 })
            .skip(offset)
            .limit(limit)
            .lean(),
        LeaderboardModel.countDocuments(),
    ]);

    return { entries, total, limit, offset };
}

/**
 * Get a single leaderboard entry by wallet address.
 */
export async function getLeaderboardEntry(walletAddress: string) {
    const entry = await LeaderboardModel.findOne({ walletAddress }).lean();
    return entry ?? null;
}

/**
 * Upsert a leaderboard entry for the given wallet address.
 * After updating points, re-ranks all entries by points descending
 * so rank 1 always corresponds to the highest score.
 *
 * Re-ranking is done with a bulk write for efficiency.
 */
export async function upsertLeaderboardEntry(
    walletAddress: string,
    input: UpdateLeaderboardInput
) {
    // Upsert the entry
    await LeaderboardModel.findOneAndUpdate(
        { walletAddress },
        { $set: { points: input.points } },
        { upsert: true, new: true }
    );

    // Re-rank all entries sorted by points descending
    const allEntries = await LeaderboardModel.find()
        .sort({ points: -1, updatedAt: 1 }) // tie-break: earlier update = better rank
        .select('_id')
        .lean();

    if (allEntries.length > 0) {
        const bulkOps = allEntries.map((entry, index) => ({
            updateOne: {
                filter: { _id: entry._id },
                update: { $set: { rank: index + 1 } },
            },
        }));

        await LeaderboardModel.bulkWrite(bulkOps, { ordered: false });
    }

    // Return the updated entry with its new rank
    const updated = await LeaderboardModel.findOne({ walletAddress }).lean();
    return updated;
}

/**
 * Remove an entry from the leaderboard and re-rank remaining entries.
 */
export async function removeLeaderboardEntry(walletAddress: string) {
    const deleted = await LeaderboardModel.findOneAndDelete({ walletAddress }).lean();

    if (!deleted) {
        return null;
    }

    // Re-rank remaining entries
    const remaining = await LeaderboardModel.find()
        .sort({ points: -1, updatedAt: 1 })
        .select('_id')
        .lean();

    if (remaining.length > 0) {
        const bulkOps = remaining.map((entry, index) => ({
            updateOne: {
                filter: { _id: entry._id },
                update: { $set: { rank: index + 1 } },
            },
        }));

        await LeaderboardModel.bulkWrite(bulkOps, { ordered: false });
    }

    return deleted;
}
