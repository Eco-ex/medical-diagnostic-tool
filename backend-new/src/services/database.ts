import { Patient } from '../types';

const patients = new Map<string, Patient>();

export function getAllPatients(): Patient[] {
  return Array.from(patients.values());
}

export function getPatient(patientId: string): Patient | null {
  return patients.get(patientId) ?? null;
}

export function addPatient(patient: Patient): void {
  patients.set(patient.patientId, patient);
}

export function updatePatient(patientId: string, updatedPatient: Patient): void {
  if (!patients.has(patientId)) throw new Error('Patient not found');

  if (updatedPatient.patientId !== patientId) {
    patients.delete(patientId);
  }
  patients.set(updatedPatient.patientId, updatedPatient);
}

export function deletePatient(patientId: string): void {
  if (!patients.delete(patientId)) throw new Error('Patient not found');
}

export function patientExists(patientId: string): boolean {
  return patients.has(patientId);
}

// Test-only helper for resetting state between tests.
export function _resetForTests(): void {
  patients.clear();
}
