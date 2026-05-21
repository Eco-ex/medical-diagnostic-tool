import { NextResponse } from 'next/server';
import type { Treatment } from '@/types';
import { addTreatment } from '@/lib/server/database';

export const dynamic = 'force-dynamic';

// Add treatment
export async function POST(
  request: Request,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const { patientId } = await params;
    const treatment = (await request.json().catch(() => null)) as Treatment | null;
    if (!treatment) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    if (!(await addTreatment(patientId, treatment))) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }
    return NextResponse.json(
      { message: 'Treatment added successfully' },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Add treatment error:', error);
    return NextResponse.json({ error: 'Failed to add treatment' }, { status: 500 });
  }
}
