import { useQuery } from '@tanstack/react-query';
import { getGraph, getNodeDetail } from '../api/graph';

// Knowledge_Graph_Design_Bible.md IA-1 — the graph never loads a full, unfocused view by
// default. `enabled` must be false until a focus exists or the user has explicitly opted
// into browsing the full corpus (IA-3) — gating in the query itself, not just in the UI,
// so an unfocused visit never actually requests the full graph from the backend.
export function useGraph(focus?: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['graph', focus ?? ''],
    queryFn: () => getGraph(focus),
    enabled: options?.enabled ?? true,
  });
}

export function useNodeDetail(entityId: string | null) {
  return useQuery({
    queryKey: ['graph-node', entityId],
    queryFn: () => getNodeDetail(entityId!),
    enabled: entityId !== null,
  });
}
