# AI SWARM DETECTOR
**Global AI Agent Threat Intelligence & Public Incident Monitoring Platform**

AI Swarm Detector is a full-stack cybersecurity threat intelligence and incident research platform that monitors publicly reported incidents involving coordinated AI agents, autonomous agent operations, agent orchestration infrastructure abuse, and multi-agent research benchmarks.

> **Core Epistemic Principle:** AI Swarm Detector monitors **publicly reported incidents and research disclosures** (OSINT). It does not claim to observe secret internet traffic without sensors, never invents geographic coordinates or agent counts, and strictly separates **Incident Occurrence Date**, **Source Publication Timestamp**, and **Platform Ingestion Time**.

---

## 1. Key Capabilities & Features

- **7-Category AI Swarm Taxonomy** (`src/lib/types.ts`):
  1. `coordinated_ai_agents`: Multiple AI agents coordinating tasks toward a shared objective.
  2. `ai_driven_cyber_operations`: Coordinated or autonomous agents used for intrusion, reconnaissance, vulnerability exploitation, or malware operations (e.g., Storm-0940 ARTEX campaign).
  3. `ai_social_manipulation`: Coordinated AI-generated personas, astroturfing, or disinformation campaigns.
  4. `autonomous_agent_incidents`: AI agents performing consequential actions with limited human supervision.
  5. `agent_infrastructure_abuse`: Misuse or vulnerability exploitation of multi-agent frameworks, MCP servers, or orchestration control planes.
  6. `benign_research_activity`: Controlled multi-agent experiments, safety benchmarks, simulations, and red-team evaluations.
  7. `unverified_suspected_activity`: Reports alleging swarm behavior without sufficient technical evidence, or ordinary scripted automation/botnets mischaracterized as AI swarms.
- **3-Dimension Trust & Confidence Separation**:
  - **Source Reliability** (`0–100` score & tier across Primary CERT/Research, Major Security Vendor, Established Media, Community/Preprint).
  - **Evidence Strength** (`strong`, `moderate`, `circumstantial`, `weak`).
  - **Classification Alignment** (`0.00–1.00` uncalibrated extraction alignment; weak evidence automatically prevents `confirmed` swarm status even when model confidence is high).
- **12 Modular Public Intelligence Connectors** (`src/lib/ingestion/connectors.ts`):
  - **AI Incident Database (AIID)** (`https://incidentdatabase.ai/rss.xml`) — RSS 2.0
  - **Microsoft Security & Threat Intelligence Blog** (`https://www.microsoft.com/en-us/security/blog/feed/`) — RSS 2.0
  - **MITRE ATLAS Case Studies Dataset** (`https://raw.githubusercontent.com/mitre-atlas/atlas-data/main/dist/ATLAS.yaml`) — Structured YAML
  - **arXiv Multi-Agent Security & Swarm Research API** (`https://export.arxiv.org/api/query?...`) — Atom 1.0
  - **METR (Model Evaluation & Threat Research)** (`https://metr.org/feed.xml`) — RSS/Atom
  - **OpenAI News & Threat Disruption Reports** (`https://openai.com/news/rss.xml`) — RSS 2.0
  - **Google Security & Threat Intelligence Blog** (`https://security.googleblog.com/feeds/posts/default`) — Atom 1.0
  - **CISA Cybersecurity Advisories (US-CERT)** (`https://www.cisa.gov/cybersecurity-advisories/all.xml`) — RSS Advisory Feed
  - **The Hacker News** (`https://feeds.feedburner.com/TheHackersNews`) — RSS 2.0
  - **Hacker News Algolia AI Agent Intelligence API** (`https://hn.algolia.com/api/v1/search_by_date?...`) — REST JSON
  - **GDELT Global Document 2.0 API** (Rate-limit aware; HTTP 429 handled gracefully)
  - **Anthropic Research Feed** (Tracked transparently as `unavailable` due to lack of public unauthenticated RSS feed)
- **Deterministic Deduplication & Multi-Source Correlation** (`src/lib/ingestion/deduplicator.ts`):
  - Canonicalizes URLs, strips tracking parameters, matches shared citation IDs (such as AIID `cite/1781` linking Microsoft and Reuters reports of the Storm-0940 ARTEX attack), and computes non-generic token similarity so unrelated articles mentioning the same vendor never falsely merge.
- **AI-Assisted Classification with Prompt-Injection Defense** (`src/lib/classification/classifier.ts`):
  - Integrates the official `@google/genai` SDK (`gemini-3.8-flash` via the Interactions API with JSON schema output) validated by `zod`, with automatic zero-downtime fallback to a deterministic evidence-based rule engine (`rule-engine-v1`) when `GEMINI_API_KEY` is not set.
- **Strict Live Mode vs. Synthetic Demo Mode Separation**:
  - **Live Mode** queries real public intelligence records.
  - **Demo Mode** loads an isolated synthetic dataset (`src/lib/db/demo-seed.ts`) with a prominent warning banner for testing edge cases (including ordinary bash botnets falsely suspected of being AI swarms).

---

## 2. Architecture & Database Design

- **Frontend & Backend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4.
- **Database Schema**: Full PostgreSQL schema and Row Level Security (RLS) migration in [`supabase/migrations/0001_initial_schema.sql`](supabase/migrations/0001_initial_schema.sql) defining all 12 relational tables:
  - `sources`, `source_runs`, `source_records`, `incidents`, `incident_sources`, `entities`, `incident_entities`, `incident_timeline`, `classification_history`, `watchlists`, `watchlist_items`, `user_feedback` (+ `audit_logs`).
- **Dual-Adapter Persistence (`src/lib/db/index.ts`)**:
  - Connects to Supabase PostgreSQL when `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are configured.
  - Automatically falls back to a transactional relational JSON store (`.data/ai_swarm_detector_db.json` locally and `/tmp/ai_swarm_detector_db.json` on Vercel serverless, hydrated from `src/lib/db/initial-live-snapshot.json`).

---

## 3. Local Development & Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```
2. **Configure environment variables (optional for local run)**:
   ```bash
   cp .env.example .env.local
   ```
   - Add `GEMINI_API_KEY` to enable live `gemini-3.8-flash` classification (otherwise `rule-engine-v1` is used automatically).
   - Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` if connecting an external Supabase PostgreSQL instance, and apply `supabase/migrations/0001_initial_schema.sql` in the Supabase SQL Editor.
3. **Seed Demo Store & Run Real-World Public Ingestion**:
   ```bash
   npm run seed
   ```
4. **Start the development server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000`.

---

## 4. Running Automated Tests & Production Build

Run the Vitest QA suite covering source parsing, deduplication, timestamp normalization, schema validation, ordinary-automation vs. swarm differentiation, unknown-coordinate handling, and API security:

```bash
npm test
```

Run a full production build check:

```bash
npm run build
```

---

## 5. Deployment (GitHub & Vercel)

- **Scheduled Ingestion**: `vercel.json` configures `/api/cron/ingest` (`0 6 * * *`) so background ingestion executes independently of browser sessions.
- **Environment Variables on Vercel**:
  - `GEMINI_API_KEY` (Optional — enables Gemini 3.8 Flash structured extraction)
  - `CRON_SECRET` (Optional — secures `/api/cron/ingest`)
  - `NEXT_PUBLIC_SUPABASE_URL` & `SUPABASE_SERVICE_ROLE_KEY` (Optional — connects external Supabase PostgreSQL)

---

## 6. Known Limitations

- Public RSS/Atom feeds provide article summaries/excerpts rather than full proprietary forensic telemetry; therefore, internal inter-agent communication graphs are marked as `uncertainties` unless explicitly documented by a primary producer (e.g., Microsoft Threat Intelligence, MITRE ATLAS, METR, or arXiv).
- Upstream providers such as GDELT enforce strict unauthenticated rate limits (HTTP 429), and Anthropic does not currently expose a public unauthenticated `/rss.xml` feed; both conditions are surfaced transparently in the **Sources & Reliability** and **System Health** views.
