import { NextResponse } from 'next/server';
import { listDocuments } from '@/lib/server/knowledge';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/knowledge/documents
 *
 * Lists all knowledge documents (newest first). Polled by the admin UI to track
 * pipeline status, so it is intentionally NOT rate-limited.
 */
export async function GET() {
  try {
    const documents = await listDocuments();
    return NextResponse.json(documents);
  } catch (error: unknown) {
    console.error('List documents error:', error);
    return NextResponse.json({ error: 'Failed to list documents' }, { status: 500 });
  }
}
