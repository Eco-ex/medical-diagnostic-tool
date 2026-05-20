import { NextResponse } from 'next/server';
import type { Treatment } from '@/types';
import { getPatient, updatePatient } from '@/lib/server/database';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ patientId: string; treatmentId: string }> };

// Update treatment
export async function PUT(request: Request, { params }: Params) {
  try {
    const { patientId, treatmentId } = await params;
    const patient = await getPatient(patientId);
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    const updatedTreatment = (await request.json().catch(() => null)) as Treatment | null;
    if (!updatedTreatment) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const index = patient.treatments.findIndex((t) => t.treatmentId === treatmentId);
    if (index === -1) {
      return NextResponse.json({ error: 'Treatment not found' }, { status: 404 });
    }

    patient.treatments[index] = updatedTreatment;
    await updatePatient(patientId, patient);
    return NextResponse.json({ message: 'Treatment updated successfully' });
  } catch (error: unknown) {
    console.error('Update treatment error:', error);
    return NextResponse.json({ error: 'Failed to update treatment' }, { status: 500 });
  }
}

// Delete treatment (and its associated outcomes)
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { patientId, treatmentId } = await params;
    const patient = await getPatient(patientId);
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    patient.treatments = patient.treatments.filter((t) => t.treatmentId !== treatmentId);
    patient.outcomes = patient.outcomes.filter((o) => o.treatmentId !== treatmentId);
    await updatePatient(patientId, patient);
    return NextResponse.json({
      message: 'Treatment and associated outcomes deleted successfully',
    });
  } catch (error: unknown) {
    console.error('Delete treatment error:', error);
    return NextResponse.json({ error: 'Failed to delete treatment' }, { status: 500 });
  }
}
