import type { ReactNode } from 'react';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;

export default function OwnerMessagesLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
