import { useCallback, useEffect, useState } from 'react';

// Knowledge_Graph_Design_Bible.md IA-2 — the empty board surfaces recent-investigation
// chips instead of starting cold every time. Frontend-only (localStorage); no backend
// dependency, unlike the "suggested starting points" part of IA-2, which needs an
// entity-status signal (e.g. open incidents) the data model doesn't have yet and is
// deliberately not fabricated here.
const STORAGE_KEY = 'corpusforge:recent-investigations';
const MAX_ITEMS = 8;

function read(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const value: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(value) && value.every((item) => typeof item === 'string') ? value : [];
  } catch {
    return [];
  }
}

export function useRecentInvestigations() {
  const [recent, setRecent] = useState<string[]>(() => read());

  useEffect(() => {
    setRecent(read());
  }, []);

  const record = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setRecent((prev) => {
      const next = [trimmed, ...prev.filter((n) => n.toLowerCase() !== trimmed.toLowerCase())].slice(0, MAX_ITEMS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { recent, record };
}
