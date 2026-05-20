import { NextResponse } from 'next/server';
import type { Patient } from '@/types';
import { deletePatient, getPatient, patientExists, updatePatient } from '@/lib/server/database';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ patientId: string }> };

// Get single patient
export async function GET(_request: Request, { params }: Params) {
  try {
    const { patientId } = await params;
    const patient = await getPatient(patientId);
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }
    return NextResponse.json(patient);
  } catch (error: unknown) {
    console.error('Get patient error:', error);
    return NextResponse.json({ error: 'Failed to get patient' }, { status: 500 });
  }
}

// Update patient
export async function PUT(request: Request, { params }: Params) {
  try {
    const { patientId } = await params;
    const updatedPatient = (await request.json().catch(() => null)) as Patient | null;

    if (
      !updatedPatient ||
      !updatedPatient.name ||
      !updatedPatient.patientId ||
      !updatedPatient.sex ||
      updatedPatient.age === undefined
    ) {
      return NextResponse.json(
        { error: 'Name, Patient ID, Age, and Sex are required' },
        { status: 400 }
      );
    }

    if (updatedPatient.patientId !== patientId && (await patientExists(updatedPatient.patientId))) {
      return NextResponse.json(
        { error: 'Patient ID already exists. Please use a unique patient ID.' },
        { status: 409 }
      );
    }

    await updatePatient(patientId, updatedPatient);
    return NextResponse.json({
      message: 'Patient updated successfully',
      patientId: updatedPatient.patientId,
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Patient not found') {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }
    console.error('Update patient error:', error);
    return NextResponse.json({ error: 'Failed to update patient' }, { status: 500 });
  }
}

// Delete patient
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { patientId } = await params;
    await deletePatient(patientId);
    return NextResponse.json({ message: 'Patient deleted successfully' });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Patient not found') {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }
    console.error('Delete patient error:', error);
    return NextResponse.json({ error: 'Failed to delete patient' }, { status: 500 });
  }
}
