import { NextResponse } from 'next/server';
import type { MedicalRecord } from '@/types';
import { addMedicalRecord } from '@/lib/server/database';

export const dynamic = 'force-dynamic';

// Add medical record
export async function POST(
  request: Request,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const { patientId } = await params;
    const record = (await request.json().catch(() => null)) as MedicalRecord | null;
    if (!record) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    if (!(await addMedicalRecord(patientId, record))) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }
    return NextResponse.json(
      { message: 'Medical record added successfully' },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Add medical record error:', error);
    return NextResponse.json(
      { error: 'Failed to add medical record' },
      { status: 500 }
    );
  }
}
