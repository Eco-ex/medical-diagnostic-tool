'use client';

import { useState } from 'react';
import { MoreVertical, RefreshCw, Trash2, FileText, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { StatusBadge } from './StatusBadge';
import {
  useGetDocuments,
  useDeleteDocument,
  useReindexDocument,
  ACTIVE_DOCUMENT_STATUSES,
} from '@/hooks/useQueries';
import type { DocumentSummary } from '@/types';

function formatBytes(n: number | null): string {
  if (!n) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString();
}

export function DocumentList() {
  const { data: documents, isLoading, isError } = useGetDocuments();
  const reindex = useReindexDocument();
  const del = useDeleteDocument();
  const [target, setTarget] = useState<DocumentSummary | null>(null);

  const handleReindex = (doc: DocumentSummary) => {
    reindex.mutate(doc.id, {
      onSuccess: () => toast.success(`Reindexing "${doc.filename}"…`),
      onError: (e) => toast.error(e instanceof Error ? e.message : 'Reindex failed.'),
    });
  };

  const confirmDelete = () => {
    if (!target) return;
    const doc = target;
    setTarget(null);
    del.mutate(doc.id, {
      onSuccess: () => toast.success(`Deleted "${doc.filename}".`),
      onError: (e) => toast.error(e instanceof Error ? e.message : 'Delete failed.'),
    });
  };

  const count = documents?.length ?? 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <CardTitle>Documents</CardTitle>
        </div>
        <CardDescription>
          {count > 0
            ? `${count} document${count === 1 ? '' : 's'} in the knowledge base.`
            : 'Documents you upload appear here.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center gap-2 py-8 text-destructive">
            <AlertCircle className="h-4 w-4" /> Failed to load documents.
          </div>
        ) : count === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No documents yet.</p>
        ) : (
          <ul className="divide-y">
            {documents!.map((doc) => (
              <li key={doc.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium" title={doc.filename}>
                    {doc.filename}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatBytes(doc.sizeBytes)} · {doc.chunkCount ?? 0} chunks · {formatDate(doc.createdAt)}
                  </p>
                  {doc.errorMessage && (
                    <p className="mt-1 truncate text-xs text-destructive" title={doc.errorMessage}>
                      {doc.errorMessage}
                    </p>
                  )}
                </div>
                <StatusBadge status={doc.status} />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => handleReindex(doc)}
                      disabled={ACTIVE_DOCUMENT_STATUSES.has(doc.status)}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" /> Reindex
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setTarget(doc)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <AlertDialog open={!!target} onOpenChange={(open) => !open && setTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes &ldquo;{target?.filename}&rdquo;, along with its chunks and
              embeddings, from the knowledge base. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className={cn('bg-destructive text-destructive-foreground hover:bg-destructive/90')}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
