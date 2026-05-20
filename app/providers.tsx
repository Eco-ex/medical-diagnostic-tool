'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';

/**
 * Client-side provider tree. Replaces the old main.tsx + App.tsx wiring:
 * QueryClientProvider, next-themes, and the sonner Toaster.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  // Create the QueryClient once per browser session (lazy state init), rather
  // than at module scope, so it is never shared across requests during SSR.
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        {children}
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
