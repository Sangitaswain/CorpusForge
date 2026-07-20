import { useCallback, useEffect, useState } from 'react';

// Knowledge_Graph_Design_Bible.md IA-6 — a breadcrumb of previously-focused entities for
// *this* investigation, persisting across lens switches and navigation away from and back
// to the graph. sessionStorage (not localStorage, unlike IA-2's cross-session "recent
// investigations" list in useRecentInvestigations.ts) — a trail is scoped to one browser
// session, not remembered forever.
const STORAGE_KEY = 'corpusforge:investigation-trail';
const MAX_ITEMS = 12;

function read(): string[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function useInvestigationTrail() {
  const [trail, setTrail] = useState<string[]>(() => read());

  useEffect(() => {
    setTrail(read());
  }, []);

  const pushEntity = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setTrail((prev) => {
      // Only a genuinely new step in the trail — reselecting the current focus (e.g. via
      // Ask Forge round-tripping back) must not duplicate the last breadcrumb.
      if (prev[prev.length - 1]?.toLowerCase() === trimmed.toLowerCase()) return prev;
      const next = [...prev, trimmed].slice(-MAX_ITEMS);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const clearTrail = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setTrail([]);
  }, []);

  return { trail, pushEntity, clearTrail };
}
