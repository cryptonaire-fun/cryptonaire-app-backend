import type { Request, Response, NextFunction } from 'express';
import type { ZodType } from 'zod/v4';

/**
 * Generic Zod validation middleware factory.
 * Validates `req.body` against the provided schema.
 * Returns 400 with structured error details on validation failure.
 */
export function validate(schema: ZodType) {
    return (req: Request, res: Response, next: NextFunction): void => {
        const result = schema.safeParse(req.body);

        if (!result.success) {
            const errors = result.error.issues.map((issue) => ({
                field: issue.path.join('.'),
                message: issue.message,
            }));

            res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors,
            });
            return;
        }

        // Replace body with parsed (and potentially transformed) data
        req.body = result.data;
        next();
    };
}
