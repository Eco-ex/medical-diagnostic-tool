import { supabaseAdmin } from "../_shared/supabase.ts";

// finalize-document — Phase 4d. The terminal step of the ingestion pipeline.
//
// Invoked by embed-batch once no embed_batch jobs remain in progress for a
// document. Verifies that every chunk has an embedding, then flips the document
// to 'indexed' (or 'embed_failed' on a count mismatch).
//
// Idempotency is the core requirement: embed-batch's last-batch check is
// at-least-once (two near-simultaneous batches can both see "0 remaining"), so
// this function may run more than once for the same document. The status-guarded
// UPDATE below makes the second run a no-op.

Deno.serve(async (req) => {
  let documentId: string | undefined;
  try {
    const body = await req.json().catch(() => ({}));
    documentId = body.documentId;
    if (!documentId) return json({ error: "documentId is required" }, 400);

    // 1. Integrity counts.
    const chunksTotal = await countChunks(documentId);
    const embeddingsTotal = await countEmbeddedChunks(documentId);
    const jobsInProgress = await countJobsInProgress(documentId);

    // 2. Batches still running — leave the document untouched and let the last
    //    one to settle retrigger us. "In progress" = pending/in_flight, matching
    //    embed-batch's own last-batch check. A 'failed'/'dead' job is settled,
    //    NOT unfinished, so it must fall through to the count check below so the
    //    document can still reach 'embed_failed'.
    if (jobsInProgress > 0) {
      console.warn(
        `finalize-document: ${documentId} still has ${jobsInProgress} embed_batch job(s) in progress; skipping`,
      );
      return json({ ok: true, skipped: "embed_batch jobs still in progress" }, 200);
    }

    // 3. All batches settled but an embedding is missing (or there are no chunks
    //    at all) → terminal failure. Don't shortcut by trusting only the chunk
    //    count: a masked rate-limit failure leaves chunks without embeddings, and
    //    chunk_count would lie.
    if (chunksTotal === 0 || chunksTotal !== embeddingsTotal) {
      const msg = `Embedding incomplete: ${embeddingsTotal}/${chunksTotal} chunks embedded`;
      await guardedUpdate(documentId, { status: "embed_failed", error_message: msg });
      console.error(`finalize-document: ${documentId} -> embed_failed (${msg})`);
      return json({ ok: false, error: msg, chunksTotal, embeddingsTotal }, 200);
    }

    // 4. Every chunk embedded → indexed. The status guard means a second,
    //    racing finalize call updates zero rows and is reported as a no-op.
    const updated = await guardedUpdate(documentId, {
      status: "indexed",
      chunk_count: chunksTotal,
      error_message: null,
    });
    if (!updated) {
      return json({ ok: true, skipped: "document already finalized", chunksTotal }, 200);
    }
    return json({ ok: true, status: "indexed", chunkCount: chunksTotal }, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`finalize-document failed for ${documentId}:`, message);
    return json({ ok: false, error: message }, 500);
  }
});

// Count chunks belonging to the document.
async function countChunks(documentId: string): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from("chunks")
    .select("id", { count: "exact", head: true })
    .eq("document_id", documentId);
  if (error) throw new Error(`Failed counting chunks: ${error.message}`);
  return count ?? 0;
}

// Count the document's chunks that have an embedding. Starting from `chunks` lets
// us filter on its own `document_id`; the `chunk_embeddings!inner` embed makes it
// a JOIN that drops any chunk without an embedding. Since chunk_embeddings.chunk_id
// is unique (one embedding per chunk), this equals the embedding count. `head` +
// `count: exact` ships only the count, never the rows.
async function countEmbeddedChunks(documentId: string): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from("chunks")
    .select("id, chunk_embeddings!inner(chunk_id)", { count: "exact", head: true })
    .eq("document_id", documentId);
  if (error) throw new Error(`Failed counting embeddings: ${error.message}`);
  return count ?? 0;
}

// Count embed_batch jobs still in progress (pending or in_flight). Settled jobs
// (done/failed/dead) do not block finalization.
async function countJobsInProgress(documentId: string): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from("ingestion_jobs")
    .select("id", { count: "exact", head: true })
    .eq("document_id", documentId)
    .eq("job_type", "embed_batch")
    .in("status", ["pending", "in_flight"]);
  if (error) throw new Error(`Failed counting jobs: ${error.message}`);
  return count ?? 0;
}

// Apply a terminal state transition, guarded so it only fires from a non-terminal
// state ('chunked'/'embedding'). Returns true if a row actually changed — a
// racing concurrent call (or a re-run against an already-finalized document)
// updates zero rows and returns false.
async function guardedUpdate(
  documentId: string,
  patch: Record<string, unknown>,
): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("documents")
    .update(patch)
    .eq("id", documentId)
    .in("status", ["chunked", "embedding"])
    .select("id");
  if (error) throw new Error(`Failed to update document status: ${error.message}`);
  return !!data && data.length > 0;
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
