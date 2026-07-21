# CorpusForge Frontend

React + TypeScript + Vite frontend for CorpusForge — an industrial document intelligence platform. Ingests PDFs, spreadsheets, and images, then surfaces them through a Copilot, a Knowledge Graph, and failure-pattern / compliance-gap intelligence.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in VITE_API_BASE_URL
npm run dev
```

## Environment Variables

`.env.local`:

```
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

Point this at the running `corpusforge-backend` instance (see the backend's own README for how to start it).

## Build

```bash
npm run build   # type-checks then builds to dist/
npm run preview # serve the production build locally
```
