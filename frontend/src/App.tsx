import { ThemeProvider } from 'next-themes';
import { Toaster } from './components/ui/sonner';
import MainLayout from './components/MainLayout';

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <MainLayout />
      <Toaster />
    </ThemeProvider>
  );
}
