import app from './app.ts';
import http from 'http';
import { config } from '../config/index.ts';
import { connectDB, disconnectDB } from '../config/mongoose.ts';

const port = config.port;
const server = http.createServer(app);

const startServer = async () => {
    try {
        // Connect to MongoDB before starting the server
        await connectDB();
        if (process.env.NODE_ENV === "development") {
            server.listen(port, () => {
                console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
            });
        } else {
            server.listen(port, '0.0.0.0', () => {
                console.log(`⚡️[server]: Server is running at http://0.0.0.0:${port}`);
                console.log(`📦 Environment: ${config.nodeEnv}`);
            });
        }

    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
    console.log(`\n${signal} signal received: closing HTTP server`);
    server.close(async () => {
        console.log('HTTP server closed');
        await disconnectDB();
        console.log('Exiting process.');
        process.exit(0);
    });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start the server
startServer();
