import { Button } from '@/components/ui/button';
import { Activity, Moon, Sun, Settings } from 'lucide-react';
import { useTheme } from 'next-themes';

interface HeaderProps {
  onAdminSettingsClick?: () => void;
}

export default function Header({ onAdminSettingsClick }: HeaderProps) {
  const { theme, setTheme } = useTheme();

  return (
    <header className="border-b bg-card">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <Activity className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-xl font-bold">MedAssist</h1>
            <p className="text-xs text-muted-foreground">Clinical Decision Support</p>
          </div>
        </div>

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

          <Button variant="outline" className="gap-2" onClick={onAdminSettingsClick}>
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Admin Settings</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
