import type { Request, Response, NextFunction } from 'express';
import { GameService } from './game.service.ts';
import type { GenerateQuestionsInput, AddPointsInput, AddTokensInput, AddBothInput } from './game.validation.ts';
import type { AuthJwtPayload } from '../types/express.d.ts';

export class GameController {
    public static async generateQuestionsHandler(
        req: Request<{}, {}, GenerateQuestionsInput>,
        res: Response,
        next: NextFunction
    ) {
        try {
            const { previousQuestions, level } = req.body;

            const questions = await GameService.generateQuestions(previousQuestions, level);

            res.status(200).json({
                success: true,
                count: questions.length,
                data: questions,
            });
        } catch (error) {
            next(error);
        }
    }

    public static async addToUserPointsHandler(
        req: Request<{}, {}, AddPointsInput>,
        res: Response,
        next: NextFunction
    ) {
        try {
            const { points } = req.body;
            // req.user is guaranteed to be present from authMiddleware
            const user = req.user as AuthJwtPayload;

            const updatedUser = await GameService.addToUserPoints(user.userId, points);

            res.status(200).json({
                success: true,
                data: updatedUser,
            });
        } catch (error) {
            next(error);
        }
    }

    public static async addToUserTokensHandler(
        req: Request<{}, {}, AddTokensInput>,
        res: Response,
        next: NextFunction
    ) {
        try {
            const { tokens } = req.body;
            const user = req.user as AuthJwtPayload;

            const updatedUser = await GameService.addToUserTokens(user.userId, tokens);

            res.status(200).json({
                success: true,
                data: updatedUser,
            });
        } catch (error) {
            next(error);
        }
    }

    public static async addToUserPointsAndTokensHandler(
        req: Request<{}, {}, AddBothInput>,
        res: Response,
        next: NextFunction
    ) {
        try {
            const { points } = req.body;
            const user = req.user as AuthJwtPayload;

            const updatedUser = await GameService.addToUserPointsAndTokens(user.userId, points);

            res.status(200).json({
                success: true,
                data: updatedUser,
            });
        } catch (error) {
            next(error);
        }
    }
}
