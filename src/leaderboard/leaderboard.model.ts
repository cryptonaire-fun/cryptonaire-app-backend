import mongoose, { Schema, type Document } from 'mongoose';

/**
 * A single entry on the leaderboard.
 * Rank is derived from the sorted order by points (descending),
 * but also stored explicitly so it can be queried directly.
 */
export interface ILeaderboardEntry {
    walletAddress: string;
    points: number;
    rank: number;
    updatedAt: Date;
}

export interface ILeaderboardDocument extends ILeaderboardEntry, Document { }

const leaderboardSchema = new Schema<ILeaderboardDocument>(
    {
        walletAddress: {
            type: String,
            required: true,
            unique: true,
            index: true,
            trim: true,
        },
        points: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
        },
        rank: {
            type: Number,
            required: true,
            default: 0,
            min: 1,
        },
    },
    {
        timestamps: { createdAt: false, updatedAt: true },
        toJSON: {
            transform(_doc, ret: Record<string, any>) {
                ret.id = ret._id;
                delete ret._id;
                delete ret.__v;
                return ret;
            },
        },
    }
);

// Index for efficient sorted leaderboard queries
leaderboardSchema.index({ points: -1 });
leaderboardSchema.index({ rank: 1 });

export const LeaderboardModel = mongoose.model<ILeaderboardDocument>(
    'Leaderboard',
    leaderboardSchema
);
