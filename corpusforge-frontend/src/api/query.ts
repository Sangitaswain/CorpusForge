import { apiClient } from './client';
import type { QueryResponse } from '../types/query';

export const postQuery = async (question: string): Promise<QueryResponse> => {
  const { data } = await apiClient.post('/query', { question });
  return data.data;
};
