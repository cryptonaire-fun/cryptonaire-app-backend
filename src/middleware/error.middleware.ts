import type { Request, Response, NextFunction } from 'express';

/**
 * Global error handler middleware.
 * Catches unhandled errors and returns a structured JSON response.
 * Must be registered after all routes.
 */
export function errorMiddleware(
    err: Error,
    _req: Request,
    res: Response,
    _next: NextFunction
): void {
    console.error('❌ Unhandled error:', err.message);

    if (process.env.NODE_ENV === 'development') {
        console.error(err.stack);
    }

    const statusCode = (err as any).statusCode || 500;
    const message =
        statusCode === 500 ? 'Internal server error' : err.message;

    res.status(statusCode).json({
        success: false,
        error: message,
        ...(process.env.NODE_ENV === 'development' && {
            stack: err.stack,
        }),
    });
}
