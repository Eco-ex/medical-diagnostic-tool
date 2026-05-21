import { NextResponse } from 'next/server';
import type { Outcome } from '@/types';
import {
  patientExists,
  updateOutcome,
  deleteOutcome,
} from '@/lib/server/database';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ patientId: string; outcomeId: string }> };

// Update outcome
export async function PUT(request: Request, { params }: Params) {
  try {
    const { patientId, outcomeId } = await params;
    if (!(await patientExists(patientId))) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }
    const outcome = (await request.json().catch(() => null)) as Outcome | null;
    if (!outcome) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    if (!(await updateOutcome(patientId, outcomeId, outcome))) {
      return NextResponse.json({ error: 'Outcome not found' }, { status: 404 });
    }
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
    if (!(await patientExists(patientId))) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }
    if (!(await deleteOutcome(patientId, outcomeId))) {
      return NextResponse.json({ error: 'Outcome not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Outcome deleted successfully' });
  } catch (error: unknown) {
    console.error('Delete outcome error:', error);
    return NextResponse.json({ error: 'Failed to delete outcome' }, { status: 500 });
  }
}
