import mongoose from 'mongoose';
import { LeaderboardModel } from './src/leaderboard/leaderboard.model.ts';
import { UserModel } from './src/user/user.model.ts';
import { config } from './config/index.ts';

async function run() {
    await mongoose.connect(config.mongodbUri);
    const users = await UserModel.find();
    console.log("Users:", users.length);
    const boards = await LeaderboardModel.find();
    console.log("Leaderboards:", boards.length, boards);
    process.exit(0);
}
run();
