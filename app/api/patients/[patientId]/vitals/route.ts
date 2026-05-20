import { NextResponse } from 'next/server';
import type { Vitals } from '@/types';
import { getPatient, updatePatient } from '@/lib/server/database';

export const dynamic = 'force-dynamic';

// Update vitals
export async function PUT(request: Request, { params }: { params: Promise<{ patientId: string }> }) {
  try {
    const { patientId } = await params;
    const patient = await getPatient(patientId);
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    const vitals = (await request.json().catch(() => null)) as Vitals | null;
    if (!vitals) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    patient.currentStatus = vitals;
    await updatePatient(patientId, patient);
    return NextResponse.json({ message: 'Vitals updated successfully' });
  } catch (error: unknown) {
    console.error('Update vitals error:', error);
    return NextResponse.json({ error: 'Failed to update vitals' }, { status: 500 });
  }
}
