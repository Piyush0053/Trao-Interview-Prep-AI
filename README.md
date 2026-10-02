# Interview Prep Kit Generator — Trao AI

## Project Overview

An automated **Interview Preparation Kit** generator. The user provides a **Job Description** and a **Company URL**, and the system produces a comprehensive study guide containing:
- A **Company Brief** (scraped & AI-generated)
- Targeted **Interview Questions** mapped to job requirements
- **Flashcards** for rapid study
- A prioritised **Day-by-Day Schedule**

---

## Tech Stack
| Layer | Technology | Purpose |
|---|---|---|
| Frontend | Next.js 14, React, Tailwind CSS | App Router, SSR, dark-navy UI |
| UI Libraries | `@dnd-kit`, `lucide-react`, `@splinetool/react-spline` | Drag-and-drop, icons, 3D assets |
| Backend | Node.js, Express 5 | REST API, SSE streaming, session auth |
| Database | MongoDB (Mongoose 9) | Kits, Users, Jobs, PracticeProgress |
| Sessions | `express-session` + `connect-mongo` | Persistent cookie-based auth |
| LLM | Google Gemini SDK (`gemini-3.1-flash-lite`) | Requirement extraction, Q&A generation |
| Scraping | `undici` + `cheerio` + `robots-parser` | Company page crawling, SSRF-safe |
| Validation | `zod` + `zod-to-json-schema` | Runtime schema enforcement |

---

## High-Level Architecture (HLD)

### 1. System Overview — Full Stack Architecture

```mermaid
graph TB
    subgraph BROWSER["🖥️  Browser — Client Tier"]
        direction TB
        NEXT["Next.js App Router<br/>(React 18 + Tailwind CSS)"]
        SSE_CLIENT["SSE Listener<br/>(EventSource)"]
    end

    subgraph SERVER["⚙️  Node.js Server — API Tier"]
        direction TB
        EXPRESS["Express 5<br/>REST API"]
        SESSION["Session Middleware<br/>(express-session)"]
        AUTH_MW["Auth Middleware<br/>(requireAuth)"]
        ROUTES["Route Handlers"]
        SSE_SERVER["SSE Endpoint<br/>GET /api/kits/:id/events"]
    end

    subgraph PIPELINE["🧠  Pipeline Engine — Processing Tier"]
        direction TB
        ORCHESTRATOR["pipeline.js<br/>Orchestrator"]
        LLM_SERVICE["llm.js<br/>Gemini Wrapper"]
        CRAWLER["crawler.js<br/>Web Scraper"]
        COVERAGE["coverage.js<br/>Gap Checker"]
        SCHEDULER["schedule.js<br/>Day Allocator"]
    end

    subgraph EXTERNAL["🌐  External Services"]
        GEMINI["Google Gemini API<br/>(gemini-3.1-flash-lite)"]
        COMPANY_SITE["Target Company<br/>Website"]
        DDG["DuckDuckGo<br/>Search"]
    end

    subgraph DATA["🗄️  Data Tier"]
        MONGO[("MongoDB Atlas")]
        MONGO_STORE[("MongoStore<br/>Sessions")]
    end

    NEXT -- "fetch('/api/...')" --> EXPRESS
    SSE_CLIENT -. "EventSource stream" .-> SSE_SERVER
    EXPRESS --> SESSION --> AUTH_MW --> ROUTES
    ROUTES -- "POST /api/kits" --> ORCHESTRATOR
    SSE_SERVER -. "poll Kit.progress" .-> MONGO

    ORCHESTRATOR --> LLM_SERVICE
    ORCHESTRATOR --> CRAWLER
    ORCHESTRATOR --> COVERAGE
    ORCHESTRATOR --> SCHEDULER

    LLM_SERVICE -- "generateContent()" --> GEMINI
    CRAWLER -- "fetch + cheerio" --> COMPANY_SITE
    CRAWLER -- "HTML search" --> DDG

    ROUTES -- "CRUD" --> MONGO
    SESSION -- "store" --> MONGO_STORE

    classDef browserStyle fill:#1a1f2e,stroke:#00bcd4,stroke-width:2px,color:#e6edf3
    classDef serverStyle fill:#161b22,stroke:#7c3aed,stroke-width:2px,color:#e6edf3
    classDef pipelineStyle fill:#0d1117,stroke:#f59e0b,stroke-width:2px,color:#e6edf3
    classDef externalStyle fill:#1c2333,stroke:#ef4444,stroke-width:2px,color:#e6edf3
    classDef dataStyle fill:#0f172a,stroke:#22c55e,stroke-width:2px,color:#e6edf3

    class NEXT,SSE_CLIENT browserStyle
    class EXPRESS,SESSION,AUTH_MW,ROUTES,SSE_SERVER serverStyle
    class ORCHESTRATOR,LLM_SERVICE,CRAWLER,COVERAGE,SCHEDULER pipelineStyle
    class GEMINI,COMPANY_SITE,DDG externalStyle
    class MONGO,MONGO_STORE dataStyle
```

---

### 2. Frontend — Page & Component Architecture

```mermaid
graph TD
    subgraph LAYOUT["layout.tsx — Root Shell"]
        NAVBAR["Navbar"]
    end

    LAYOUT --> LANDING["/ — Landing Page<br/>(Hero, Feature Cards, CTA)"]
    LAYOUT --> LOGIN["/login — Login Page<br/>(Email + Password Form)"]
    LAYOUT --> REGISTER["/register — Register Page<br/>(Email + Password Form)"]
    LAYOUT --> DASHBOARD["/dashboard — Dashboard<br/>(Kit Cards Grid, Stats, Quick-Create)"]
    LAYOUT --> NEW_KIT["/kits/new — Create Kit<br/>(JD Input, Company URL, Days, Batch Upload)"]
    LAYOUT --> KIT_DETAIL["/kits/[id] — Kit Detail<br/>(Three-Column Layout with Tab Navigation)"]
    LAYOUT --> PRACTICE["/kits/[id]/practice — Practice Mode<br/>(Immersive 3D Flip Flashcards)"]

    subgraph KIT_CHILDREN["Kit Detail Sub-Components"]
        GEN_PROGRESS["GenerationProgress.tsx<br/>(Vertical Timeline, SSE Listener)"]
        QUESTION_BOARD["QuestionBoard.tsx<br/>(Drag-n-Drop, Category Filters)"]
        FLASHCARD_BOARD["FlashcardBoard.tsx<br/>(Card Grid, Pin/Unpin)"]
        EDITABLE_FIELD["EditableField.tsx<br/>(Inline Edit, Save/Cancel)"]
        READINESS["ReadinessMatrix.tsx<br/>(Coverage Heat Map)"]
    end

    KIT_DETAIL --> GEN_PROGRESS
    KIT_DETAIL --> QUESTION_BOARD
    KIT_DETAIL --> FLASHCARD_BOARD
    KIT_DETAIL --> EDITABLE_FIELD
    KIT_DETAIL --> READINESS

    classDef page fill:#161b22,stroke:#00bcd4,stroke-width:2px,color:#e6edf3
    classDef comp fill:#1a1f2e,stroke:#7c3aed,stroke-width:1px,color:#e6edf3

    class LANDING,LOGIN,REGISTER,DASHBOARD,NEW_KIT,KIT_DETAIL,PRACTICE page
    class GEN_PROGRESS,QUESTION_BOARD,FLASHCARD_BOARD,EDITABLE_FIELD,READINESS,NAVBAR comp
```

---

### 3. Backend — Module Architecture

```mermaid
graph LR
    subgraph ENTRY["Entry Point"]
        SERVER["server.js<br/>Listen on PORT 8099"]
    end

    subgraph APP["app.js — Express App"]
        JSON_MW["express.json()"]
        SESSION_MW["express-session<br/>+ MongoStore"]
    end

    subgraph ROUTES["Route Handlers"]
        AUTH_R["routes/auth.js<br/>POST /register<br/>POST /login<br/>POST /logout<br/>GET /me"]
        KITS_R["routes/kits.js<br/>POST / (create)<br/>GET / (list)<br/>GET /:id (detail)<br/>DELETE /:id<br/>GET /:id/events (SSE)<br/>PATCH /:id/brief<br/>PATCH /:id/questions<br/>PATCH /:id/flashcards<br/>POST /:id/regenerate"]
        PRACTICE_R["routes/practice.js<br/>GET /:id/progress<br/>POST /:id/progress"]
    end

    subgraph SERVICES["Services"]
        PIPELINE["pipeline.js<br/>runPipeline()<br/>regenerateBrief()<br/>regenerateRole()<br/>regenerateQuestions()<br/>regenerateFlashcards()"]
        LLM["llm.js<br/>callLLM()<br/>Auto-Repair Loop"]
        CRAWL["crawler.js<br/>crawlCompanySite()<br/>findInterviewProcess()<br/>SSRF Guard"]
        COV["coverage.js<br/>checkCoverage()"]
        SCHED["schedule.js<br/>buildSchedule()"]
    end

    subgraph MODELS["Mongoose Models"]
        USER_M["User.js<br/>{email, passwordHash}"]
        KIT_M["Kit.js<br/>{ownerId, status, source,<br/>company_brief, role,<br/>questions, flashcards,<br/>schedule, coverage, progress}"]
        JOB_M["Job.js<br/>{kitId, ownerId, status,<br/>currentStep, startedAt}"]
        PP_M["PracticeProgress.js<br/>{kitId, userId,<br/>cardResults, sessionDate}"]
    end

    subgraph SCHEMAS["Zod Schemas"]
        KIT_Z["schemas/kit.js<br/>KitSchema, RequirementSchema,<br/>QuestionSchema, FlashcardSchema"]
    end

    SERVER --> APP
    APP --> JSON_MW --> SESSION_MW
    SESSION_MW --> AUTH_R
    SESSION_MW --> KITS_R
    SESSION_MW --> PRACTICE_R

    KITS_R --> PIPELINE
    PIPELINE --> LLM
    PIPELINE --> CRAWL
    PIPELINE --> COV
    PIPELINE --> SCHED
    PIPELINE --> KIT_Z

    AUTH_R --> USER_M
    KITS_R --> KIT_M
    KITS_R --> JOB_M
    PRACTICE_R --> PP_M

    classDef entry fill:#22c55e,stroke:#22c55e,stroke-width:1px,color:#0d1117
    classDef route fill:#7c3aed,stroke:#7c3aed,stroke-width:1px,color:#fff
    classDef service fill:#f59e0b,stroke:#f59e0b,stroke-width:1px,color:#0d1117
    classDef model fill:#00bcd4,stroke:#00bcd4,stroke-width:1px,color:#0d1117
    classDef schema fill:#ef4444,stroke:#ef4444,stroke-width:1px,color:#fff

    class SERVER entry
    class AUTH_R,KITS_R,PRACTICE_R route
    class PIPELINE,LLM,CRAWL,COV,SCHED service
    class USER_M,KIT_M,JOB_M,PP_M model
    class KIT_Z schema
```

---

### 4. Data Model — Entity Relationship Diagram

```mermaid
erDiagram
    USER {
        ObjectId _id PK
        String email UK
        String passwordHash
    }

    KIT {
        ObjectId _id PK
        ObjectId ownerId FK
        String status
        String inputHash
        Mixed source
        String original_jd
        Mixed company_brief
        Mixed role
        Array questions
        Array flashcards
        Mixed schedule
        Mixed coverage
        Array progress
        Date createdAt
        Date updatedAt
    }

    JOB {
        ObjectId _id PK
        ObjectId kitId FK
        ObjectId ownerId FK
        String status
        String currentStep
        Date startedAt
        Date finishedAt
        Mixed error
    }

    PRACTICE_PROGRESS {
        ObjectId _id PK
        ObjectId kitId FK
        ObjectId userId FK
        Array cardResults
        Date sessionDate
    }

    SESSION {
        String _id PK
        ObjectId userId FK
        Date expires
        Mixed session
    }

    USER ||--o{ KIT : "owns"
    USER ||--o{ JOB : "owns"
    USER ||--o{ PRACTICE_PROGRESS : "records"
    USER ||--o{ SESSION : "authenticates via"
    KIT ||--o{ JOB : "tracked by"
    KIT ||--o{ PRACTICE_PROGRESS : "practiced via"
```

---

### 5. Core Pipeline — Kit Generation Flow (Step-by-Step)

```mermaid
flowchart TD
    START(["🚀 User Submits JD + Company URL + Days"])
    START --> DEDUP{"Duplicate Check<br/>(SHA-256 inputHash)"}
    DEDUP -- "Exists" --> RETURN_EXISTING["Return Existing Kit ID"]
    DEDUP -- "New" --> CREATE_KIT["Create Kit (status: pending)<br/>Create Job (status: running)"]

    CREATE_KIT --> BG_START["🔄 Background Pipeline Starts"]

    BG_START --> STEP1["Step 1: extractRequirements<br/>───────────────────<br/>LLM analyses JD text<br/>→ title, seniority, location<br/>→ requirements (must / nice-to-have)"]

    STEP1 --> STEP2["Step 2: crawlCompanySite<br/>───────────────────<br/>Fetch company URL<br/>→ Discover subpage links<br/>→ Check robots.txt<br/>→ LLM ranks relevant pages<br/>→ Scrape top 3 pages"]

    STEP2 --> STEP3["Step 3: buildCompanyBrief<br/>───────────────────<br/>LLM summarises scraped pages<br/>→ summary, what_they_do, sources"]

    STEP3 --> STEP4["Step 4: findInterviewProcessDiscussion<br/>───────────────────<br/>DuckDuckGo search:<br/>Company interview process questions<br/>→ Parse search snippets<br/>→ Extract interview context"]

    STEP4 --> STEP5["Step 5: generateQuestions<br/>───────────────────<br/>For EACH requirement:<br/>→ LLM generates targeted Q and A<br/>→ 1.5s delay between calls<br/>→ Attach _meta pinned: false"]

    STEP5 --> STEP6{"Step 6: checkCoverage<br/>───────────────────<br/>Diff must-have requirements<br/>vs generated questions"}

    STEP6 -- "Gaps found &<br/>passes < 3" --> GAP_FILL["Generate questions<br/>for uncovered requirements"]
    GAP_FILL --> STEP6

    STEP6 -- "All covered OR<br/>max passes reached" --> STEP7["Step 7: generateFlashcards<br/>───────────────────<br/>LLM creates front/back cards<br/>from question set"]

    STEP7 --> STEP8["Step 8: buildSchedule<br/>───────────────────<br/>Score questions (priority × difficulty)<br/>→ Inject fallbacks for gaps<br/>→ Sort descending by score<br/>→ Distribute across N days"]

    STEP8 --> VALIDATE{"Step 9: Zod Schema<br/>Validation"}
    VALIDATE -- "Pass" --> SAVE["Save Kit (status: ready)<br/>Mark Job (status: completed)"]
    VALIDATE -- "Fail" --> FAIL["Save Kit (status: failed)<br/>Mark Job (status: failed)"]

    SAVE --> DONE(["✅ Kit Ready — SSE notifies client"])
    FAIL --> DONE_FAIL(["❌ Kit Failed — SSE notifies client"])

    classDef start fill:#22c55e,stroke:#22c55e,color:#0d1117
    classDef step fill:#161b22,stroke:#00bcd4,stroke-width:2px,color:#e6edf3
    classDef decision fill:#1a1f2e,stroke:#f59e0b,stroke-width:2px,color:#e6edf3
    classDef success fill:#065f46,stroke:#22c55e,color:#e6edf3
    classDef error fill:#7f1d1d,stroke:#ef4444,color:#e6edf3

    class START,BG_START start
    class STEP1,STEP2,STEP3,STEP4,STEP5,GAP_FILL,STEP7,STEP8,CREATE_KIT step
    class DEDUP,STEP6,VALIDATE decision
    class SAVE,DONE,RETURN_EXISTING success
    class FAIL,DONE_FAIL error
```

---

### 6. LLM Self-Healing — Auto-Repair Loop

```mermaid
flowchart TD
    CALL["callLLM(promptId, vars, zodSchema)"]
    CALL --> SEND["Send prompt to Gemini API<br/>(responseMimeType: application/json)"]
    SEND --> PARSE{"JSON.parse()<br/>succeeds?"}

    PARSE -- "Yes" --> SCHEMA{"Zod schema<br/>validation<br/>succeeds?"}
    PARSE -- "No (SyntaxError)" --> REPAIR_JSON["🔧 Repair Retry #1<br/>────────────<br/>Send broken text back to LLM:<br/>&quot;Fix this invalid JSON&quot;"]
    REPAIR_JSON --> PARSE2{"JSON.parse()<br/>succeeds?"}
    PARSE2 -- "Yes" --> SCHEMA
    PARSE2 -- "No" --> RETRY_OR_FAIL

    SCHEMA -- "Pass ✅" --> RETURN["Return validated data"]
    SCHEMA -- "Fail ❌" --> REPAIR_SCHEMA["🔧 Repair Retry #2<br/>────────────<br/>Send JSON + Zod errors to LLM:<br/>&quot;Fix structure to match schema&quot;"]
    REPAIR_SCHEMA --> SCHEMA2{"Zod validation<br/>succeeds?"}
    SCHEMA2 -- "Pass ✅" --> RETURN
    SCHEMA2 -- "Fail ❌" --> RETRY_OR_FAIL

    RETRY_OR_FAIL{"Retries<br/>remaining?<br/>(max 4)"}
    RETRY_OR_FAIL -- "Yes" --> BACKOFF["Exponential Backoff<br/>(2s → 4s → 8s → 16s)"]
    BACKOFF --> SEND
    RETRY_OR_FAIL -- "No" --> ERROR["Return error<br/>{ok: false, code, message}"]

    classDef normal fill:#161b22,stroke:#00bcd4,color:#e6edf3
    classDef repair fill:#1a1f2e,stroke:#f59e0b,stroke-width:2px,color:#e6edf3
    classDef success fill:#065f46,stroke:#22c55e,color:#e6edf3
    classDef error fill:#7f1d1d,stroke:#ef4444,color:#e6edf3
    classDef decision fill:#1e1e2e,stroke:#7c3aed,color:#e6edf3

    class CALL,SEND normal
    class REPAIR_JSON,REPAIR_SCHEMA,BACKOFF repair
    class RETURN success
    class ERROR error
    class PARSE,PARSE2,SCHEMA,SCHEMA2,RETRY_OR_FAIL decision
```

---

### 7. Real-Time Progress — SSE Communication

```mermaid
sequenceDiagram
    participant User as 🖥️ Browser
    participant Frontend as Next.js Frontend
    participant Proxy as Next.js Rewrite Proxy
    participant Backend as Express Backend
    participant Pipeline as Pipeline Engine
    participant DB as MongoDB

    User->>Frontend: Submit JD + Company URL
    Frontend->>Proxy: POST /api/kits
    Proxy->>Backend: POST /api/kits
    Backend->>DB: Create Kit (pending) + Job (running)
    Backend-->>Proxy: 202 {jobId, kitId}
    Proxy-->>Frontend: 202 {jobId, kitId}

    Frontend->>Frontend: Redirect to /kits/[kitId]
    Frontend->>Proxy: EventSource GET /api/kits/:id/events
    Proxy->>Backend: SSE Connection

    Note over Backend,Pipeline: Background Pipeline runs asynchronously

    loop Every 2 seconds
        Backend->>DB: Poll Kit.progress
        DB-->>Backend: {status, progress[]}
        Backend-->>Frontend: SSE data: {status, progress}
    end

    Pipeline->>DB: Push progress: extractRequirements ✓
    Pipeline->>DB: Push progress: crawlCompanySite ✓
    Pipeline->>DB: Push progress: buildCompanyBrief ✓
    Pipeline->>DB: Push progress: generateQuestions ✓
    Pipeline->>DB: Push progress: checkCoverage ✓
    Pipeline->>DB: Push progress: generateFlashcards ✓
    Pipeline->>DB: Push progress: buildSchedule ✓
    Pipeline->>DB: Update Kit status → ready

    Backend-->>Frontend: SSE data: {status: "ready"}
    Frontend->>Frontend: Close EventSource
    Frontend->>User: Show completed Kit Detail
```

---

### 8. User Edit & Regeneration Flow

```mermaid
flowchart LR
    subgraph USER_ACTIONS["User Actions on Kit"]
        EDIT["✏️ Edit a Question"]
        PIN["📌 Pin an Item"]
        REGEN["🔄 Click Regenerate"]
    end

    EDIT --> PATCH["PATCH /api/kits/:id/questions<br/>────────────<br/>Update text in-place<br/>Set _meta.origin = 'edited'<br/>Set _meta.pinned = true"]

    PIN --> PATCH2["PATCH /api/kits/:id/questions<br/>────────────<br/>Toggle _meta.pinned = true"]

    REGEN --> FILTER["Filter out all items<br/>where pinned = false"]
    FILTER --> GEN_NEW["LLM generates<br/>fresh replacement items"]
    GEN_NEW --> MERGE["Merge: pinned items<br/>+ new generated items"]
    MERGE --> SAVE["Save merged result<br/>to MongoDB"]

    PATCH --> DB[("MongoDB")]
    PATCH2 --> DB
    SAVE --> DB

    classDef action fill:#161b22,stroke:#00bcd4,color:#e6edf3
    classDef process fill:#1a1f2e,stroke:#f59e0b,color:#e6edf3
    classDef db fill:#0f172a,stroke:#22c55e,stroke-width:2px,color:#e6edf3

    class EDIT,PIN,REGEN action
    class PATCH,PATCH2,FILTER,GEN_NEW,MERGE,SAVE process
    class DB db
```

---

### 9. Schedule Allocation Algorithm

```mermaid
flowchart TD
    INPUT["Input: requirements[], questions[], days"]
    INPUT --> SCORE["Score each question<br/>────────────<br/>score = max(requirement.priority)<br/>× question.difficulty<br/>(must=2, nice=1) × (1-3)"]

    SCORE --> CHECK{"Any must-have<br/>requirements<br/>still uncovered?"}
    CHECK -- "Yes" --> INJECT["Inject fallback question<br/>difficulty=3, category='review'<br/>for each uncovered requirement"]
    INJECT --> SORT
    CHECK -- "No" --> SORT

    SORT["Sort questions<br/>descending by score"]
    SORT --> CHUNK["Chunk into N days<br/>(round-robin distribution)"]
    CHUNK --> OUTPUT["Output:<br/>Day 1 = hardest + must-have<br/>Day 2 = next priority<br/>...<br/>Day N = nice-to-have + easy"]

    classDef step fill:#161b22,stroke:#00bcd4,color:#e6edf3
    classDef decision fill:#1a1f2e,stroke:#f59e0b,color:#e6edf3
    classDef output fill:#065f46,stroke:#22c55e,color:#e6edf3

    class INPUT,SCORE,SORT,CHUNK,INJECT step
    class CHECK decision
    class OUTPUT output
```

---

### 10. API Routes Map

```mermaid
graph TD
    subgraph AUTH["/api/auth"]
        A1["POST /register<br/>→ Create user, set session"]
        A2["POST /login<br/>→ Verify credentials, set session"]
        A3["POST /logout<br/>→ Destroy session"]
        A4["GET /me<br/>→ Return current user"]
    end

    subgraph KITS["/api/kits"]
        K1["POST /<br/>→ Create kit + start pipeline"]
        K2["GET /<br/>→ List user's kits"]
        K3["GET /:id<br/>→ Get full kit detail"]
        K4["DELETE /:id<br/>→ Delete kit + jobs"]
        K5["GET /:id/events<br/>→ SSE progress stream"]
        K6["PATCH /:id/brief<br/>→ Update company brief"]
        K7["PATCH /:id/questions<br/>→ Update questions"]
        K8["PATCH /:id/flashcards<br/>→ Update flashcards"]
        K9["POST /:id/regenerate<br/>→ Regenerate section"]
    end

    subgraph PRACTICE["/api/practice"]
        P1["GET /:id/progress<br/>→ Get practice stats"]
        P2["POST /:id/progress<br/>→ Save practice session"]
    end

    classDef auth fill:#065f46,stroke:#22c55e,color:#e6edf3
    classDef kits fill:#161b22,stroke:#00bcd4,color:#e6edf3
    classDef practice fill:#1a1f2e,stroke:#7c3aed,color:#e6edf3

    class A1,A2,A3,A4 auth
    class K1,K2,K3,K4,K5,K6,K7,K8,K9 kits
    class P1,P2 practice
```

---

### 11. Security Architecture

```mermaid
flowchart TD
    subgraph INPUT_LAYER["Input Validation Layer"]
        URL_VALID["URL Validator<br/>────────────<br/>• Block private IPs (10.x, 192.168.x, 127.0.0.1)<br/>• Block non-HTTP protocols<br/>• SSRF Guard"]
        BODY_VALID["Request Body Validation<br/>────────────<br/>• Zod schema enforcement<br/>• Content-Type checks"]
        SIZE_VALID["Payload Size Limits<br/>────────────<br/>• Max 2MB per fetched page<br/>• Abort on oversized response"]
    end

    subgraph AUTH_LAYER["Authentication Layer"]
        BCRYPT["Password Hashing<br/>────────────<br/>bcrypt (10 salt rounds)"]
        SESSION_COOKIE["HTTP-Only Session Cookie<br/>────────────<br/>7-day expiry, MongoStore backed"]
        AUTH_CHECK["requireAuth Middleware<br/>────────────<br/>Reject 401 if no session"]
        OWNER_CHECK["requireOwnership Middleware<br/>────────────<br/>Reject 403 if not kit owner"]
    end

    subgraph LLM_SAFETY["LLM Safety Layer"]
        SANDBOX["Prompt Sandboxing<br/>────────────<br/>Scraped text wrapped as<br/>untrusted context data<br/>(never as instructions)"]
        SCHEMA_ENFORCE["Output Schema Enforcement<br/>────────────<br/>Zod validates every<br/>LLM response before saving"]
    end

    REQUEST["Incoming Request"] --> URL_VALID
    REQUEST --> BODY_VALID
    REQUEST --> SIZE_VALID
    URL_VALID --> AUTH_LAYER
    BODY_VALID --> AUTH_LAYER
    AUTH_LAYER --> LLM_SAFETY
    LLM_SAFETY --> SAFE["✅ Trusted Operation"]

    classDef layer fill:#161b22,stroke:#ef4444,stroke-width:2px,color:#e6edf3
    classDef safe fill:#065f46,stroke:#22c55e,color:#e6edf3

    class URL_VALID,BODY_VALID,SIZE_VALID,BCRYPT,SESSION_COOKIE,AUTH_CHECK,OWNER_CHECK,SANDBOX,SCHEMA_ENFORCE layer
    class SAFE safe
```

---

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
   npm start
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

---

## LLM Provider and Model
- **Provider**: Google
- **Model**: `gemini-3.1-flash-lite`. Chosen for its balance of speed and reasoning capabilities, which is crucial when making multiple sequential API calls for requirement extraction, question generation, and flashcard creation.

---

## Key Design Decisions, Trade-offs, and Limitations
- **Sequential LLM Calls over Parallel**: Generating questions per requirement is done sequentially with a 1.5s delay. *Trade-off*: This significantly increases the total generation time, but it was necessary to aggressively prevent `HTTP 429 Too Many Requests` errors from the LLM provider rate limits.
- **Search Snippets over Full Page Fetches**: For the interview process search, the app only parses DuckDuckGo search result snippets rather than fetching the full Reddit/Glassdoor pages. *Trade-off*: It's much faster and avoids complex bot-protection mechanisms on those sites, but the context is limited to ~160 characters per result, sometimes missing deeper insights.
- **SSRF limitations**: The crawler uses a strict URL validator to prevent Server-Side Request Forgery (SSRF) and blocks requests to localhost/private IPs. *Limitation*: This prevents testing the crawler against a local mock server unless `ALLOW_LOCAL_HOSTS=true` is set.
