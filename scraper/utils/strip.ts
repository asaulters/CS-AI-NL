import { ArticleClean } from "../../types";

/** Return a shallow copy of the article without the heavy embedding vector */
export function stripEmbedding(a: ArticleClean): Omit<ArticleClean, "embedding"> {
  const { embedding, ...rest } = a;
  return rest;
}
