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
import type { Patient } from '../types';

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
  beforeEach(() => {
    _resetForTests();
  });

  it('starts empty', () => {
    expect(getAllPatients()).toEqual([]);
  });

  it('round-trips a patient through add/get', () => {
    const patient = makePatient();
    addPatient(patient);

    expect(patientExists('p1')).toBe(true);
    expect(getPatient('p1')).toEqual(patient);
    expect(getAllPatients()).toHaveLength(1);
  });

  it('updatePatient swaps the entry under a new id when the id changes', () => {
    addPatient(makePatient({ patientId: 'p1' }));
    updatePatient('p1', makePatient({ patientId: 'p2', name: 'Renamed' }));

    expect(patientExists('p1')).toBe(false);
    expect(getPatient('p2')?.name).toBe('Renamed');
  });

  it('deletePatient throws when the id is missing', () => {
    expect(() => deletePatient('missing')).toThrow('Patient not found');
  });

  it('updatePatient throws when the id is missing', () => {
    expect(() => updatePatient('missing', makePatient())).toThrow('Patient not found');
  });
});
