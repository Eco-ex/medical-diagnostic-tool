import Link from 'next/link';
import { ArrowLeft, BookOpen } from 'lucide-react';
import AdminSettings from '@/components/AdminSettings';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Admin route ("/admin"). Sits outside the (dashboard) group, so it renders
 * full-width with no patient sidebar.
 */
export default function AdminPage() {
  return (
    <div className="flex-1 overflow-auto">
      <div className="flex items-center justify-between border-b bg-card p-4">
        <Link
          href="/"
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'gap-2')}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Patients
        </Link>
        <Link
          href="/admin/knowledge"
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-2')}
        >
          <BookOpen className="h-4 w-4" />
          Knowledge base
        </Link>
      </div>
      <AdminSettings />
    </div>
  );
}
