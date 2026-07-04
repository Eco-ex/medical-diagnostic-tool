import { NextResponse } from 'next/server';
import type { UpdateSummaryRequest } from '@/types';
import { getPatientSummary, updateSummary } from '@/lib/server/database';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ patientId: string }> };

// Get summary
export async function GET(_request: Request, { params }: Params) {
  try {
    const { patientId } = await params;
    const summary = await getPatientSummary(patientId);
    if (!summary) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }
    return NextResponse.json(summary);
  } catch (error: unknown) {
    console.error('Get summary error:', error);
    return NextResponse.json({ error: 'Failed to get summary' }, { status: 500 });
  }
}

// Update summary
export async function PUT(request: Request, { params }: Params) {
  try {
    const { patientId } = await params;
    const body = (await request.json().catch(() => null)) as UpdateSummaryRequest | null;
    if (!body) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    if (!(await updateSummary(patientId, body.reasonForVisit, body.patientReport))) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Summary updated successfully' });
  } catch (error: unknown) {
    console.error('Update summary error:', error);
    return NextResponse.json({ error: 'Failed to update summary' }, { status: 500 });
  }
}
