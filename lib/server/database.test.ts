import { describe, it, expect, beforeEach } from 'vitest';
import {
  addPatient,
  deletePatient,
  getAllPatients,
  getPatient,
  patientExists,
  updatePatient,
  _resetForTests,
} from './database';
import type { Patient } from '../../types';

function makePatient(overrides: Partial<Patient> = {}): Patient {
  return {
    patientId: 'p1',
    name: 'Test Patient',
    age: 40,
    sex: 'Other',
    occupation: null,
    allergies: null,
    currentStatus: {
      heartRate: 0,
      bloodPressure: '',
      temperature: 0,
      respiratoryRate: 0,
      oxygenSaturation: 0,
    },
    medicalRecords: [],
    treatments: [],
    outcomes: [],
    chatHistory: [],
    reasonForVisit: null,
    patientReport: null,
    ...overrides,
  };
}

describe('in-memory patient store', () => {
  beforeEach(async () => {
    await _resetForTests();
  });

  it('starts empty', async () => {
    expect(await getAllPatients()).toEqual([]);
  });

  it('round-trips a patient through add/get', async () => {
    const patient = makePatient();
    await addPatient(patient);

    expect(await patientExists('p1')).toBe(true);
    expect(await getPatient('p1')).toEqual(patient);
    expect(await getAllPatients()).toHaveLength(1);
  });

  it('updatePatient swaps the entry under a new id when the id changes', async () => {
    await addPatient(makePatient({ patientId: 'p1' }));
    await updatePatient('p1', makePatient({ patientId: 'p2', name: 'Renamed' }));

    expect(await patientExists('p1')).toBe(false);
    expect((await getPatient('p2'))?.name).toBe('Renamed');
  });

  it('deletePatient throws when the id is missing', async () => {
    await expect(deletePatient('missing')).rejects.toThrow('Patient not found');
  });

  it('updatePatient throws when the id is missing', async () => {
    await expect(updatePatient('missing', makePatient())).rejects.toThrow('Patient not found');
  });
});
