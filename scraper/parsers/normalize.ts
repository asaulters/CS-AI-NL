import crypto from 'crypto';
import { ArticleRaw, ArticleClean } from '../../types';
import { hasSeen } from '../../db/seenStore';

export const normalize = (a: ArticleRaw): ArticleClean | null => {
  const id = crypto.createHash('md5').update(a.url).digest('hex');
  
  // Skip if we've seen this article before
  if (hasSeen(a.sourceId, id)) {
    return null;
  }
  
  return {
    ...a,
    id,
    publisher: new URL(a.url).hostname.replace(/^www\./,''),
    dateISO: a.pubDate ? new Date(a.pubDate).toISOString() : new Date().toISOString(),
    score: 0,
    star: false
  };
};
