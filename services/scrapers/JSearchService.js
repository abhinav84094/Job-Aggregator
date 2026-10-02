import axios from 'axios';
import Job from '../../models/Job.js';
import { SKILL_ALIASES } from '../../utils/skillAliases.js';

// ─────────────────────────────────────────
// Utils
// ─────────────────────────────────────────

const normalize = (text = "") => {
  return text
    .toLowerCase()
    .replaceAll("c++", "cplusplus")
    .replaceAll("c#", "csharp")
    .replace(/[^a-z0-9]/g, "")
    .trim();
};

const extractSkills = (description = "") => {
  const text = normalize(description);
  const extractedSkills = [];

  for (const [skill, aliases] of Object.entries(SKILL_ALIASES)) {
    const found = aliases.some(alias =>
      text.includes(normalize(alias))
    );
    if (found) {
      extractedSkills.push(skill);
    }
  }

  return extractedSkills;
};

const parseExperienceMonths = (description = "") => {
  const match = description.match(
    /(?:minimum\s+|at\s+least\s+)?(\d+)(?:\s*-\s*\d+)?\+?\s*(?:years?|yrs?)/i
  );
  if (!match) return 0;
  return Number(match[1]) * 12;
};

const isFreshJob = (dateStr) => {
  if (!dateStr) return false;
  const posted = new Date(dateStr);
  const diffDays = (Date.now() - posted) / (1000 * 60 * 60 * 24);
  const FRESH_DAYS = Number(process.env.FRESH_JOB_DAYS) || 1;
  return diffDays <= FRESH_DAYS;
};

const getPlatform = (applyLink = "") => {
  const url = applyLink.toLowerCase();
  if (url.includes("linkedin"))    return "linkedin";
  if (url.includes("naukri"))      return "naukri";
  if (url.includes("indeed"))      return "indeed";
  if (url.includes("internshala")) return "internshala";
  if (url.includes("foundit"))     return "foundit";
  return "linkedin";
};

const generateJobKey = (company = "", title = "", location = "") => {
  return `${normalize(company)}-${normalize(title)}-${normalize(location)}`;
};

// ─────────────────────────────────────────
// Search Queries
// ─────────────────────────────────────────

const SEARCH_QUERIES = [
   // Full Stack / Web Development
  "MERN Developer",
  "Full Stack Developer",
  "Node.js Developer",
  "React Developer",
  "Frontend Developer",
  "Backend Developer",
  "JavaScript Developer",

  // Software Engineering
  "Software Engineer",
  "Software Developer",
  "Fresher Software Engineer",
  "Fresher Developer",

  // Programming
  "Java Developer",
  "Python Developer",
  "PHP Developer",

  // DevOps / Cloud
  "DevOps Engineer",
  "Cloud Engineer",
  "Site Reliability Engineer",

  // Data / AI
  "Data Scientist",
  "Data Analyst",
  "Data Science",
  "Machine Learning Engineer",
  "GenAI Developer",
  "AI Engineer",

  // Business / Management
  "MBA",
  "BBA",
];

// ─────────────────────────────────────────
// Main Service
// ─────────────────────────────────────────

export const fetchAndStoreJobs = async () => {
  console.log("\n Starting job fetch from JSearch...\n");

  let totalFetched  = 0;
  let totalInserted = 0;
  let totalUpdated  = 0;
  let totalSkipped  = 0;

  for (const query of SEARCH_QUERIES) {
    try {
      console.log(`Fetching: ${query}`);

      const response = await axios.get(
        "https://jsearch.p.rapidapi.com/search-v2",
        {
          params: {
            query,
            page:      "1",
            num_pages: "1",
            country:   "in",
            date_posted: "week",
          },
          headers: {
            "X-RapidAPI-Key":  process.env.RAPIDAPI_KEY,
            "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
          },
        }
      );

      const jobs = response.data.data?.jobs || []; 
      totalFetched += jobs.length;

      const operations = [];

      for (const job of jobs) {

  if (!job.job_apply_link) {
    totalSkipped++;
    continue;
  }

  if (!isFreshJob(job.job_posted_at_datetime_utc)) {
    totalSkipped++;
    continue;
  }

  const description = job.job_description || "";
  const platform    = getPlatform(job.job_apply_link);
  const jobKey      = generateJobKey(
    job.employer_name,
    job.job_title,
    job.job_city || ""
  );

  const requiredSkills = extractSkills(description);

  if (requiredSkills.length === 0) {
    console.log(`No skills found: ${job.job_title}`);
    totalSkipped++;
    continue;
  }

  const requiredExperienceMonths = parseExperienceMonths(description);

  operations.push({
    updateOne: {
      filter: { platform, jobKey },
      update: {
        $set: {
          jobKey,
          title:                    job.job_title?.trim(),
          company:                  job.employer_name?.trim(),
          location:                 `${job.job_city || ""} ${job.job_country || ""}`.trim() || "India",
          platform,
          jobUrl:                   job.job_apply_link?.trim(),
          description:              description.substring(0, 5000),
          requiredSkills,
          requiredExperienceMonths,
          postedDate:               new Date(job.job_posted_at_datetime_utc),
          scrapedAt:                new Date(),
          status:                   "active",
          expiredAt:                null,
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

      // Delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 3000));

    } catch (err) {
      console.error(`❌ Failed for "${query}":`, err.message);
    }
  }

  console.log("====================================");
  console.log("✅ JSearch Fetch Completed");
  console.log(`📥 Total Fetched  : ${totalFetched}`);
  console.log(`💾 Total Inserted : ${totalInserted}`);
  console.log(`🔄 Total Updated  : ${totalUpdated}`);
  console.log(`⏭  Total Skipped  : ${totalSkipped}`);
  console.log("====================================\n");
};







