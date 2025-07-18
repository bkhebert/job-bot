const { scrapeIndeedJobs } = require("./scraper");
const { filterJobsLocally } = require("./filter");
const { evaluateFit } = require("./gemini");
const { saveJobs } = require("./utils");

(async () => {
  console.log("🔍 Scraping Indeed...");
  const scraped = await scrapeIndeedJobs("software engineer remote");
  console.log(`🧹 Found ${scraped.length} jobs`);

  const filtered = filterJobsLocally(scraped);
  console.log(`✅ ${filtered.length} passed local filters`);

  const results = [];
  const limit = 5; // limit Gemini calls

  for (let i = 0; i < Math.min(limit, filtered.length); i++) {
    const job = filtered[i];
    const fitResult = await evaluateFit(job);
    results.push({ ...job, ...fitResult });
    console.log(`🤖 ${job.title} => ${fitResult.fit}`);
  }

  saveJobs(results);
})();
