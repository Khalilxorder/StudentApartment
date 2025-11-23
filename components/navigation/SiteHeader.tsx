'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import UserAuthStatus from '@/components/UserAuthStatus';

const primaryLinks = [
	{ href: '/', label: 'Home' },
	{ href: '/search', label: 'Search' },
	{ href: '/dashboard', label: 'Students' },
	{ href: '/owner', label: 'Owners' },
	{ href: '/trust-safety', label: 'Trust & Safety' },
];

export default function SiteHeader() {
	const pathname = usePathname();

	if (!pathname) return null;

	return (
		<header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
			<div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
				<Link
					href="/"
					className="flex items-center gap-2 text-lg font-semibold text-slate-900"
				>
					<span className="text-2xl" aria-hidden="true">
						🏙️
					</span>
					<span className="hidden sm:inline">Student Apartments Budapest</span>
					<span className="sm:hidden">SA Budapest</span>
				</Link>

				<nav
					aria-label="Primary navigation"
					className="hidden md:flex items-center gap-6 text-sm font-medium"
				>
					{primaryLinks.map((link) => {
						const isActive =
							link.href === '/'
								? pathname === '/'
								: pathname === link.href || pathname.startsWith(`${link.href}/`);

						return (
							<Link
								key={link.href}
								href={link.href}
								aria-current={isActive ? 'page' : undefined}
								className={clsx(
									'rounded-lg px-3 py-2 transition-colors',
									isActive
										? 'bg-blue-50 text-blue-700 shadow-sm'
										: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
								)}
							>
								{link.label}
							</Link>
						);
					})}
				</nav>

				<div className="flex items-center gap-4">
					<UserAuthStatus />
				</div>
			</div>
		</header>
	);
}
