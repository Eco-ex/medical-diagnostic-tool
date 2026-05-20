import { NextResponse } from 'next/server';
import type { Outcome } from '@/types';
import { getPatient, updatePatient } from '@/lib/server/database';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ patientId: string; outcomeId: string }> };

// Update outcome
export async function PUT(request: Request, { params }: Params) {
  try {
    const { patientId, outcomeId } = await params;
    const patient = await getPatient(patientId);
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    const updatedOutcome = (await request.json().catch(() => null)) as Outcome | null;
    if (!updatedOutcome) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const index = patient.outcomes.findIndex((o) => o.outcomeId === outcomeId);
    if (index === -1) {
      return NextResponse.json({ error: 'Outcome not found' }, { status: 404 });
    }

    patient.outcomes[index] = updatedOutcome;
    await updatePatient(patientId, patient);
    return NextResponse.json({ message: 'Outcome updated successfully' });
  } catch (error: unknown) {
    console.error('Update outcome error:', error);
    return NextResponse.json({ error: 'Failed to update outcome' }, { status: 500 });
  }
}

// Delete outcome
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { patientId, outcomeId } = await params;
    const patient = await getPatient(patientId);
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    patient.outcomes = patient.outcomes.filter((o) => o.outcomeId !== outcomeId);
    await updatePatient(patientId, patient);
    return NextResponse.json({ message: 'Outcome deleted successfully' });
  } catch (error: unknown) {
    console.error('Delete outcome error:', error);
    return NextResponse.json({ error: 'Failed to delete outcome' }, { status: 500 });
  }
}
