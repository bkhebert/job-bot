// src/utils/flaresolverr.js
const axios = require('axios');

const FLARESOLVERR_URL = 'http://localhost:8191/v1';

const freeProxies = [
  'http://45.61.139.48:8000',
  'http://193.122.71.184:3128',
  'http://20.210.113.32:80'
];

async function bypassCloudflare(url) {
  for (const proxy of freeProxies) {
    try {
      const response = await axios.post('http://localhost:8191/v1', {
        cmd: 'request.get',
        url: url,
        maxTimeout: 90000,
        proxy: { url: proxy },
        headers: {
          'Accept-Language': 'en-US,en;q=0.9'
        }
      });
      return response.data.solution;
    } catch (e) {
      console.log(`Failed with proxy ${proxy}, trying next...`);
    }
  }
  throw new Error('All proxies failed');
}

module.exports = { bypassCloudflare };