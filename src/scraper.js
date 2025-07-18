const puppeteer = require("puppeteer");

async function scrapeIndeedJobs(searchTerm = "software engineer remote") {
  const query = searchTerm.replace(/\s+/g, "+");
  const url = `https://www.indeed.com/jobs?q=${query}&l=Remote`;

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "domcontentloaded" });

  const jobs = await page.evaluate(() => {
    const results = [];
    const listings = document.querySelectorAll(".job_seen_beacon");

    listings.forEach((el) => {
      const title = el.querySelector("h2.jobTitle")?.innerText.trim();
      const company = el.querySelector(".companyName")?.innerText.trim();
      const location = el.querySelector(".companyLocation")?.innerText.trim();
      const snippet = el.querySelector(".job-snippet")?.innerText.trim();
      const link = "https://www.indeed.com" + el.querySelector("a")?.getAttribute("href");

      if (title && company && snippet && link) {
        results.push({ title, company, location, snippet, link });
      }
    });

    return results;
  });

  await browser.close();
  return jobs;
}

module.exports = { scrapeIndeedJobs };
