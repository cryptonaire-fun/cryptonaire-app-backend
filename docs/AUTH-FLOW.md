# Auth Flow: Sign In with Solana (SIWS)

## Overview

This document describes the authentication flow for a mobile app built with React Native and the Solana Mobile SDK, backed by a Node.js API and MongoDB database.

The goal is to allow users to authenticate using their Solana wallet — no passwords, no email, just cryptographic proof of wallet ownership. On successful authentication, the backend either creates a new user record or retrieves the existing one, then issues a JWT for all subsequent API access.

This document is intended to guide both the **mobile app agent** and the **backend agent** in implementing this flow correctly.

---

## Core Idea

Sign In with Solana (SIWS) works on a simple principle:  **only the owner of a wallet can produce a valid signature for that wallet's public key** .

The process is:

1. The mobile app triggers a sign-in interaction via the user's installed Solana wallet app (e.g. Phantom).
2. The wallet app presents the user with a human-readable message and asks them to approve.
3. On approval, the wallet signs the message with the user's private key and returns the  **wallet address** , the  **signed message** , and the **signature** to the app.
4. The app sends these three pieces to the backend.
5. The backend verifies the signature cryptographically — if valid, it confirms the user is the legitimate owner of that wallet address.
6. The backend finds or creates a user record in MongoDB keyed to that wallet address, then issues a JWT.
7. The app stores the JWT and uses it for all subsequent authenticated requests.

> **Important for agents** : No address is needed before the sign-in interaction begins. The wallet address is returned  *as part of the sign-in result* . The flow starts with zero prior knowledge of the user.

---

## Replay Attack Prevention

Since there is no server-side nonce exchange, replay attacks are mitigated by:

* Embedding an **`issuedAt`** ISO timestamp in the signed message at the time of sign-in.
* The backend rejecting any sign-in payload where `issuedAt` is older than  **5 minutes** .
* Once a JWT is issued, the signed message payload is no longer valid for re-use within the expiry window.

> In a higher-security context, a server-side nonce (stored in Redis with a TTL) can be added. For most applications, timestamp validation is sufficient.

---

## Flow Diagram

```
Mobile App                                  Backend (Node.js + MongoDB)
----------                                  ----------------------------

User taps "Sign In"
  │
  ▼
Generate local nonce + issuedAt timestamp
  │
  ▼
Call signIn() — opens wallet app
  User approves in wallet
  │
  ◄── Returns { address, signedMessage, signature }
  │
  ▼
POST /auth/verify
  { address, signedMessage, signature }  ──►  Decode signedMessage
                                              Verify signature against address
                                              Check issuedAt is within 5 minutes
                                              Find or create user in MongoDB
                                         ◄──  Return { token, user }
  │
  ▼
Store JWT in secure storage
Use JWT as Bearer token on all API calls
```

---

## Mobile App Responsibilities

### Package

The mobile app uses `@wallet-ui/react-native-web3js` which exposes the `useMobileWallet` hook.

### What the app must do

1. Call `signIn()` with a `domain`, `statement`, `nonce`, and `issuedAt`.
2. Receive the result containing `address`, `signedMessage`, and `signature`.
3. Encode `signedMessage` and `signature` as Base64 strings before sending to the backend.
4. Send a POST request to `/auth/verify` with the three fields.
5. On a successful response, securely store the JWT (use `expo-secure-store` or equivalent — **not** `AsyncStorage` for sensitive tokens).
6. Attach the JWT as a `Bearer` token in the `Authorization` header for all subsequent API calls.

### Code Reference (TypeScript — illustrative only)

> **Note to agent** : The following is a structural guide. You are responsible for proper file organisation, error handling, loading states, and integration with your state management solution.

```typescript
// Illustrative shape of the signIn flow

type AuthVerifyPayload = {
  address: string;
  signedMessage: string; // base64 encoded
  signature: string;     // base64 encoded
};

type AuthVerifyResponse = {
  token: string;
  user: User;
};

async function handleSignIn(signIn: SignInFunction): Promise<void> {
  const nonce = generateRandomHex(16); // use a crypto-safe random generator

  const result = await signIn({
    domain: 'your-app-domain.com',
    statement: 'Sign in to YourApp',
    nonce,
    issuedAt: new Date().toISOString(),
  });

  const payload: AuthVerifyPayload = {
    address: result.address,
    signedMessage: toBase64(result.signedMessage),
    signature: toBase64(result.signature),
  };

  const response = await postToBackend<AuthVerifyResponse>('/auth/verify', payload);

  await securelyStoreToken(response.token);
}
```

---

## Backend Responsibilities

### Stack

* **Runtime** : Node.js with TypeScript
* **Framework** : Express (or equivalent)
* **Database** : MongoDB via Mongoose
* **Cryptography** : `tweetnacl` for Ed25519 signature verification, `@solana/web3.js` for public key handling
* **Auth tokens** : `jsonwebtoken`

### Endpoint

**`POST /auth/verify`**

 **Request body** :

```json
{
  "address": "string — the wallet's base58 public key",
  "signedMessage": "string — base64 encoded bytes of the signed message",
  "signature": "string — base64 encoded bytes of the signature"
}
```

 **Success response** :

```json
{
  "token": "string — signed JWT",
  "user": { "walletAddress": "...", "createdAt": "..." }
}
```

### What the backend must do

1. Decode `signedMessage` and `signature` from Base64 to byte arrays.
2. Derive the public key bytes from the `address` using `@solana/web3.js` `PublicKey`.
3. Use `nacl.sign.detached.verify()` to verify the signature.
4. Parse the `issuedAt` field from the decoded message text and reject if older than 5 minutes.
5. If valid, query MongoDB for a user document with `walletAddress === address`.
6. If no user exists, create one with default fields and persist it.
7. Sign and return a JWT containing `userId` and `address`.

### Code Reference (TypeScript — illustrative only)

> **Note to agent** : The following illustrates the verification logic and data flow only. You are responsible for proper project structure, middleware organisation, input validation (use `zod` or equivalent), error handling, environment variable management, and Mongoose schema design.

```typescript
// Illustrative verification logic

import nacl from 'tweetnacl';
import { PublicKey } from '@solana/web3.js';
import jwt from 'jsonwebtoken';

type VerifyPayload = {
  address: string;
  signedMessage: string; // base64
  signature: string;     // base64
};

async function verifyAndAuthenticate(payload: VerifyPayload) {
  const { address, signedMessage, signature } = payload;

  const messageBytes = Buffer.from(signedMessage, 'base64');
  const signatureBytes = Buffer.from(signature, 'base64');
  const publicKeyBytes = new PublicKey(address).toBytes();

  const isValid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);

  if (!isValid) {
    throw new UnauthorisedError('Signature verification failed');
  }

  // Check issuedAt recency
  const messageText = messageBytes.toString('utf8');
  const issuedAt = parseIssuedAt(messageText); // extract from SIWS message format
  const ageMs = Date.now() - issuedAt.getTime();

  if (ageMs > 5 * 60 * 1000) {
    throw new UnauthorisedError('Sign-in payload has expired');
  }

  // Find or create user
  let user = await UserModel.findOne({ walletAddress: address });
  if (!user) {
    user = await UserModel.create({ walletAddress: address });
  }

  // Update last login
  user.lastLoginAt = new Date();
  await user.save();

  // Issue JWT
  const token = jwt.sign(
    { userId: user._id.toString(), address },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  );

  return { token, user };
}
```

### MongoDB User Schema (illustrative)

> **Note to agent** : Extend this schema with any application-specific fields. Index `walletAddress` for query performance.

```typescript
// Illustrative Mongoose schema shape

interface IUser {
  walletAddress: string;  // unique, indexed — primary identifier
  username?: string;
  avatar?: string;
  createdAt: Date;
  lastLoginAt?: Date;
}
```

### JWT Auth Middleware (illustrative)

> **Note to agent** : Apply this middleware to all routes that require authentication.

```typescript
// Illustrative auth middleware

function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
  req.user = decoded; // attach to request for downstream handlers
  next();
}
```

---

## Environment Variables

### Backend

| Variable           | Description                           |
| ------------------ | ------------------------------------- |
| `JWT_SECRET`     | Strong random secret for signing JWTs |
| `MONGODB_URI`    | MongoDB connection string             |
| `JWT_EXPIRES_IN` | Token expiry duration (e.g.`7d`)    |

---

## Security Checklist

* [ ] Signature is always verified with `nacl.sign.detached.verify` — never skipped
* [ ] `issuedAt` timestamp is validated to be within 5 minutes
* [ ] JWT secret is stored in environment variables, never hardcoded
* [ ] JWT is stored in secure storage on the mobile app, not AsyncStorage
* [ ] All authenticated routes are protected with the auth middleware
* [ ] Input is validated and sanitised before processing on the backend
* [ ] MongoDB `walletAddress` field is indexed and enforced as unique

---

## Dependencies

### Mobile App

```
@wallet-ui/react-native-web3js
expo-secure-store
```

### Backend

```
@solana/web3.js
tweetnacl
jsonwebtoken
mongoose
zod           (recommended for request validation)
```

---

## Summary

The authentication flow has three actors: the  **mobile app** , the **Solana wallet app** (Phantom or similar, installed on the user's device), and the  **backend** . The mobile app initiates a sign-in, the wallet handles the cryptographic signing, and the backend verifies the proof and manages user identity. No passwords, no email verification, no OAuth redirects — just a cryptographic handshake that results in a standard JWT-based session.
