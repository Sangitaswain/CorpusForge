export type Confidence = 'High' | 'Medium' | 'Low';

export interface Citation {
  document_id: string;
  filename: string;
  page_number: number;
}

export interface QueryResponse {
  answer: string;
  confidence: Confidence;
  citations: Citation[];
  used_graph: boolean;
  follow_ups: string[];
}

export interface ChatMessage {
  id: string;
  type: 'question' | 'answer';
  content: string;
  response?: QueryResponse;
  timestamp: Date;
}
