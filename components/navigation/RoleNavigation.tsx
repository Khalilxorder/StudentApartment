'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

type NavItem = {
  href: string;
  label: string;
  badge?: string;
};

interface RoleNavigationProps {
  title: string;
  items: NavItem[];
}

function RoleNavigationBase({ title, items }: RoleNavigationProps) {
  const pathname = usePathname();

  if (!pathname) return null;

  return (
    <nav
      aria-label={`${title} navigation`}
      className="flex h-full flex-col gap-1 px-4 py-6 text-sm"
    >
      <p className="px-2 pb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">
        {title}
      </p>
      <div className="flex flex-col gap-1 text-left">
        {items.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/' && pathname && pathname.startsWith(`${item.href}/`));

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={clsx(
                'flex items-center justify-between rounded-lg px-3 py-2 font-medium transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              )}
            >
              <span>{item.label}</span>
              {item.badge ? (
                <span className="ml-3 inline-flex items-center rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700">
                  {item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function StudentNavigation() {
  return (
    <RoleNavigationBase
      title="Student"
      items={[
        { href: '/dashboard', label: 'Overview' },
        { href: '/dashboard/favorites', label: 'Favorites' },
        { href: '/dashboard/bookings', label: 'Bookings' },
        { href: '/dashboard/messages', label: 'Messages' },
        { href: '/dashboard/profile', label: 'Profile' },
        { href: '/apartments/create', label: 'List Your Place', badge: 'New' },
        { href: '/search', label: 'Search Listings' },
        { href: '/trust-safety', label: 'Trust & Safety' },
      ]}
    />
  );
}

export function OwnerNavigation() {
  return (
    <RoleNavigationBase
      title="Owner"
      items={[
        { href: '/owner', label: 'Overview' },
        { href: '/owner/listings', label: 'My Listings' },
        { href: '/owner/listings/create', label: 'Create Listing' },
        { href: '/owner/bookings', label: 'Bookings' },
        { href: '/owner/messages', label: 'Messages' },
        { href: '/owner/profile', label: 'Profile & Payouts' },
        { href: '/owner/analytics', label: 'Performance Insights' },
      ]}
    />
  );
}

export function AdminNavigation() {
  return (
    <RoleNavigationBase
      title="Admin"
      items={[
        { href: '/admin', label: 'Dashboard' },
        { href: '/admin/console', label: 'Moderation Console' },
        { href: '/admin/analytics', label: 'Analytics' },
      ]}
    />
  );
}
