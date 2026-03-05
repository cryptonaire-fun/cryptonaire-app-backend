import type { Request, Response, NextFunction } from 'express';
import { UserService } from './user.service.ts';
import type { AuthJwtPayload } from '../types/express.d.ts';

export class UserController {
    public static async getUserDetailsHandler(req: Request, res: Response, next: NextFunction) {
        try {
            const user = req.user as AuthJwtPayload;
            const details = await UserService.getUserDetails(user.userId);

            res.status(200).json({
                success: true,
                data: details,
            });
        } catch (error) {
            next(error);
        }
    }

    public static async getUserPointsHandler(req: Request, res: Response, next: NextFunction) {
        try {
            const user = req.user as AuthJwtPayload;
            const data = await UserService.getUserPoints(user.userId);

            res.status(200).json({
                success: true,
                data,
            });
        } catch (error) {
            next(error);
        }
    }

    public static async getUserTokensHandler(req: Request, res: Response, next: NextFunction) {
        try {
            const user = req.user as AuthJwtPayload;
            const data = await UserService.getUserTokens(user.userId);

            res.status(200).json({
                success: true,
                data,
            });
        } catch (error) {
            next(error);
        }
    }

    public static async getUserProgressHandler(req: Request, res: Response, next: NextFunction) {
        try {
            const user = req.user as AuthJwtPayload;
            const data = await UserService.getUserProgress(user.userId);

            res.status(200).json({
                success: true,
                data,
            });
        } catch (error) {
            next(error);
        }
    }
    public static async updateUsernameHandler(req: Request, res: Response, next: NextFunction) {
        try {
            const user = req.user as AuthJwtPayload;
            const { username } = req.body as { username: string };
            const updated = await UserService.updateUsername(user.userId, username);

            res.status(200).json({
                success: true,
                data: updated,
            });
        } catch (error) {
            next(error);
        }
    }
}

