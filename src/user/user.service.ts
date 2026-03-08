import { UserModel } from './user.model.ts';
import { calculateLevel } from '../game/game.service.ts';

export class UserService {
    /**
     * Get full user details
     */
    public static async getUserDetails(userId: string) {
        const user = await UserModel.findById(userId);
        if (!user) throw new Error("User not found");
        return user;
    }

    /**
     * Get only user points
     */
    public static async getUserPoints(userId: string) {
        const user = await UserModel.findById(userId).select('points');
        if (!user) throw new Error("User not found");
        return { points: user.points };
    }

    /**
     * Get only user skrTokens
     */
    public static async getUserTokens(userId: string) {
        const user = await UserModel.findById(userId).select('skrTokens');
        if (!user) throw new Error("User not found");
        return { skrTokens: user.skrTokens };
    }

    /**
     * Get user progression: level, total answered, answered towards next level,
     * and total questions required to advance to next level.
     */
    public static async getUserProgress(userId: string) {
        const user = await UserModel.findById(userId).select('level questionsAnswered');
        if (!user) throw new Error('User not found');

        const { questionsAnswered } = user;

        // Walk the thresholds to find how many questions were answered before this level started
        let level = 1;
        let totalRequired = 0;
        while (true) {
            const toNextLevel = level * 10;
            if (questionsAnswered < totalRequired + toNextLevel) break;
            totalRequired += toNextLevel;
            level++;
        }

        const requiredForNextLevel = level * 10;
        const answeredTowardsNextLevel = questionsAnswered - totalRequired;

        return {
            level,
            questionsAnswered,
            answeredTowardsNextLevel,
            requiredForNextLevel,
        };
    }
    /**
     * Update a user's username. Validates uniqueness before saving.
     */
    public static async updateUsername(userId: string, newUsername: string) {
        const trimmed = newUsername.trim();

        if (!trimmed) {
            throw Object.assign(new Error('Username cannot be empty'), { statusCode: 400 });
        }

        if (trimmed.length < 3 || trimmed.length > 30) {
            throw Object.assign(
                new Error('Username must be between 3 and 30 characters'),
                { statusCode: 400 }
            );
        }

        // Check uniqueness (case-insensitive)
        const existing = await UserModel.findOne({
            username: { $regex: new RegExp(`^${trimmed}$`, 'i') },
            _id: { $ne: userId },
        });

        if (existing) {
            throw Object.assign(new Error('Username is already taken'), { statusCode: 409 });
        }

        const user = await UserModel.findByIdAndUpdate(
            userId,
            { username: trimmed },
            { returnDocument: 'after' }
        );

        if (!user) throw new Error('User not found');
        return user;
    }
}


