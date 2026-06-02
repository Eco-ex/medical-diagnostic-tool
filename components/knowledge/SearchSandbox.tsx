'use client';

import { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useSearchKnowledge } from '@/hooks/useQueries';
import type { SearchResult } from '@/types';

export function SearchSandbox() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const search = useSearchKnowledge();

  const run = () => {
    const q = query.trim();
    if (!q) return;
    search.mutate(
      { query: q, matchCount: 10 },
      {
        onSuccess: (r) => setResults(r),
        onError: (e) => toast.error(e instanceof Error ? e.message : 'Search failed.'),
      },
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Search className="h-5 w-5 text-primary" />
          <CardTitle>Search sandbox</CardTitle>
        </div>
        <CardDescription>
          Test retrieval quality: enter a clinical query to see the top matching chunks and their
          similarity scores.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            run();
          }}
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="e.g. risk factors for endometrial carcinosarcoma"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit" disabled={!query.trim() || search.isPending}>
            {search.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
          </Button>
        </form>

        {results &&
          (results.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No matches. Upload and index documents first, then try again.
            </p>
          ) : (
            <ul className="space-y-3">
              {results.map((r) => (
                <li key={r.chunkId} className="rounded-lg border p-3">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-primary">
                      {(r.similarity * 100).toFixed(1)}% match
                    </span>
                    <span
                      className="shrink-0 font-mono text-xs text-muted-foreground"
                      title={r.documentId}
                    >
                      doc {r.documentId.slice(0, 8)}
                    </span>
                  </div>
                  <p className="line-clamp-4 whitespace-pre-wrap text-sm text-muted-foreground">
                    {r.content}
                  </p>
                </li>
              ))}
            </ul>
          ))}
      </CardContent>
    </Card>
  );
}
