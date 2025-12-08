'use client';
import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { useTransition } from 'react';

export default function LanguageSwitcher() {
    const locale = useLocale();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const pathname = usePathname();

    const onSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const nextLocale = e.target.value;

        startTransition(() => {
            // Get the current path without the locale prefix (next/navigation usePathname potentially returns it without prefix if using i18n routing, 
            // but in many setups it includes it or middleware handles it. 
            // However, with standard next-intl setup, we should construct the new URL manually if not using the navigation wrapper.
            // A safer approach for this specific codebase based on middleware.ts:

            // pathname usually comes in as /dashboard or /hu/dashboard
            // We want to replace the first segment if it matches a locale, or prepend it.

            let currentPath = pathname;
            if (!currentPath.startsWith('/')) currentPath = '/' + currentPath;

            // Remove existing locale prefix if present
            const segments = currentPath.split('/');
            // segments[0] is empty, segments[1] might be 'en' or 'hu'
            if (segments.length > 1 && (segments[1] === 'en' || segments[1] === 'hu')) {
                segments.splice(1, 1); // remove the locale segment
            }

            // Reconstruct path
            const cleanPath = segments.join('/') || '/';

            // Navigate to new path with new locale
            // Note: In Next.js App Router with i18n, usually you push /locale/path
            const newPath = `/${nextLocale}${cleanPath === '/' ? '' : cleanPath}`;

            router.replace(newPath);
            router.refresh(); // Ensure server components re-render with new locale
        });
    };

    return (
        <div className="relative inline-block text-left">
            <select
                defaultValue={locale}
                className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-orange-600 sm:text-sm sm:leading-6"
                onChange={onSelectChange}
                disabled={isPending}
            >
                <option value="en">🇺🇸 English</option>
                <option value="hu">🇭🇺 Magyar</option>
            </select>
        </div>
    );
}
