import fs from 'fs';
import dayjs from 'dayjs';
import { Source, ArticleClean } from '../types';
import { rssFetcher } from './fetchers/rssFetcher';
import { htmlFetcher } from './fetchers/htmlFetcher';
import { dynFetcher } from './fetchers/dynFetcher';
import { normalize } from './parsers/normalize';
import { scoreArticles } from './scoreArticles';
import { markSeen } from '../db/seenStore';
import { ensureEmbeddings } from './ensureEmbedding';
import { stripEmbedding } from './utils/strip';

const INCLUDES = [
  'ai','artificial intelligence','generative','genai','llm','large language model',
  'chatgpt','openai','gpt-4o','vector search','embedding','rag','prompt','hallucinat',
  'machine learning','ml','deep learning','nlp','natural language','speech analytics',
  'automation','automated','workflow','bot','chatbot','voicebot','virtual agent','ivr',
  'self-service','knowledge base','deflection','onboarding','adoption','activation',
  'renewal','churn','retention','upsell','expansion','health score','success plan',
  'ticket','case','support','help desk','service cloud','contact center','call center',
  'agent assist','csat','nps','sentiment','customer journey','experience orchestration',
  'predictive','forecast','propensity','segmentation','customer insights',
  'usage analytics','usage data'
];

const EXCLUDES = [
  'job posting','we are hiring','career','recruit','join our team','open role',
  'webinar','register now','conference','summit','event recap','virtual event',
  'expo','agenda','booth','fireside chat','discount','promotion','coupon',
  'black friday','cyber monday','deal','bundle','giveaway','earnings call','ipo',
  'quarterly results','shareholder','stock price','funding round','series a','vc',
  'acquired','acquisition','leadership update','press release','board of directors',
  'corporate governance','partnership announcement','devops','observability','finops',
  'zero trust','sase','blockchain','crypto','recipe','gift guide','holiday shopping',
  'lifestyle','fitness','celebrity'
];

function passesKeywordGate(a: { title: string; description?: string | null }): boolean {
  const txt = (a.title + ' ' + (a.description || '')).toLowerCase();
  if (EXCLUDES.some(k => txt.includes(k))) return false;
  return INCLUDES.some(k => txt.includes(k));
}

const loadSources = (): Source[] =>
  JSON.parse(fs.readFileSync('config/sources.json', 'utf8'));

const selectFetcher = (type: Source['type']) => ({
  rss: rssFetcher,
  html: htmlFetcher,
  dyn: dynFetcher
}[type]);

(async () => {
  const sources = loadSources();
  const clean: ArticleClean[] = [];

  for (const src of sources) {
    const raw = await selectFetcher(src.type)(src);
    const cleaned = raw
      .map(normalize)
      .filter((x): x is ArticleClean => x !== null);
    clean.push(...cleaned);
    await new Promise(r => setTimeout(r, (src.robotsDelay || 2) * 1000));
  }

  // Apply keyword filtering and per-source cap
  console.log(`Total articles fetched: ${clean.length}`);
  
  const perSourceCap = 7;            // tweak as needed
  const capped: ArticleClean[] = [];
  const perSource: Record<string, number> = {};

  for (const art of clean) {
    if (!passesKeywordGate(art)) continue;

    const n = perSource[art.sourceId] || 0;
    if (n >= perSourceCap) continue;
    perSource[art.sourceId] = n + 1;

    capped.push(art);
  }

  console.log(`Keyword+cap retained ${capped.length} of ${clean.length} articles`);
  
  // Ensure embeddings are present before scoring
  console.log(`Ensuring embeddings for ${capped.length} articles`);
  const READY = await ensureEmbeddings(capped);
  
  // Score articles for relevance
  console.log(`Scoring ${READY.length} articles with OpenAI embeddings`);
  await scoreArticles(READY);
  
  // ---- Rank & keep top-50 ----
  READY.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));   // descending
  const keep = READY.slice(0, 50);                         // highest 50
  
  console.log(`✅ Selected top ${keep.length} articles by relevance`);

  const stamp = dayjs().format('YYYY-MM-DD-HHmm');

  // Write raw and cleaned JSONL files (both without embeddings for readability)
  fs.writeFileSync(
    `data/raw/${stamp}.jsonl`,
    clean.map(stripEmbedding).map(item => JSON.stringify(item)).join('\n')
  );
  console.log(`✅  Saved ${clean.length} stripped articles to data/raw/${stamp}.jsonl`);
  // 👉 write *without* embeddings
  fs.writeFileSync(
    `data/clean/${stamp}.jsonl`,
    keep.map(stripEmbedding).map(item => JSON.stringify(item)).join('\n')
  );
  
  console.log(`✅  Saved ${keep.length} stripped articles to data/clean/${stamp}.jsonl`);
  
  // Mark all kept articles as seen
  for (const article of keep) {
    markSeen(article);
  }
  
  console.log(`✅  Marked ${keep.length} articles as seen`);
})();
