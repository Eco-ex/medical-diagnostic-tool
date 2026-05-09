// User and Authentication Types
export interface UserProfile {
  name: string;
}

export interface User {
  userId: string;
  username: string;
  passwordHash: string;
  role: 'admin' | 'user';
  profile: UserProfile | null;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  userId: string;
  role: 'admin' | 'user';
  profile: UserProfile | null;
}

// Patient Data Types
export type PatientId = string;
export type DoctorId = string;

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
  assignedDoctor: DoctorId;
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

export interface AuditLog {
  logId: string;
  timestamp: number;
  userId: string;
  action: string;
  patientId: PatientId | null;
  details: string;
}

export interface AdminSettings {
  openAiApiKey: string;
}

// Request/Response Types
export interface UpdateSummaryRequest {
  reasonForVisit: string;
  patientReport: string;
}

export interface AnalyzeTreatmentRequest {
  treatmentDescription: string;
}

// JWT Payload
export interface JwtPayload {
  userId: string;
  username: string;
  role: 'admin' | 'user';
}


