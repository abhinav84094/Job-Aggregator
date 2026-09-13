import cron from "node-cron";
import { fetchAndStoreJobs } from "../services/jobSearchService.js";

const runFetcher = async () => {
  console.log("====================================");
  console.log("Job Fetch Started");
  console.log("Time :", new Date().toLocaleString());
  console.log("====================================");

  const startTime = Date.now();

  try {
    await fetchAndStoreJobs();
  } catch (err) {
    console.log("Fetch failed:", err.message);
  }

  const seconds = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log("====================================");
  console.log("Job Fetch Completed");
  console.log(`Execution Time : ${seconds} sec`);
  console.log("====================================");
};

export const startJobFetcher = () => {
  console.log("Job Fetcher Scheduler Started");

  // Initial fetch on startup
  runFetcher();

  // Every 2 hours
  cron.schedule("0 */2 * * *", async () => {
    await runFetcher();
  });
};