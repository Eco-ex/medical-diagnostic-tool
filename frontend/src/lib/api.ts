import axios, { AxiosInstance } from 'axios';
import type { 
  LoginRequest, 
  RegisterRequest, 
  AuthResponse, 
  UserProfile, 
  Patient, 
  NewPatient,
  Vitals,
  MedicalRecord,
  Treatment,
  Outcome,
  ChatMessage,
  PatientId
} from '../types';

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

    // Add token to requests
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle 401 errors
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user_data');
          window.location.href = '/';
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await this.client.post<AuthResponse>('/api/auth/register', data);
    return response.data;
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await this.client.post<AuthResponse>('/api/auth/login', data);
    return response.data;
  }

  async getProfile(): Promise<UserProfile | null> {
    const response = await this.client.get<UserProfile | null>('/api/auth/profile');
    return response.data;
  }

  async updateProfile(profile: UserProfile): Promise<void> {
    await this.client.put('/api/auth/profile', profile);
  }

  async isAdmin(): Promise<boolean> {
    const response = await this.client.get<boolean>('/api/auth/is-admin');
    return response.data;
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
    } catch (error: any) {
      if (error.response?.status === 404) return null;
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

  // AI Analysis
  async analyzeTreatment(patientId: PatientId, treatmentDescription: string): Promise<string> {
    const response = await this.client.post(`/api/patients/${patientId}/analyze-treatment`, {
      treatmentDescription,
    });
    return response.data.analysis;
  }

  // Admin
  async getOpenAiApiKey(): Promise<string> {
    const response = await this.client.get<{ openAiApiKey: string }>('/api/admin/openai-key');
    return response.data.openAiApiKey;
  }

  async updateOpenAiApiKey(apiKey: string): Promise<void> {
    await this.client.put('/api/admin/openai-key', { openAiApiKey: apiKey });
  }
}

export const apiClient = new ApiClient();


