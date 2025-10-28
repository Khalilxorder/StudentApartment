import Link from 'next/link';

export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p>&copy; {year} Student Apartments Budapest. All rights reserved.</p>
        <nav className="flex flex-wrap items-center gap-4" aria-label="Footer navigation">
          <Link href="/privacy-policy" className="hover:text-slate-900">
            Privacy
          </Link>
          <Link href="/trust-safety" className="hover:text-slate-900">
            Trust &amp; Safety
          </Link>
          <Link href="/pricing" className="hover:text-slate-900">
            Pricing
          </Link>
          <Link href="/about/case-studies/student-apartments" className="hover:text-slate-900">
            About
          </Link>
        </nav>
      </div>
    </footer>
  );
}
