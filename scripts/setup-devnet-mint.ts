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
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { createMetadataAccountV3 } from '@metaplex-foundation/mpl-token-metadata';
import {
    keypairIdentity,
    publicKey as umiPublicKey,
} from '@metaplex-foundation/umi';

const SKR_DECIMALS = 6;
const INITIAL_SUPPLY = 1_000_000; // 1 million tokens
const RPC_URL = process.env.SOLANA_RPC_URL ?? clusterApiUrl('devnet');

/**
 * Polls the balance every 5s until at least 1 SOL is detected,
 * giving the user time to fund the wallet manually via faucet.solana.com.
 */
async function waitForFunding(connection: Connection, keypair: Keypair): Promise<void> {
    const pubkey = keypair.publicKey;
    console.log('\n>>> Go to https://faucet.solana.com and airdrop SOL to:');
    console.log('   ', pubkey.toBase58());
    console.log('\nWaiting for funds to arrive on devnet...');

    while (true) {
        const balance = await connection.getBalance(pubkey, 'confirmed');
        if (balance >= LAMPORTS_PER_SOL) {
            console.log(`Funded! Balance: ${(balance / LAMPORTS_PER_SOL).toFixed(2)} SOL`);
            return;
        }
        process.stdout.write('.');
        await new Promise((r) => setTimeout(r, 5000));
    }
}

async function main() {
    const connection = new Connection(RPC_URL, 'confirmed');

    // Generate a new treasury keypair
    const treasury = Keypair.generate();
    console.log('\n--- Treasury Keypair ---');
    console.log('Public key :', treasury.publicKey.toBase58());
    console.log('Private key (add to .env as TREASURY_PRIVATE_KEY):');
    console.log(JSON.stringify(Array.from(treasury.secretKey)));

    // Wait for user to manually fund the treasury via faucet.solana.com
    await waitForFunding(connection, treasury);

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

    // Attach on-chain metadata so Phantom displays "SKR" instead of "Unknown Token"
    console.log('\nAttaching token metadata...');
    const umi = createUmi(RPC_URL);
    umi.use(keypairIdentity(umi.eddsa.createKeypairFromSecretKey(treasury.secretKey)));

    await createMetadataAccountV3(umi, {
        mint: umiPublicKey(mint.toBase58()),
        mintAuthority: umi.identity,
        data: {
            name: 'SKR',
            symbol: 'SKR',
            uri: '',
            sellerFeeBasisPoints: 0,
            creators: null,
            collection: null,
            uses: null,
        },
        isMutable: true,
        collectionDetails: null,
    }).sendAndConfirm(umi);
    console.log('Metadata attached. Token will appear as "SKR" in Phantom.');

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
