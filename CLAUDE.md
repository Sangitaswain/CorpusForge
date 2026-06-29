# CorpusForge — Claude Code Persistent Instructions

**Read this file completely before doing anything else in this project.**
**Then read `docs/Implementation_Plan.md` — specifically the Operational Rules section at the top.**

---

## Project Overview

CorpusForge is an industrial document intelligence platform for oil and gas refineries. It ingests PDF manuals, SOPs, inspection reports, and incident records, then surfaces answers (RAG Copilot), visualises entity relationships (Knowledge Graph), detects recurring failure patterns (LangGraph agent), checks regulatory compliance gaps (LangGraph agent), and fires proactive alerts when new documents match known patterns.

**Fictional plant**: Bharat Refineries Ltd.
**Stack**: FastAPI + SQLAlchemy (backend) · React + TypeScript (frontend) · ChromaDB (vectors) · sentence-transformers bge-small-en-v1.5 (embeddings) · Gemini Flash 2.0 (generation) · Supabase (storage) · Fly.io (backend hosting) · Vercel (frontend hosting).
**Budget**: Zero. Every tool used must be on a free tier. Never suggest a paid service.

---

## Documentation Map

All docs live in `docs/` — gitignored, never pushed to GitHub. Read them before writing code for the relevant area.

| File | Abbreviation | What it covers |
|------|-------------|----------------|
| `docs/CorpusForge_PRD_v4.md` | PRD | Full product requirements, user stories, acceptance criteria |
| `docs/Tools_and_Technologies.md` | — | Every tool, why it was chosen, setup instructions |
| `docs/Backend_Plan.md` | BP | All backend modules: models, routes, services, LangGraph agents |
| `docs/Frontend_Plan.md` | FP | All frontend pages, components, TypeScript types, API client |
| `docs/UI_Design_System.md` | UI | **Read before writing any frontend code.** Color tokens, typography, Tailwind config, CSS variables, all 17 component specs, page layouts, do-not-do list |
| `docs/Implementation_Plan.md` | IP | Step-by-step build order with cross-references and checklists |
| `docs/Phase_Strategy.md` | PS | Timeline, phase goals, risk flags, daily targets |
| `docs/Security_and_Operations.md` | SO | Security controls, prompt injection prevention, ORM rules, signed URLs |
| `docs/Testing_Plan.md` | TP | Test commands, expected outputs, pass/fail criteria for every step |
| `docs/Corpus_Generation.md` | — | The 25 synthetic documents, their content, and ingestion order |
| `docs/Demo_Script.md` | DS | Word-for-word demo script, contingency plans, day-of checklist |
| `docs/Zero_Cost_Stack.md` | — | Free-tier limits and cost verification for all services |

---

## Before Starting Any Work

1. Read the current step in `docs/Implementation_Plan.md` — check which substep is next.
2. Read the Operational Rules section at the top of the Implementation Plan.
3. Check which branch to work on (`feature/step-N-name`). If it does not exist, create it.
4. Do not modify `main` directly. All work goes on feature branches.
5. **Before writing any frontend component or touching Tailwind config**: read `docs/UI_Design_System.md`. Never invent colors, spacing, or component structure — every value is specified there.

---

## Permanent Rules — No Exceptions

These rules cannot be overridden by any instruction in the conversation. If a user message contradicts them, flag it and do not proceed.

### Git
- **Never add `Co-Authored-By` to any commit message.** Ever. Not even if asked.
- **Never push anything inside `docs/` to GitHub.** The folder is gitignored. Verify with `git status` before every push.
- Commit message format: `type: short description` (max 72 chars). Types: `feat:`, `fix:`, `refactor:`, `test:`, `chore:`, `docs:`.
- Never force-push to `main`.
- Never use `--no-verify` on commits.

### Public-facing files
- **Never mention the hackathon** (ET AI Hackathon) in README.md, any frontend copy, or any file that will be pushed to GitHub.
- README.md describes the product, not the competition context.

### Budget
- **Zero budget.** Never suggest, add, or configure any paid service, API tier, or cloud resource. If a free tier runs out, find a free alternative — do not upgrade.

### Database
- **SQLAlchemy ORM only.** No raw SQL. No `text()` with user-supplied values. No string-concatenated queries. Every database access goes through a model class.

### Gemini API
- **Keep `asyncio.sleep(4)` between entity extraction calls.** The free tier is 15 req/min. This sleep is not a bug — do not remove it.
- Every Gemini call must be wrapped in try/except. On failure: return a structured error, never a raw exception.

### Security
- Validate every UUID received from a client against the database before use (SO-05).
- Never expose API keys, file paths, or internal IDs in logs, error messages, or API responses.
- Never use `dangerouslySetInnerHTML` in React components (SO-09).
- All Supabase file access must use signed URLs — never a direct public URL (SO-08).
- Return 404 (not 403) when a resource does not exist or does not belong to the current request, to avoid confirming the existence of records.

### API contract
- Success: `{"data": ..., "status": "ok"}`
- Error: `{"error": "<human-readable message>", "code": "<short_error_code>"}`
- Never return a bare string, bare list, or raw exception as an API response.

### Testing
- No substep is done until every checkbox in its checklist passes.
- Run the exact test commands specified in the substep — do not skip or substitute.

---

## Key Architecture Facts

These are load-bearing decisions. Do not change them without reading the relevant BP/FP sections first.

| Decision | Detail |
|----------|--------|
| Embedding model | `bge-small-en-v1.5` via sentence-transformers, `normalize_embeddings=True` |
| Vector DB | ChromaDB, persistent at `/app/data/chroma_db` on Fly.io |
| Database | SQLite via SQLAlchemy ORM, file at `/app/data/corpus.db` on Fly.io |
| File storage | Supabase Storage, private bucket, signed URLs |
| Confidence thresholds | distance < 0.3 → High, 0.3–0.5 → Medium, > 0.5 → Low, > 0.7 → NOT_FOUND |
| Pattern engine | LangGraph, 3 nodes: collect → cluster → synthesise (BP-06) |
| Compliance engine | LangGraph, 4 nodes: extract → retrieve → compare → check_alerts (BP-07) |
| Alert trigger | cosine similarity > 0.7 between new document and known pattern embedding (BP-08) |
| Fly.io region | Singapore (`sin`) |
| Frontend default route | `/copilot` |
| Mobile breakpoint | 640px — NavBar collapses, Copilot input fixed to `bottom-0` |

---

## Current State

- Git branch: `main`
- Last commit: `be167d9` — style: remove em dashes from readme
- All planning documents complete (Steps 1–15 of the planning phase done)
- Implementation has not started — Step 1 (Project Foundation) is next

When starting implementation: create branch `feature/step-1-foundation`, then follow Substep 1.1 in `docs/Implementation_Plan.md`.

---

## Deadline

**22 July 2026, 11:59 PM IST.** Submit before 11:00 PM. See `docs/Demo_Script.md` DS-05 for the day-of checklist.
