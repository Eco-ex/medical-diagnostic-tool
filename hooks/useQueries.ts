import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import type {
  Patient,
  PatientId,
  Vitals,
  MedicalRecord,
  Treatment,
  Outcome,
  ChatMessage,
  NewPatient,
  DocumentSummary,
  DocumentStatus,
  SearchResult,
  KnowledgePreset,
} from '../types';

function extractErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null) {
    const e = error as { response?: { data?: { error?: string } }; message?: string };
    return e.response?.data?.error ?? e.message ?? String(error);
  }
  return String(error);
}

export function useGetAllPatients() {
  return useQuery<Patient[]>({
    queryKey: ['patients'],
    queryFn: () => apiClient.getAllPatients(),
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
    mutationFn: (searchTerm: string) => apiClient.searchPatients(searchTerm),
  });
}

export function useAddNewPatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newPatient: NewPatient) => {
      try {
        await apiClient.addNewPatient(newPatient);
        return newPatient.patientId;
      } catch (error: unknown) {
        const errorMessage = extractErrorMessage(error);

        if (errorMessage.includes('Patient ID already exists')) {
          throw new Error('DUPLICATE_PATIENT_ID: A patient with this ID already exists. Please use a unique patient ID.');
        }

        if (errorMessage.includes('required')) {
          throw new Error('VALIDATION_ERROR: Please fill in all required fields (Name, Patient ID, Age, Sex).');
        }

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
      } catch (error: unknown) {
        const errorMessage = extractErrorMessage(error);

        if (errorMessage.includes('Patient ID already exists')) {
          throw new Error('DUPLICATE_PATIENT_ID: A patient with this ID already exists. Please use a unique patient ID.');
        }

        if (errorMessage.includes('required')) {
          throw new Error('VALIDATION_ERROR: Please fill in all required fields (Name, Patient ID, Age, Sex).');
        }

        if (errorMessage.includes('Patient not found')) {
          throw new Error('NOT_FOUND: Patient not found. The patient may have been deleted.');
        }

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
      } catch (error: unknown) {
        const errorMessage = extractErrorMessage(error);
        if (errorMessage.includes('Patient not found')) {
          throw new Error('NOT_FOUND: Patient not found. The patient may have already been deleted.');
        }
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
    mutationFn: ({ patientId, vitals }: { patientId: PatientId; vitals: Vitals }) =>
      apiClient.updateVitals(patientId, vitals),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patient', variables.patientId] });
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });
}

export function useAddMedicalRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ patientId, record }: { patientId: PatientId; record: MedicalRecord }) =>
      apiClient.addMedicalRecord(patientId, record),
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
      } catch (error: unknown) {
        const errorMessage = extractErrorMessage(error);
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
      } catch (error: unknown) {
        const errorMessage = extractErrorMessage(error);
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
    mutationFn: ({ patientId, treatment }: { patientId: PatientId; treatment: Treatment }) =>
      apiClient.addTreatment(patientId, treatment),
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
      } catch (error: unknown) {
        const errorMessage = extractErrorMessage(error);
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
      } catch (error: unknown) {
        const errorMessage = extractErrorMessage(error);
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
    mutationFn: ({ patientId, outcome }: { patientId: PatientId; outcome: Outcome }) =>
      apiClient.logOutcome(patientId, outcome),
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
      } catch (error: unknown) {
        const errorMessage = extractErrorMessage(error);
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
      } catch (error: unknown) {
        const errorMessage = extractErrorMessage(error);
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
      } catch (error: unknown) {
        const errorMessage = extractErrorMessage(error);
        if (errorMessage.includes('Patient not found')) {
          throw new Error('NOT_FOUND: Patient not found. The patient may have been deleted.');
        }
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
    mutationFn: ({ patientId, message }: { patientId: PatientId; message: ChatMessage }) =>
      apiClient.addChatMessage(patientId, message),
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
    mutationFn: (patientId: PatientId) => apiClient.clearChatHistory(patientId),
    onSuccess: (_, patientId) => {
      queryClient.invalidateQueries({ queryKey: ['chatHistory', patientId] });
      queryClient.invalidateQueries({ queryKey: ['patient', patientId] });
    },
  });
}

// ---- Knowledge base (admin) -----------------------------------------------

// Statuses where the ingestion pipeline is still working on a document.
export const ACTIVE_DOCUMENT_STATUSES = new Set<DocumentStatus>([
  'uploaded',
  'parsing',
  'parsed',
  'chunking',
  'chunked',
  'embedding',
]);

export function useGetDocuments() {
  return useQuery<DocumentSummary[]>({
    queryKey: ['knowledge', 'documents'],
    queryFn: () => apiClient.listKnowledgeDocuments(),
    // Poll while any document is mid-pipeline; go idle once all are terminal.
    refetchInterval: (query) =>
      (query.state.data ?? []).some((d) => ACTIVE_DOCUMENT_STATUSES.has(d.status)) ? 2500 : false,
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, preset }: { file: File; preset: KnowledgePreset }) => {
      try {
        return await apiClient.uploadKnowledgeDocument(file, preset);
      } catch (error: unknown) {
        const errorMessage = extractErrorMessage(error);
        if (errorMessage.toLowerCase().includes('pdf')) {
          throw new Error(`INVALID_FILE: ${errorMessage}`);
        }
        if (errorMessage.includes('limit') || errorMessage.includes('exceeds')) {
          throw new Error(`FILE_TOO_LARGE: ${errorMessage}`);
        }
        throw new Error(`Failed to upload document: ${errorMessage}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge', 'documents'] });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      try {
        await apiClient.deleteKnowledgeDocument(id);
      } catch (error: unknown) {
        throw new Error(`Failed to delete document: ${extractErrorMessage(error)}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge', 'documents'] });
    },
  });
}

export function useReindexDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      try {
        await apiClient.reindexKnowledgeDocument(id);
      } catch (error: unknown) {
        throw new Error(`Failed to reindex document: ${extractErrorMessage(error)}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge', 'documents'] });
    },
  });
}

export function useSearchKnowledge() {
  return useMutation<SearchResult[], Error, { query: string; matchCount?: number }>({
    mutationFn: async ({ query, matchCount }) => {
      try {
        return await apiClient.searchKnowledge(query, matchCount);
      } catch (error: unknown) {
        throw new Error(`Search failed: ${extractErrorMessage(error)}`);
      }
    },
  });
}

export function useAnalyzeTreatmentWithAnthropic() {
  return useMutation({
    mutationFn: async ({ patientId, treatmentDescription }: { patientId: PatientId; treatmentDescription: string }) => {
      try {
        return await apiClient.analyzeTreatment(patientId, treatmentDescription);
      } catch (error: unknown) {
        const errorMessage = extractErrorMessage(error);

        if (errorMessage.includes('Anthropic API key is not configured')) {
          throw new Error('ANTHROPIC_CONFIG_ERROR: Anthropic API key is not set. Open Admin Settings and paste your key.');
        }

        if (errorMessage.includes('Authentication failed') ||
            errorMessage.includes('401') ||
            errorMessage.includes('403')) {
          throw new Error('ANTHROPIC_AUTH_ERROR: Invalid Anthropic API key. Update it in Admin Settings.');
        }

        if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
          throw new Error('ANTHROPIC_RATE_LIMIT: API rate limit exceeded. Please wait a moment and try again.');
        }

        if (errorMessage.includes('timeout') || errorMessage.includes('timed out') || errorMessage.includes('ETIMEDOUT')) {
          throw new Error('ANTHROPIC_NETWORK_ERROR: Request to Anthropic timed out. Please try again.');
        }

        if (errorMessage.match(/5\d\d/) || errorMessage.includes('unavailable')) {
          throw new Error('ANTHROPIC_SERVICE_ERROR: Anthropic service is temporarily unavailable. Please try again.');
        }

        throw new Error(`ANTHROPIC_ERROR: Failed to analyze treatment. ${errorMessage}`);
      }
    },
  });
}
