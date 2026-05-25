/**
 * Extracts and shape-validates the caller-supplied Anthropic key from a request.
 *
 * Rejects malformed values before we forward them to Anthropic. Anthropic keys
 * start with `sk-ant-` and use a constrained character set.
 */

const ANTHROPIC_KEY_RE = /^sk-ant-[A-Za-z0-9_-]{20,200}$/;

export function extractAnthropicKey(request: Request): string | null {
  const raw = request.headers.get('x-anthropic-key');
  if (typeof raw !== 'string') return null;

  const trimmed = raw.trim();
  return ANTHROPIC_KEY_RE.test(trimmed) ? trimmed : null;
}
