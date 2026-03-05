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

        // Attach the validated and transformed data to a new property
        // because req.query is read-only in Express and cannot be safely reassigned
        (req as any).validatedQuery = result.data;

        next();
    };
}
