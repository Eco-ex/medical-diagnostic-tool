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

// Request/Response Types
export interface UpdateSummaryRequest {
  reasonForVisit: string;
  patientReport: string;
}

export interface AnalyzeTreatmentRequest {
  treatmentDescription: string;
}
