import mongoose from "mongoose";
import { config } from "./config/index.ts";
import { GameService } from "./src/game/game.service.ts";

async function run() {
    await mongoose.connect(config.mongodbUri);
    console.log("Generating questions...");
    const qs = await GameService.generateQuestions([], 1);
    console.log(JSON.stringify(qs, null, 2));
    process.exit(0);
}
run();
