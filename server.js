import "dotenv/config";                                    // ← missing!
import connectDB from "./config/db.js";
import { startJobFetcher } from "./cron/scrapeJobs.js";   // ← missing import!
import { startCleanupCron } from "./cron/cleanOldJobs.js";




const start = async () => {
  try {
    await connectDB();

    startJobFetcher();  // ← this already runs fetchAndStoreJobs on startup
    startCleanupCron();

    console.log("Job Aggregator running...");

  } catch (err) {
    console.error("Startup error:", err.message);
    process.exit(1);
  }
};

start();