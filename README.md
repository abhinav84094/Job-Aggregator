# Job Aggregator

A small Node.js service that periodically fetches job listings from configured sources, normalizes them, and stores them in MongoDB. It also runs daily cleanup jobs to expire and delete old listings.

Why this repo exists: to collect job postings (example: "MERN Stack Developer India") on a schedule, keep a deduplicated dataset, and provide a foundation for powering feeds, alerts, or dashboards.

---

## Quick summary / Stack
- Language(s): JavaScript (ES modules)
- Runtime: Node.js (project uses "type": "module")
- Notable libraries:
  - axios — HTTP client used to call job APIs
  - mongoose — MongoDB ODM for schema and persistence
  - node-cron — schedules recurring tasks
  - dotenv — environment variable loading

Node 16+ is a safe choice because of ES module usage.

---

## What you'll find in the repo (annotated)
```
server.js                 # App entry: connects DB and starts cron jobs
package.json              # npm metadata (type: module, dependencies)
config/
  db.js                   # Mongoose connection using MONGODB_URI
cron/
  scrapeJobs.js           # Job-fetching scheduler and runner
  cleanOldJobs.js         # Expire and delete-old-jobs scheduler
models/
  Job.js                  # Mongoose model (job fields, indexes)
services/
  jobSearchService.js     # Scraper + normalization + (previously) DB write logic
utils/
  skillAliases.js         # (expected) mappings for skill alias detection
.gitignore
package-lock.json
```

How it fits together (runtime shape)
- server.js loads environment variables, connects to MongoDB (config/db.js), then starts two cron schedulers:
  - Job fetcher (cron/scrapeJobs.js) — runs an initial fetch, then repeats on a schedule.
  - Cleanup scheduler (cron/cleanOldJobs.js) — marks old jobs expired and deletes stale expired jobs.
- The fetcher calls fetchAndStoreJobs from services/jobSearchService.js which is responsible for calling an external job search API, normalizing results, extracting skills, building a job key, and (in the fuller implementation) upserting into MongoDB using the Job model.

---

## Important files explained

- server.js
  - Loads dotenv, connects to DB via connectDB(), then calls startJobFetcher() and startCleanupCron().
  - This file is the runtime entrypoint; to run the service use `node server.js` (or add a start script).

- config/db.js
  - Exports connectDB which runs mongoose.connect(process.env.MONGODB_URI).
  - Environment variable: MONGODB_URI (required).

- models/Job.js
  - Defines the Job schema with fields:
    - jobKey (string, unique) — synthetic dedupe key
    - title, company, location (strings)
    - platform (enum: linkedin, naukri, indeed, internshala, foundit)
    - jobUrl (string, unique)
    - description (string)
    - requiredSkills (array of strings)
    - requiredExperienceMonths (number)
    - postedDate (Date)
    - scrapedAt (Date)
    - employmentType (enum)
    - isRemote (boolean)
    - status (active | expired)
    - expiredAt (Date | null)
  - Several indexes for performance and uniqueness: platform+jobUrl, platform+jobKey, postedDate, requiredSkills, status.

- cron/scrapeJobs.js
  - Exports startJobFetcher() which:
    - Runs an initial fetch (runFetcher()) at startup.
    - Schedules fetches every 2 hours with cron expression "0 */2 * * *".
  - runFetcher() logs start/end times and calls fetchAndStoreJobs().

- cron/cleanOldJobs.js
  - Exports startCleanupCron() which schedules:
    - expireOldJobs() at cron "30 20 * * *" — marks jobs older than ACTIVE_DAYS (from EXPIRE_JOB_DAYS env or default 4) as expired.
    - deleteExpiredJobs() at cron "15 8 * * *" — deletes jobs expired more than DELETE_AFTER_EXPIRED_DAYS (30) ago.
  - NOTE: Cron expressions are literal; exact wall-clock times depend on the server's timezone.

- services/jobSearchService.js
  - Contains utilities used to normalize text, extract skills, parse experience, determine platform from URLs, and generate jobKey.
  - SEARCH_QUERIES array contains one sample: `"MERN Stack Developer India"`.
  - The file contains two forms of logic:
    - A commented-out full implementation that builds bulkWrite operations and upserts jobs into MongoDB.
    - A newer active section that currently calls the external RapidAPI endpoint (`jsearch.p.rapidapi.com/search-v2`) and logs responses, but does not persist to DB in the active code path. The commented section demonstrates how upserts were intended to work with Job.bulkWrite.
  - Uses SKILL_ALIASES from utils/skillAliases.js to detect skills in descriptions.

---

## Environment variables (what to set)
- MONGODB_URI — MongoDB connection string (required)
- RAPIDAPI_KEY — API key for JSearch RapidAPI (required if running fetcher)
- EXPIRE_JOB_DAYS — number of days after which active jobs are marked expired (default: 4)
- FRESH_JOB_DAYS — used to filter only recently posted jobs (default: 1)
- NODE_ENV — environment (development/production)
- (Optional) any other keys mentioned in code or utils (check utils and services for additional expectations)

---

## How to run (short path)
1. Clone and install:
   git clone https://github.com/abhinav84094/Job-Aggregator.git
   cd Job-Aggregator
   npm install

2. Create a `.env` in the repo root and set the required variables:
   MONGODB_URI="mongodb://localhost:27017/job-aggregator"
   RAPIDAPI_KEY="your-rapidapi-key"
   EXPIRE_JOB_DAYS=4
   FRESH_JOB_DAYS=1

3. Start the app:
   node server.js

Notes:
- package.json currently lists `"main": "index.js"` but the runtime entrypoint in this repo is `server.js`. Add a start script or correct `"main"` if you want `npm start` to work.
- To develop with auto-reload, install nodemon and run `npx nodemon server.js` or add a `dev` script.

---

## What the fetcher does (behavioral walkthrough)
1. scrapeJobs.runFetcher() is invoked at startup and then scheduled every 2 hours.
2. runFetcher() calls fetchAndStoreJobs() in services/jobSearchService.js.
3. fetchAndStoreJobs (intended flow in commented code):
   - Iterates SEARCH_QUERIES and calls the JSearch API.
   - For each returned job:
     - Skips items missing apply links or not within FRESH_JOB_DAYS.
     - Normalizes text and extracts skills using SKILL_ALIASES.
     - Generates a jobKey based on company/title/location.
     - Prepares upsert operations (updateOne with upsert).
   - Bulk writes to MongoDB using Job.bulkWrite to insert or update records.
4. In the current active implementation the code logs the API response and response status; the write logic is present as commented code. If you expect persisted jobs, re-enable and validate the upsert section and ensure SKILL_ALIASES is present.

---

## Data model notes (why things are done this way)
- jobKey + platform: protects against duplicates across scrapes and platforms.
- requiredSkills: extracted and normalized to allow skill searches / filters.
- Several indexes: help queries by postedDate, platform, status, and skill lookups to be fast at scale.
- Separate "status" and "expiredAt" fields allow soft-expiry and later permanent deletion.

---

## Cron schedules (exact expressions present in code)
- scrapeJobs: "0 */2 * * *" — runs at minute 0 every 2nd hour (e.g., 00:00, 02:00, 04:00, ...).
- expireOldJobs: "30 20 * * *" — runs daily at 20:30 (server timezone).
- deleteExpiredJobs: "15 8 * * *" — runs daily at 08:15 (server timezone).
Verify server timezone when deploying so schedules run at intended local times.

---

## Troubleshooting & common fixes
- MongoDB connection errors:
  - Ensure MONGODB_URI is correct, reachable, and credentials are valid.
  - Check firewall/IP whitelist for hosted DBs (Atlas).
- RapidAPI errors:
  - Ensure RAPIDAPI_KEY is set and has quota.
  - If responses are empty, inspect printed response JSON and check whether API changed.
- Duplicate key / unique index errors:
  - The Job model has unique constraints. If you see write failures, ensure jobKey/jobUrl normalization is stable and sanitized.
- Jobs not saved:
  - The active code in services/jobSearchService.js logs responses but the DB upsert logic is currently commented out. Re-enable and test in a controlled environment.
- Cron expressions appear to run at unexpected local times — confirm server timezone (system tz or container tz).

---

## Development tips & suggestions
- Add a `start` script to package.json:
  "start": "node server.js"
- Add graceful shutdown in server.js to close mongoose connection on SIGINT/SIGTERM.
- Add unit tests for:
  - normalize(), extractSkills(), parseExperienceMonths(), generateJobKey()
  - job upsert logic (simulate responses and bulkWrite behavior)
- Add retries and exponential backoff around axios calls to be resilient to transient network errors.
- Add logging (winston/pino) and structured logs to ease debugging in production.
- Consider a health endpoint and/or a small express server if you want liveness/readiness checks for containers.

---

## How to extend (add a new source)
1. Add source-specific fetch logic in services/, returning normalized objects matching the Job schema shape.
2. Add the new fetcher into fetchAndStoreJobs loop or create a modular sources list so each source can be polled independently.
3. Ensure the jobKey generation and platform detection uniquely identify jobs to avoid duplicates.
4. Add tests that simulate the source's response and assert that upserts happen as intended.

---

## Security & operational notes
- Do not commit API keys or MongoDB credentials. Use environment variables and secrets management for production.
- Monitor RapidAPI usage and Mongo DB storage to control costs and quotas.
- Use a process manager (PM2, systemd, Docker + restart policies) in production to keep the service running.

---

## Example troubleshooting commands
- Check logs quickly:
  tail -f /path/to/your/logfile.log
- Test DB connection from machine:
  node -e "require('mongoose').connect(process.env.MONGODB_URI).then(()=>console.log('ok')).catch(e=>console.error(e))"
- Inspect a single cron invocation manually:
  node -e "require('./cron/scrapeJobs.js').startJobFetcher && console.log('started')"

---

## Frequently asked questions (for a beginner)
Q: Why are some jobs marked "expired" before being deleted?  
A: The cleanup step soft-expired old jobs first (status = "expired" and expiredAt set) so you can still query or restore them for a window before permanent deletion (30 days in code).

Q: Why doesn't the fetcher persist jobs right now?  
A: The file contains a fully implemented but commented bulkWrite block; the currently active code logs the API response. Re-enable the upsert code and validate SKILL_ALIASES and DB connectivity.

Q: Where does skill extraction come from?  
A: The service loads SKILL_ALIASES from utils/skillAliases.js and normalizes the job description to find aliases for known skills.

---

## Next learning steps (for a beginner)
- Read models/Job.js to understand how schemas and indexes map to queries and data shape in MongoDB.
- Walk through services/jobSearchService.js to follow the fetch → normalize → upsert flow.
- Try running the fetcher locally with a test RapidAPI key and watch the logs — that will make the flow concrete.
- Add a single unit test for normalize() to see how text normalization affects skill extraction.

---

## Try asking (example repo-specific follow-ups)
- "Where is SKILL_ALIASES defined and how can I add skills to it?"
- "How do I re-enable the DB upsert in jobSearchService.js safely for testing?"
- "What cron timezone does the server use and how do I force UTC for the schedules?"

---

## License & contribution
- package.json lists license: ISC. Add a LICENSE file if you want to make the license explicit.
- Contributions: fork → branch → PR. Include tests and documentation for substantive changes.

---

Thank you for sharing the repo—this README is written so a beginner can clone, configure, run, and understand the code flow. If you want, you can copy this into README.md in the repository root and tweak environment examples or schedules to match your deployment environment.
