// Voyage AI embeddings client.
// Docs: https://docs.voyageai.com/reference/embeddings-api
// Mirrors the shape of _shared/llama.ts: module-level config + startup guard,
// shared auth headers, typed responses, and exported async functions that throw
// on non-OK responses. Transient failures (429 / 5xx / network) are retried
// in-process with exponential backoff + jitter.

const VOYAGE_KEY = Deno.env.get("VOYAGE_API_KEY")!;
const VOYAGE_URL = Deno.env.get("VOYAGE_BASE_URL") ??
  "https://api.voyageai.com/v1/embeddings";

if (!VOYAGE_KEY) throw new Error("VOYAGE_API_KEY is not set");

// Must match chunk_embeddings.embedding vector(1024) and the table's model
// default. voyage-4-large defaults to 1024-dim; we send output_dimension
// explicitly so intent survives any future change to Voyage's default.
export const EMBED_MODEL = "voyage-4-large";
export const EMBED_DIM = 1024;

const AUTH_JSON = {
  Authorization: `Bearer ${VOYAGE_KEY}`,
  "Content-Type": "application/json",
};

// Bounded retry so worst-case wall time stays well under the batch budget
// (chunk-document sizes batches at 64 chunks to keep each invocation < 30s).
const MAX_ATTEMPTS = 4; // initial try + 3 retries
const BASE_DELAY_MS = 500;
const MAX_DELAY_MS = 8000;
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

// voyage-4-large accepts ~120K tokens and up to 1000 inputs per request. Cut a
// request below those limits — the token ceiling leaves headroom for the
// caller's cl100k_base counts being ~5-10% off Voyage's own tokenizer.
const SAFE_TOKEN_CEILING = 100_000;
const MAX_INPUTS_PER_REQUEST = 1000;

export class VoyageError extends Error {
  readonly status: number;
  readonly retryable: boolean;
  readonly retryAfterMs?: number;
  constructor(message: string, status: number, retryable: boolean, retryAfterMs?: number) {
    super(message);
    this.name = "VoyageError";
    this.status = status;
    this.retryable = retryable;
    this.retryAfterMs = retryAfterMs;
  }
}

interface VoyageEmbedding {
  object: string;
  embedding: number[];
  index: number;
}

interface VoyageResponse {
  object: string;
  data: VoyageEmbedding[];
  model: string;
  usage?: { total_tokens?: number };
}

/**
 * Embed an ordered array of document texts. Returns embeddings aligned to the
 * input order — result[i] is the vector for texts[i].
 *
 * Splits the work across multiple Voyage requests when the running token sum
 * would approach the per-request budget (a batch of large medical tables can
 * otherwise blow past ~120K tokens and hard-fail with a 400). Pass tokenCounts
 * (e.g. chunks.token_count) for accurate sizing; falls back to a char/4 estimate
 * when a count is absent. Each request retries transient failures internally and
 * aligns its response by the `index` field.
 */
export async function embedDocuments(
  texts: string[],
  tokenCounts?: (number | null)[],
): Promise<number[][]> {
  if (texts.length === 0) return [];

  const out: number[][] = [];
  let group: string[] = [];
  let groupTokens = 0;
  for (let i = 0; i < texts.length; i++) {
    const tokens = tokenCounts?.[i] ?? Math.ceil(texts[i].length / 4);
    if (
      group.length > 0 &&
      (groupTokens + tokens > SAFE_TOKEN_CEILING || group.length >= MAX_INPUTS_PER_REQUEST)
    ) {
      out.push(...await embedRequest(group));
      group = [];
      groupTokens = 0;
    }
    group.push(texts[i]);
    groupTokens += tokens;
  }
  if (group.length > 0) out.push(...await embedRequest(group));
  return out;
}

/**
 * Embed a single search query. Mirrors embedDocuments but with input_type="query"
 * — Voyage tunes query vs. document embeddings differently (~5% retrieval lift).
 */
export async function embedQuery(text: string): Promise<number[]> {
  const [vec] = await embedRequest([text], "query");
  if (!vec || vec.length !== EMBED_DIM) {
    throw new VoyageError(
      `Voyage returned a ${vec?.length ?? 0}-dim query vector, expected ${EMBED_DIM}`,
      200,
      false,
    );
  }
  return vec;
}

// Embed a single request's worth of texts (already sized within Voyage limits).
async function embedRequest(
  texts: string[],
  inputType: "document" | "query" = "document",
): Promise<number[][]> {
  const body = JSON.stringify({
    model: EMBED_MODEL,
    input: texts,
    input_type: inputType, // "document" for ingestion; "query" at search time
    output_dimension: EMBED_DIM, // explicit, though 1024 is the default
    output_dtype: "float",
    truncation: true, // truncate any single input over the 32K context limit
  });

  const data = await withRetry(() => callVoyage(body));

  if (data.data.length !== texts.length) {
    throw new VoyageError(
      `Voyage returned ${data.data.length} embeddings for ${texts.length} inputs`,
      200,
      false,
    );
  }

  // Align by the response `index` field, not array position.
  const ordered: number[][] = new Array(texts.length);
  for (const item of data.data) {
    if (item.index < 0 || item.index >= texts.length) {
      throw new VoyageError(`Voyage returned out-of-range index ${item.index}`, 200, false);
    }
    ordered[item.index] = item.embedding;
  }
  for (let i = 0; i < ordered.length; i++) {
    if (!ordered[i]) throw new VoyageError(`Voyage response missing embedding for index ${i}`, 200, false);
  }
  return ordered;
}

async function callVoyage(body: string): Promise<VoyageResponse> {
  let res: Response;
  try {
    res = await fetch(VOYAGE_URL, { method: "POST", headers: AUTH_JSON, body });
  } catch (e) {
    // Network / connection failure — retryable.
    throw new VoyageError(
      `Voyage request failed: ${e instanceof Error ? e.message : String(e)}`,
      0,
      true,
    );
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const retryable = RETRYABLE_STATUS.has(res.status);
    // Voyage does not document a Retry-After header, but honor it opportunistically.
    const retryAfter = res.headers.get("retry-after");
    const retryAfterMs = retryAfter ? Number(retryAfter) * 1000 : undefined;
    throw new VoyageError(
      `Voyage embeddings failed (${res.status}): ${text}`,
      res.status,
      retryable,
      Number.isFinite(retryAfterMs) ? retryAfterMs : undefined,
    );
  }
  return await res.json() as VoyageResponse;
}

async function withRetry(fn: () => Promise<VoyageResponse>): Promise<VoyageResponse> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const retryable = err instanceof VoyageError && err.retryable;
      if (!retryable || attempt === MAX_ATTEMPTS - 1) throw err;
      const backoff = Math.min(BASE_DELAY_MS * 2 ** attempt, MAX_DELAY_MS);
      const jittered = backoff * (0.5 + Math.random() * 0.5);
      const headerWait = err instanceof VoyageError ? err.retryAfterMs : undefined;
      const waitMs = Math.min(Math.max(jittered, headerWait ?? 0), MAX_DELAY_MS);
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
  throw lastErr;
}
