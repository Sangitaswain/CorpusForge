export type Confidence = 'High' | 'Medium' | 'Low';

export interface Citation {
  document_id: string;
  filename: string;
  // Optional so the Heat Stamp (CitationChip) can also be used for graph-connection sources,
  // which carry a source document but no page number.
  page_number?: number;
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
