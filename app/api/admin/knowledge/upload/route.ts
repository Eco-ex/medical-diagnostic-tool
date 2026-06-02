import { NextResponse, after } from 'next/server';
import { clientKey, rateLimit } from '@/lib/server/rate-limit';
import { ingestPdf, triggerParse, isPreset, type Preset } from '@/lib/server/knowledge';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs'; // node:crypto (SHA-256 in ingestPdf) + large request bodies
export const maxDuration = 120; // headroom: a 50MB upload over a slow link + storage I/O

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB
const PDF_MAGIC = '%PDF-';

/**
 * POST /api/admin/knowledge/upload
 *
 * Browser-facing entry point to the knowledge ingestion pipeline. Accepts a
 * multipart form with a `file` (PDF) and optional `preset`, stores the PDF, and
 * starts parse -> chunk -> embed -> finalize. Returns immediately; the caller
 * polls documents.status to track progress.
 *
 * Responses:
 *   201 { documentId, status: 'uploaded', deduped: false }  - new upload (pipeline started)
 *   200 { documentId, status, deduped: true }               - identical PDF seen before
 *   400/413/415/429/500 { error }
 */
export async function POST(request: Request) {
  try {
    // --- Authorization -------------------------------------------------------
    // TODO(auth): this is an ADMIN-only operation, but the app currently ships
    // with no authentication (README: "no accounts, no login"); the
    // profiles.role enum exists but is never populated. When Supabase Auth lands,
    // gate this on an authenticated user with profiles.role = 'admin' and set
    // documents.uploaded_by to their id. Until then, abuse rate-limiting is the
    // only real protection.
    if (!rateLimit(`knowledge-upload:${clientKey(request)}`, 20, 60 * 1000)) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a minute and try again.' },
        { status: 429 },
      );
    }

    // --- Parse multipart form ------------------------------------------------
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return NextResponse.json(
        { error: 'Expected multipart/form-data with a "file" field.' },
        { status: 400 },
      );
    }

    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }
    if (file.name.length > 255) {
      return NextResponse.json(
        { error: 'Filename is too long (max 255 characters).' },
        { status: 400 },
      );
    }

    // --- Validate preset (default to research_paper when omitted) ------------
    const rawPreset = form.get('preset');
    const presetValue =
      typeof rawPreset === 'string' && rawPreset !== '' ? rawPreset : 'research_paper';
    if (!isPreset(presetValue)) {
      return NextResponse.json(
        { error: 'Invalid preset. Use research_paper, clinical_guideline, or case_report.' },
        { status: 400 },
      );
    }
    const preset: Preset = presetValue;

    // --- Validate size (reject before buffering huge bodies) -----------------
    if (file.size === 0) {
      return NextResponse.json({ error: 'File is empty.' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `File exceeds the ${MAX_BYTES / (1024 * 1024)}MB limit.` },
        { status: 413 },
      );
    }

    // --- Read body + verify it is actually a PDF -----------------------------
    // App Router route handlers stream the request, so there is no Next-level body
    // cap to configure (the Pages-Router `bodyParser` knob does NOT apply here);
    // the only ceiling is the host platform's request limit. We rejected oversize
    // via file.size above; re-check the actual byte length as the source of truth.
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes.length > MAX_BYTES) {
      return NextResponse.json(
        { error: `File exceeds the ${MAX_BYTES / (1024 * 1024)}MB limit.` },
        { status: 413 },
      );
    }

    const declaredPdf =
      file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!declaredPdf) {
      return NextResponse.json(
        { error: 'Only PDF files are accepted (expected application/pdf or a .pdf file).' },
        { status: 415 },
      );
    }
    const magicPdf = new TextDecoder().decode(bytes.subarray(0, 5)) === PDF_MAGIC;
    if (!magicPdf) {
      return NextResponse.json(
        { error: 'File is not a valid PDF (missing %PDF header).' },
        { status: 415 },
      );
    }

    // --- Ingest (size_bytes from the actual bytes, not the declared size) -----
    const result = await ingestPdf({
      bytes,
      filename: file.name,
      sizeBytes: bytes.length,
      preset,
    });

    // Start the pipeline only for genuinely new documents. after() runs once the
    // response is flushed, so the browser never waits on LlamaParse and the
    // dispatch survives serverless teardown.
    if (!result.deduped) {
      after(() => triggerParse(result.documentId));
    }

    return NextResponse.json(result, { status: result.deduped ? 200 : 201 });
  } catch (error: unknown) {
    console.error('Knowledge upload error:', error);
    const body: { error: string; detail?: string } = { error: 'Failed to upload document.' };
    if (process.env.NODE_ENV !== 'production') {
      body.detail = error instanceof Error ? error.message : String(error);
    }
    return NextResponse.json(body, { status: 500 });
  }
}
