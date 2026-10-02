import puppeteer from "puppeteer";

export const fetchFullJobDescription = async (url) => {
  if (!url) return "";

  let browser;

  try {
    browser = await puppeteer.launch({
        executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        headless: true,
    });

    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
      "AppleWebKit/537.36 (KHTML, like Gecko) " +
      "Chrome/130.0.0.0 Safari/537.36"
    );

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 25000,
    });

    const description = await page.evaluate(() => {
      // Prefer structured JobPosting data.
      const scripts = [
        ...document.querySelectorAll(
          'script[type="application/ld+json"]'
        ),
      ];

      for (const script of scripts) {
        try {
          const data = JSON.parse(script.textContent);

          const entries = Array.isArray(data)
            ? data
            : data["@graph"]
              ? data["@graph"]
              : [data];

          for (const entry of entries) {
            if (
              entry["@type"] === "JobPosting" ||
              (Array.isArray(entry["@type"]) &&
                entry["@type"].includes("JobPosting"))
            ) {
              const text =
                typeof entry.description === "string"
                  ? entry.description
                  : "";

              if (text.length > 100) {
                const element = document.createElement("div");
                element.innerHTML = text;
                return element.innerText || element.textContent || "";
              }
            }
          }
        } catch {
          // Ignore invalid structured data.
        }
      }

      // Generic fallback selectors; actual selectors vary by job site.
      const selectors = [
        '[data-testid="jobDescriptionText"]',
        "#jobDescriptionText",
        '[class*="job-description"]',
        '[class*="jobDescription"]',
        '[id*="job-description"]',
        "main",
      ];

      for (const selector of selectors) {
        const element = document.querySelector(selector);
        const text = element?.innerText?.trim() || "";

        if (text.length > 500) {
          return text;
        }
      }

      return "";
    });

    return description.trim();
  } catch (error) {
    console.warn(
      `[Full description] Could not fetch ${url}: ${error.message}`
    );
    return "";
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
};