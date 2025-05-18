import { OpenAIEmbeddings } from '@langchain/openai';
import { ArticleClean } from '../types';
import * as dotenv from 'dotenv';

dotenv.config();

const embedder = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_KEY!,
  maxRetries: 3, // Limit retries to avoid excessive API calls
  maxConcurrency: 5, // Limit concurrent requests
});

const seedText =
  'customer success service support retention churn AI automation chatbot';

export async function scoreArticles(
  articles: ArticleClean[]
): Promise<ArticleClean[]> {
  try {
    console.log('Computing seed embedding...');
    // Compute seed embedding once per run
    const seedVector: number[] = await embedder.embedQuery(seedText);
    console.log('Seed embedding computed successfully');
    console.log('SEED first 5', seedVector.slice(0,5));
    console.log('Seed vector length:', seedVector.length);

    // Process articles in batches to avoid rate limits
    const batchSize = 5;
    const batches = Math.ceil(articles.length / batchSize);
    
    for (let i = 0; i < batches; i++) {
      const start = i * batchSize;
      const end = Math.min(start + batchSize, articles.length);
      const batch = articles.slice(start, end);
      
      console.log(`Processing batch ${i+1}/${batches} (articles ${start+1}-${end})...`);
      
      // Process each article in the batch
      for (let batchIdx = 0; batchIdx < batch.length; batchIdx++) {
        const art = batch[batchIdx];
        try {
          // Skip articles without embeddings (should not happen with ensureEmbeddings)
          if (!art.embedding) {
            console.log(`Skipping article without embedding: "${art.title.substring(0, 40)}..."`);
            continue;
          }

          // Use the pre-computed embedding from ensureEmbeddings
          const vec: number[] = art.embedding;
          
          // Debug vector info for first article of first batch
          if (i === 0 && batchIdx === 0) {
            console.log('VEC first 5', vec.slice(0,5));
            console.log('Article vector length:', vec.length);
          }

          // Cosine similarity calculation with explicit typings
          const dot: number = seedVector.reduce(
            (acc: number, sVal: number, idx: number) => acc + sVal * vec[idx],
            0
          );
          const mag: number =
            Math.hypot(...seedVector) * Math.hypot(...vec);
          const cosine: number = mag === 0 ? 0 : dot / mag;
          
          // Print raw cosine for first 3 articles
          if (i === 0 && batchIdx < 3) {
            console.log('RAW cos', cosine);
            console.log('seed len', seedVector.length, 'vec len', vec.length);
          }

          // Rescale cosine [-1, +1] to [0, 10]
          const rescaled = (cosine + 1) * 5;   // -1→0 , 0→5 , +1→10
          // Keep 2 decimals for debugging (temporarily bypass rounding)
          art.score = Math.round(rescaled * 100) / 100;
          
          console.log(`Cos: ${cosine.toFixed(3)}  ->  Score: ${art.score}  |  ${art.title.slice(0,50)}`);
        } catch (articleError) {
          const errorMessage = articleError instanceof Error ? articleError.message : String(articleError);
          console.error(`Error scoring individual article: ${errorMessage}`);
          console.log(`Assigning default score to article: "${art.title.substring(0, 40)}..."`);
          art.score = 5; // Default score for articles that fail
        }
      }
      
      // Add a small delay between batches to avoid rate limits
      if (i < batches - 1) {
        console.log('Waiting 2 seconds before processing next batch...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log('✅ Article scoring complete');
    return articles;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Error in scoreArticles: ${errorMessage}`);
    
    // If the entire process fails, assign default scores to all articles
    console.log('Assigning default scores to all articles');
    for (const art of articles) {
      art.score = 5;
    }
    
    return articles;
  }
}
