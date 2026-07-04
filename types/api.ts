// Request payload types — used by the API route handlers.
export interface UpdateSummaryRequest {
  reasonForVisit: string;
  patientReport: string;
}

export interface AnalyzeTreatmentRequest {
  treatmentDescription: string;
}
