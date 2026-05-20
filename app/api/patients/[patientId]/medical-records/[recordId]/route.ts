import { NextResponse } from 'next/server';
import type { MedicalRecord } from '@/types';
import { getPatient, updatePatient } from '@/lib/server/database';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ patientId: string; recordId: string }> };

// Update medical record
export async function PUT(request: Request, { params }: Params) {
  try {
    const { patientId, recordId } = await params;
    const patient = await getPatient(patientId);
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    const updatedRecord = (await request.json().catch(() => null)) as MedicalRecord | null;
    if (!updatedRecord) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const index = patient.medicalRecords.findIndex((r) => r.recordId === recordId);
    if (index === -1) {
      return NextResponse.json({ error: 'Medical record not found' }, { status: 404 });
    }

    patient.medicalRecords[index] = updatedRecord;
    await updatePatient(patientId, patient);
    return NextResponse.json({ message: 'Medical record updated successfully' });
  } catch (error: unknown) {
    console.error('Update medical record error:', error);
    return NextResponse.json({ error: 'Failed to update medical record' }, { status: 500 });
  }
}

// Delete medical record
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { patientId, recordId } = await params;
    const patient = await getPatient(patientId);
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    patient.medicalRecords = patient.medicalRecords.filter((r) => r.recordId !== recordId);
    await updatePatient(patientId, patient);
    return NextResponse.json({ message: 'Medical record deleted successfully' });
  } catch (error: unknown) {
    console.error('Delete medical record error:', error);
    return NextResponse.json({ error: 'Failed to delete medical record' }, { status: 500 });
  }
}
