import type { Request, Response, NextFunction } from 'express';
import { verifyAndAuthenticate, AuthError } from './auth.service.ts';
import type { VerifyAuthInput } from './auth.validation.ts';

/**
 * POST /auth/verify
 *
 * Accepts a SIWS payload (address, signedMessage, signature),
 * verifies the signature, and returns a JWT + user record.
 */
export async function verifyAuthController(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const payload = req.body as VerifyAuthInput;
        const result = await verifyAndAuthenticate(payload);

        res.status(200).json({
            success: true,
            data: {
                token: result.token,
                user: result.user,
            },
        });
    } catch (error) {
        if (error instanceof AuthError) {
            res.status(error.statusCode).json({
                success: false,
                error: error.message,
            });
            return;
        }
        next(error);
    }
}
