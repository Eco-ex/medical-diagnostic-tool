import { NextResponse } from 'next/server';
import { searchPatients } from '@/lib/server/database';

export const dynamic = 'force-dynamic';

// Search patients by name or id. The static `search` segment is matched before
// the sibling `[patientId]` segment, so there is no routing conflict.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ searchTerm: string }> }
) {
  try {
    const { searchTerm } = await params;
    return NextResponse.json(await searchPatients(searchTerm));
  } catch (error: unknown) {
    console.error('Search patients error:', error);
    return NextResponse.json({ error: 'Failed to search patients' }, { status: 500 });
  }
}
