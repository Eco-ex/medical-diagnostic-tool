import { createHash } from 'node:crypto';
import {
  KNOWLEDGE_PRESETS,
  type DocumentSummary,
  type KnowledgePreset,
  type SearchResult,
} from '../../types';
import { supabase } from './supabase';

/* ============================================================================
 * Knowledge ingestion — server seam for the admin upload route.
 *
 * Productionizes what planning_development/smoke-test.mjs did by hand: hash a PDF
 * for content-dedupe, store it in the `knowledge` bucket, insert a `documents`
 * row, and (via the route) kick off the parse -> chunk -> embed -> finalize Edge
 * Function pipeline. The single seam between the upload route and Supabase
 * Storage / Postgres, mirroring how lib/server/database.ts fronts patient data.
 * ========================================================================= */

// Storage bucket the ingestion Edge Functions read from (parse-document,
// chunk-document). Keep in sync with supabase/functions/*/index.ts.
export const KNOWLEDGE_BUCKET = 'knowledge';

// Preset values mirror the documents.preset CHECK constraint; the canonical list
// lives in types.ts (KNOWLEDGE_PRESETS) so client code can share it.
export type Preset = KnowledgePreset;

export function isPreset(value: unknown): value is Preset {
  return typeof value === 'string' && (KNOWLEDGE_PRESETS as readonly string[]).includes(value);
}

export interface IngestInput {
  bytes: Uint8Array;
  filename: string;
  sizeBytes: number;
  preset: Preset;
}

export interface IngestResult {
  documentId: string;
  /** The document's current documents.status: 'uploaded' for a new upload, or the
   *  existing document's status when deduped. Always a real status enum value. */
  status: string;
  deduped: boolean;
}

/** SHA-256 of the file bytes as lowercase hex — the content address for dedupe. */
function sha256Hex(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

async function findBySha(sha256: string): Promise<{ id: string; status: string } | null> {
  const { data, error } = await supabase
    .from('documents')
    .select('id, status')
    .eq('sha256', sha256)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

/**
 * Ingests a PDF into the knowledge pipeline: hash -> dedupe -> upload to Storage
 * -> insert the documents row. Idempotent on file content — identical bytes reuse
 * the existing document instead of re-uploading or re-processing.
 *
 * Does NOT trigger parse-document; the route does that via Next's after() so the
 * fire-and-forget dispatch outlives the HTTP response. Returns deduped=false for
 * a freshly created row (caller should trigger parsing) and deduped=true for a
 * pre-existing one (caller should not).
 */
export async function ingestPdf(input: IngestInput): Promise<IngestResult> {
  const sha256 = sha256Hex(input.bytes);

  // Same content already known -> return it untouched. Dedupe is eventual: two
  // identical uploads can both pass this check, but the sha256 unique index lets
  // the loser recover the winner's row on the 23505 path below.
  const existing = await findBySha(sha256);
  if (existing) return { documentId: existing.id, status: existing.status, deduped: true };

  const id = crypto.randomUUID();
  const sourcePath = `pdf/${id}.pdf`;

  const { error: upErr } = await supabase.storage
    .from(KNOWLEDGE_BUCKET)
    .upload(sourcePath, input.bytes, { contentType: 'application/pdf' });
  if (upErr) throw new Error(`Storage upload failed: ${upErr.message}`);

  // uploaded_by is intentionally omitted (left null): it's an FK to auth.users and
  // the app has no auth yet. See the route's TODO(auth). status/mime_type/metadata
  // have DB defaults but are written explicitly for intent.
  const { error: insErr } = await supabase.from('documents').insert({
    id,
    filename: input.filename,
    mime_type: 'application/pdf',
    size_bytes: input.sizeBytes,
    sha256,
    source_path: sourcePath,
    preset: input.preset,
    status: 'uploaded',
  });

  if (insErr) {
    // Don't leave the just-uploaded object orphaned if the row didn't land. Log
    // (don't swallow) cleanup failures — a residual object is recoverable, but we
    // want it visible. No periodic sweep exists yet; that's a v2 follow-up.
    await supabase.storage
      .from(KNOWLEDGE_BUCKET)
      .remove([sourcePath])
      .catch((e) => console.error(`Failed to clean up orphan ${sourcePath}:`, e));
    // 23505 = lost a dedupe race against the sha256 unique index: return the winner.
    if (insErr.code === '23505') {
      const winner = await findBySha(sha256);
      if (winner) return { documentId: winner.id, status: winner.status, deduped: true };
    }
    throw new Error(`Document insert failed: ${insErr.message}`);
  }

  // status mirrors the row we just inserted ('uploaded'); the caller starts the
  // pipeline (which flips it to 'parsing') after the response is sent.
  return { documentId: id, status: 'uploaded', deduped: false };
}

/**
 * Fires the ingestion pipeline for a freshly-uploaded document. Best-effort: logs
 * on failure instead of throwing, since it runs after the HTTP response is sent.
 * parse-document chains chunk -> embed -> finalize itself, so this one call starts
 * the whole pipeline.
 */
export async function triggerParse(documentId: string): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('parse-document', {
      body: { documentId },
    });
    if (error) {
      console.error(`parse-document invoke failed for ${documentId}:`, error.message);
    }
  } catch (e) {
    console.error(`parse-document invoke threw for ${documentId}:`, e);
  }
}

// ---- Admin document management (Phase 7) ----------------------------------

const DOCUMENT_LIST_COLUMNS =
  'id, filename, status, preset, chunk_count, size_bytes, error_message, created_at, updated_at';

/** Lists all documents, newest first, mapped to the client-facing summary shape. */
export async function listDocuments(): Promise<DocumentSummary[]> {
  const { data, error } = await supabase
    .from('documents')
    .select(DOCUMENT_LIST_COLUMNS)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    filename: r.filename as string,
    status: r.status as DocumentSummary['status'],
    preset: r.preset as DocumentSummary['preset'],
    chunkCount: (r.chunk_count as number | null) ?? null,
    sizeBytes: (r.size_bytes as number | null) ?? null,
    errorMessage: (r.error_message as string | null) ?? null,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  }));
}

/**
 * Deletes a document and its derived data. The documents-row delete cascades to
 * chunks -> chunk_embeddings and to ingestion_jobs via FKs; Storage objects have
 * no FK, so the PDF and markdown are removed explicitly (best-effort). Returns
 * false if the document does not exist.
 */
export async function deleteDocument(id: string): Promise<boolean> {
  const { data: doc, error: selErr } = await supabase
    .from('documents')
    .select('source_path, markdown_path')
    .eq('id', id)
    .maybeSingle();
  if (selErr) throw selErr;
  if (!doc) return false;

  const { data, error } = await supabase.from('documents').delete().eq('id', id).select('id');
  if (error) throw error;
  if (!data || data.length === 0) return false;

  const paths = [doc.source_path, doc.markdown_path].filter(
    (p): p is string => typeof p === 'string' && p.length > 0,
  );
  if (paths.length > 0) {
    const { error: rmErr } = await supabase.storage.from(KNOWLEDGE_BUCKET).remove(paths);
    if (rmErr) console.error(`Storage cleanup failed for document ${id}:`, rmErr.message);
  }
  return true;
}

// Statuses a document can be reindexed from — i.e. the pipeline is not running.
const TERMINAL_DOC_STATUSES = [
  'indexed',
  'parse_failed',
  'chunk_failed',
  'embed_failed',
  'archived',
];

export type ReindexResult = 'reindexed' | 'not_found' | 'busy';

/**
 * Resets a document to re-run the full ingestion pipeline. Only fires from a
 * terminal status (guarded UPDATE) so a reindex cannot race an in-flight pipeline
 * — returns 'busy' if the document is still processing, 'not_found' if it's gone.
 * On success it clears the derived fields, deletes stale chunks (so search won't
 * return the old revision mid-reprocess), and the caller re-invokes parse-document.
 */
export async function reindexDocument(id: string): Promise<ReindexResult> {
  const { data, error } = await supabase
    .from('documents')
    .update({ status: 'uploaded', error_message: null, chunk_count: null })
    .eq('id', id)
    .in('status', TERMINAL_DOC_STATUSES)
    .select('id');
  if (error) throw error;

  if (data && data.length > 0) {
    // Clear stale chunks immediately (chunk-document also clears them idempotently).
    const { error: delErr } = await supabase.from('chunks').delete().eq('document_id', id);
    if (delErr) console.error(`Failed clearing chunks on reindex for ${id}:`, delErr.message);
    return 'reindexed';
  }

  // No row matched the guard: distinguish a missing document from a busy one.
  const { data: existing, error: exErr } = await supabase
    .from('documents')
    .select('id')
    .eq('id', id)
    .maybeSingle();
  if (exErr) throw exErr;
  return existing ? 'busy' : 'not_found';
}

/**
 * Runs the search-quality sandbox: invokes the search-chunks edge function, which
 * embeds the query with Voyage (input_type="query") and runs match_chunks.
 */
export async function searchKnowledge(query: string, matchCount = 10): Promise<SearchResult[]> {
  const { data, error } = await supabase.functions.invoke('search-chunks', {
    body: { query, matchCount },
  });
  // Surface failures loudly. supabase-js sets `error` for non-2xx, but defensively
  // also check for an { error } body so a Voyage/match_chunks failure never gets
  // silently flattened into an empty result set.
  if (error) throw new Error(`search-chunks failed: ${error.message}`);
  if (data && typeof data === 'object' && 'error' in data && data.error) {
    throw new Error(`search-chunks failed: ${String((data as { error: unknown }).error)}`);
  }
  const results = (data as { results?: unknown } | null)?.results;
  if (!Array.isArray(results)) {
    throw new Error('search-chunks returned an unexpected response');
  }
  return results as SearchResult[];
}
