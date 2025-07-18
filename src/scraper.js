const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const { executablePath } = require("puppeteer");

// Add stealth plugin
puppeteer.use(StealthPlugin());

async function scrapeIndeedJobs(searchTerm = "software engineer remote") {
  const query = searchTerm.replace(/\s+/g, "+");
  const url = `https://www.indeed.com/jobs?q=${query}&l=Remote`;

  const browser = await puppeteer.launch({
    headless: false, // Start with visible browser for debugging
    executablePath: executablePath(),
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--window-size=1920,1080'
    ]
  });

  try {
    const page = await browser.newPage();
    
    // Set realistic browser fingerprints
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br'
    });

    // Randomize viewport
    await page.setViewport({
      width: 1920 + Math.floor(Math.random() * 100),
      height: 1080 + Math.floor(Math.random() * 100),
      deviceScaleFactor: 1,
      hasTouch: false,
      isLandscape: false
    });

    console.log(`🌐 Navigating to Indeed...`);
    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 60000
    });

    // Check for CAPTCHA or verification page
    const isBlocked = await page.evaluate(() => {
      return document.querySelector('h1')?.textContent.includes('hCaptcha') || 
             document.querySelector('h1')?.textContent.includes('Verification');
    });

    if (isBlocked) {
      console.log('⚠️ Detected CAPTCHA or verification page');
      await page.screenshot({ path: 'blocked.png' });
      throw new Error('Bot detection triggered');
    }

    // Add random delays between actions
    await page.waitForTimeout(2000 + Math.random() * 3000);

    // Try multiple selectors for job listings
    const selectorsToTry = [
      '.job_seen_beacon',
      '[data-tn-component="organicJob"]',
      '.jobsearch-SerpJobCard'
    ];

    let jobElements = [];
    for (const selector of selectorsToTry) {
      jobElements = await page.$$(selector);
      if (jobElements.length > 0) break;
      await page.waitForTimeout(1000);
    }

    if (jobElements.length === 0) {
      await page.screenshot({ path: 'no_jobs.png' });
      throw new Error('No job listings found');
    }

    console.log(`Found ${jobElements.length} job listings`);

    const jobs = [];
    for (const element of jobElements.slice(0, 10)) { // Limit to first 10 for demo
      try {
        const job = await element.evaluate((el) => {
          // Helper function to safely extract text
          const getText = (selector, parent = el) => 
            parent.querySelector(selector)?.textContent?.trim() || '';

          const title = getText('h2.jobTitle a, h2.jobtitle a');
          const company = getText('[data-testid="company-name"], .companyName');
          const location = getText('[data-testid="text-location"], .companyLocation');
          const salary = getText('.salary-snippet-container, .salaryText');
          const snippet = getText('.job-snippet, .summary');
          
          const attributes = Array.from(
            el.querySelectorAll('[data-testid="attribute_snippet_testid"], .jobMetaDataGroup li')
          ).map(attr => attr.textContent.trim());

          const linkEl = el.querySelector('h2.jobTitle a, h2.jobtitle a');
          const relativeLink = linkEl?.getAttribute('href') || '';
          const link = relativeLink.startsWith('http') ? relativeLink : `https://www.indeed.com${relativeLink}`;
          
          const easyApply = !!el.querySelector('[data-testid="indeedApply"], .ialbl');

          return { 
            title, 
            company, 
            location, 
            salary,
            snippet, 
            attributes,
            easyApply,
            link 
          };
        });

        if (job.title && job.company && job.link) {
          jobs.push(job);
        }
      } catch (err) {
        console.log('Error processing job element:', err);
      }
      
      // Random delay between processing jobs
      await page.waitForTimeout(500 + Math.random() * 1500);
    }

    return jobs;
  } catch (error) {
    console.error('Scraping error:', error);
    return [];
  } finally {
    await browser.close();
  }
}

module.exports = { scrapeIndeedJobs };