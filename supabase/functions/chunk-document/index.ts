import { supabaseAdmin } from "../_shared/supabase.ts";
import { getDocument, setStatus, enqueueJob, invokeFunction } from "../_shared/db.ts";
import { buildChunks } from "./chunk.ts";

// Supabase Edge Functions inject this global; declare it locally so TS compiles.
declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void };

const STORAGE_BUCKET = "knowledge";
const EMBED_BATCH_SIZE = 64; // keeps each embed-batch invocation < 30s

Deno.serve(async (req) => {
  let documentId: string | undefined;
  try {
    const body = await req.json().catch(() => ({}));
    documentId = body.documentId;
    if (!documentId) {
      return json({ error: "documentId is required" }, 400);
    }

    await setStatus(documentId, "chunking");
    const doc = await getDocument(documentId);

    // 1. Download markdown from Storage.
    const mdPath = doc.markdown_path ?? `markdown/${documentId}.md`;
    const { data: blob, error: dlErr } = await supabaseAdmin
      .storage.from(STORAGE_BUCKET).download(mdPath);
    if (dlErr || !blob) {
      throw new Error(`Storage download failed: ${dlErr?.message ?? "no blob"}`);
    }
    const markdown = await blob.text();
    if (!markdown.trim()) throw new Error("Markdown file is empty");

    // 2-7. Section-split, tokenize, apply size policy, preserve atomic units.
    const chunks = buildChunks(markdown);
    if (chunks.length === 0) throw new Error("Chunking produced 0 chunks");

    // Idempotency: clear any prior chunks (cascades to chunk_embeddings) and
    // stale embed_batch jobs so a re-run never duplicates.
    const { error: delChunksErr } = await supabaseAdmin
      .from("chunks").delete().eq("document_id", documentId);
    if (delChunksErr) throw new Error(`Failed clearing old chunks: ${delChunksErr.message}`);
    const { error: delJobsErr } = await supabaseAdmin
      .from("ingestion_jobs").delete()
      .eq("document_id", documentId).eq("job_type", "embed_batch");
    if (delJobsErr) throw new Error(`Failed clearing old embed jobs: ${delJobsErr.message}`);

    // 8. Bulk insert all chunk rows (metadata inherited from the document).
    const rows = chunks.map((c, i) => ({
      document_id: documentId,
      chunk_index: i,
      section_path: c.section_path || null,
      section_heading: c.section_heading,
      content: c.content,
      token_count: c.token_count,
      metadata: doc.metadata ?? {},
    }));
    const { data: inserted, error: insErr } = await supabaseAdmin
      .from("chunks").insert(rows).select("id, chunk_index");
    if (insErr) throw new Error(`Chunk insert failed: ${insErr.message}`);

    // Order ids by chunk_index — INSERT...RETURNING order isn't guaranteed.
    const orderedIds = (inserted ?? [])
      .sort((a, b) => a.chunk_index - b.chunk_index)
      .map((r) => r.id as string);

    // 9. Group into batches of 64 and enqueue one embed_batch job per batch.
    const batches: string[][] = [];
    for (let i = 0; i < orderedIds.length; i += EMBED_BATCH_SIZE) {
      batches.push(orderedIds.slice(i, i + EMBED_BATCH_SIZE));
    }
    const jobs: { chunkIds: string[]; jobId: string }[] = [];
    for (const chunkIds of batches) {
      const jobId = await enqueueJob("embed_batch", documentId, { documentId, chunkIds });
      jobs.push({ chunkIds, jobId });
    }

    // 10. Mark chunked.
    await setStatus(documentId, "chunked");

    // 11. Fan out embed-batch invocations in parallel (fire-and-forget).
    EdgeRuntime.waitUntil(
      Promise.all(jobs.map((b) =>
        invokeFunction("embed-batch", { documentId, chunkIds: b.chunkIds, jobId: b.jobId })
          .catch((e) => console.error(`embed-batch invoke failed (job ${b.jobId}):`, e))
      )),
    );

    return json({ ok: true, chunkCount: chunks.length, batchCount: batches.length }, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`chunk-document failed for ${documentId}:`, message);
    if (documentId) {
      await setStatus(documentId, "chunk_failed", { error_message: message })
        .catch((e) => console.error("Failed to record chunk_failed:", e));
    }
    return json({ ok: false, error: message }, 500);
  }
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
