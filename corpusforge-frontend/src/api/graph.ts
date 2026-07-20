import { apiClient } from './client';
import type { GraphData, NodeDetail, NodeSearchResult, NodeSummary } from '../types/graph';

export const getGraph = async (focus?: string): Promise<GraphData> => {
  const { data } = await apiClient.get('/graph', { params: focus ? { focus } : {} });
  return data.data;
};

// SEARCH-2 — autocomplete-as-you-type backing call.
export const searchGraphEntities = async (query: string): Promise<NodeSearchResult[]> => {
  if (!query.trim()) return [];
  const { data } = await apiClient.get('/graph/search', { params: { q: query } });
  return data.data;
};

export const getNodeDetail = async (entityId: string): Promise<NodeDetail> => {
  const { data } = await apiClient.get(`/graph/node/${entityId}`);
  return data.data;
};

// PANEL-9 — explicit-trigger only; never called on panel open (Gemini quota is a hard
// daily cap). Kept as a plain fetch, invoked from a mutation, not a query that could
// auto-run.
export const getNodeSummary = async (entityId: string): Promise<NodeSummary> => {
  const { data } = await apiClient.get(`/graph/node/${entityId}/summary`);
  return data.data;
};
