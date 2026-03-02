# Leaderboard API Reference

> Base URL (dev): `http://localhost:4000`

The leaderboard tracks wallet addresses, their points, and their auto-calculated rank. Rank 1 = highest points. Ranks are recalculated automatically after every update.

---

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/leaderboard` | Public | Get the ranked leaderboard |
| `GET` | `/leaderboard/:address` | Public | Get a single entry by wallet address |
| `PUT` | `/leaderboard/:address` | 🔒 JWT | Set points for a wallet (upsert + re-rank) |
| `DELETE` | `/leaderboard/:address` | 🔒 JWT | Remove an entry and re-rank |

---

## GET `/leaderboard`

Returns all entries sorted by rank (1 = best).

### Query Parameters

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | number | `100` | Max entries to return (1–500) |
| `offset` | number | `0` | Entries to skip (for pagination) |

### Example Request

```bash
# First page (top 10)
curl "http://localhost:4000/leaderboard?limit=10&offset=0"

# Second page
curl "http://localhost:4000/leaderboard?limit=10&offset=10"
```

### Example Response

```json
{
  "success": true,
  "data": {
    "entries": [
      {
        "id": "65f1a2b3c4d5e6f7a8b9c0d1",
        "walletAddress": "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin",
        "points": 1500,
        "rank": 1,
        "updatedAt": "2026-03-02T20:00:00.000Z"
      },
      {
        "id": "65f1a2b3c4d5e6f7a8b9c0d2",
        "walletAddress": "7ZNmwjLFpjYVoWkHhsNZ8h9bvtZn93bqckFUL2v3ePGG",
        "points": 900,
        "rank": 2,
        "updatedAt": "2026-03-02T19:00:00.000Z"
      }
    ],
    "total": 2,
    "limit": 10,
    "offset": 0
  }
}
```

---

## GET `/leaderboard/:address`

Returns a single entry by Solana wallet address.

### Example Request

```bash
curl "http://localhost:4000/leaderboard/9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin"
```

### Example Response

```json
{
  "success": true,
  "data": {
    "id": "65f1a2b3c4d5e6f7a8b9c0d1",
    "walletAddress": "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin",
    "points": 1500,
    "rank": 1,
    "updatedAt": "2026-03-02T20:00:00.000Z"
  }
}
```

### Not Found Response

```json
{
  "success": false,
  "error": "Leaderboard entry not found"
}
```

---

## PUT `/leaderboard/:address` 🔒

Set the points for a wallet address. Creates the entry if it doesn't exist. **Ranks are recalculated for all entries automatically.**

### Headers

```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

### Request Body

```json
{
  "points": 1500
}
```

| Field | Type | Rules |
|-------|------|-------|
| `points` | integer | Required, ≥ 0 |

### Example Request

```bash
TOKEN="your_jwt_token_here"
ADDRESS="9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin"

curl -X PUT "http://localhost:4000/leaderboard/$ADDRESS" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"points": 1500}'
```

### Example Response

```json
{
  "success": true,
  "data": {
    "id": "65f1a2b3c4d5e6f7a8b9c0d1",
    "walletAddress": "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin",
    "points": 1500,
    "rank": 1,
    "updatedAt": "2026-03-02T21:00:00.000Z"
  }
}
```

---

## DELETE `/leaderboard/:address` 🔒

Removes an entry and re-ranks all remaining entries.

### Headers

```
Authorization: Bearer <your_jwt_token>
```

### Example Request

```bash
TOKEN="your_jwt_token_here"
ADDRESS="9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin"

curl -X DELETE "http://localhost:4000/leaderboard/$ADDRESS" \
  -H "Authorization: Bearer $TOKEN"
```

### Example Response

```json
{
  "success": true,
  "message": "Entry removed and leaderboard re-ranked"
}
```

---

## Error Responses

All error responses follow this shape:

```json
{
  "success": false,
  "error": "Error message here"
}
```

| Status | Cause |
|--------|-------|
| `400` | Validation failed (bad body or query params) |
| `401` | Missing or invalid JWT token |
| `404` | Entry not found |
| `429` | Rate limit exceeded |
| `500` | Internal server error |

---

## Ranking Logic

- Rank is **not** manually set — it is calculated automatically on every `PUT`.
- Rank 1 always has the **highest points**.
- **Tie-break**: if two wallets have equal points, the one whose entry was updated **earlier** gets the better rank.
- The full re-rank uses a MongoDB `bulkWrite` for efficiency.

---

## Quick Integration Flow

```bash
# 1. Authenticate (get your JWT from the auth flow)
TOKEN=$(curl -s -X POST http://localhost:4000/auth/verify \
  -H "Content-Type: application/json" \
  -d '{"address":"...","signedMessage":"...","signature":"..."}' \
  | jq -r '.data.token')

# 2. Set points for a wallet
curl -X PUT http://localhost:4000/leaderboard/9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"points": 1500}'

# 3. Get the leaderboard (public)
curl http://localhost:4000/leaderboard?limit=10
```
