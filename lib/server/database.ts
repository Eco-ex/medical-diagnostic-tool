import type { Patient } from '../../types';

/**
 * In-memory patient store.
 *
 * This module is the single seam for persistence. Everything else talks to
 * patients only through the async functions below, so swapping the in-memory
 * `Map` for Supabase Postgres later means reimplementing this file alone — the
 * signatures are already async, so no caller changes.
 *
 * Storage notes:
 *  - The `Map` is cached on `globalThis` so it survives Next.js dev hot-reload
 *    (which re-evaluates modules). Without this, every edit would wipe the store.
 *  - Data is still process-memory only: a full server restart wipes it. This is
 *    why the app must run as a single long-lived Node process (`next start`),
 *    not on per-request serverless. Supabase removes that constraint.
 */

const globalForStore = globalThis as unknown as {
  __patientStore?: Map<string, Patient>;
};

const patients: Map<string, Patient> =
  globalForStore.__patientStore ?? (globalForStore.__patientStore = new Map());

export async function getAllPatients(): Promise<Patient[]> {
  return Array.from(patients.values());
}

export async function getPatient(patientId: string): Promise<Patient | null> {
  return patients.get(patientId) ?? null;
}

export async function addPatient(patient: Patient): Promise<void> {
  patients.set(patient.patientId, patient);
}

export async function updatePatient(patientId: string, updatedPatient: Patient): Promise<void> {
  if (!patients.has(patientId)) throw new Error('Patient not found');

  if (updatedPatient.patientId !== patientId) {
    patients.delete(patientId);
  }
  patients.set(updatedPatient.patientId, updatedPatient);
}

export async function deletePatient(patientId: string): Promise<void> {
  if (!patients.delete(patientId)) throw new Error('Patient not found');
}

export async function patientExists(patientId: string): Promise<boolean> {
  return patients.has(patientId);
}

// Test-only helper for resetting state between tests.
export async function _resetForTests(): Promise<void> {
  patients.clear();
}
