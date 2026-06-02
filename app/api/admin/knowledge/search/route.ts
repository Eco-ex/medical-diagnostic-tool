import { NextResponse } from 'next/server';
import { clientKey, rateLimit } from '@/lib/server/rate-limit';
import { searchKnowledge } from '@/lib/server/knowledge';

export const dynamic = 'force-dynamic';

const MAX_MATCH_COUNT = 50;

/**
 * POST /api/admin/knowledge/search
 *
 * Search-quality sandbox: embeds the query (via the search-chunks edge function)
 * and returns the top matching chunks with similarity scores. Rate-limited since
 * each call spends Voyage credits.
 *
 * Body: { query: string, matchCount?: number }
 * 200:  { results: SearchResult[] }
 */
export async function POST(request: Request) {
  try {
    if (!rateLimit(`knowledge-search:${clientKey(request)}`, 30, 60 * 1000)) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a minute and try again.' },
        { status: 429 },
      );
    }

    const body = (await request.json().catch(() => null)) as
      | { query?: unknown; matchCount?: unknown }
      | null;
    const query = typeof body?.query === 'string' ? body.query.trim() : '';
    if (!query) {
      return NextResponse.json({ error: 'A search query is required' }, { status: 400 });
    }
    const matchCount =
      typeof body?.matchCount === 'number' && Number.isFinite(body.matchCount)
        ? Math.min(Math.max(1, Math.floor(body.matchCount)), MAX_MATCH_COUNT)
        : 10;

    const results = await searchKnowledge(query, matchCount);
    return NextResponse.json({ results });
  } catch (error: unknown) {
    console.error('Knowledge search error:', error);
    return NextResponse.json({ error: 'Failed to run search' }, { status: 500 });
  }
}
