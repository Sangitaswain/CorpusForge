import { apiClient } from './client';
import type { Alert } from '../types/alert';

export const getAlerts = async (): Promise<Alert[]> => {
  const { data } = await apiClient.get('/alerts');
  return data.data;
};

export const getAlertCount = async (): Promise<{ unread_count: number }> => {
  const { data } = await apiClient.get('/alerts/count');
  return data.data;
};

export const checkAlertsNow = async (): Promise<{ created: number }> => {
  const { data } = await apiClient.post('/alerts/check');
  return data.data;
};

export const dismissAlert = async (id: string): Promise<void> => {
  await apiClient.post(`/alerts/${id}/dismiss`);
};

export const dismissAllAlerts = async (): Promise<void> => {
  await apiClient.post('/alerts/dismiss-all');
};
