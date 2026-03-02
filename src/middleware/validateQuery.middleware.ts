import type { Request, Response, NextFunction } from 'express';
import type { ZodType } from 'zod/v4';

/**
 * Generic Zod validation middleware for `req.query`.
 * Works the same as `validate()` but targets query parameters instead of body.
 */
export function validateQuery(schema: ZodType) {
    return (req: Request, res: Response, next: NextFunction): void => {
        const result = schema.safeParse(req.query);

        if (!result.success) {
            const errors = result.error.issues.map((issue) => ({
                field: issue.path.join('.'),
                message: issue.message,
            }));

            res.status(400).json({
                success: false,
                error: 'Invalid query parameters',
                details: errors,
            });
            return;
        }

        // Overwrite req.query with parsed + transformed values
        req.query = result.data as typeof req.query;
        next();
    };
}
