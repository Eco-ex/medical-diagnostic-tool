import { createHash } from 'node:crypto';
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

// Mirrors the documents.preset CHECK constraint (migration 20260525173719).
export const PRESETS = ['research_paper', 'clinical_guideline', 'case_report'] as const;
export type Preset = (typeof PRESETS)[number];

export function isPreset(value: unknown): value is Preset {
  return typeof value === 'string' && (PRESETS as readonly string[]).includes(value);
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
