require("dotenv").config();
const fetch = require("node-fetch");
const fs = require("fs");

const profile = JSON.parse(fs.readFileSync("./config/profile.json", "utf-8"));
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function evaluateFit(job) {
  const prompt = `
You are evaluating whether this job is a good fit for this candidate:

Candidate:
${JSON.stringify(profile, null, 2)}

Job:
Title: ${job.title}
Company: ${job.company}
Location: ${job.location}
Description: ${job.snippet}

Respond with:
Fit: [Excellent Fit, Good Fit, Maybe Fit, Not a Fit]
Reason: <one short sentence>
`;

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  });

  const data = await res.json();
  const response = data.candidates?.[0]?.content?.parts?.[0]?.text;

  const match = /Fit:\s*(.+?)\s*Reason:\s*(.+)/i.exec(response);
  if (match) {
    return {
      fit: match[1].trim(),
      reason: match[2].trim()
    };
  } else {
    return {
      fit: "Unknown",
      reason: response
    };
  }
}

module.exports = { evaluateFit };
