import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import authRouter from './auth/auth.routes.ts';
import leaderboardRouter from './leaderboard/leaderboard.routes.ts';
import userRouter from './user/user.routes.ts';
import gameRouter from './game/game.routes.ts';
import { errorMiddleware } from './middleware/error.middleware.ts';

const app = express();

// --------------- Security & Parsing Middleware ---------------

// Set security-related HTTP headers
app.use(helmet());

// Request logging — colored dev format in development, combined in production
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Enable CORS — configure origin for production
app.use(
    cors({
        origin: process.env.NODE_ENV === 'production'
            ? process.env.ALLOWED_ORIGINS?.split(',') || []
            : '*',
        credentials: true,
    })
);

// Parse JSON request bodies
app.use(express.json({ limit: '1mb' }));

// Parse cookies
app.use(cookieParser());

// Rate limiting — prevent brute-force attacks
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,                  // limit each IP to 100 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: 'Too many requests, please try again later.',
    },
});
app.use(limiter);

// --------------- Routes ---------------

// Health check
app.get('/health', (_req, res) => {
    res.status(200).json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString(),
    });
});

// Auth routes
app.use('/auth', authRouter);

// User routes
app.use('/user', userRouter);

// Leaderboard routes
app.use('/leaderboard', leaderboardRouter);

// Game routes
app.use('/game', gameRouter);

// --------------- Error Handling ---------------

app.use(errorMiddleware);

export default app;
