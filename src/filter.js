const INCLUDE_KEYWORDS = ["react", "node", "typescript", "postgres", "ai", "full-stack"];
const EXCLUDE_KEYWORDS = ["senior", "director", "principal", "phd", "10+ years"];

function filterJobsLocally(jobs) {
  return jobs.filter((job) => {
    const text = `${job.title} ${job.snippet}`.toLowerCase();

    const includes = INCLUDE_KEYWORDS.some((kw) => text.includes(kw));
    const excludes = EXCLUDE_KEYWORDS.some((kw) => text.includes(kw));

    return includes && !excludes;
  });
}

module.exports = { filterJobsLocally };
