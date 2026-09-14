import { SKILL_ALIASES } from "./skillAliases.js";

// ─────────────────────────────────────────
// Normalize text
// ─────────────────────────────────────────
export const normalize = (text = "") => {
  return text
    .toLowerCase()
    .replaceAll("c++", "cplusplus")
    .replaceAll("c#", "csharp")
    .replace(/[^a-z0-9]/g, "")
    .trim();
};

// ─────────────────────────────────────────
// Extract skills from description
// ─────────────────────────────────────────
export const extractSkills = (description = "") => {
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

// ─────────────────────────────────────────
// Parse experience months from description
// ─────────────────────────────────────────
export const parseExperienceMonths = (description = "") => {
  const match = description.match(
    /(?:minimum\s+|at\s+least\s+)?(\d+)(?:\s*-\s*\d+)?\+?\s*(?:years?|yrs?)/i
  );
  if (!match) return 0;
  return Number(match[1]) * 12;
};

// ─────────────────────────────────────────
// Check if job is fresh
// ─────────────────────────────────────────
export const isFreshJob = (dateStr) => {
  if (!dateStr) return false;
  const posted = new Date(dateStr);
  const diffDays = (Date.now() - posted) / (1000 * 60 * 60 * 24);
  const FRESH_DAYS = Number(process.env.FRESH_JOB_DAYS) || 1;
  return diffDays <= FRESH_DAYS;
};

// ─────────────────────────────────────────
// Generate stable job key
// ─────────────────────────────────────────
export const generateJobKey = (
  company = "",
  title = "",
  location = ""
) => {
  return `${normalize(company)}-${normalize(title)}-${normalize(location)}`;
};

// ─────────────────────────────────────────
// Map URL to platform enum
// ─────────────────────────────────────────
export const getPlatform = (applyLink = "") => {
  const url = applyLink.toLowerCase();
  if (url.includes("linkedin"))    return "linkedin";
  if (url.includes("naukri"))      return "naukri";
  if (url.includes("indeed"))      return "indeed";
  if (url.includes("internshala")) return "internshala";
  if (url.includes("foundit"))     return "foundit";
  return "linkedin";
};