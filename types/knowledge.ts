// Knowledge base (admin ingestion) types — shared by client and server.
export const KNOWLEDGE_PRESETS = ['research_paper', 'clinical_guideline', 'case_report'] as const;
export type KnowledgePreset = (typeof KNOWLEDGE_PRESETS)[number];

// Mirrors the documents.status CHECK constraint.
export type DocumentStatus =
  | 'uploaded'
  | 'parsing'
  | 'parsed'
  | 'parse_failed'
  | 'chunking'
  | 'chunked'
  | 'chunk_failed'
  | 'embedding'
  | 'indexed'
  | 'embed_failed'
  | 'archived';

/** A row in the admin knowledge document list. */
export interface DocumentSummary {
  id: string;
  filename: string;
  status: DocumentStatus;
  preset: KnowledgePreset;
  chunkCount: number | null;
  sizeBytes: number | null;
  errorMessage: string | null;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

/** Response from POST /api/admin/knowledge/upload. */
export interface UploadResult {
  documentId: string;
  status: string;
  deduped: boolean;
}

/** One hit from the search-quality sandbox (match_chunks). */
export interface SearchResult {
  chunkId: string;
  documentId: string;
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
}
