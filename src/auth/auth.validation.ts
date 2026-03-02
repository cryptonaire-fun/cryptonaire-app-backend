import { z } from 'zod/v4';

/**
 * Validation schema for POST /auth/verify request body.
 * Ensures all three fields are present and properly formatted.
 */
export const verifyAuthSchema = z.object({
    address: z
        .string()
        .min(32, 'Invalid Solana address')
        .max(44, 'Invalid Solana address'),
    signedMessage: z
        .string()
        .min(1, 'Signed message is required'),
    signature: z
        .string()
        .min(1, 'Signature is required'),
});

export type VerifyAuthInput = z.infer<typeof verifyAuthSchema>;
