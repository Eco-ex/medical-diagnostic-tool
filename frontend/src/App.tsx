import { useAuth } from './hooks/useAuth';
import { ThemeProvider } from 'next-themes';
import { Toaster } from './components/ui/sonner';
import LoginPage from './pages/LoginPage';
import ProfileSetupModal from './components/ProfileSetupModal';
import MainLayout from './components/MainLayout';

export default function App() {
  const { isAuthenticated, isLoading, userProfile } = useAuth();

  const showProfileSetup = isAuthenticated && userProfile === null;

  if (isLoading) {
    return (
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <div className="flex h-screen items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  if (!isAuthenticated) {
    return (
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <LoginPage />
        <Toaster />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {showProfileSetup && <ProfileSetupModal />}
      <MainLayout />
      <Toaster />
    </ThemeProvider>
  );
}
