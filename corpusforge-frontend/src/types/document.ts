export type DocumentStatus = 'queued' | 'processing' | 'done' | 'failed';
export type DocumentType = 'manual' | 'work_order' | 'inspection' | 'sop' | 'incident' | 'regulation' | 'image' | 'other';

export interface Document {
  id: string;
  filename: string;
  doc_type: DocumentType;
  status: DocumentStatus;
  page_count: number;
  entity_count: number;
  uploaded_at: string;
  error_msg?: string;
}

export interface UploadResponse {
  document_id: string;
  status: string;
  filename: string;
}
