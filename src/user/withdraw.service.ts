import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import {
    getOrCreateAssociatedTokenAccount,
    transfer,
    getMint,
} from '@solana/spl-token';
import { config } from '../../config/index.ts';
import { UserModel } from './user.model.ts';

function getConnection(): Connection {
    return new Connection(config.solana.rpcUrl, 'confirmed');
}

function getTreasuryKeypair(): Keypair {
    const raw = config.solana.treasuryPrivateKey;
    if (!raw) {
        throw Object.assign(
            new Error('Treasury wallet is not configured'),
            { statusCode: 503 }
        );
    }
    return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));
}

function getMintAddress(): PublicKey {
    const addr = config.solana.skrMintAddress;
    if (!addr) {
        throw Object.assign(
            new Error('SKR mint address is not configured'),
            { statusCode: 503 }
        );
    }
    return new PublicKey(addr);
}

export class WithdrawService {
    /**
     * Deducts `amount` skrTokens from the user's DB balance and transfers
     * the equivalent SPL tokens from the treasury to the user's wallet on devnet.
     *
     * The DB deduction is atomic: it only succeeds if the user has sufficient balance.
     * If the on-chain transfer fails, the deduction is rolled back.
     */
    static async withdrawSkr(userId: string, amount: number): Promise<{ txSignature: string; amount: number }> {
        if (typeof amount !== 'number' || !isFinite(amount) || amount <= 0) {
            throw Object.assign(
                new Error('Amount must be a positive number'),
                { statusCode: 400 }
            );
        }

        // Atomically check balance and deduct — prevents race conditions
        const user = await UserModel.findOneAndUpdate(
            { _id: userId, skrTokens: { $gte: amount } },
            { $inc: { skrTokens: -amount } },
            { returnDocument: 'after' }
        );

        if (!user) {
            throw Object.assign(
                new Error('Insufficient SKR token balance'),
                { statusCode: 400 }
            );
        }

        try {
            const connection = getConnection();
            const treasury = getTreasuryKeypair();
            const mintPubkey = getMintAddress();
            const userPubkey = new PublicKey(user.walletAddress);

            // Read decimals from the mint so raw amount is always correct
            const mintInfo = await getMint(connection, mintPubkey);
            const rawAmount = BigInt(Math.round(amount * 10 ** mintInfo.decimals));

            // Get treasury ATA (must already exist and be funded)
            const treasuryAta = await getOrCreateAssociatedTokenAccount(
                connection,
                treasury,
                mintPubkey,
                treasury.publicKey
            );

            // Get or create user ATA — treasury pays for account creation if needed
            const userAta = await getOrCreateAssociatedTokenAccount(
                connection,
                treasury,
                mintPubkey,
                userPubkey
            );

            const txSignature = await transfer(
                connection,
                treasury,           // payer & fee payer
                treasuryAta.address,
                userAta.address,
                treasury,           // authority over treasury ATA
                rawAmount
            );

            return { txSignature, amount };
        } catch (err) {
            // Roll back DB deduction so the user's balance is restored
            await UserModel.findByIdAndUpdate(userId, { $inc: { skrTokens: amount } });

            console.error('SKR transfer failed, balance rolled back:', err);
            throw Object.assign(
                new Error('On-chain token transfer failed, your balance has been restored'),
                { statusCode: 502 }
            );
        }
    }
}
