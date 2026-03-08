/**
 * One-time setup script: creates a devnet SPL token mint to simulate SKR,
 * funds the treasury wallet, and mints an initial supply to it.
 *
 * Run once with:
 *   bun run scripts/setup-devnet-mint.ts
 *
 * Then copy the printed values into your .env file.
 */

import {
    Connection,
    Keypair,
    LAMPORTS_PER_SOL,
    clusterApiUrl,
} from '@solana/web3.js';
import {
    createMint,
    getOrCreateAssociatedTokenAccount,
    mintTo,
} from '@solana/spl-token';

const SKR_DECIMALS = 6;
const INITIAL_SUPPLY = 1_000_000; // 1 million tokens
const RPC_URL = process.env.SOLANA_RPC_URL ?? clusterApiUrl('devnet');

async function main() {
    const connection = new Connection(RPC_URL, 'confirmed');

    // Generate a new treasury keypair
    const treasury = Keypair.generate();
    console.log('\n--- Treasury Keypair ---');
    console.log('Public key :', treasury.publicKey.toBase58());
    console.log('Private key (add to .env as TREASURY_PRIVATE_KEY):');
    console.log(JSON.stringify(Array.from(treasury.secretKey)));

    // Airdrop SOL to pay for tx fees and ATA creation
    console.log('\nRequesting devnet SOL airdrop...');
    const sig = await connection.requestAirdrop(treasury.publicKey, 2 * LAMPORTS_PER_SOL);
    await connection.confirmTransaction(sig, 'confirmed');
    console.log('Airdrop confirmed. Balance: 2 SOL');

    // Create the SPL token mint (simulates SKR on devnet)
    console.log('\nCreating SPL token mint...');
    const mint = await createMint(
        connection,
        treasury,           // payer
        treasury.publicKey, // mint authority
        null,               // freeze authority (none)
        SKR_DECIMALS
    );
    console.log('\n--- Mint Address ---');
    console.log('Add to .env as SKR_MINT_ADDRESS:');
    console.log(mint.toBase58());

    // Create treasury ATA and mint initial supply
    console.log('\nCreating treasury token account...');
    const treasuryAta = await getOrCreateAssociatedTokenAccount(
        connection,
        treasury,
        mint,
        treasury.publicKey
    );

    console.log(`Minting ${INITIAL_SUPPLY.toLocaleString()} tokens to treasury...`);
    await mintTo(
        connection,
        treasury,
        mint,
        treasuryAta.address,
        treasury, // mint authority
        BigInt(INITIAL_SUPPLY) * BigInt(10 ** SKR_DECIMALS)
    );

    console.log('\n✅ Setup complete. Add these to your .env:\n');
    console.log(`SOLANA_RPC_URL=${RPC_URL}`);
    console.log(`SKR_MINT_ADDRESS=${mint.toBase58()}`);
    console.log(`TREASURY_PRIVATE_KEY=${JSON.stringify(Array.from(treasury.secretKey))}`);
    console.log('\nTreasury holds', INITIAL_SUPPLY.toLocaleString(), 'simulated SKR tokens on devnet.');
}

main().catch((err) => {
    console.error('Setup failed:', err);
    process.exit(1);
});
