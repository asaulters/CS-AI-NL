import axios from 'axios';
import * as cheerio from 'cheerio';
import { Source, ArticleRaw } from '../../types';

const defaultSelectors = {
  item: 'article',
  link: 'article a',
  title: 'article a',
  date: 'article time',
  excerpt: 'article p',
};

export const htmlFetcher = async (src: Source): Promise<ArticleRaw[]> => {
  try {
    console.log(`Fetching HTML page: ${src.name} (${src.url})`);
    const response = await axios.get(src.url, {
      timeout: 30000,
      validateStatus: (s) => s < 500
    });
    if (response.status >= 400) {
      console.warn(`› bad status ${response.status} from ${src.id}`);
      return [];
    }
    const html: string = response.data;
    console.log(`› fetched ${html.length} chars from ${src.id}`);
    const selectors = { ...defaultSelectors, ...(src.selectors || {}) };
    const $ = cheerio.load(html);
    const items: ArticleRaw[] = [];

    $(selectors.item).each((_, el) => {
      const linkEl = $(el).find(selectors.link).first();
      const href = linkEl.attr('href') || '';
      const url = new URL(href, src.url).toString();
      const title = linkEl.text().trim();
      let dateISO: string | null = null;
      if (selectors.date && selectors.date.trim() !== '') {
        const dateEl = $(el).find(selectors.date).first();
        const dateRaw = dateEl.attr('datetime') || dateEl.text();
        const parsed = new Date(dateRaw);
        if (!isNaN(parsed.getTime())) {
          dateISO = parsed.toISOString();
        }
      }
      const excerpt = $(el).find(selectors.excerpt).text().trim();

      items.push({
        sourceId: src.id,
        title: title,
        url: url,
        pubDate: dateISO,
        description: excerpt || null
      });
    });
    
    if (items.length === 0 && html.length > 5000) {
      console.warn(`› no items via selectors for ${src.id}, falling back to link scan`);
      const seen = new Set<string>();
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href')!;
        const text = $(el).text().trim();
        // only consider longish link text => likely a headline,
        // and URLs on the same domain
        if (text.length > 20 && href.startsWith(src.url)) {
          const full = new URL(href, src.url).toString();
          if (!seen.has(full)) {
            seen.add(full);
            items.push({
              sourceId:  src.id,
              title:     text,
              url:       full,
              pubDate:   null,
              description: null,
            });
          }
        }
      });
      console.log(`✅ Fallback found ${items.length} links for ${src.id}`);
    }
    
    console.log(`✅ Successfully fetched ${items.length} items from ${src.name}`);
    return items;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Error fetching HTML page ${src.name} (${src.url}): ${errorMessage}`);
    // Return an empty array instead of crashing
    return [];
  }
};
