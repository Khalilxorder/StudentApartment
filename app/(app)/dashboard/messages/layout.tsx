import type { ReactNode } from 'react';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;

// Prevent static generation
export async function generateStaticParams() {
  return [];
}

export default function MessagesLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
