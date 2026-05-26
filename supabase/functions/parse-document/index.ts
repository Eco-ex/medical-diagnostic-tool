import { supabaseAdmin } from "../_shared/supabase.ts";
import { getDocument, setStatus, invokeFunction } from "../_shared/db.ts";
import { uploadFile, submitParse, pollUntilDone } from "../_shared/llama.ts";

// Supabase Edge Functions inject this global; declare it locally so TS compiles.
declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void };

const STORAGE_BUCKET = "knowledge";

const PRESET_PROMPTS: Record<string, string> = {
  research_paper:
    "A medical research paper is being processed. Preserve section headings, " +
    "tables, and inline citation markers. Do not include images, captions, " +
    "or page numbers. Exclude figure-only content (e.g. 'Figure 1.', 'Figure 2.').",
  clinical_guideline:
    "A clinical guideline is being processed. Preserve heading hierarchy, " +
    "numbered recommendations, and tables. Do not include images or page numbers.",
  case_report:
    "A medical case report is being processed. Preserve section headings, " +
    "patient timelines, lab values, and tables. Do not include images " +
    "or figure captions.",
};

Deno.serve(async (req) => {
  let documentId: string | undefined;
  try {
    const body = await req.json().catch(() => ({}));
    documentId = body.documentId;
    if (!documentId) {
      return json({ error: "documentId is required" }, 400);
    }

    await setStatus(documentId, "parsing");
    const doc = await getDocument(documentId);

    // 1. Download PDF from Storage
    const { data: pdfBlob, error: dlErr } = await supabaseAdmin
      .storage.from(STORAGE_BUCKET).download(doc.source_path);
    if (dlErr || !pdfBlob) {
      throw new Error(`Storage download failed: ${dlErr?.message ?? "no blob"}`);
    }

    // 2. Upload file (v1) then submit parse (v2 — JSON body with file_id)
    const customPrompt = PRESET_PROMPTS[doc.preset] ?? PRESET_PROMPTS.research_paper;
    const fileId = await uploadFile(pdfBlob, doc.filename);
    const jobId = await submitParse(fileId, { customPrompt });

    // 3. Poll until LlamaParse finishes (4-min budget; Pro plan gives ~6.6m headroom)
    const markdown = await pollUntilDone(jobId, { timeoutMs: 240_000 });
    if (!markdown.trim()) throw new Error("LlamaParse returned empty markdown");

    // 4. Save markdown back to Storage
    const mdPath = `markdown/${documentId}.md`;
    const { error: upErr } = await supabaseAdmin
      .storage.from(STORAGE_BUCKET)
      .upload(mdPath, markdown, { contentType: "text/markdown", upsert: true });
    if (upErr) throw new Error(`Storage upload failed: ${upErr.message}`);

    // 5. Mark parsed + hand off to chunking (fire-and-forget via waitUntil)
    await setStatus(documentId, "parsed", {
      markdown_path: mdPath,
      llama_file_id: fileId,
      llama_job_id: jobId,
    });
    EdgeRuntime.waitUntil(invokeFunction("chunk-document", { documentId }));

    return json({ ok: true, markdownPath: mdPath, jobId }, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`parse-document failed for ${documentId}:`, message);
    if (documentId) {
      await setStatus(documentId, "parse_failed", { error_message: message })
        .catch((e) => console.error("Failed to record parse_failed:", e));
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
