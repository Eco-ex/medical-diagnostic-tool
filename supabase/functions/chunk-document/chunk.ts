// Pure markdown → chunk logic for the chunk-document Edge Function.
// No I/O here so it can be unit-tested with `deno test`. The orchestration
// (download, insert, enqueue) lives in index.ts.

import { getEncoding } from "js-tiktoken";

// cl100k_base is GPT-4's tokenizer. Not Voyage's, but close enough (~5-10% off)
// for chunk-size budgeting. Built once at module load.
const enc = getEncoding("cl100k_base");

export function countTokens(text: string): number {
  return enc.encode(text).length;
}

// Size policy (tokens).
const MAX_TOKENS = 800; // soft ceiling per chunk
const OVERLAP_TOKENS = 100; // overlap when splitting an oversized section
const MIN_TOKENS = 50; // below this, merge forward into the next section

// A heading needs at least one non-whitespace char after the `#`s. The extra
// letter check below rejects numeric false-positives like `# 1` (page noise).
const HEADING_RE = /^(#{1,6})\s+(\S.*?)\s*$/;
const FENCE_RE = /^\s*```/;
const TABLE_RE = /^\s*\|/;
const LIST_RE = /^\s*([-*+]|\d+[.)])\s+/;

// Sections whose heading (after stripping numbering) matches these are dropped
// entirely — a pure citation list is useless for retrieval.
const REFERENCES_RE =
  /^(references|bibliography|works cited|citations|reference list|literature cited)$/;

export interface Chunk {
  section_path: string; // "3. Methodology > 3.1 Training Data"
  section_heading: string | null; // leaf heading only
  content: string;
  token_count: number;
}

interface Section {
  heading: string | null;
  path: string;
  lines: string[];
}

// ---------------------------------------------------------------------------
// Cleaning — strip LlamaParse output quirks before parsing structure.
// ---------------------------------------------------------------------------
export function cleanMarkdown(md: string): string {
  return md
    .replace(/\r\n/g, "\n")
    .split("\n")
    // Drop stray page-number-only lines (e.g. a lone "12"). Tables use `|`,
    // so real tabular numbers are safe.
    .filter((line) => !/^\s*\d{1,4}\s*$/.test(line))
    .join("\n")
    // Collapse 3+ consecutive newlines down to a paragraph break.
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ---------------------------------------------------------------------------
// Section split — walk heading hierarchy, build ancestor paths.
// Each heading starts a section whose content is the lines directly under it
// (subsections become their own sections). The path is the ancestor chain.
// ---------------------------------------------------------------------------
export function splitSections(md: string): Section[] {
  const lines = md.split("\n");
  const sections: Section[] = [];
  const stack: { level: number; text: string }[] = [];
  let current: Section = { heading: null, path: "", lines: [] };
  let inFence = false;

  const flush = () => {
    if (current.heading !== null || current.lines.length > 0) sections.push(current);
  };

  for (const line of lines) {
    if (FENCE_RE.test(line)) inFence = !inFence;
    const m = inFence ? null : line.match(HEADING_RE);
    if (m && /[A-Za-z]/.test(m[2])) {
      flush();
      const level = m[1].length;
      const text = m[2].trim();
      while (stack.length && stack[stack.length - 1].level >= level) stack.pop();
      stack.push({ level, text });
      current = { heading: text, path: stack.map((s) => s.text).join(" > "), lines: [] };
    } else {
      current.lines.push(line);
    }
  }
  flush();
  return sections;
}

function normalizeHeading(h: string): string {
  return h
    .replace(/[*_`#]/g, "") // markdown emphasis / leftover hashes
    .replace(/^[\dIVXLC]+(\.\d+)*[.)]?\s+/i, "") // leading numbering: "7.", "3.1", "IV."
    .trim()
    .toLowerCase();
}

function isReferenceSection(s: Section): boolean {
  // path already contains the heading as its last segment; any ancestor that is
  // a references section drops the whole subtree.
  const segments = s.path ? s.path.split(" > ") : [];
  return segments.some((seg) => REFERENCES_RE.test(normalizeHeading(seg)));
}

// ---------------------------------------------------------------------------
// Block split — break a section body into atomic units. Tables, fenced code,
// and bullet lists are never split across chunk boundaries.
// ---------------------------------------------------------------------------
type BlockType = "para" | "table" | "code" | "list";
interface Block {
  type: BlockType;
  text: string;
}

function splitIntoBlocks(content: string): Block[] {
  const lines = content.split("\n");
  const blocks: Block[] = [];
  let para: string[] = [];
  const flushPara = () => {
    if (para.join("").trim()) blocks.push({ type: "para", text: para.join("\n").trim() });
    para = [];
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (FENCE_RE.test(line)) {
      flushPara();
      const code = [line];
      i++;
      while (i < lines.length) {
        code.push(lines[i]);
        if (FENCE_RE.test(lines[i])) {
          i++;
          break;
        }
        i++;
      }
      blocks.push({ type: "code", text: code.join("\n") });
      continue;
    }

    if (TABLE_RE.test(line)) {
      flushPara();
      const tbl: string[] = [];
      while (i < lines.length && TABLE_RE.test(lines[i])) {
        tbl.push(lines[i]);
        i++;
      }
      blocks.push({ type: "table", text: tbl.join("\n") });
      continue;
    }

    if (LIST_RE.test(line)) {
      flushPara();
      const list: string[] = [];
      // include continuation lines (indented wraps) until a blank line.
      while (i < lines.length && lines[i].trim() !== "" &&
        (LIST_RE.test(lines[i]) || /^\s{2,}\S/.test(lines[i]))) {
        list.push(lines[i]);
        i++;
      }
      blocks.push({ type: "list", text: list.join("\n") });
      continue;
    }

    if (line.trim() === "") {
      flushPara();
      i++;
      continue;
    }

    para.push(line);
    i++;
  }
  flushPara();
  return blocks;
}

// Decode the trailing `n` tokens of `text` as overlap context.
function tailTokens(text: string, n: number): string {
  const ids = enc.encode(text);
  if (ids.length <= n) return "";
  return enc.decode(ids.slice(-n));
}

// Sliding token window over a single oversized paragraph (no atomic structure).
function splitParagraphByTokens(text: string): string[] {
  const ids = enc.encode(text);
  const out: string[] = [];
  let start = 0;
  while (start < ids.length) {
    const end = Math.min(start + MAX_TOKENS, ids.length);
    out.push(enc.decode(ids.slice(start, end)));
    if (end >= ids.length) break;
    start = end - OVERLAP_TOKENS;
  }
  return out;
}

// Pack a >MAX_TOKENS section into chunks, keeping atomic blocks whole and
// carrying ~OVERLAP_TOKENS of context between consecutive chunks.
function splitOversized(content: string): string[] {
  const blocks = splitIntoBlocks(content);
  const chunks: string[] = [];
  let buf: string[] = [];
  let bufTokens = 0;

  const flush = () => {
    if (buf.length) {
      chunks.push(buf.join("\n\n"));
      buf = [];
      bufTokens = 0;
    }
  };

  for (const block of blocks) {
    const bt = countTokens(block.text);

    if (bt > MAX_TOKENS) {
      flush();
      if (block.type === "para") {
        for (const part of splitParagraphByTokens(block.text)) chunks.push(part);
      } else {
        // table / code / list — never split, even when oversized.
        chunks.push(block.text);
      }
      continue;
    }

    if (bufTokens + bt > MAX_TOKENS && buf.length) {
      flush();
      const overlap = tailTokens(chunks[chunks.length - 1], OVERLAP_TOKENS);
      if (overlap) {
        buf.push(overlap);
        bufTokens += countTokens(overlap);
      }
    }

    buf.push(block.text);
    bufTokens += bt;
  }
  flush();
  return chunks;
}

// ---------------------------------------------------------------------------
// Top-level: markdown → chunks.
// ---------------------------------------------------------------------------
export function buildChunks(md: string): Chunk[] {
  const sections = splitSections(cleanMarkdown(md));

  // Drop references + empty (heading-only) sections.
  const withContent = sections
    .filter((s) => !isReferenceSection(s))
    .map((s) => ({ heading: s.heading, path: s.path, content: s.lines.join("\n").trim() }))
    .filter((s) => s.content.length > 0);

  // Merge tiny sections forward into the next one to avoid noisy micro-chunks.
  const merged: { heading: string | null; path: string; content: string }[] = [];
  let carry = "";
  let carryHeading: string | null = null;
  let carryPath = "";
  for (let i = 0; i < withContent.length; i++) {
    const s = withContent[i];
    const combined = carry ? `${carry}\n\n${s.content}` : s.content;
    const isLast = i === withContent.length - 1;
    if (countTokens(combined) < MIN_TOKENS && !isLast) {
      carry = combined;
      if (carryHeading === null) {
        carryHeading = s.heading;
        carryPath = s.path;
      }
      continue;
    }
    merged.push({
      heading: s.heading ?? carryHeading,
      path: s.path || carryPath,
      content: combined,
    });
    carry = "";
    carryHeading = null;
    carryPath = "";
  }

  // Apply size policy.
  const chunks: Chunk[] = [];
  for (const s of merged) {
    const tokens = countTokens(s.content);
    if (tokens <= MAX_TOKENS) {
      chunks.push({ section_path: s.path, section_heading: s.heading, content: s.content, token_count: tokens });
    } else {
      for (const part of splitOversized(s.content)) {
        if (!part.trim()) continue;
        chunks.push({ section_path: s.path, section_heading: s.heading, content: part, token_count: countTokens(part) });
      }
    }
  }

  return chunks.filter((c) => c.content.trim().length > 0);
}
