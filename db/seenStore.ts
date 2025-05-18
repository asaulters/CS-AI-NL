import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ArticleClean } from '../types';

const SEEN_DIR = path.resolve('data/seen');
if (!fs.existsSync(SEEN_DIR)) fs.mkdirSync(SEEN_DIR, { recursive: true });

export function articleId(url: string) {
  return crypto.createHash('md5').update(url).digest('hex');
}

export function markSeen(a: ArticleClean) {
  const p = path.join(SEEN_DIR, `${a.sourceId}.jsonl`);
  fs.appendFileSync(p, JSON.stringify(a) + '\n');
}

export function hasSeen(sourceId: string, id: string): boolean {
  const p = path.join(SEEN_DIR, `${sourceId}.jsonl`);
  if (!fs.existsSync(p)) return false;
  const lines = fs.readFileSync(p, 'utf8').split('\n');
  return lines.some(l => l.startsWith(`{"id":"${id}"`));
}
