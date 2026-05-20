import { NextResponse } from 'next/server';
import { getAllPatients } from '@/lib/server/database';

export const dynamic = 'force-dynamic';

// Search patients by name or id. The static `search` segment is matched before
// the sibling `[patientId]` segment, so there is no routing conflict.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ searchTerm: string }> }
) {
  try {
    const { searchTerm } = await params;
    const term = searchTerm.toLowerCase();
    const results = (await getAllPatients()).filter(
      (p) => p.name.toLowerCase().includes(term) || p.patientId.toLowerCase().includes(term)
    );
    return NextResponse.json(results);
  } catch (error: unknown) {
    console.error('Search patients error:', error);
    return NextResponse.json({ error: 'Failed to search patients' }, { status: 500 });
  }
}
