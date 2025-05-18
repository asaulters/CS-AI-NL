import Parser from 'rss-parser';
import { Source, ArticleRaw } from '../../types';
const parser = new Parser();

export const rssFetcher = async (src: Source): Promise<ArticleRaw[]> => {
  try {
    console.log(`Fetching RSS feed: ${src.name} (${src.url})`);
    const feed = await parser.parseURL(src.url);
    console.log(`✅ Successfully fetched ${feed.items.length} items from ${src.name}`);
    return feed.items.map(i => ({
      sourceId: src.id,
      title: i.title ?? '',
      url:   i.link  ?? '',
      pubDate: i.pubDate ?? null,
      description: i.contentSnippet ?? null
    }));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Error fetching RSS feed ${src.name} (${src.url}): ${errorMessage}`);
    // Return an empty array instead of crashing
    return [];
  }
};
