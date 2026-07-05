import { useQuery } from '@tanstack/react-query';
import { getGraph, getNodeDetail } from '../api/graph';

export function useGraph(focus?: string) {
  return useQuery({ queryKey: ['graph', focus ?? ''], queryFn: () => getGraph(focus) });
}

export function useNodeDetail(entityId: string | null) {
  return useQuery({
    queryKey: ['graph-node', entityId],
    queryFn: () => getNodeDetail(entityId!),
    enabled: entityId !== null,
  });
}
