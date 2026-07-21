import { apiClient } from './client';
import type { Document, UploadResponse } from '../types/document';

// All backend success responses are wrapped as { data: ..., status: "ok" }

export interface DocumentStatusResponse {
  status: Document['status'];
  entity_count: number;
  error_msg: string | null;
}

export const uploadDocument = async (file: File): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await apiClient.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data;
};

export const listDocuments = async (): Promise<Document[]> => {
  const { data } = await apiClient.get('/documents');
  return data.data;
};

export const deleteDocument = async (id: string): Promise<void> => {
  await apiClient.delete(`/documents/${id}`);
};

export const getDocumentStatus = async (id: string): Promise<DocumentStatusResponse> => {
  const { data } = await apiClient.get(`/documents/${id}/status`);
  return data.data;
};

export const getDocumentFileUrl = (id: string, page?: number): string => {
  const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
  const url = `${base}/documents/${id}/file`;
  return page !== undefined ? `${url}?page=${page}` : url;
};
