import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import Header from '@/components/Header';

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
        <Providers>
          {/* App shell. The Header is global; the route tree fills the area
              below it — the patient sidebar lives in the (dashboard) layout. */}
          <div className="flex h-screen flex-col">
            <Header />
            <div className="flex flex-1 overflow-hidden">{children}</div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
