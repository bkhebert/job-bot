const fs = require("fs");
const path = require("path");

function saveJobs(jobs) {
  const outputPath = path.join(__dirname, "../data/jobs.json");
  fs.writeFileSync(outputPath, JSON.stringify(jobs, null, 2));
  console.log(`✅ Saved ${jobs.length} jobs to jobs.json`);
}

module.exports = { saveJobs };
