import { apiClient } from './client';
import type { GraphData, NodeDetail } from '../types/graph';

export const getGraph = async (focus?: string): Promise<GraphData> => {
  const { data } = await apiClient.get('/graph', { params: focus ? { focus } : {} });
  return data.data;
};

export const getNodeDetail = async (entityId: string): Promise<NodeDetail> => {
  const { data } = await apiClient.get(`/graph/node/${entityId}`);
  return data.data;
};
