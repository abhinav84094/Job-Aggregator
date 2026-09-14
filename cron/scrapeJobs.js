import cron from "node-cron";
import { fetchAndStoreJobs } from "../services/scrapers/JSearchService.js";
import { fetchAndStoreAdzunaJobs } from "../services/scrapers/adzunaService.js";


const runFetcher = async () => {
  console.log("====================================");
  console.log("Job Fetch Started");
  console.log("Time :", new Date().toLocaleString());
  console.log("====================================");

  const startTime = Date.now();


  // JSearch API
  try {
    // await fetchAndStoreJobs();/
    console.log("for now scrapping service is closed for JSearch");
  } catch (err) {
    console.log("Fetch failed:", err.message);
  }


  // 2. Adzuna
  try {
    console.log("\n Running Adzuna...");
    await fetchAndStoreAdzunaJobs();
  } catch (err) {
    console.log("Adzuna failed:", err.message);
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