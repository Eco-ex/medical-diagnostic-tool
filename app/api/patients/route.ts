import { NextResponse } from 'next/server';
import type { NewPatient, Patient } from '@/types';
import { addPatient, getAllPatients, patientExists } from '@/lib/server/database';

export const dynamic = 'force-dynamic';

// Get all patients
export async function GET() {
  try {
    return NextResponse.json(await getAllPatients());
  } catch (error: unknown) {
    console.error('Get all patients error:', error);
    return NextResponse.json({ error: 'Failed to get patients' }, { status: 500 });
  }
}

// Add new patient
export async function POST(request: Request) {
  try {
    const newPatient = (await request.json().catch(() => null)) as NewPatient | null;

    if (
      !newPatient ||
      !newPatient.name ||
      !newPatient.patientId ||
      !newPatient.sex ||
      newPatient.age === undefined
    ) {
      return NextResponse.json(
        { error: 'Name, Patient ID, Age, and Sex are required' },
        { status: 400 }
      );
    }

    if (await patientExists(newPatient.patientId)) {
      return NextResponse.json(
        { error: 'Patient ID already exists. Please use a unique patient ID.' },
        { status: 409 }
      );
    }

    const patient: Patient = {
      patientId: newPatient.patientId,
      name: newPatient.name,
      age: newPatient.age,
      sex: newPatient.sex,
      occupation: newPatient.occupation,
      allergies: newPatient.allergies,
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
    };

    await addPatient(patient);
    return NextResponse.json(
      { message: 'Patient added successfully', patientId: patient.patientId },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Add patient error:', error);
    return NextResponse.json({ error: 'Failed to add patient' }, { status: 500 });
  }
}
