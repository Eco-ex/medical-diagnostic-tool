// Patient Data Types
export type PatientId = string;

export interface Vitals {
  heartRate: number;
  bloodPressure: string;
  temperature: number;
  respiratoryRate: number;
  oxygenSaturation: number;
}

export interface MedicalRecord {
  recordId: string;
  date: number;
  description: string;
  details: string;
}

export interface Treatment {
  treatmentId: string;
  date: number;
  description: string;
  method: string;
  doctorId: string;
}

export interface Outcome {
  outcomeId: string;
  treatmentId: string;
  date: number;
  result: string;
  metrics: string;
}

export interface ChatMessage {
  messageId: string;
  timestamp: number;
  sender: string;
  content: string;
  patientId: PatientId;
}

export interface Patient {
  patientId: PatientId;
  name: string;
  currentStatus: Vitals;
  medicalRecords: MedicalRecord[];
  treatments: Treatment[];
  outcomes: Outcome[];
  chatHistory: ChatMessage[];
  age: number;
  sex: string;
  occupation: string | null;
  allergies: string | null;
  reasonForVisit: string | null;
  patientReport: string | null;
}

export interface NewPatient {
  patientId: PatientId;
  name: string;
  age: number;
  sex: string;
  occupation: string | null;
  allergies: string | null;
}

// Request payload types — used by the API route handlers.
export interface UpdateSummaryRequest {
  reasonForVisit: string;
  patientReport: string;
}

export interface AnalyzeTreatmentRequest {
  treatmentDescription: string;
}

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
