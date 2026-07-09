import { apiClient } from './client';
import type { ComplianceGap, ComplianceSummary, Pattern } from '../types/intelligence';

export const listPatterns = async (): Promise<Pattern[]> => {
  const { data } = await apiClient.get('/intelligence/patterns');
  return data.data;
};

export const runPatternAnalysis = async (): Promise<{ message: string }> => {
  const { data } = await apiClient.post('/intelligence/patterns/run');
  return data.data;
};

export const getCompliance = async (): Promise<{ summary: ComplianceSummary; gaps: ComplianceGap[] }> => {
  const { data } = await apiClient.get('/intelligence/compliance');
  return data.data;
};

export const runComplianceCheck = async (): Promise<{ message: string }> => {
  const { data } = await apiClient.post('/intelligence/compliance/run');
  return data.data;
};

export const exportComplianceReport = async (): Promise<Blob> => {
  const { data } = await apiClient.get('/intelligence/compliance/export', { responseType: 'blob' });
  return data;
};
