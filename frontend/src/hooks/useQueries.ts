import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import type {
  Patient,
  PatientId,
  UserProfile,
  Vitals,
  MedicalRecord,
  Treatment,
  Outcome,
  ChatMessage,
  NewPatient,
} from '../types';

export function useGetCallerUserProfile() {
  const query = useQuery<UserProfile | null>({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      return apiClient.getProfile();
    },
  });

  return query;
}

export function useSaveCallerUserProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      return apiClient.updateProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
    },
  });
}

export function useIsCallerAdmin() {
  return useQuery<boolean>({
    queryKey: ['isAdmin'],
    queryFn: async () => {
      return apiClient.isAdmin();
    },
  });
}

export function useGetAllPatients() {
  return useQuery<Patient[]>({
    queryKey: ['patients'],
    queryFn: async () => {
      return apiClient.getAllPatients();
    },
  });
}

export function useGetPatient(patientId: PatientId | null) {
  return useQuery<Patient | null>({
    queryKey: ['patient', patientId],
    queryFn: async () => {
      if (!patientId) return null;
      return apiClient.getPatient(patientId);
    },
    enabled: !!patientId,
  });
}

export function useSearchPatients() {
  return useMutation({
    mutationFn: async (searchTerm: string) => {
      return apiClient.searchPatients(searchTerm);
    },
  });
}

export function useAddNewPatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newPatient: NewPatient) => {
      try {
        await apiClient.addNewPatient(newPatient);
        return newPatient.patientId;
      } catch (error: any) {
        const errorMessage = error?.response?.data?.error || error?.message || String(error);
        
        // Check for duplicate patient ID error
        if (errorMessage.includes('Patient ID already exists')) {
          throw new Error('DUPLICATE_PATIENT_ID: A patient with this ID already exists. Please use a unique patient ID.');
        }
        
        // Check for validation errors
        if (errorMessage.includes('required')) {
          throw new Error('VALIDATION_ERROR: Please fill in all required fields (Name, Patient ID, Age, Sex).');
        }
        
        // Check for authorization errors
        if (errorMessage.includes('Unauthorized') || errorMessage.includes('Admin access required')) {
          throw new Error('UNAUTHORIZED: You do not have permission to add new patients. Please contact your administrator.');
        }
        
        // Generic error
        throw new Error(`Failed to add patient: ${errorMessage}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });
}

export function useUpdatePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ patientId, updatedPatient }: { patientId: PatientId; updatedPatient: Patient }) => {
      try {
        await apiClient.updatePatient(patientId, updatedPatient);
        return updatedPatient.patientId;
      } catch (error: any) {
        const errorMessage = error?.response?.data?.error || error?.message || String(error);
        
        // Check for duplicate patient ID error
        if (errorMessage.includes('Patient ID already exists')) {
          throw new Error('DUPLICATE_PATIENT_ID: A patient with this ID already exists. Please use a unique patient ID.');
        }
        
        // Check for validation errors
        if (errorMessage.includes('required')) {
          throw new Error('VALIDATION_ERROR: Please fill in all required fields (Name, Patient ID, Age, Sex).');
        }
        
        // Check for authorization errors
        if (errorMessage.includes('Unauthorized') || errorMessage.includes('Admin access required')) {
          throw new Error('UNAUTHORIZED: You do not have permission to update patients. Please contact your administrator.');
        }
        
        // Check for not found errors
        if (errorMessage.includes('Patient not found')) {
          throw new Error('NOT_FOUND: Patient not found. The patient may have been deleted.');
        }
        
        // Generic error
        throw new Error(`Failed to update patient: ${errorMessage}`);
      }
    },
    onSuccess: (newPatientId, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['patient', variables.patientId] });
      queryClient.invalidateQueries({ queryKey: ['patient', newPatientId] });
    },
  });
}

export function useDeletePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patientId: PatientId) => {
      try {
        await apiClient.deletePatient(patientId);
      } catch (error: any) {
        const errorMessage = error?.response?.data?.error || error?.message || String(error);
        
        // Check for authorization errors
        if (errorMessage.includes('Unauthorized') || errorMessage.includes('Admin access required')) {
          throw new Error('UNAUTHORIZED: You do not have permission to delete patients. Please contact your administrator.');
        }
        
        // Check for not found errors
        if (errorMessage.includes('Patient not found')) {
          throw new Error('NOT_FOUND: Patient not found. The patient may have already been deleted.');
        }
        
        // Generic error
        throw new Error(`Failed to delete patient: ${errorMessage}`);
      }
    },
    onSuccess: (_, patientId) => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.removeQueries({ queryKey: ['patient', patientId] });
      queryClient.removeQueries({ queryKey: ['chatHistory', patientId] });
    },
  });
}

export function useUpdateVitals() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ patientId, vitals }: { patientId: PatientId; vitals: Vitals }) => {
      return apiClient.updateVitals(patientId, vitals);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patient', variables.patientId] });
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });
}

export function useAddMedicalRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ patientId, record }: { patientId: PatientId; record: MedicalRecord }) => {
      return apiClient.addMedicalRecord(patientId, record);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patient', variables.patientId] });
    },
  });
}

export function useUpdateMedicalRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ patientId, recordId, updatedRecord }: { patientId: PatientId; recordId: string; updatedRecord: MedicalRecord }) => {
      try {
        await apiClient.updateMedicalRecord(patientId, recordId, updatedRecord);
      } catch (error: any) {
        const errorMessage = error?.response?.data?.error || error?.message || String(error);
        
        if (errorMessage.includes('Unauthorized')) {
          throw new Error('UNAUTHORIZED: You do not have permission to update medical records. Please contact your administrator.');
        }
        
        if (errorMessage.includes('Patient not found')) {
          throw new Error('NOT_FOUND: Patient not found. The patient may have been deleted.');
        }
        
        throw new Error(`Failed to update medical record: ${errorMessage}`);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patient', variables.patientId] });
    },
  });
}

export function useDeleteMedicalRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ patientId, recordId }: { patientId: PatientId; recordId: string }) => {
      try {
        await apiClient.deleteMedicalRecord(patientId, recordId);
      } catch (error: any) {
        const errorMessage = error?.response?.data?.error || error?.message || String(error);
        
        if (errorMessage.includes('Unauthorized')) {
          throw new Error('UNAUTHORIZED: You do not have permission to delete medical records. Please contact your administrator.');
        }
        
        if (errorMessage.includes('Patient not found')) {
          throw new Error('NOT_FOUND: Patient not found. The patient may have been deleted.');
        }
        
        throw new Error(`Failed to delete medical record: ${errorMessage}`);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patient', variables.patientId] });
    },
  });
}

export function useAddTreatment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ patientId, treatment }: { patientId: PatientId; treatment: Treatment }) => {
      return apiClient.addTreatment(patientId, treatment);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patient', variables.patientId] });
    },
  });
}

export function useUpdateTreatment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ patientId, treatmentId, updatedTreatment }: { patientId: PatientId; treatmentId: string; updatedTreatment: Treatment }) => {
      try {
        await apiClient.updateTreatment(patientId, treatmentId, updatedTreatment);
      } catch (error: any) {
        const errorMessage = error?.response?.data?.error || error?.message || String(error);
        
        if (errorMessage.includes('Unauthorized')) {
          throw new Error('UNAUTHORIZED: You do not have permission to update treatments. Please contact your administrator.');
        }
        
        if (errorMessage.includes('Patient not found')) {
          throw new Error('NOT_FOUND: Patient not found. The patient may have been deleted.');
        }
        
        throw new Error(`Failed to update treatment: ${errorMessage}`);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patient', variables.patientId] });
    },
  });
}

export function useDeleteTreatment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ patientId, treatmentId }: { patientId: PatientId; treatmentId: string }) => {
      try {
        await apiClient.deleteTreatment(patientId, treatmentId);
      } catch (error: any) {
        const errorMessage = error?.response?.data?.error || error?.message || String(error);
        
        if (errorMessage.includes('Unauthorized')) {
          throw new Error('UNAUTHORIZED: You do not have permission to delete treatments. Please contact your administrator.');
        }
        
        if (errorMessage.includes('Patient not found')) {
          throw new Error('NOT_FOUND: Patient not found. The patient may have been deleted.');
        }
        
        throw new Error(`Failed to delete treatment: ${errorMessage}`);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patient', variables.patientId] });
    },
  });
}

export function useLogOutcome() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ patientId, outcome }: { patientId: PatientId; outcome: Outcome }) => {
      return apiClient.logOutcome(patientId, outcome);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patient', variables.patientId] });
    },
  });
}

export function useUpdateOutcome() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ patientId, outcomeId, updatedOutcome }: { patientId: PatientId; outcomeId: string; updatedOutcome: Outcome }) => {
      try {
        await apiClient.updateOutcome(patientId, outcomeId, updatedOutcome);
      } catch (error: any) {
        const errorMessage = error?.response?.data?.error || error?.message || String(error);
        
        if (errorMessage.includes('Unauthorized')) {
          throw new Error('UNAUTHORIZED: You do not have permission to update outcomes. Please contact your administrator.');
        }
        
        if (errorMessage.includes('Patient not found')) {
          throw new Error('NOT_FOUND: Patient not found. The patient may have been deleted.');
        }
        
        throw new Error(`Failed to update outcome: ${errorMessage}`);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patient', variables.patientId] });
    },
  });
}

export function useDeleteOutcome() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ patientId, outcomeId }: { patientId: PatientId; outcomeId: string }) => {
      try {
        await apiClient.deleteOutcome(patientId, outcomeId);
      } catch (error: any) {
        const errorMessage = error?.response?.data?.error || error?.message || String(error);
        
        if (errorMessage.includes('Unauthorized')) {
          throw new Error('UNAUTHORIZED: You do not have permission to delete outcomes. Please contact your administrator.');
        }
        
        if (errorMessage.includes('Patient not found')) {
          throw new Error('NOT_FOUND: Patient not found. The patient may have been deleted.');
        }
        
        throw new Error(`Failed to delete outcome: ${errorMessage}`);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patient', variables.patientId] });
    },
  });
}

export function useUpdateSummary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ patientId, reasonForVisit, patientReport }: { patientId: PatientId; reasonForVisit: string; patientReport: string }) => {
      try {
        await apiClient.updateSummary(patientId, reasonForVisit, patientReport);
      } catch (error: any) {
        const errorMessage = error?.response?.data?.error || error?.message || String(error);
        
        // Check for authorization errors
        if (errorMessage.includes('Unauthorized')) {
          throw new Error('UNAUTHORIZED: You do not have permission to update patient summary. Please contact your administrator.');
        }
        
        // Check for not found errors
        if (errorMessage.includes('Patient not found')) {
          throw new Error('NOT_FOUND: Patient not found. The patient may have been deleted.');
        }
        
        // Generic error
        throw new Error(`Failed to update summary: ${errorMessage}`);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patient', variables.patientId] });
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });
}

export function useAddChatMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ patientId, message }: { patientId: PatientId; message: ChatMessage }) => {
      return apiClient.addChatMessage(patientId, message);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['chatHistory', variables.patientId] });
      queryClient.invalidateQueries({ queryKey: ['patient', variables.patientId] });
    },
  });
}

export function useGetChatHistory(patientId: PatientId | null) {
  return useQuery<ChatMessage[]>({
    queryKey: ['chatHistory', patientId],
    queryFn: async () => {
      if (!patientId) return [];
      return apiClient.getChatHistory(patientId);
    },
    enabled: !!patientId,
  });
}

export function useClearChatHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patientId: PatientId) => {
      return apiClient.clearChatHistory(patientId);
    },
    onSuccess: (_, patientId) => {
      queryClient.invalidateQueries({ queryKey: ['chatHistory', patientId] });
      queryClient.invalidateQueries({ queryKey: ['patient', patientId] });
    },
  });
}

export function useAnalyzeTreatmentWithOpenAi() {
  return useMutation({
    mutationFn: async ({ patientId, treatmentDescription }: { patientId: PatientId; treatmentDescription: string }) => {
      try {
        const result = await apiClient.analyzeTreatment(patientId, treatmentDescription);
        return result;
      } catch (error: any) {
        const errorMessage = error?.response?.data?.error || error?.message || String(error);
        
        // Check for authentication errors
        if (errorMessage.includes('Authentication failed') || 
            errorMessage.includes('401') || 
            errorMessage.includes('403') ||
            errorMessage.includes('Unauthorized') ||
            errorMessage.includes('Forbidden')) {
          throw new Error('OPENAI_AUTH_ERROR: Invalid OpenAI API key. Please contact your administrator to update the API credentials in Admin Settings.');
        }
        
        // Check for configuration errors
        if (errorMessage.includes('OpenAI API key is not configured')) {
          throw new Error('OPENAI_CONFIG_ERROR: OpenAI API key is not configured. Please contact your administrator to set up the API key in Admin Settings.');
        }
        
        // Check for endpoint errors
        if (errorMessage.includes('OpenAI endpoint not found') ||
            errorMessage.includes('404') || 
            errorMessage.includes('not found')) {
          throw new Error('OPENAI_CONFIG_ERROR: OpenAI endpoint not found or incorrectly configured. Please verify the API configuration with your administrator.');
        }
        
        // Check for service unavailability
        if (errorMessage.includes('OpenAI service is currently unavailable') ||
            errorMessage.includes('500') || 
            errorMessage.includes('502') ||
            errorMessage.includes('503') ||
            errorMessage.includes('504')) {
          throw new Error('OPENAI_SERVICE_ERROR: OpenAI service is temporarily unavailable. Please try again in a few moments.');
        }
        
        // Check for network errors and timeouts
        if (errorMessage.includes('timeout') || 
            errorMessage.includes('timed out') ||
            errorMessage.includes('network') ||
            errorMessage.includes('connection') ||
            errorMessage.includes('ECONNREFUSED') ||
            errorMessage.includes('ETIMEDOUT')) {
          throw new Error('OPENAI_NETWORK_ERROR: Unable to connect to OpenAI service due to network timeout. The request may have taken too long to complete. Please try again with a simpler query or check your network connection.');
        }
        
        // Check for rate limiting
        if (errorMessage.includes('rate limit') || 
            errorMessage.includes('429') ||
            errorMessage.includes('Too Many Requests')) {
          throw new Error('OPENAI_RATE_LIMIT: API rate limit exceeded. Please wait a moment and try again.');
        }

        // Check for invalid request format
        if (errorMessage.includes('400') ||
            errorMessage.includes('Bad Request') ||
            errorMessage.includes('invalid') ||
            errorMessage.includes('malformed')) {
          throw new Error('OPENAI_REQUEST_ERROR: Invalid request format. The analysis query structure may be incorrect. Please contact your administrator to verify the backend API integration.');
        }

        // Check for JSON parsing errors
        if (errorMessage.includes('JSON') || 
            errorMessage.includes('parse') ||
            errorMessage.includes('syntax')) {
          throw new Error('OPENAI_REQUEST_ERROR: JSON formatting error in the request. Please contact your administrator to verify the backend properly formats JSON payloads for the OpenAI API.');
        }
        
        // Generic OpenAI error with the original message
        throw new Error(`OPENAI_ERROR: Failed to analyze treatment. ${errorMessage}`);
      }
    },
  });
}

export function useGetOpenAiApiKey() {
  return useQuery<string>({
    queryKey: ['openAiApiKey'],
    queryFn: async () => {
      return apiClient.getOpenAiApiKey();
    },
  });
}

export function useUpdateOpenAiApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (apiKey: string) => {
      return apiClient.updateOpenAiApiKey(apiKey);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['openAiApiKey'] });
    },
  });
}

