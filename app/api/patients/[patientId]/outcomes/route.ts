import { NextResponse } from 'next/server';
import type { Outcome } from '@/types';
import { getPatient, updatePatient } from '@/lib/server/database';

export const dynamic = 'force-dynamic';

// Log outcome
export async function POST(request: Request, { params }: { params: Promise<{ patientId: string }> }) {
  try {
    const { patientId } = await params;
    const patient = await getPatient(patientId);
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    const outcome = (await request.json().catch(() => null)) as Outcome | null;
    if (!outcome) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    patient.outcomes.push(outcome);
    await updatePatient(patientId, patient);
    return NextResponse.json({ message: 'Outcome logged successfully' }, { status: 201 });
  } catch (error: unknown) {
    console.error('Log outcome error:', error);
    return NextResponse.json({ error: 'Failed to log outcome' }, { status: 500 });
  }
}
