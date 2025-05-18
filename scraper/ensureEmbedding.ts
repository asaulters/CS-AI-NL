import { OpenAIEmbeddings } from '@langchain/openai';
import { ArticleClean } from '../types';
import { articleId, markSeen } from '../db/seenStore';
import * as dotenv from 'dotenv';
import striptags from 'striptags';

dotenv.config();

const embedder = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_KEY!,
  modelName: 'text-embedding-3-small',
  batchSize: 20,
  maxConcurrency: 2,
  maxRetries: 5
});

function teaser(html?: string | null): string {
  if (!html) return '';
  const clean = striptags(html)          // strip all markup
                 .replace(/\s+/g, ' ')   // collapse whitespace
                 .trim();
  // return first ~60 words
  return clean.split(' ').slice(0, 60).join(' ');
}

export async function ensureEmbeddings(arts: ArticleClean[]): Promise<ArticleClean[]> {
  const missing = arts.filter(a => !a.embedding);
  if (missing.length === 0) return arts;

  const texts = missing.map(a =>
    `${a.title}\n\n${teaser(a.description || (a as any).excerpt)}`);
  const vectors = await embedder.embedDocuments(texts);

  missing.forEach((a, i) => {
    a.embedding = vectors[i];
    markSeen(a);               // update cache with embedding
  });
  return arts;
}
