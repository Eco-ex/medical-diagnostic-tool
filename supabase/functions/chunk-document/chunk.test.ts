// Unit tests for the pure chunking logic. Run with:
//   deno test supabase/functions/chunk-document/chunk.test.ts
// (uses the import map in deno.json for js-tiktoken)
import { assert, assertEquals } from "jsr:@std/assert@1";
import { buildChunks, cleanMarkdown, countTokens, splitSections } from "./chunk.ts";

Deno.test("cleanMarkdown strips page-number lines and collapses blank runs", () => {
  const out = cleanMarkdown("Intro line\n\n\n\n12\n\nMore text\n");
  assertEquals(out, "Intro line\n\nMore text");
});

Deno.test("splitSections builds ancestor paths and ignores numeric false-positive headings", () => {
  const md = [
    "# 3. Methodology",
    "Some intro to methods.",
    "## 3.1 Training Data",
    "Details about the data.",
    "# 1", // numeric-only -> treated as content, not a heading
  ].join("\n");
  const sections = splitSections(md);
  const leaf = sections.find((s) => s.heading === "3.1 Training Data");
  assert(leaf, "expected the 3.1 subsection");
  assertEquals(leaf!.path, "3. Methodology > 3.1 Training Data");
  // "# 1" stayed as content under the subsection, not a new section.
  assert(leaf!.lines.some((l) => l.trim() === "# 1"));
});

Deno.test("References section is excluded entirely", () => {
  const md = [
    "# Discussion",
    "We found that the treatment was effective in most cohorts studied here.",
    "# References",
    "[1] Smith et al. 2020.",
    "[2] Doe et al. 2021.",
  ].join("\n");
  const chunks = buildChunks(md);
  assert(chunks.length >= 1);
  assert(!chunks.some((c) => c.content.includes("Smith et al")), "references leaked into chunks");
  assert(chunks.some((c) => c.section_heading === "Discussion"));
});

Deno.test("small section under heading-only parent merges forward", () => {
  const md = [
    "# Results",
    "## Primary",
    "Tiny.", // < 50 tokens, should merge into the next section
    "## Secondary",
    "The secondary outcome analysis produced a much longer body of text that on " +
      "its own comfortably exceeds the fifty token floor used for merge decisions.",
  ].join("\n");
  const chunks = buildChunks(md);
  // No micro-chunk: "Tiny." must not appear as its own standalone chunk.
  const tiny = chunks.find((c) => c.content.trim() === "Tiny.");
  assertEquals(tiny, undefined);
  assert(chunks.some((c) => c.content.includes("Tiny.")), "tiny content was dropped instead of merged");
});

Deno.test("oversized section splits with overlap, stays under ~ceiling", () => {
  const sentence = "The model architecture relies on a transformer backbone with attention. ";
  const big = "# Architecture\n" + sentence.repeat(120); // well over 800 tokens
  const chunks = buildChunks(big);
  assert(chunks.length > 1, "expected oversized section to split into multiple chunks");
  for (const c of chunks) {
    // allow some slack for overlap, but each chunk should be in a sane range
    assert(c.token_count <= 950, `chunk too large: ${c.token_count} tokens`);
    assertEquals(c.section_heading, "Architecture");
  }
});

Deno.test("a markdown table is never split across chunks", () => {
  const row = "| col a | col b | col c | col d | col e |\n";
  const table = "| h1 | h2 | h3 | h4 | h5 |\n| --- | --- | --- | --- | --- |\n" + row.repeat(60);
  const md = "# Data Table\n" + table;
  const chunks = buildChunks(md);
  const tableChunks = chunks.filter((c) => c.content.includes("| col a |"));
  assertEquals(tableChunks.length, 1, "table rows were spread across multiple chunks");
  assert(countTokens(tableChunks[0].content) > 800, "expected the atomic table to be oversized");
});

Deno.test("empty / whitespace-only markdown yields no chunks", () => {
  assertEquals(buildChunks("   \n\n  \n").length, 0);
});
