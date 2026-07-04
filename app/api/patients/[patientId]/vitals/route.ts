import { NextResponse } from 'next/server';
import type { Vitals } from '@/types';
import { addVitalsReading } from '@/lib/server/database';

export const dynamic = 'force-dynamic';

// Update vitals — appends a new reading. "Current" vitals = the latest reading.
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const { patientId } = await params;
    const vitals = (await request.json().catch(() => null)) as Vitals | null;
    if (!vitals) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    if (!(await addVitalsReading(patientId, vitals))) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Vitals updated successfully' });
  } catch (error: unknown) {
    console.error('Update vitals error:', error);
    return NextResponse.json({ error: 'Failed to update vitals' }, { status: 500 });
  }
}
