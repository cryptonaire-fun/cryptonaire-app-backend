import mongoose from 'mongoose';
import { LeaderboardModel } from './leaderboard/leaderboard.model.ts';
import { upsertLeaderboardEntry } from './leaderboard/leaderboard.service.ts';

async function run() {
    try {
        await mongoose.connect("mongodb://localhost:27017/cryptonaire");
        console.log("Connected, inserting test data...");
        const res = await upsertLeaderboardEntry("TESTADDRESS", { points: 0 });
        console.log("Upserted:", res);
        const all = await LeaderboardModel.find();
        console.log("All entries:", all.length);
    } catch (err) {
        console.error("Error", err);
    } finally {
        process.exit(0);
    }
}
run();
