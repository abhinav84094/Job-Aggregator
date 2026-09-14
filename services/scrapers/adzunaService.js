import axios from "axios";
import Job from "../../models/Job.js";
import {
  extractSkills,
  parseExperienceMonths,
  isFreshJob,
  generateJobKey,
} from "../../utils/jobUtils.js";

// ─────────────────────────────────────────
// Search Queries
// ─────────────────────────────────────────
const SEARCH_QUERIES = [
  "MERN Developer",
  "Node.js Developer",
  "React Developer",
  "Full Stack Developer",
  "Backend Developer",
  "Frontend Developer",
  "JavaScript Developer",
  "Python Developer",
  "Java Developer",
  "Software Engineer",
  "Fresher Software Engineer",
  "Fresher Developer",
  "DevOps Engineer",
  "Data Science",
  "GenAI Developer",
];

// ─────────────────────────────────────────
// Fetch one query one page
// ─────────────────────────────────────────
const fetchAdzunaJobs = async (query, page = 1) => {
  const response = await axios.get(
    `https://api.adzuna.com/v1/api/jobs/in/search/${page}`,
    {
      params: {
        app_id:           process.env.ADZUNA_APP_ID,
        app_key:          process.env.ADZUNA_APP_KEY,
        results_per_page: 50,
        what:             query,
        where:            "India",
        max_days_old:     1,
        sort_by:          "date",
        // full_time:        1,
        category:         "it-jobs",
      },
    }
  );

  return response.data.results || [];
};

// ─────────────────────────────────────────
// Main Service
// ─────────────────────────────────────────
export const fetchAndStoreAdzunaJobs = async () => {
  console.log("\n Starting job fetch from Adzuna...\n");

  let totalFetched  = 0;
  let totalInserted = 0;
  let totalUpdated  = 0;
  let totalSkipped  = 0;

  for (const query of SEARCH_QUERIES) {
    try {
      console.log(`Fetching: ${query}`);

      const jobs = await fetchAdzunaJobs(query, 1);
      totalFetched += jobs.length;

      if (jobs.length === 0) {
        console.log(`No jobs found for: ${query}`);
        continue;
      }

      const operations = [];

      for (const job of jobs) {

        // Skip if no apply link
        if (!job.redirect_url) {
          totalSkipped++;
          continue;
        }

        // Skip if not fresh
        if (!isFreshJob(job.created)) {
          totalSkipped++;
          continue;
        }

        const description = job.description || "";
        const location    = job.location?.display_name || "India";
        const company     = job.company?.display_name || "";
        const title       = job.title || "";
        const jobKey      = generateJobKey(company, title, location);

        // Extract skills from description
        const requiredSkills = extractSkills(description);

        if (requiredSkills.length === 0) {
          console.log(`No skills found: ${title}`);
          totalSkipped++;
          continue;
        }

        // Extract experience months
        const requiredExperienceMonths = parseExperienceMonths(description);

        operations.push({
          updateOne: {
            filter: {
              platform: "indeed",   // adzuna aggregates indeed + others
              jobKey,
            },
            update: {
              $set: {
                jobKey,
                title:                   title.trim(),
                company:                 company.trim(),
                location:                location.trim(),
                platform:                "indeed",
                jobUrl:                  job.redirect_url.trim(),
                description:             description.substring(0, 2000),
                requiredSkills,
                requiredExperienceMonths,
                postedDate:              new Date(job.created),
                scrapedAt:               new Date(),
                status:                  "active",
                expiredAt:               null,
              },
            },
            upsert: true,
          },
        });
      }

      if (operations.length === 0) {
        console.log(`No valid jobs for: ${query}\n`);
        continue;
      }

      // bulkWrite to MongoDB
      const result = await Job.bulkWrite(operations);

      totalInserted += result.upsertedCount;
      totalUpdated  += result.modifiedCount;

      console.log("========================================");
      console.log(`Query     : ${query}`);
      console.log(`Fetched   : ${jobs.length}`);
      console.log(`Processed : ${operations.length}`);
      console.log(`Inserted  : ${result.upsertedCount}`);
      console.log(`Updated   : ${result.modifiedCount}`);
      console.log("========================================\n");

      // Delay to respect rate limit (1 req/sec)
      await new Promise(r => setTimeout(r, 1500));

    } catch (err) {
      console.error(`Failed for "${query}":`, err.message);
    }
  }

  console.log("====================================");
  console.log("✅ Adzuna Fetch Completed");
  console.log(`📥 Total Fetched  : ${totalFetched}`);
  console.log(`💾 Total Inserted : ${totalInserted}`);
  console.log(`🔄 Total Updated  : ${totalUpdated}`);
  console.log(`⏭  Total Skipped  : ${totalSkipped}`);
  console.log("====================================\n");
};