import { NextResponse } from 'next/server';
import type { Treatment } from '@/types';
import {
  patientExists,
  updateTreatment,
  deleteTreatment,
} from '@/lib/server/database';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ patientId: string; treatmentId: string }> };

// Update treatment
export async function PUT(request: Request, { params }: Params) {
  try {
    const { patientId, treatmentId } = await params;
    if (!(await patientExists(patientId))) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }
    const treatment = (await request.json().catch(() => null)) as Treatment | null;
    if (!treatment) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    if (!(await updateTreatment(patientId, treatmentId, treatment))) {
      return NextResponse.json({ error: 'Treatment not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Treatment updated successfully' });
  } catch (error: unknown) {
    console.error('Update treatment error:', error);
    return NextResponse.json({ error: 'Failed to update treatment' }, { status: 500 });
  }
}

// Delete treatment (its associated outcomes cascade-delete via the foreign key)
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { patientId, treatmentId } = await params;
    if (!(await patientExists(patientId))) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }
    if (!(await deleteTreatment(patientId, treatmentId))) {
      return NextResponse.json({ error: 'Treatment not found' }, { status: 404 });
    }
    return NextResponse.json({
      message: 'Treatment and associated outcomes deleted successfully',
    });
  } catch (error: unknown) {
    console.error('Delete treatment error:', error);
    return NextResponse.json({ error: 'Failed to delete treatment' }, { status: 500 });
  }
}
