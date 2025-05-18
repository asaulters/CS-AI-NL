import axios from 'axios';
import * as cheerio from 'cheerio';

async function test() {
  // Change this URL to any HTML‐type source from your config, e.g. Intercom
  const url = 'https://www.intercom.com/blog/tag/ai/';
  console.log(`Testing fetch for: ${url}`);

  // Fetch with extended timeout and allow 4xx
  const response = await axios.get(url, {
    timeout: 30000,
    validateStatus: (s) => s < 500
  });
  if (response.status >= 400) {
    console.error(`Bad status ${response.status} from test URL`);
    process.exit(1);
  }

  const html: string = response.data;
  console.log(`Fetched ${html.length} characters`);

  // Load into cheerio and count elements
  const $ = cheerio.load(html);
  const count = $('article').length;
  console.log(`Found ${count} <article> elements (default selector)`);

  process.exit(0);
}

test().catch(err => {
  console.error('Error during test:', err.message);
  process.exit(1);
});
