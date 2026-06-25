# CorpusForge

**Forge Intelligence from Industrial Documents**

CorpusForge is an AI-powered knowledge platform for asset-intensive industries. It ingests scattered industrial documents — equipment manuals, maintenance records, safety procedures, incident reports, and regulatory standards — and makes their collective intelligence queryable, connected, and actionable at the point of need.

## What It Does

- **Universal Document Ingestion** — Upload PDFs (digital or scanned), spreadsheets, and images. CorpusForge extracts text, identifies entities (equipment tags, procedure codes, regulation references, people, dates), and makes everything searchable.

- **Expert Knowledge Copilot** — Ask plain-language questions and get cited answers drawn exclusively from your documents. Every answer includes the source document and page number. Works on mobile.

- **Knowledge Graph** — Visualises the connections between equipment, procedures, incidents, and regulations across all documents. See how assets, failures, and compliance requirements relate to each other.

- **Failure Pattern Intelligence** — Automatically detects recurring incident patterns across the document corpus — surface connections that no individual review would catch.

- **Compliance Gap Detection** — Maps regulatory clauses against plant procedures and identifies gaps, outdated procedures, and missing coverage.

- **Proactive Alerts** — Surfaces warnings when new documents introduce compliance risks or match known failure patterns, without waiting to be asked.

## Tech Stack

**Frontend** — React, TypeScript, Tailwind CSS, react-force-graph

**Backend** — Python, FastAPI, LangChain, LangGraph

**AI** — Google Gemini Flash, sentence-transformers (local embeddings)

**Storage** — ChromaDB (vector store), SQLite, Supabase Storage

**Deploy** — Vercel (frontend), Fly.io (backend)

## Project Structure

```
corpusforge-frontend/    # React frontend
corpusforge-backend/     # FastAPI backend
```

## Getting Started

### Backend

```bash
cd corpusforge-backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

# Copy env template and fill in your keys
cp .env.example .env

uvicorn main:app --reload
```

### Frontend

```bash
cd corpusforge-frontend
npm install

# Copy env template and fill in your API URL
cp .env.example .env.local

npm run dev
```

### Environment Variables

**Backend (`.env`)**
```
GEMINI_API_KEY=
SUPABASE_URL=
SUPABASE_ANON_KEY=
FRONTEND_URL=http://localhost:5173
```

**Frontend (`.env.local`)**
```
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

## License

MIT
