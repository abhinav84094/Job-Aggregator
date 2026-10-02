import { SKILL_ALIASES } from "./skillAliases.js";

// ─────────────────────────────────────────
// Normalize text
// Used for job keys and general normalization
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
// Normalize job description text
// Keeps word boundaries for accurate skill matching
// ─────────────────────────────────────────
const normalizeJobText = (text = "") => {
  return text
    .toLowerCase()
    .replaceAll("c++", "cplusplus")
    .replaceAll("c#", "csharp")
    .replace(/[•●▪]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

// ─────────────────────────────────────────
// Escape special regex characters
// ─────────────────────────────────────────
const escapeRegex = (text = "") => {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

// ─────────────────────────────────────────
// Extract skills from job description
// ─────────────────────────────────────────
export const extractSkills = (description = "") => {
  const text = normalizeJobText(description);
  const extractedSkills = new Set();

  for (const [skill, aliases = []] of Object.entries(SKILL_ALIASES)) {
    // Check both canonical skill name and aliases
    const allAliases = [skill, ...aliases];

    for (const alias of allAliases) {
      if (!alias) continue;

      const normalizedAlias = normalizeJobText(alias);

      if (!normalizedAlias) continue;

      const escapedAlias = escapeRegex(normalizedAlias);

      // Match complete words/phrases instead of simple substring matching.
      const regex = new RegExp(
        `(^|[^a-z0-9+#.])${escapedAlias}([^a-z0-9+#.]|$)`,
        "i"
      );

      if (regex.test(text)) {
        extractedSkills.add(skill);
        break;
      }
    }
  }

  return [...extractedSkills];
};

// ─────────────────────────────────────────
// Parse required experience into months
// ─────────────────────────────────────────

export const parseExperienceMonths = (description = "") => {
  const text = description
    .toLowerCase()
    .replace(/[–—]/g, "-");

  // Match ranges such as "3-5 years" or "3 to 5 years".
  const rangeRegex =
    /(\d+(?:\.\d+)?)\s*(?:-|to)\s*(\d+(?:\.\d+)?)\s*(years?|yrs?|months?|mos?)/gi;

  const rangeMatch = rangeRegex.exec(text);

  if (rangeMatch) {
    const minimum = Number(rangeMatch[1]);
    const unit = rangeMatch[3];

    return unit.startsWith("year") || unit.startsWith("yr")
      ? minimum * 12
      : minimum;
  }

  // Match single values such as "3+ years" or "6 months".
  const singleRegex =
    /(?:minimum\s+of|minimum|at\s+least|min\.?)?\s*(\d+(?:\.\d+)?)\s*\+?\s*(years?|yrs?|months?|mos?)/i;

  const match = singleRegex.exec(text);

  if (!match) return 0;

  const value = Number(match[1]);
  const unit = match[2];

  return unit.startsWith("year") || unit.startsWith("yr")
    ? value * 12
    : value;
};


// ─────────────────────────────────────────
// Check if job is fresh
// ─────────────────────────────────────────
export const isFreshJob = (dateStr) => {
  if (!dateStr) return false;

  const posted = new Date(dateStr);

  if (Number.isNaN(posted.getTime())) {
    return false;
  }

  const diffDays =
    (Date.now() - posted.getTime()) / (1000 * 60 * 60 * 24);

  const FRESH_DAYS = Number(process.env.FRESH_JOB_DAYS) || 1;

  return diffDays >= 0 && diffDays <= FRESH_DAYS;
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

  if (url.includes("linkedin")) {
    return "linkedin";
  }

  if (url.includes("naukri")) {
    return "naukri";
  }

  if (url.includes("indeed")) {
    return "indeed";
  }

  if (url.includes("internshala")) {
    return "internshala";
  }

  if (url.includes("foundit")) {
    return "foundit";
  }

  return "linkedin";
};