import mongoose from 'mongoose';
import { config } from './index.ts';

/**
 * Connect to MongoDB using Mongoose.
 * Should be called before the server starts listening.
 */
export const connectDB = async (): Promise<void> => {
    try {
        const conn = await mongoose.connect(config.mongodbUri, {
            serverSelectionTimeoutMS: 5000, // fail fast if MongoDB is not reachable
        });
        console.log(`🍃 MongoDB connected: ${conn.connection.host}`);
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
};

/**
 * Gracefully disconnect from MongoDB.
 */
export const disconnectDB = async (): Promise<void> => {
    try {
        await mongoose.disconnect();
        console.log('🍃 MongoDB disconnected');
    } catch (error) {
        console.error('❌ MongoDB disconnect error:', error);
    }
};
