import { supabaseAdmin } from "../_shared/supabase.ts";
import { embedQuery } from "../_shared/voyage.ts";

// search-chunks — the search-quality sandbox backend (Phase 7).
//
// Embeds a query with Voyage (input_type="query") and runs the match_chunks
// vector search. Lives in Supabase (not the Next app) so VOYAGE_API_KEY stays an
// edge-function secret and the Voyage client (_shared/voyage.ts) is reused.
//
// In:  { query: string, matchCount?: number, filter?: object }
// Out: { results: [{ chunkId, documentId, content, metadata, similarity }] }

const DEFAULT_MATCH_COUNT = 10;
const MAX_MATCH_COUNT = 50;

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const query = typeof body.query === "string" ? body.query.trim() : "";
    if (!query) return json({ error: "query is required" }, 400);

    const matchCount = clampCount(body.matchCount);
    const filter = body.filter && typeof body.filter === "object" ? body.filter : {};

    // Embed the query, then vector-search. match_chunks takes vector(1024); pass
    // the embedding in pgvector's text form "[...]" so PostgREST binds it cleanly.
    const embedding = await embedQuery(query);
    const { data, error } = await supabaseAdmin.rpc("match_chunks", {
      query_embedding: JSON.stringify(embedding),
      match_count: matchCount,
      filter,
    });
    if (error) throw new Error(`match_chunks failed: ${error.message}`);

    const results = (data ?? []).map((r: Record<string, unknown>) => ({
      chunkId: r.chunk_id,
      documentId: r.document_id,
      content: r.content,
      metadata: r.metadata,
      similarity: r.similarity,
    }));
    return json({ results }, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("search-chunks failed:", message);
    return json({ error: message }, 500);
  }
});

function clampCount(raw: unknown): number {
  const n = typeof raw === "number" && Number.isFinite(raw) ? Math.floor(raw) : DEFAULT_MATCH_COUNT;
  return Math.min(Math.max(1, n), MAX_MATCH_COUNT);
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
