import Groq from 'groq-sdk';
import { config } from '../../config/index.ts';
import { UserModel } from '../user/user.model.ts';
import { upsertLeaderboardEntry } from '../leaderboard/leaderboard.service.ts';

const groq = new Groq({ apiKey: config.groqApiKey });

/**
 * Progression formula: questions required to advance from level N to N+1 = N × 10.
 * Total to reach level N: 10 × (N × (N-1) / 2)
 * This function calculates current level from cumulative questions answered.
 */
export function calculateLevel(questionsAnswered: number): number {
    let level = 1;
    let totalRequired = 0;
    while (true) {
        const toNextLevel = level * 10;
        if (questionsAnswered < totalRequired + toNextLevel) break;
        totalRequired += toNextLevel;
        level++;
    }
    return level;
}

export class GameService {

    /**
     * Increment user points (records a correct answer).
     * Also increments questionsAnswered and recalculates the user's level.
     */
    public static async addToUserPoints(userId: string, pointsAmount: number) {
        // First increment questionsAnswered, then recalculate level
        const interim = await UserModel.findByIdAndUpdate(
            userId,
            { $inc: { points: pointsAmount, questionsAnswered: 1 } },
            { new: true, select: 'points skrTokens questionsAnswered level walletAddress' }
        );
        if (!interim) throw new Error('User not found');

        const newLevel = calculateLevel(interim.questionsAnswered);

        // Only write level if it changed (avoids unnecessary writes)
        if (newLevel !== interim.level) {
            interim.level = newLevel;
            await UserModel.findByIdAndUpdate(userId, { $set: { level: newLevel } });
        }

        // Sync points to leaderboard
        if (interim.walletAddress) {
            await upsertLeaderboardEntry(interim.walletAddress, { points: interim.points });
        }

        return interim;
    }

    /**
     * Increment user skrTokens
     */
    public static async addToUserTokens(userId: string, tokensAmount: number) {
        const user = await UserModel.findByIdAndUpdate(
            userId,
            { $inc: { skrTokens: tokensAmount } },
            { new: true, select: 'points skrTokens' }
        );
        if (!user) throw new Error("User not found");
        return user;
    }

    /**
     * Increment both user points and skrTokens
     */
    public static async addToUserPointsAndTokens(userId: string, pointsAmount: number, tokensAmount: number) {
        // Increment points, tokens, and questionsAnswered
        const user = await UserModel.findByIdAndUpdate(
            userId,
            { $inc: { points: pointsAmount, skrTokens: tokensAmount, questionsAnswered: 1 } },
            { new: true, select: 'points skrTokens questionsAnswered level walletAddress' }
        );
        if (!user) throw new Error("User not found");

        const newLevel = calculateLevel(user.questionsAnswered);

        // Only write level if it changed (avoids unnecessary writes)
        if (newLevel !== user.level) {
            user.level = newLevel;
            await UserModel.findByIdAndUpdate(userId, { $set: { level: newLevel } });
        }

        // Sync points to leaderboard
        if (user.walletAddress) {
            await upsertLeaderboardEntry(user.walletAddress, { points: user.points });
        }

        return user;
    }

    public static async generateQuestions(previousQuestions: string[] = [], level: number = 1) {
        // Map level (1–100) to a human-readable difficulty descriptor for the prompt
        const difficulty =
            level <= 20 ? 'very easy beginner-level' :
                level <= 40 ? 'easy and straightforward' :
                    level <= 60 ? 'moderate intermediate-level' :
                        level <= 80 ? 'hard and advanced' :
                            'extremely difficult expert-level';

        let systemPrompt = `You are a trivia question generator for a crypto-themed game called "Cryptonaire".
Your task is to generate 20 unique multiple-choice questions about cryptocurrency, blockchain, Web3, trading, and crypto history.
The difficulty level is ${level}/100, so the questions must be ${difficulty}. The higher the difficulty, the more obscure, technical, and nuanced the questions and wrong options should be.

Each question must be formatted as a JSON object with the following fields:
- "question": A string containing the question text.
- "options": An array of exactly 4 strings representing the answer choices.
- "correctAnswer": A string that exactly matches one of the options.

Return ONLY a JSON array containing exactly 20 question objects. Do not wrap it in markdown blockquotes or provide any conversational text.`;

        if (previousQuestions.length > 0) {
            systemPrompt += `\n\nCRITICAL: Do not generate questions that are identical or extremely similar to the following previously generated questions:\n${previousQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`;
        }

        try {
            const completion = await groq.chat.completions.create({
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt,
                    },
                    {
                        role: 'user',
                        content: 'Generate 20 new crypto trivia questions.',
                    },
                ],
                model: 'llama-3.1-8b-instant',
                temperature: 0.7,
                stream: false,
                response_format: { type: 'json_object' }, // Enforce JSON output if model supports it, but fallback needed
            });

            const content = completion.choices[0]?.message?.content || '[]';

            // Try to parse the response as JSON (array or object containing array)
            let parsedQuestions;
            try {
                parsedQuestions = JSON.parse(content);
                // Handle cases where the model returns an object like { "questions": [...] }
                if (!Array.isArray(parsedQuestions) && parsedQuestions.questions && Array.isArray(parsedQuestions.questions)) {
                    parsedQuestions = parsedQuestions.questions;
                }
            } catch (err) {
                console.error("Failed to parse Groq response:", content);
                throw new Error("Invalid response format from AI. Please try again.");
            }

            if (!Array.isArray(parsedQuestions)) {
                throw new Error("AI did not return an array of questions.");
            }

            return parsedQuestions;

        } catch (error: any) {
            console.error("GameService.generateQuestions error:", error);
            throw new Error(error.message || 'Failed to generate questions from AI.');
        }
    }
}
