# User Module

This document outlines the API endpoints and services responsible for retrieving user data. The `User` model acts as the core identity record (created during wallet authentication).

All endpoints in the User module are protected and require a valid JWT token.

---

## Automatic Username Generation

When a new user signs in for the first time (or any authenticated user is found to have a `null` username), the backend automatically assigns a random display username.

**Format:** `Crypto_<first6charsOfWallet>_<4-char alphanumeric suffix>`

**Example:** `Crypto_5Bpd2v_x3kQ`

Users can later update this username via the `PATCH /user/me/username` endpoint.

---

## Get User Profile (`GET /user/me`)

Retrieves the full profile of the currently authenticated user, including wallet address, points, SKR tokens, level, and progression stats.

### Requirements

- **Authentication**: Required (`Bearer Token`)

### Request Headers

```http
Authorization: Bearer <your_jwt_token>
```

### Successful Response (`200 OK`)

```json
{
  "success": true,
  "data": {
    "id": "64eb4b3d8a7c2f0012345678",
    "walletAddress": "5Bpd2vM...",
    "username": "Crypto_5Bpd2v_x3kQ",
    "avatar": null,
    "points": 150,
    "skrTokens": 10,
    "level": 2,
    "questionsAnswered": 15,
    "createdAt": "2026-03-03T18:00:00.000Z"
  }
}
```

### User Model Fields

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | Unique MongoDB document ID |
| `walletAddress` | `string` | Solana wallet address (primary identity) |
| `username` | `string` | Display name (auto-generated on signup; user-updatable) |
| `avatar` | `string \| null` | Optional avatar URL |
| `points` | `number` | Total accumulated game points |
| `skrTokens` | `number` | Total `$SKR` tokens earned |
| `level` | `number` | Current level (auto-calculated from `questionsAnswered`) |
| `questionsAnswered` | `number` | Total correct answers recorded all-time |
| `createdAt` | `string` | ISO timestamp of account creation |

---

## Update Username (`PATCH /user/me/username`)

Allows the authenticated user to change their display username. Validates length and uniqueness (case-insensitive) before saving.

### Requirements

- **Authentication**: Required (`Bearer Token`)

### Request Headers

```http
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

### Request Body

```json
{
  "username": "CryptoKing"
}
```

| Field | Type | Rules |
| :--- | :--- | :--- |
| `username` | `string` | Required · 3–30 characters · must be unique (case-insensitive) |

### Successful Response (`200 OK`)

Returns the full updated user document.

```json
{
  "success": true,
  "data": {
    "id": "64eb4b3d8a7c2f0012345678",
    "walletAddress": "5Bpd2vM...",
    "username": "CryptoKing",
    "avatar": null,
    "points": 150,
    "skrTokens": 10,
    "level": 2,
    "questionsAnswered": 15,
    "createdAt": "2026-03-03T18:00:00.000Z"
  }
}
```

### Error Responses

| Status | Reason |
| :--- | :--- |
| `400 Bad Request` | `username` is empty or not between 3–30 characters |
| `409 Conflict` | Another user already has that username |
| `401 Unauthorized` | Missing or invalid JWT |

---

## Get User Points (`GET /user/me/points`)

Retrieves only the total accumulated `points` for the currently authenticated user. This is a lightweight endpoint optimal for frequent UI polling.

### Requirements

- **Authentication**: Required (`Bearer Token`)

### Request Headers

```http
Authorization: Bearer <your_jwt_token>
```

### Successful Response (`200 OK`)

```json
{
  "success": true,
  "data": {
    "points": 1500
  }
}
```

---

## Get User Tokens (`GET /user/me/tokens`)

Retrieves only the total accumulated `$SKR` tokens for the currently authenticated user.

### Requirements

- **Authentication**: Required (`Bearer Token`)

### Request Headers

```http
Authorization: Bearer <your_jwt_token>
```

### Successful Response (`200 OK`)

```json
{
  "success": true,
  "data": {
    "skrTokens": 250
  }
}
```

---

## Get User Level Progress (`GET /user/me/progress`)

Returns the user's current level and a breakdown of their progress towards the next level, computed from the total number of correct answers.

### Requirements

- **Authentication**: Required (`Bearer Token`)

### How the formula works

Questions required to advance from level N to level N+1:

```
questionsToNextLevel(N) = N × 10
```

| Current Level | Questions needed to advance |
| :--- | :--- |
| 1 | 10 |
| 2 | 20 |
| 3 | 30 |
| N | N × 10 |

Each time `POST /game/add-to-user-points` is called (correct answer recorded), the backend automatically increments `questionsAnswered` and recalculates `level`.

### Successful Response (`200 OK`)

```json
{
  "success": true,
  "data": {
    "level": 2,
    "questionsAnswered": 15,
    "answeredTowardsNextLevel": 5,
    "requiredForNextLevel": 20
  }
}
```

| Field | Description |
| :--- | :--- |
| `level` | Current level of the user |
| `questionsAnswered` | Total correct questions answered all-time |
| `answeredTowardsNextLevel` | Questions answered within the current level tier |
| `requiredForNextLevel` | Total questions needed to complete the current tier and advance |

---

## Error Responses

For all the routes in the User module, the following errors may be encountered:

#### Unauthorized Error (`401 Unauthorized`)

Returned if the request lacks a valid JWT or if the token has expired/is malformed.

```json
{
  "success": false,
  "error": "No token provided" // or "Invalid or expired token"
}
```

#### Not Found Error (`500 Internal Server Error`)

Returned if the JWT payload is valid, but the user ID extracted from it no longer exists in the MongoDB database (e.g., if the user was manually deleted).

```json
{
  "success": false,
  "error": "User not found"
}
```

---

## User Service Layer (`src/user/user.service.ts`)

The raw logic handling the database interaction relies on Mongoose's `Model.findById()`.

### `UserService.getUserDetails(userId: string)`

Fetches and returns the entire user document. Overrides any implicit `.select()` restrictions, excluding standard ignored fields like `__v` and mapping `_id` to `id` through the schema's JSON transformer.

### `UserService.getUserPoints(userId: string)`

Optimized query using `.select('points')`. Returns only the points field to minimize database and network overhead.

### `UserService.getUserTokens(userId: string)`

Optimized query using `.select('skrTokens')`. Returns only the tokens field to minimize overhead.

### `UserService.updateUsername(userId: string, newUsername: string)`

Validates that `newUsername` is non-empty and 3–30 characters long, then checks for an existing user with the same username (case-insensitive). On success, updates the document via `findByIdAndUpdate` and returns the full updated user.
