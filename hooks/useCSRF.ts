'use client';

import { useState, useEffect } from 'react';

export function useCSRFToken() {
  const [csrfToken, setCsrfToken] = useState<string>('');

  useEffect(() => {
    // Get CSRF token from meta tag or header
    const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ||
                  document.querySelector('meta[name="csrfToken"]')?.getAttribute('content');

    if (token) {
      setCsrfToken(token);
    } else {
      // Fallback: try to get from response header (not reliable in client)
      fetch('/api/csrf-token')
        .then(res => res.json())
        .then(data => setCsrfToken(data.token))
        .catch(err => console.error('Failed to get CSRF token:', err));
    }
  }, []);

  return csrfToken;
}

export function getCSRFToken(): string {
  // Try to get from meta tag first
  const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ||
                document.querySelector('meta[name="csrfToken"]')?.getAttribute('content');

  if (token) return token;

  // Fallback: check for token in session storage
  return sessionStorage.getItem('csrf-token') || '';
}

export function setCSRFToken(token: string) {
  sessionStorage.setItem('csrf-token', token);
}

// Utility function to add CSRF token to fetch requests
export function fetchWithCSRF(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getCSRFToken();

  const headers = new Headers(options.headers);
  headers.set('X-CSRF-Token', token);

  return fetch(url, {
    ...options,
    headers,
  });
}

// Utility function to add CSRF token to form submissions
export function submitFormWithCSRF(form: HTMLFormElement): void {
  const token = getCSRFToken();
  if (token) {
    const hiddenInput = document.createElement('input');
    hiddenInput.type = 'hidden';
    hiddenInput.name = 'csrfToken';
    hiddenInput.value = token;
    form.appendChild(hiddenInput);
  }
}