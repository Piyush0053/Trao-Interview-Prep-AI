#!/usr/bin/env node
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs = require('fs').promises;
const path = require('path');
const { runPipeline } = require('../src/services/pipeline');
const connectDB = require('../src/models/db');
const mongoose = require('mongoose');

function stripMeta(obj) {
  if (Array.isArray(obj)) {
    return obj.map(stripMeta);
  } else if (obj !== null && typeof obj === 'object') {
    const newObj = {};
    for (const key of Object.keys(obj)) {
      if (key !== '_meta') {
        newObj[key] = stripMeta(obj[key]);
      }
    }
    return newObj;
  }
  return obj;
}

async function evaluateBatch() {
  const args = process.argv.slice(2);
  let inputPath = '';
  let outputPath = '';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input') inputPath = args[i + 1];
    if (args[i] === '--output') outputPath = args[i + 1];
  }

  if (!inputPath || !outputPath) {
    console.error('Usage: npm run evaluate -- --input cases.json --output kits.json');
    process.exit(1);
  }

  const inputRaw = await fs.readFile(path.resolve(inputPath), 'utf-8');
  const cases = JSON.parse(inputRaw);

  await connectDB();

  const results = [];
  
  // Process sequentially to respect rate limits
  for (const caseData of cases) {
    const { id, jd, company_url, days } = caseData;
    console.log(`Processing case: ${id}...`);
    
    const result = await runPipeline({ jd, company_url, days });
    
    if (result.ok) {
      results.push({
        id,
        status: "ok",
        kit: stripMeta(result.kit),
        error: null
      });
    } else {
      results.push({
        id,
        status: "failed",
        kit: null,
        error: { code: result.error?.code || "PIPELINE_ERROR", message: result.error?.message || String(result.error) }
      });
    }
  }

  const outputDoc = {
    version: "1.0",
    generated_at: new Date().toISOString(),
    kits: results
  };

  await fs.writeFile(path.resolve(outputPath), JSON.stringify(outputDoc, null, 2), 'utf-8');
  console.log(`Evaluation complete. Results written to ${outputPath}`);
  
  await mongoose.disconnect();
}

evaluateBatch().catch(err => {
  console.error("Evaluation error:", err);
  mongoose.disconnect().then(() => process.exit(1));
});
