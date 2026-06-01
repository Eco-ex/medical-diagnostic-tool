import { supabaseAdmin } from "../_shared/supabase.ts";
import { setStatus, invokeFunction } from "../_shared/db.ts";
import { embedDocuments, EMBED_DIM, EMBED_MODEL } from "../_shared/voyage.ts";

// Supabase Edge Functions inject this global; declare it locally so TS compiles.
declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void };

Deno.serve(async (req) => {
  let documentId: string | undefined;
  let jobId: string | undefined;
  let jobAttempts = 0;
  let claimed = false;

  try {
    const body = await req.json().catch(() => ({}));
    documentId = body.documentId;
    jobId = body.jobId;
    const chunkIds: string[] = Array.isArray(body.chunkIds) ? body.chunkIds : [];

    if (!documentId) return json({ error: "documentId is required" }, 400);
    if (chunkIds.length === 0) return json({ error: "chunkIds must be a non-empty array" }, 400);

    // jobId is normally supplied by chunk-document; tolerate its absence
    // (future dispatcher / manual replay) by looking the job up.
    if (!jobId) jobId = await findJobId(documentId, chunkIds);

    // Claim the job with a single-winner guard. A transient DB error during the
    // claim means we never started — return 500 and leave the row 'pending' for
    // a re-run rather than terminally failing the document.
    if (jobId) {
      let claim: { attempts: number } | null;
      try {
        claim = await claimJob(jobId);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`embed-batch claim failed for ${documentId} (job ${jobId}):`, msg);
        return json({ ok: false, error: `claim failed: ${msg}` }, 500);
      }
      // Not pending → another invocation already owns it (fan-out double-delivery
      // or retry overlap). Skip to avoid wasted Voyage spend; embedding is
      // idempotent anyway.
      if (!claim) return json({ ok: true, skipped: "job not pending (already claimed/done)" }, 200);
      jobAttempts = claim.attempts;
      claimed = true;
    }

    await setStatus(documentId, "embedding");

    // Load chunk content + token counts. SELECT ... IN (...) does not preserve
    // chunkIds order, so re-order in JS and fail loudly on any missing chunk
    // (e.g. deleted between enqueue and embed).
    const { data: chunkRows, error: selErr } = await supabaseAdmin
      .from("chunks").select("id, content, token_count").in("id", chunkIds);
    if (selErr) throw new Error(`Failed to load chunks: ${selErr.message}`);

    const byId = new Map((chunkRows ?? []).map((r) => [r.id as string, r]));
    const orderedTexts: string[] = [];
    const orderedTokens: (number | null)[] = [];
    for (const id of chunkIds) {
      const row = byId.get(id);
      if (!row) throw new Error(`Chunk ${id} not found`);
      orderedTexts.push(row.content as string);
      orderedTokens.push((row.token_count as number | null) ?? null);
    }

    // Embed (retries 429/5xx/network internally, splits by token budget), then
    // verify dimensions so a schema/model mismatch surfaces here, not at the DB.
    const embeddings = await embedDocuments(orderedTexts, orderedTokens);
    for (const v of embeddings) {
      if (v.length !== EMBED_DIM) {
        throw new Error(`Voyage returned ${v.length}-dim vector, expected ${EMBED_DIM}`);
      }
    }

    // Single atomic INSERT ... ON CONFLICT (chunk_id) DO UPDATE. Idempotent on
    // retry. Write model explicitly rather than relying on the column default.
    const rows = chunkIds.map((id, i) => ({
      chunk_id: id,
      model: EMBED_MODEL,
      embedding: embeddings[i],
    }));
    const { error: upErr } = await supabaseAdmin
      .from("chunk_embeddings").upsert(rows, { onConflict: "chunk_id" });
    if (upErr) throw new Error(`Embedding upsert failed: ${upErr.message}`);

    // Mark the job done AFTER embeddings are persisted — the ordering is the
    // correctness guarantee (a crash leaves embeddings written but job not done,
    // which a retry harmlessly re-writes; the reverse could fire finalize early).
    if (jobId) {
      const { error: doneErr } = await supabaseAdmin.from("ingestion_jobs")
        .update({ status: "done", completed_at: nowIso() })
        .eq("id", jobId).eq("status", "in_flight");
      if (doneErr) throw new Error(`Failed to mark job done: ${doneErr.message}`);
      await checkLastBatchAndFinalize(documentId);
    }

    return json({ ok: true, embedded: chunkIds.length }, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`embed-batch failed for ${documentId} (job ${jobId}):`, message);

    // Settle the job we own as failed, then let finalize-document make the
    // document-level verdict (indexed vs embed_failed) after observing which
    // chunks actually have embeddings. embed-batch never sets the document to
    // embed_failed itself — that belongs to finalize (Phase 4d). Running the
    // last-batch check here ensures finalize still fires when the failing batch
    // is the last one outstanding.
    if (jobId && claimed && documentId) {
      await markJobFailed(jobId, jobAttempts + 1, message);
      await checkLastBatchAndFinalize(documentId);
    }
    return json({ ok: false, error: message }, 500);
  }
});

// Claim a pending job: flip to in_flight, stamp started_at, return its attempt
// count. Returns null if the row is not 'pending' (already claimed/done).
async function claimJob(jobId: string): Promise<{ attempts: number } | null> {
  const { data, error } = await supabaseAdmin
    .from("ingestion_jobs")
    .update({ status: "in_flight", started_at: nowIso() })
    .eq("id", jobId).eq("status", "pending")
    .select("attempts")
    .maybeSingle();
  if (error) throw new Error(`Failed to claim job ${jobId}: ${error.message}`);
  return data ? { attempts: data.attempts as number } : null;
}

// Settle a job we own (in_flight) as failed. Best-effort: logs instead of
// throwing so the original error is what the caller returns. The in_flight guard
// means we never clobber a row owned by another invocation.
async function markJobFailed(jobId: string, attempts: number, message: string): Promise<void> {
  try {
    const { error } = await supabaseAdmin.from("ingestion_jobs")
      .update({ status: "failed", attempts, last_error: message, completed_at: nowIso() })
      .eq("id", jobId).eq("status", "in_flight");
    if (error) console.error(`Failed to mark job ${jobId} failed:`, error.message);
  } catch (e) {
    console.error(`Failed to mark job ${jobId} failed:`, e instanceof Error ? e.message : String(e));
  }
}

// If no embed_batch jobs remain in progress for the document, hand off to
// finalize-document. Counts only 'pending'/'in_flight' (settled done/failed/dead
// don't block) and runs after this job is settled, so the last batch to finish —
// success or failure — triggers exactly one finalize (at-least-once; finalize is
// idempotent in Phase 4d). A job-less fallback invocation never gets here.
async function checkLastBatchAndFinalize(documentId: string): Promise<void> {
  const { count, error } = await supabaseAdmin
    .from("ingestion_jobs")
    .select("id", { count: "exact", head: true })
    .eq("document_id", documentId)
    .eq("job_type", "embed_batch")
    .in("status", ["pending", "in_flight"]);
  if (error) {
    console.error(`Last-batch count failed for ${documentId}:`, error.message);
    return;
  }
  if ((count ?? 0) === 0) {
    EdgeRuntime.waitUntil(
      invokeFunction("finalize-document", { documentId })
        .catch((e) => console.error(`finalize-document invoke failed for ${documentId}:`, e)),
    );
  }
}

// Fallback job lookup when jobId is not supplied. Matches on the jsonb payload
// containing this batch's chunkIds (batches are disjoint, so this is unique).
async function findJobId(documentId: string, chunkIds: string[]): Promise<string | undefined> {
  const { data, error } = await supabaseAdmin
    .from("ingestion_jobs")
    .select("id")
    .eq("document_id", documentId)
    .eq("job_type", "embed_batch")
    .contains("payload", { chunkIds })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error(`findJobId lookup failed for ${documentId}:`, error.message);
    return undefined;
  }
  return data?.id as string | undefined;
}

function nowIso(): string {
  return new Date().toISOString();
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
