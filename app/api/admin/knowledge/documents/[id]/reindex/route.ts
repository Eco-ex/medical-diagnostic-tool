import { NextResponse, after } from 'next/server';
import { clientKey, rateLimit } from '@/lib/server/rate-limit';
import { reindexDocument, triggerParse } from '@/lib/server/knowledge';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/admin/knowledge/documents/[id]/reindex
 *
 * Resets a finished document to 'uploaded' and re-runs the full ingestion
 * pipeline. Rejected with 409 if the document is still processing (so a reindex
 * cannot race an in-flight pipeline). The parse-document dispatch runs after the
 * response (survives serverless teardown), so the call returns immediately.
 */
export async function POST(request: Request, { params }: Params) {
  try {
    // Reindex re-runs the expensive parse -> chunk -> embed pipeline; throttle it.
    if (!rateLimit(`knowledge-reindex:${clientKey(request)}`, 10, 60 * 1000)) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a minute and try again.' },
        { status: 429 },
      );
    }

    const { id } = await params;
    const result = await reindexDocument(id);
    if (result === 'not_found') {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }
    if (result === 'busy') {
      return NextResponse.json(
        { error: 'Document is still processing. Reindex once it has finished.' },
        { status: 409 },
      );
    }

    after(() => triggerParse(id));
    return NextResponse.json({ message: 'Reindex started' });
  } catch (error: unknown) {
    console.error('Reindex document error:', error);
    return NextResponse.json({ error: 'Failed to reindex document' }, { status: 500 });
  }
}
