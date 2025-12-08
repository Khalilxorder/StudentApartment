'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

export default function CookieConsent() {
  const t = useTranslations('Compliance.cookieBanner');
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie_consent', 'accepted');
    setShowBanner(false);
  };

  const handleDecline = () => {
    localStorage.setItem('cookie_consent', 'declined');
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-description"
      className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white p-4 z-50 shadow-lg"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p id="cookie-consent-description" className="text-sm">
          <span id="cookie-consent-title" className="sr-only">Cookie Consent</span>
          {t('message')}
        </p>
        <div className="flex gap-2" role="group" aria-label="Cookie consent options">
          <button
            onClick={handleDecline}
            className="px-4 py-2 text-sm text-gray-300 hover:text-white hover:underline"
            aria-label="Decline cookies"
          >
            {t('decline')}
          </button>
          <button
            onClick={handleAccept}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 rounded-md transition"
            aria-label="Accept cookies"
          >
            {t('accept')}
          </button>
        </div>
      </div>
    </div>
  );
}
