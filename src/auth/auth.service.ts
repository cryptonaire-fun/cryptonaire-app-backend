import nacl from 'tweetnacl';
import { PublicKey } from '@solana/web3.js';
import jwt from 'jsonwebtoken';
import { UserModel } from '../user/user.model.ts';
import { upsertLeaderboardEntry, getLeaderboardEntry } from '../leaderboard/leaderboard.service.ts';
import { config } from '../../config/index.ts';
import type { VerifyAuthInput } from './auth.validation.ts';

/** Maximum age (in ms) of an issuedAt timestamp before it's considered expired. */
const MAX_PAYLOAD_AGE_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Parse the `Issued At` field from a SIWS-formatted message.
 *
 * The Sign-In with Solana message format includes a line like:
 *   Issued At: 2024-01-01T00:00:00.000Z
 */
function parseIssuedAt(messageText: string): Date {
    // Match "Issued At: <ISO timestamp>"
    const match = messageText.match(/Issued At:\s*(.+)/i);
    if (!match?.[1]) {
        throw new AuthError('Missing issuedAt in signed message', 400);
    }

    const date = new Date(match[1].trim());
    if (isNaN(date.getTime())) {
        throw new AuthError('Invalid issuedAt timestamp', 400);
    }

    return date;
}

/**
 * Custom error class for auth-specific failures.
 */
export class AuthError extends Error {
    public statusCode: number;

    constructor(message: string, statusCode: number = 401) {
        super(message);
        this.name = 'AuthError';
        this.statusCode = statusCode;
    }
}

/**
 * Generate a unique-ish display username seeded from the wallet address.
 * Format: Crypto_<first 6 chars of address>_<4-char random suffix>
 * e.g. Crypto_5Bpd2v_x3kQ
 */
function generateUsername(walletAddress: string): string {
    const prefix = walletAddress.slice(0, 6);
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const suffix = Array.from({ length: 4 }, () =>
        chars[Math.floor(Math.random() * chars.length)]
    ).join('');
    return `Crypto_${prefix}_${suffix}`;
}

/**
 * Verify a Sign In with Solana payload and authenticate the user.
 *
 * Steps:
 * 1. Decode signedMessage and signature from Base64
 * 2. Derive public key from address via @solana/web3.js
 * 3. Verify signature with nacl.sign.detached.verify()
 * 4. Parse issuedAt and reject if > 5 minutes old
 * 5. Find or create user by walletAddress
 * 6. Update lastLoginAt
 * 7. Issue and return JWT
 */
export async function verifyAndAuthenticate(payload: VerifyAuthInput) {
    const { address, signedMessage, signature } = payload;

    // 1. Decode from Base64
    const messageBytes = Buffer.from(signedMessage, 'base64');
    const signatureBytes = Buffer.from(signature, 'base64');

    // 2. Derive public key bytes
    let publicKeyBytes: Uint8Array;
    try {
        publicKeyBytes = new PublicKey(address).toBytes();
    } catch {
        throw new AuthError('Invalid Solana address', 400);
    }

    // 3. Verify signature
    const isValid = nacl.sign.detached.verify(
        messageBytes,
        signatureBytes,
        publicKeyBytes
    );

    if (!isValid) {
        throw new AuthError('Signature verification failed');
    }

    // 4. Check issuedAt recency
    const messageText = messageBytes.toString('utf8');
    const issuedAt = parseIssuedAt(messageText);
    const ageMs = Date.now() - issuedAt.getTime();

    if (ageMs > MAX_PAYLOAD_AGE_MS) {
        throw new AuthError('Sign-in payload has expired');
    }

    // 5. Find or create user
    let user = await UserModel.findOne({ walletAddress: address });
    let isNewUser = false;

    if (!user) {
        isNewUser = true;
        const username = generateUsername(address);
        user = await UserModel.create({ walletAddress: address, username });

        // Seed a leaderboard entry for the new user (0 points, ranked last)
        await upsertLeaderboardEntry(address, { points: 0 });
    } else if (!user.username) {
        // Back-fill username for legacy accounts that somehow have none
        user.username = generateUsername(address);
    }

    if (!isNewUser) {
        // Back-fill leaderboard entry for existing users testing the new feature
        const entry = await getLeaderboardEntry(address);
        if (!entry) {
            await upsertLeaderboardEntry(address, { points: user.points || 0 });
        }
    }

    // 6. Update last login
    user.lastLoginAt = new Date();
    await user.save();

    // 7. Issue JWT
    const token = jwt.sign(
        { userId: user._id.toString(), address },
        config.jwtSecret as jwt.Secret,
        { expiresIn: config.jwtExpiresIn as string } as jwt.SignOptions
    );

    return { token, user };
}
