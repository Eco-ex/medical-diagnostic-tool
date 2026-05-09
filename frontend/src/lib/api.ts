import axios, { AxiosInstance } from 'axios';
import type {
  Patient,
  NewPatient,
  Vitals,
  MedicalRecord,
  Treatment,
  Outcome,
  ChatMessage,
  PatientId,
} from '../types';

export const OPENAI_KEY_STORAGE = 'openai_api_key';

export function getStoredOpenAiKey(): string {
  if (typeof window === 'undefined') return '';
  return window.sessionStorage.getItem(OPENAI_KEY_STORAGE) ?? '';
}

export function setStoredOpenAiKey(key: string): void {
  if (typeof window === 'undefined') return;
  if (key) {
    window.sessionStorage.setItem(OPENAI_KEY_STORAGE, key);
  } else {
    window.sessionStorage.removeItem(OPENAI_KEY_STORAGE);
  }
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  // Patient endpoints
  async getAllPatients(): Promise<Patient[]> {
    const response = await this.client.get<Patient[]>('/api/patients');
    return response.data;
  }

  async getPatient(patientId: PatientId): Promise<Patient | null> {
    try {
      const response = await this.client.get<Patient>(`/api/patients/${patientId}`);
      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response?.status === 404) return null;
      throw error;
    }
  }

  async searchPatients(searchTerm: string): Promise<Patient[]> {
    const response = await this.client.get<Patient[]>(`/api/patients/search/${searchTerm}`);
    return response.data;
  }

  async addNewPatient(patient: NewPatient): Promise<void> {
    await this.client.post('/api/patients', patient);
  }

  async updatePatient(patientId: PatientId, patient: Patient): Promise<void> {
    await this.client.put(`/api/patients/${patientId}`, patient);
  }

  async deletePatient(patientId: PatientId): Promise<void> {
    await this.client.delete(`/api/patients/${patientId}`);
  }

  async updateVitals(patientId: PatientId, vitals: Vitals): Promise<void> {
    await this.client.put(`/api/patients/${patientId}/vitals`, vitals);
  }

  // Medical Records
  async addMedicalRecord(patientId: PatientId, record: MedicalRecord): Promise<void> {
    await this.client.post(`/api/patients/${patientId}/medical-records`, record);
  }

  async updateMedicalRecord(patientId: PatientId, recordId: string, record: MedicalRecord): Promise<void> {
    await this.client.put(`/api/patients/${patientId}/medical-records/${recordId}`, record);
  }

  async deleteMedicalRecord(patientId: PatientId, recordId: string): Promise<void> {
    await this.client.delete(`/api/patients/${patientId}/medical-records/${recordId}`);
  }

  // Treatments
  async addTreatment(patientId: PatientId, treatment: Treatment): Promise<void> {
    await this.client.post(`/api/patients/${patientId}/treatments`, treatment);
  }

  async updateTreatment(patientId: PatientId, treatmentId: string, treatment: Treatment): Promise<void> {
    await this.client.put(`/api/patients/${patientId}/treatments/${treatmentId}`, treatment);
  }

  async deleteTreatment(patientId: PatientId, treatmentId: string): Promise<void> {
    await this.client.delete(`/api/patients/${patientId}/treatments/${treatmentId}`);
  }

  // Outcomes
  async logOutcome(patientId: PatientId, outcome: Outcome): Promise<void> {
    await this.client.post(`/api/patients/${patientId}/outcomes`, outcome);
  }

  async updateOutcome(patientId: PatientId, outcomeId: string, outcome: Outcome): Promise<void> {
    await this.client.put(`/api/patients/${patientId}/outcomes/${outcomeId}`, outcome);
  }

  async deleteOutcome(patientId: PatientId, outcomeId: string): Promise<void> {
    await this.client.delete(`/api/patients/${patientId}/outcomes/${outcomeId}`);
  }

  // Summary
  async updateSummary(patientId: PatientId, reasonForVisit: string, patientReport: string): Promise<void> {
    await this.client.put(`/api/patients/${patientId}/summary`, { reasonForVisit, patientReport });
  }

  async getSummary(patientId: PatientId): Promise<{ reasonForVisit: string | null; patientReport: string | null }> {
    const response = await this.client.get(`/api/patients/${patientId}/summary`);
    return response.data;
  }

  // Chat
  async getChatHistory(patientId: PatientId): Promise<ChatMessage[]> {
    const response = await this.client.get<ChatMessage[]>(`/api/patients/${patientId}/chat`);
    return response.data;
  }

  async addChatMessage(patientId: PatientId, message: ChatMessage): Promise<void> {
    await this.client.post(`/api/patients/${patientId}/chat`, message);
  }

  async clearChatHistory(patientId: PatientId): Promise<void> {
    await this.client.delete(`/api/patients/${patientId}/chat`);
  }

  // AI Analysis — passes the user's per-session OpenAI key via header.
  async analyzeTreatment(patientId: PatientId, treatmentDescription: string): Promise<string> {
    const apiKey = getStoredOpenAiKey();
    const response = await this.client.post(
      `/api/patients/${patientId}/analyze-treatment`,
      { treatmentDescription },
      { headers: apiKey ? { 'X-OpenAI-Key': apiKey } : {} }
    );
    return response.data.analysis;
  }
}

export const apiClient = new ApiClient();
