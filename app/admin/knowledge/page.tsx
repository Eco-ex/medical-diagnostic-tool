'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { KnowledgeUpload } from '@/components/knowledge/KnowledgeUpload';
import { DocumentList } from '@/components/knowledge/DocumentList';
import { SearchSandbox } from '@/components/knowledge/SearchSandbox';

/**
 * Admin knowledge base ("/admin/knowledge"): upload documents, watch the
 * ingestion pipeline, manage documents, and test retrieval quality.
 */
export default function KnowledgePage() {
  return (
    <div className="flex-1 overflow-auto">
      <div className="border-b bg-card p-4">
        <Link
          href="/admin"
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'gap-2')}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Admin
        </Link>
      </div>
      <div className="container mx-auto max-w-4xl space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-semibold">Knowledge base</h1>
          <p className="text-sm text-muted-foreground">
            Upload clinical documents and inspect retrieval quality.
          </p>
        </div>
        <KnowledgeUpload />
        <DocumentList />
        <SearchSandbox />
      </div>
    </div>
  );
}
