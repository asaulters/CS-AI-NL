import fs from 'fs';
import path from 'path';
import { ArticleClean } from '../types';

const SENT_DIR = path.resolve('data/sent');
if (!fs.existsSync(SENT_DIR)) fs.mkdirSync(SENT_DIR, { recursive: true });

export function markSent(a: ArticleClean) {
  const p = path.join(SENT_DIR, `${a.sourceId}.jsonl`);
  const articleWithSentAt = {
    ...a,
    sentAt: new Date().toISOString()
  };
  fs.appendFileSync(p, JSON.stringify(articleWithSentAt) + '\n');
}

export function hasSent(sourceId: string, id: string, maxAgeDays = 30): boolean {
  const p = path.join(SENT_DIR, `${sourceId}.jsonl`);
  if (!fs.existsSync(p)) return false;
  
  const lines = fs.readFileSync(p, 'utf8').split('\n').filter(Boolean);
  
  for (const line of lines) {
    try {
      const article = JSON.parse(line);
      if (article.id === id) {
        // Check if the article was sent within the maxAgeDays period
        if (article.sentAt) {
          const sentDate = new Date(article.sentAt);
          const maxAgeDate = new Date();
          maxAgeDate.setDate(maxAgeDate.getDate() - maxAgeDays);
          
          if (sentDate >= maxAgeDate) {
            return true; // Article was sent recently enough
          }
        }
      }
    } catch (e) {
      // Skip invalid JSON lines
      continue;
    }
  }
  
  return false;
}

export function loadVectorsForSource(sourceId: string): number[][] {
  const p = path.join(SENT_DIR, `${sourceId}.jsonl`);
  if (!fs.existsSync(p)) return [];
  
  const lines = fs.readFileSync(p, 'utf8').split('\n').filter(Boolean);
  const vectors: number[][] = [];
  
  for (const line of lines) {
    try {
      const article = JSON.parse(line);
      if (article.embedding && Array.isArray(article.embedding)) {
        vectors.push(article.embedding);
      }
    } catch (e) {
      // Skip invalid JSON lines
      continue;
    }
  }
  
  return vectors;
}

export function cosine(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function isNearDup(vec: number[], prev: number[][], thr = 0.92): boolean {
  return prev.some(p => cosine(p, vec) > thr);
}
