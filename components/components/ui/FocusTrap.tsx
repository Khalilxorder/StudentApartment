'use client';

import { useEffect, useRef } from 'react';
import { useAccessibility } from '../AccessibilityProvider';

interface FocusTrapProps {
  children: React.ReactNode;
  isActive: boolean;
  className?: string;
}

export function FocusTrap({ children, isActive, className }: FocusTrapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { trapFocus } = useAccessibility();

  useEffect(() => {
    if (isActive && containerRef.current) {
      const cleanup = trapFocus(containerRef.current);
      return cleanup;
    }
  }, [isActive, trapFocus]);

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}