import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getGraph, getNodeDetail, getNodeSummary, searchGraphEntities } from '../api/graph';

// Knowledge_Graph_Design_Bible.md IA-1 — the graph never loads a full, unfocused view by
// default. `enabled` must be false until a focus exists or the user has explicitly opted
// into browsing the full corpus (IA-3) — gating in the query itself, not just in the UI,
// so an unfocused visit never actually requests the full graph from the backend.
export function useGraph(focus?: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['graph', focus ?? ''],
    queryFn: () => getGraph(focus),
    enabled: options?.enabled ?? Boolean(focus),
  });
}

export function useNodeDetail(entityId: string | null) {
  return useQuery({
    queryKey: ['graph-node', entityId],
    queryFn: () => getNodeDetail(entityId!),
    enabled: entityId !== null,
  });
}

// PANEL-9 — a mutation, not a query: the summary must only fire on an explicit user
// click, never automatically when the panel opens or the entity changes.
export function useNodeSummary() {
  return useMutation({
    mutationFn: (entityId: string) => getNodeSummary(entityId),
  });
}

// SEARCH-2 — autocomplete-as-you-type. Debounced client-side so every keystroke doesn't
// fire a request; the query itself stays disabled below 2 characters to avoid a flood of
// near-useless single-letter matches.
export function useEntitySearch(query: string) {
  const [debounced, setDebounced] = useState(query);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 200);
    return () => clearTimeout(timer);
  }, [query]);

  return useQuery({
    queryKey: ['graph-search', debounced],
    queryFn: () => searchGraphEntities(debounced),
    enabled: debounced.trim().length >= 2,
    placeholderData: (prev) => prev,
  });
}
