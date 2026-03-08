/**
 * Attaches on-chain metadata (name, symbol) to the existing devnet SKR mint
 * so that Phantom and other wallets display it correctly.
 *
 * Reads TREASURY_PRIVATE_KEY and SKR_MINT_ADDRESS from your .env — no new
 * keys or mint addresses are generated.
 *
 * Run once with:
 *   bun run scripts/add-token-metadata.ts
 */

import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import {
    createMetadataAccountV3,
} from '@metaplex-foundation/mpl-token-metadata';
import {
    keypairIdentity,
    publicKey as umiPublicKey,
} from '@metaplex-foundation/umi';

const RPC_URL = process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com';

function loadEnvVar(key: string): string {
    const value = process.env[key];
    if (!value) throw new Error(`Missing required env var: ${key}`);
    return value;
}

async function main() {
    const rawKey = loadEnvVar('TREASURY_PRIVATE_KEY');
    const mintAddress = loadEnvVar('SKR_MINT_ADDRESS');

    const umi = createUmi(RPC_URL);

    // Load treasury keypair from env
    const secretKey = Uint8Array.from(JSON.parse(rawKey));
    const treasuryKeypair = umi.eddsa.createKeypairFromSecretKey(secretKey);
    umi.use(keypairIdentity(treasuryKeypair));

    const mint = umiPublicKey(mintAddress);

    console.log(`\nAdding metadata to mint: ${mintAddress}`);
    console.log(`Using treasury:          ${treasuryKeypair.publicKey}`);
    console.log(`RPC:                     ${RPC_URL}\n`);

    const { signature } = await createMetadataAccountV3(umi, {
        mint,
        mintAuthority: treasuryKeypair,
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

    console.log('✅ Metadata created successfully!');
    console.log('   Tx signature:', Buffer.from(signature).toString('base64'));
    console.log('\nRestart Phantom or refresh the token to see "SKR".');
}

main().catch((err) => {
    console.error('Failed:', err);
    process.exit(1);
});
