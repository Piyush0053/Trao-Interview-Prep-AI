# Interview Prep Kit Generator

## Project Overview and Tech Stack

This project is an automated Interview Preparation Kit generator. It takes a job description (JD) and a company URL as input, and outputs a comprehensive study guide including a company brief, a set of practice questions mapped to the job requirements, study flashcards, and a day-by-day study schedule.

### Tech Stack
- **Frontend**: Next.js (React), Tailwind CSS, Framer Motion, `@dnd-kit`. Chosen for rapid UI development and a smooth, interactive user experience with drag-and-drop capabilities.
- **Backend**: Node.js, Express.js. Chosen for easy integration with JSON-based APIs and lightweight orchestration of the LLM pipeline.
- **Database**: MongoDB (Mongoose) for storing generated kits and user states.
- **LLM**: Google Gen AI SDK.
- **Scraping**: `cheerio` for HTML parsing, `undici` for robust HTTP fetching.

## Setup Instructions

### Environment Variables
Create a `.env` file in the `backend` directory based on `.env.example`. You will need:
- `GEMINI_API_KEY`: Your Google Gemini API key.
- `MONGO_URI`: Your MongoDB connection string.

### Local Development
1. **Backend**:
   ```bash
   cd backend
   npm install
   node server.js
   ```
2. **Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

### Running the Batch Entry Point
To generate kits in bulk from a JSON file containing cases (array of objects with `id`, `jd`, `company_url`, `days`):
```bash
cd backend
npm run evaluate -- --input cases.json --output kits.json
```

## LLM Provider and Model
- **Provider**: Google
- **Model**: `gemini-3.1-flash-lite`. This model was chosen for its balance of speed and reasoning capabilities, which is crucial when making multiple sequential API calls for requirement extraction, question generation, and flashcard creation.

## High-Level Architecture
- **Web App**: The Next.js frontend allows users to view and interact with the generated interview kits, edit questions, and manage their pinned items.
- **API Server**: The Express backend exposes endpoints for the frontend to fetch and update kits.
- **Pipeline Engine**: The core logic resides in `backend/src/services/pipeline.js`, which orchestrates the calls between the Crawler, the Search module, and the LLM service to build the kit progressively.
- **Resilient LLM wrapper**: A custom wrapper around the Gemini SDK that implements retry logic with exponential backoff for rate limits, as well as automatic "repair loops" when the LLM outputs malformed JSON or violates the expected schema.

## Retrieval Approach and Sources
The pipeline gathers context from two main sources before generating questions:
1. **Company Website (Crawler)**: It fetches the provided company URL and extracts links. It filters for relevant links (e.g., "about", "careers", "culture") and uses the LLM to rank them. It then scrapes the top 3 most relevant pages to generate a "Company Brief".
2. **External Discussions (Web Search)**: It performs a DuckDuckGo HTML search for `[Company Name] interview process questions`. It parses the search result snippets (often surfacing Glassdoor or Reddit discussions) to extract real-world context on how the company interviews (e.g., "3 rounds", "focus on system design"). This context is directly fed into the question generation prompt.

## Sequencing of Steps

The generation pipeline executes in the following sequence:
1. **`extractRequirements`**: Analyzes the JD to extract role details and a list of requirements (classified by priority: must vs. nice-to-have).
2. **`crawlCompanySite`**: Fetches the company URL, discovers subpages, ranks them, and extracts text.
3. **`buildCompanyBrief`**: Generates a summary of the company based on the scraped pages.
4. **`findInterviewProcessDiscussion`**: Searches the web for insights on the company's interview process.
5. **`generateQuestions`**: Iterates through each requirement, passing the requirement and the interview process context to the LLM to generate targeted questions.
6. **`checkCoverage` (Coverage Loop)**: Checks if any "must-have" requirements failed to produce a question. If gaps exist, it runs additional passes (up to 3) specifically for those missing requirements.
7. **`generateFlashcards`**: Summarizes the generated questions into front/back flashcards for rapid study.
8. **`buildSchedule`**: Allocates the questions across the available days.

## State Representation (Generated, Edited, Pinned)
State mutations are managed via a `_meta` object attached to items (requirements, questions, flashcards).
- **Format**: `_meta: { origin: 'generated', pinned: false }`
- When a user manually edits a generated item, or pins an item they like, `pinned` is set to `true`. 
- When the user clicks "Regenerate", the pipeline respects pinned items. It filters out unpinned items, runs the LLM generation, and merges the new results with the `pinned` items, ensuring user edits and saved items are never overwritten.

## Schedule Allocation
The schedule builder ensures the candidate studies the most important material first:
1. **Scoring**: Each question is scored based on the highest priority of the requirements it covers (must = 2, nice = 1) multiplied by the question's difficulty (1-3).
2. **Fallback Injection**: If any "must-have" requirement was missed by the LLM (even after the coverage loop), a high-difficulty fallback review question is forcefully injected.
3. **Sorting & Distribution**: Questions are sorted descending by score. The list is chunked evenly across the available days. Because of the sorting, Day 1 always contains the highest-scoring (hardest + must-have) questions.

## Creative Feature
**Auto-Repairing LLM JSON Parser**: 
A common failure mode with LLMs is returning invalid JSON or JSON that violates the requested schema. The `callLLM` service implements a self-healing loop:
- If `JSON.parse` fails, it prompts the LLM again with the exact broken text, asking it to fix the JSON syntax.
- If the parsed JSON fails the `Zod` schema validation, it prompts the LLM with the validation errors and the current JSON, asking it to correct the structure.

**Coverage Assurance Loop & Fallbacks**:
To ensure the study kit is comprehensive, the pipeline doesn't just trust the LLM to cover everything on the first try. It runs a `checkCoverage` diff against the "must-have" requirements. It runs up to 3 generation passes to fill gaps, and if gaps still remain, the schedule builder injects generic fallback questions to guarantee 100% coverage of critical requirements.

## Key Design Decisions, Trade-offs, and Limitations
- **Sequential LLM Calls over Parallel**: Generating questions per requirement is done sequentially with a 1.5s delay. *Trade-off*: This significantly increases the total generation time, but it was necessary to aggressively prevent `HTTP 429 Too Many Requests` errors from the LLM provider rate limits.
- **Search Snippets over Full Page Fetches**: For the interview process search, the app only parses DuckDuckGo search result snippets rather than fetching the full Reddit/Glassdoor pages. *Trade-off*: It's much faster and avoids complex bot-protection mechanisms on those sites, but the context is limited to ~160 characters per result, sometimes missing deeper insights.
- **SSRF limitations**: The crawler uses a strict URL validator to prevent Server-Side Request Forgery (SSRF) and blocks requests to localhost/private IPs. *Limitation*: This prevents testing the crawler against a local mock server unless `ALLOW_LOCAL_HOSTS=true` is set.
