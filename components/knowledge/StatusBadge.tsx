import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DocumentStatus } from '@/types';

const STYLES: Record<DocumentStatus, string> = {
  uploaded: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  parsing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  parsed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  chunking: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  chunked: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  embedding: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  indexed: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  parse_failed: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  chunk_failed: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  embed_failed: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  archived: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
};

const LABELS: Record<DocumentStatus, string> = {
  uploaded: 'Uploaded',
  parsing: 'Parsing',
  parsed: 'Parsed',
  chunking: 'Chunking',
  chunked: 'Chunked',
  embedding: 'Embedding',
  indexed: 'Indexed',
  parse_failed: 'Parse failed',
  chunk_failed: 'Chunk failed',
  embed_failed: 'Embed failed',
  archived: 'Archived',
};

// Statuses where the pipeline is still working — show a spinner.
const IN_PROGRESS = new Set<DocumentStatus>([
  'uploaded',
  'parsing',
  'parsed',
  'chunking',
  'chunked',
  'embedding',
]);

export function StatusBadge({ status }: { status: DocumentStatus }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
        STYLES[status],
      )}
    >
      {IN_PROGRESS.has(status) && <Loader2 className="h-3 w-3 animate-spin" />}
      {LABELS[status]}
    </span>
  );
}
