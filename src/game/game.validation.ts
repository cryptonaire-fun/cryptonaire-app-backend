import { z } from 'zod';

export const generateQuestionsSchema = z.object({
    previousQuestions: z.array(z.string()).optional().default([]),
    level: z.number().int().min(1, 'Level must be at least 1').max(100, 'Level must be at most 100').optional().default(1),
});

export const addPointsSchema = z.object({
    points: z.number().int().positive('Points must be a positive integer'),
});

export const addTokensSchema = z.object({
    tokens: z.number().positive('Tokens must be a positive number'),
});

export const addBothSchema = z.object({
    points: z.number().int().positive('Points must be a positive integer'),
});

export type GenerateQuestionsInput = z.infer<typeof generateQuestionsSchema>;
export type AddPointsInput = z.infer<typeof addPointsSchema>;
export type AddTokensInput = z.infer<typeof addTokensSchema>;
export type AddBothInput = z.infer<typeof addBothSchema>;
