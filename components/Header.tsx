'use client';

import Link from 'next/link';
import { Activity, Moon, Sun, Settings } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function Header() {
  const { theme, setTheme } = useTheme();

  return (
    <header className="border-b bg-card">
      <div className="flex h-16 items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-3">
          <Activity className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-xl font-bold">MedAssist</h1>
            <p className="text-xs text-muted-foreground">Clinical Decision Support</p>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>

          <Link
            href="/admin"
            className={cn(buttonVariants({ variant: 'outline' }), 'gap-2')}
          >
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Admin Settings</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
