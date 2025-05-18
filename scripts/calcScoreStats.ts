import fs from 'fs';
import path from 'path';

// Get the latest JSONL file in the data/clean directory
const cleanDir = path.resolve('data/clean');
const files = fs.readdirSync(cleanDir)
  .filter(file => file.endsWith('.jsonl'))
  .sort()
  .reverse();

if (files.length === 0) {
  console.error('No JSONL files found in data/clean directory');
  process.exit(1);
}

const latestFile = path.join(cleanDir, files[0]);
console.log(`Reading from ${latestFile}`);

// Read and parse the file
const content = fs.readFileSync(latestFile, 'utf8');
const articles = content
  .split('\n')
  .filter(line => line.trim() !== '')
  .map(line => JSON.parse(line));

// Calculate statistics
const scores = articles.map(article => article.score);
const min = Math.min(...scores);
const max = Math.max(...scores);
const sum = scores.reduce((acc, score) => acc + score, 0);
const mean = sum / scores.length;

console.log(`min: ${min}`);
console.log(`mean: ${mean}`);
console.log(`max: ${max}`);
