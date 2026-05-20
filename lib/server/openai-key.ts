/**
 * Extracts and shape-validates the caller-supplied OpenAI key from a request.
 *
 * In the previous Express backend this was middleware whose extra job was to
 * strip the header off `req.headers` before a request logger (morgan) could log
 * it. Next.js has no such logger and does not serialize arbitrary request
 * headers, so the strip step is gone — but the shape validation still matters:
 * it rejects malformed values before we forward them to OpenAI.
 */

// Accepts current `sk-...` and `sk-proj-...` shapes. Liberal length range; tightly
// constrained to characters OpenAI actually uses so injection-via-header oddities
// are rejected before we forward.
const OPENAI_KEY_RE = /^sk-[A-Za-z0-9_-]{20,200}$/;

export function extractOpenAiKey(request: Request): string | null {
  const raw = request.headers.get('x-openai-key');
  if (typeof raw !== 'string') return null;

  const trimmed = raw.trim();
  return OPENAI_KEY_RE.test(trimmed) ? trimmed : null;
}
