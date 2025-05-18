import { chromium } from 'playwright';
import { Source, ArticleRaw } from '../../types';

export const dynFetcher = async (src: Source): Promise<ArticleRaw[]> => {
  let browser = null;
  
  try {
    console.log(`Fetching dynamic page: ${src.name} (${src.url})`);
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(src.url, { timeout: 15000 });

    const items: ArticleRaw[] = await page.$$eval('article', articles =>
      articles.slice(0, 15).map(el => {
        const a = el.querySelector('a');
        const t = el.querySelector('time');
        return {
          sourceId: '', // fill later
          title: a?.textContent?.trim() || '',
          url: a?.getAttribute('href') || '',
          pubDate: t?.getAttribute('datetime') || null,
          description: el.querySelector('p')?.textContent?.trim() || null
        };
      })
    );

    const result = items.map(i => ({ ...i, sourceId: src.id }));
    console.log(`✅ Successfully fetched ${result.length} items from ${src.name}`);
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Error fetching dynamic page ${src.name} (${src.url}): ${errorMessage}`);
    // Return an empty array instead of crashing
    return [];
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};
