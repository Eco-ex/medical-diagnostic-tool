import { NextResponse } from 'next/server';
import { clientKey, rateLimit } from '@/lib/server/rate-limit';
import { deleteDocument } from '@/lib/server/knowledge';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

/**
 * DELETE /api/admin/knowledge/documents/[id]
 *
 * Removes a document, its chunks/embeddings/jobs (via FK cascade), and its
 * Storage objects (PDF + markdown).
 */
export async function DELETE(request: Request, { params }: Params) {
  try {
    // Destructive (cascades to chunks/embeddings); throttle like the other routes.
    if (!rateLimit(`knowledge-delete:${clientKey(request)}`, 20, 60 * 1000)) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a minute and try again.' },
        { status: 429 },
      );
    }

    const { id } = await params;
    if (!(await deleteDocument(id))) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Document deleted successfully' });
  } catch (error: unknown) {
    console.error('Delete document error:', error);
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
  }
}
