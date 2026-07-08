import { apiClient } from './client';
import type { Pattern } from '../types/intelligence';

export const listPatterns = async (): Promise<Pattern[]> => {
  const { data } = await apiClient.get('/intelligence/patterns');
  return data.data;
};

export const runPatternAnalysis = async (): Promise<{ message: string }> => {
  const { data } = await apiClient.post('/intelligence/patterns/run');
  return data.data;
};
