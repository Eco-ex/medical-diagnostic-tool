import { supabaseAdmin } from "./supabase.ts";

export type DocumentStatus =
  | "uploaded"  | "parsing"  | "parsed"   | "parse_failed"
  | "chunking"  | "chunked"  | "chunk_failed"
  | "embedding" | "indexed"  | "embed_failed"
  | "archived";

export interface DocumentRow {
  id: string;
  filename: string;
  source_path: string;
  markdown_path: string | null;
  status: DocumentStatus;
  preset: string;
  metadata: Record<string, unknown>;
}

export async function getDocument(id: string): Promise<DocumentRow> {
  const { data, error } = await supabaseAdmin
    .from("documents")
    .select("id, filename, source_path, markdown_path, status, preset, metadata")
    .eq("id", id)
    .single();
  if (error) throw new Error(`Document ${id} not found: ${error.message}`);
  return data as DocumentRow;
}

export async function setStatus(
  id: string,
  status: DocumentStatus,
  extra: Record<string, unknown> = {},
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("documents")
    .update({ status, ...extra })
    .eq("id", id);
  if (error) throw new Error(`Failed to set status: ${error.message}`);
}

export type JobType =
  | "parse_document"
  | "chunk_document"
  | "embed_batch"
  | "finalize_document";

export async function enqueueJob(
  jobType: JobType,
  documentId: string,
  payload: Record<string, unknown> = {},
): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("ingestion_jobs")
    .insert({ job_type: jobType, document_id: documentId, payload, status: "pending" })
    .select("id")
    .single();
  if (error) throw new Error(`Failed to enqueue job: ${error.message}`);
  return data.id;
}

export async function invokeFunction(
  name: string,
  body: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabaseAdmin.functions.invoke(name, { body });
  if (error) throw new Error(`Failed to invoke ${name}: ${error.message}`);
}
