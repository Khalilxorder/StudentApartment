import type { ReactNode } from 'react';
import { OwnerNavigation } from '@/components/navigation/RoleNavigation';

export default function OwnerLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-slate-50">
      <aside className="hidden w-64 border-r border-slate-200 bg-white lg:block">
        <OwnerNavigation />
      </aside>
      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
