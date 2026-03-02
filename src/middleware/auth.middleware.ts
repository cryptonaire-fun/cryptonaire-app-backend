import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../../config/index.ts';
import type { AuthJwtPayload } from '../types/express.d.ts';

/**
 * JWT authentication middleware.
 * Extracts the Bearer token from the Authorization header,
 * verifies it, and attaches the decoded payload to `req.user`.
 *
 * Apply to any route that requires authentication.
 */
export function authMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({
            success: false,
            error: 'No token provided',
        });
        return;
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
        res.status(401).json({
            success: false,
            error: 'No token provided',
        });
        return;
    }

    try {
        const decoded = jwt.verify(token, config.jwtSecret) as AuthJwtPayload;
        req.user = decoded;
        next();
    } catch {
        res.status(401).json({
            success: false,
            error: 'Invalid or expired token',
        });
    }
}
