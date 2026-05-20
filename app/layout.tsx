import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Clinical Decision Support Tool',
  description:
    'A web-based tool that helps healthcare professionals analyze treatment options with AI assistance.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // suppressHydrationWarning: next-themes sets the `class`/`style` on <html>
  // before React hydrates, which would otherwise trip a hydration mismatch.
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
