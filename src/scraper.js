// src/scraper.js
const axios = require('axios');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const randomUseragent = require('random-useragent');
puppeteer.use(StealthPlugin());

// List of free proxies (replace with current working ones)
const FREE_PROXIES = [
  'http://45.61.139.48:8000',       // US proxy
  'http://193.122.71.184:3128',    // Netherlands
  'http://20.210.113.32:80',       // Azure
  'http://138.197.157.32:8080',    // DigitalOcean
  'http://165.227.204.239:3128'    // Linode
];

async function bypassCloudflare(url, attempt = 0) {
  const proxy = FREE_PROXIES[attempt % FREE_PROXIES.length];
  const userAgent = randomUseragent.getRandom();
  
  try {
    console.log(`Attempt ${attempt + 1} with proxy: ${proxy}`);
    const response = await axios.post('http://localhost:8191/v1', {
      cmd: 'request.get',
      url: url,
      maxTimeout: 90000, // 90 seconds
      proxy: { url: proxy },
      headers: {
        'User-Agent': userAgent,
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml'
      }
    });
    return response.data.solution;
  } catch (error) {
    if (attempt < FREE_PROXIES.length * 2) { // Try each proxy twice
      console.log(`Failed attempt ${attempt + 1}, retrying...`);
      await new Promise(res => setTimeout(res, 5000));
      return bypassCloudflare(url, attempt + 1);
    }
    throw new Error(`All proxy attempts failed: ${error.message}`);
  }
}

async function scrapeIndeedJobs(searchTerm = "software engineer remote") {
  const query = searchTerm.replace(/\s+/g, "+");
  const url = `https://www.indeed.com/jobs?q=${query}&l=Remote`;

  try {
    // Step 1: Bypass Cloudflare using FlareSolverr
    const solution = await bypassCloudflare(url);
    console.log('✅ Cloudflare bypass successful');

    // Step 2: Use Puppeteer with the obtained session
    const browser = await puppeteer.launch({
      headless: false, // Set to true after testing
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        `--proxy-server=${new URL(solution.proxyUsed || FREE_PROXIES[0]).host}`
      ]
    });

    try {
      const page = await browser.newPage();
      
      // Set random viewport
      await page.setViewport({
        width: 1280 + Math.floor(Math.random() * 100),
        height: 800 + Math.floor(Math.random() * 100),
        deviceScaleFactor: 1
      });

      // Set cookies and headers from FlareSolverr
      await page.setCookie(...solution.cookies.map(c => ({
        name: c.name,
        value: c.value,
        domain: c.domain || '.indeed.com'
      })));

      // Human-like navigation
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 60000,
        referer: 'https://www.google.com/'
      });

      // Check if still blocked
      const isBlocked = await page.evaluate(() => {
        return document.title.includes('Verification') || 
               document.querySelector('iframe[src*="challenge"]');
      });

      if (isBlocked) {
        await page.screenshot({ path: 'blocked.png' });
        throw new Error('Still blocked after bypass');
      }

      // Human-like scrolling
      await autoScroll(page);

      // Scrape jobs
      const jobs = await page.evaluate(() => {
      const jobElements = Array.from(document.querySelectorAll('li.css-1ac2h1w'));
      
      return jobElements.map(jobEl => {
        try {
          // Title and Link
          const titleEl = jobEl.querySelector('h2.jobTitle a');
          const title = titleEl?.textContent?.trim() || '';
          const relativeLink = titleEl?.getAttribute('href') || '';
          const link = relativeLink.startsWith('http') ? relativeLink : `https://www.indeed.com${relativeLink}`;
          
          // Company
          const company = jobEl.querySelector('[data-testid="company-name"]')?.textContent?.trim() || '';
          
          // Location
          const location = jobEl.querySelector('[data-testid="text-location"]')?.textContent?.trim() || '';
          
          // Salary
          const salaryContainer = jobEl.querySelector('.css-by2xwt, .css-1a6kja7');
          const salary = salaryContainer?.textContent?.replace(/\s+/g, ' ').trim() || '';
          
          // Job Type (Full-time, Contract, etc)
          const jobType = jobEl.querySelector('[data-testid="attribute_snippet_testid"]')?.textContent?.trim() || '';
          
          // Benefits/Attributes
          const attributes = Array.from(jobEl.querySelectorAll('.css-5ooe72'))
            .map(el => el.textContent.trim())
            .filter(text => text && !text.includes('+') && !text.includes('more'));
          
          // Easy Apply
          const easyApply = !!jobEl.querySelector('[data-testid="indeedApply"]');
          
          return {
            title,
            company,
            location,
            salary,
            jobType,
            attributes,
            easyApply,
            link
          };
        } catch (error) {
          console.error('Error processing job element:', error);
          return null;
        }
      }).filter(job => job?.title && job?.company); // Filter out invalid entries
    });

      console.log(`Scraped ${jobs.length} jobs`);
      return jobs;
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.error('Scraping failed:', error.message);
    return []; // Return empty array instead of failing
  }
}

// Helper function for human-like scrolling
async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= scrollHeight - window.innerHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 200 + Math.random() * 300);
    });
  });
}

module.exports = { scrapeIndeedJobs };