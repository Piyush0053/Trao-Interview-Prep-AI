const { GoogleGenAI } = require('@google/genai');
const prompts = require('../prompts');

// Make sure to set GEMINI_API_KEY in the environment
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL_NAME = 'gemini-3.1-flash-lite';

function loadPrompt(promptId, vars) {
  let content = prompts[promptId] || promptId;
  for (const [key, value] of Object.entries(vars)) {
    content = content.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  return content;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function callLLM(promptId, vars, schema, maxRetries = 4) {
  const promptText = loadPrompt(promptId, vars);
  
  let attempt = 0;
  let delay = 2000;
  
  while (attempt <= maxRetries) {
    try {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: promptText,
        config: {
          responseMimeType: 'application/json'
        }
      });
      
      let text = response.text;
      text = text.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
      
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        // Repair retry for invalid JSON
        const repairResponse = await ai.models.generateContent({
          model: MODEL_NAME,
          contents: `The following text is invalid JSON. Fix it and return ONLY valid JSON.\n\n${text}`,
          config: { responseMimeType: 'application/json' }
        });
        let repairText = repairResponse.text.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
        data = JSON.parse(repairText);
      }
      
      if (schema) {
        const parsed = schema.safeParse(data);
        if (!parsed.success) {
          // Schema repair retry
          const schemaRepairResponse = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: `The following JSON does not match the required schema. Fix it and return ONLY valid JSON.\n\nErrors: ${JSON.stringify(parsed.error.errors)}\n\nJSON:\n${JSON.stringify(data)}`,
            config: { responseMimeType: 'application/json' }
          });
          let schemaRepairText = schemaRepairResponse.text.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
          const repairedData = JSON.parse(schemaRepairText);
          const repairedParsed = schema.safeParse(repairedData);
          if (!repairedParsed.success) {
            return { ok: false, code: 'SCHEMA_ERROR', message: 'Failed to generate valid schema after repair.' };
          }
          return repairedParsed.data;
        }
        return parsed.data;
      }
      return data;
      
    } catch (error) {
      if (error.status === 429 || (error.message && error.message.includes('429'))) {
        attempt++;
        if (attempt > maxRetries) {
          return { ok: false, code: 'RATE_LIMIT', message: 'Exhausted retries due to rate limit' };
        }
        await sleep(delay + Math.random() * 500);
        delay *= 2;
      } else {
        return { ok: false, code: 'LLM_ERROR', message: error.message };
      }
    }
  }
}

module.exports = { callLLM };
