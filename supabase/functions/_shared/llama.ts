// LlamaCloud v2 client.
// File upload still uses /api/v1/files (v2 hasn't replaced it). Parse submission
// and polling moved to /api/v2/parse. Migration guide:
// https://developers.llamaindex.ai/llamaparse/parse/guides/migration-v1-to-v2/

const LLAMA_KEY  = Deno.env.get("LLAMA_CLOUD_API_KEY")!;
const LLAMA_BASE = Deno.env.get("LLAMA_CLOUD_BASE_URL")
  ?? "https://api.cloud.eu.llamaindex.ai";

if (!LLAMA_KEY) throw new Error("LLAMA_CLOUD_API_KEY is not set");

const AUTH = { Authorization: `Bearer ${LLAMA_KEY}` };
const AUTH_JSON = { ...AUTH, "Content-Type": "application/json" };

// v2 status values. Note: COMPLETED (not SUCCESS), FAILED (not ERROR).
type JobStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";

interface PresignedRef {
  presigned_url?: string;
  url?: string;
  size_bytes?: number;
  exists?: boolean;
}

interface V2Job {
  id: string;
  status: JobStatus;
  error_message?: string;
  error_code?: string;
}

interface V2Response {
  job: V2Job;
  // Empirically, expand values like `markdown` / `markdown_full` /
  // `*_content_metadata` all surface as files referenced here. Despite docs
  // suggesting inline content, the EU agentic tier returns presigned URLs only.
  result_content_metadata?: {
    markdown?: PresignedRef;
    markdown_full?: PresignedRef;
    text?: PresignedRef;
    text_full?: PresignedRef;
  };
}

export async function uploadFile(blob: Blob, filename: string): Promise<string> {
  const form = new FormData();
  form.append("upload_file", blob, filename);
  form.append("purpose", "parse");

  const res = await fetch(`${LLAMA_BASE}/api/v1/files`, {
    method: "POST",
    headers: AUTH,                                 // do NOT set Content-Type; fetch adds boundary
    body: form,
  });
  if (!res.ok) {
    throw new Error(`LlamaCloud file upload failed (${res.status}): ${await res.text()}`);
  }
  const { id } = await res.json();
  return id;
}

export async function submitParse(
  fileId: string,
  options: {
    customPrompt?: string;
    tier?: "agentic" | "agentic_plus" | "cost_effective" | "fast";
  } = {},
): Promise<string> {
  const body: Record<string, unknown> = {
    file_id: fileId,
    tier: options.tier ?? "agentic",
    version: "latest",
  };
  // v2: parsing_instruction / system_prompt → agentic_options.custom_prompt
  // (only valid on cost_effective / agentic / agentic_plus tiers).
  if (options.customPrompt) {
    body.agentic_options = { custom_prompt: options.customPrompt };
  }

  const res = await fetch(`${LLAMA_BASE}/api/v2/parse`, {
    method: "POST",
    headers: AUTH_JSON,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`LlamaCloud parse submit failed (${res.status}): ${await res.text()}`);
  }
  const data = await res.json();
  // Empirically the v2 response is flat (id at top level); fall back to wrapped just in case.
  return data.id ?? data.job?.id;
}

export async function pollUntilDone(
  jobId: string,
  opts: { timeoutMs: number; intervalMs?: number } = { timeoutMs: 240_000 },
): Promise<string> {
  const intervalMs = opts.intervalMs ?? 3000;
  const start = Date.now();

  // Request the presigned URL for full markdown (preferred) and per-page
  // markdown (fallback if full isn't generated for this tier).
  const expand = "markdown_full_content_metadata,markdown_content_metadata";
  const url = `${LLAMA_BASE}/api/v2/parse/${jobId}?expand=${expand}`;

  while (Date.now() - start < opts.timeoutMs) {
    const res = await fetch(url, { headers: AUTH });
    if (!res.ok) {
      throw new Error(`Job poll failed (${res.status}): ${await res.text()}`);
    }
    const data = await res.json() as V2Response;
    const job = data.job;

    if (job.status === "COMPLETED") {
      const ref =
        data.result_content_metadata?.markdown_full ??
        data.result_content_metadata?.markdown;
      const presigned = ref?.presigned_url ?? ref?.url;
      if (!presigned) {
        const dump = JSON.stringify(data).slice(0, 1500);
        throw new Error(`Parse COMPLETED but no presigned URL in result_content_metadata. Response=${dump}`);
      }
      const r = await fetch(presigned);  // presigned URLs carry their own auth
      if (!r.ok) {
        throw new Error(`Presigned markdown fetch failed (${r.status}): ${await r.text()}`);
      }
      return await extractMarkdown(r);
    }
    if (job.status === "FAILED" || job.status === "CANCELLED") {
      throw new Error(
        `LlamaCloud parse ${job.status}: ${job.error_message ?? job.error_code ?? "unknown"}`
      );
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`LlamaCloud parse timed out after ${opts.timeoutMs}ms`);
}

// The presigned URL points at `output.md.json` — a JSON file wrapping the
// markdown rather than raw markdown. Try parsing as JSON and extracting from
// known shapes; fall back to raw text if it isn't JSON.
async function extractMarkdown(response: Response): Promise<string> {
  const text = await response.text();
  const trimmed = text.trimStart();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    return text;                                                // raw markdown
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return text;                                                // looked like JSON, wasn't
  }
  // Known shapes (in priority order)
  const obj = parsed as Record<string, unknown>;
  const direct =
    (typeof obj.markdown_full === "string" && obj.markdown_full) ||
    (typeof obj.markdown === "string" && obj.markdown) ||
    (typeof obj.content === "string" && obj.content) ||
    (typeof obj.text === "string" && obj.text);
  if (direct) return direct as string;

  // Per-page array shapes
  const pages = (obj.pages as unknown[]) ?? (Array.isArray(parsed) ? parsed : undefined);
  if (Array.isArray(pages)) {
    const parts = pages
      .map((p) => {
        if (typeof p === "string") return p;
        const page = p as Record<string, unknown>;
        return (page.markdown ?? page.md ?? page.content ?? page.text ?? "") as string;
      })
      .filter(Boolean);
    if (parts.length > 0) return parts.join("\n\n");
  }
  const dump = JSON.stringify(parsed).slice(0, 1500);
  throw new Error(`Could not extract markdown from result JSON. Shape=${dump}`);
}
