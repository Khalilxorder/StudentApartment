import type { ReactNode } from 'react';
import { AdminNavigation } from '@/components/navigation/RoleNavigation';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-slate-100">
      <aside className="hidden w-64 border-r border-slate-300 bg-white lg:block">
        <AdminNavigation />
      </aside>
      <main className="flex-1 overflow-x-hidden bg-white/60">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-10">
          {children}
        </div>
      </main>
    </div>
  );
}
