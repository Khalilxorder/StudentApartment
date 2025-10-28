'use client';

import { useEffect, useState } from 'react';

interface SkipLinkProps {
  href: string;
  children: React.ReactNode;
}

export function SkipLink({ href, children }: SkipLinkProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        setIsVisible(true);
      }
    };

    const handleClick = () => {
      setIsVisible(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', handleClick);
    };
  }, []);

  return (
    <a
      href={href}
      className={`fixed top-4 left-4 z-50 bg-orange-500 text-white px-4 py-2 rounded-md shadow-lg transform transition-transform duration-200 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:ring-offset-2 ${
        isVisible ? 'translate-y-0' : '-translate-y-full'
      }`}
      onFocus={() => setIsVisible(true)}
    >
      {children}
    </a>
  );
}