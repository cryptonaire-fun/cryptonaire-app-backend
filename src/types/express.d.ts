import type { JwtPayload } from 'jsonwebtoken';

/**
 * JWT payload shape issued by the auth service.
 */
export interface AuthJwtPayload extends JwtPayload {
    userId: string;
    address: string;
}

/**
 * Augment Express Request to include the decoded user payload.
 */
declare global {
    namespace Express {
        interface Request {
            user?: AuthJwtPayload;
        }
    }
}
