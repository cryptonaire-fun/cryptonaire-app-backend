# Cryptonaire Backend API

Welcome to the backend repository of **Cryptonaire**, a real-time crypto trivia and gaming application! This repository houses the API that handles user authentication via Solana wallets, AI-powered question generation, user progression, and global leaderboards.

## 🚀 Features

- **Wallet-Based Authentication**: Secure login using Solana wallet signatures (`Sign in with Solana`), backed by JWT sessions.
- **AI Question Generation**: Integration with Groq AI to dynamically generate crypto-related questions for players.
- **Progression System**: Track user progress, including points, tokens, and level ups as they answer questions correctly.
- **Global Leaderboard**: Real-time ranking of players based on their scores.
- **Robust Security**: Protected routes, JWT verification, rate-limiting, and standard Express security middlewares (Helmet, CORS).

## 🛠️ Tech Stack

- **Runtime**: [Bun](https://bun.sh/)
- **Framework**: [Express.js](https://expressjs.com/)
- **Language**: TypeScript
- **Database**: [MongoDB](https://www.mongodb.com/) (Object modeling via [Mongoose](https://mongoosejs.com/))
- **Validation**: [Zod](https://zod.dev/)
- **Blockchain**: `@solana/web3.js`, `tweetnacl`
- **AI Integration**: `groq-sdk`

## 📁 Project Structure

```
src/
├── auth/           # Solana wallet authentication routes & controllers
├── config/         # Configuration, Environment variables, MongoDB connection setup
├── game/           # AI question generation logic & points/tokens assignment
├── leaderboard/    # Global leaderboard retrieval & management
├── middleware/     # Auth, Error handling, Rate limiting & Request validations
├── user/           # User profiles, points, tokens & progression endpoints
├── app.ts          # Express application setup & middleware initialization
└── server.ts       # Server entry point
```

## ⚙️ Prerequisites

Before you begin, ensure you have the following installed:

- [Bun](https://bun.sh/docs/installation) (v1.0.0 or higher recommended)
- [MongoDB](https://www.mongodb.com/try/download/community) (Local instance or Atlas URI)
- A [Groq API Key](https://console.groq.com/keys)

## 🔧 Installation & Setup

1. **Clone the repository:**

   ```bash
   git clone <repository-url>
   cd cryptonaire-app-backend
   ```

2. **Install dependencies:**

   ```bash
   bun install
   ```

3. **Environment Configuration:**
   Create a `.env` file in the root directory based on `.env.example`:

   ```bash
   cp .env.example .env
   ```

   *Required Variables:*
   - `PORT`: (default 4000)
   - `NODE_ENV`: `development` or `production`
   - `MONGODB_URI`: Your MongoDB connection string
   - `JWT_SECRET`: A strong random string for signing JWT tokens
   - `JWT_EXPIRES_IN`: JWT expiration length (e.g., `7d`)
   - `GROQ_API_KEY`: Your Groq AI API key

4. **Start the development server:**

   ```bash
   bun run dev
   ```

   The server will start locally at `http://localhost:4000`.

## 📜 Available Scripts

- `bun run dev`: Starts the server in development mode with hot-reloading.
- `bun run build`: Compiles TypeScript files into the `dist` directory.
- `bun run start`: Runs the compiled output (used in production).
- `bun run typecheck`: Runs TypeScript type checking without emitting files.

## 🛣️ API Endpoints Summary

### Authentication

- `POST /auth/verify` - Verifies Solana wallet signature and returns a JWT token.

### User

- `GET /user/me` - Retrieves the authenticated user's details.
- `GET /user/me/progress` - Retrieves user's level, questions answered, and progression status.
- `PATCH /user/me/username` - Update the user's display name.

### Game

- `POST /game/generate-questions` - Generates a new set of crypto questions using Groq AI.
- `POST /game/add-to-user-points` - Increments user points upon answering correctly.
- `POST /game/add-to-user-tokens` - Credits tokens to the user.

### Leaderboard

- `GET /leaderboard` - Public endpoint to retrieve the global scoreboard.
- `GET /leaderboard/:address` - Retrieve leaderboard position for a specific wallet address.

## 🔒 Security Measures

- Uses **bcryptjs** and **tweetnacl** for cryptographic operations.
- Request payloads validated strictly via **Zod**.
- **express-rate-limit** prevents brute-force attacks.
- **Helmet.js** sets sensible and secure HTTP headers.
