'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Cookie, Settings, X } from 'lucide-react';

interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
}

const COOKIE_PREFERENCES_KEY = 'cookie-preferences';
const COOKIE_CONSENT_KEY = 'cookie-consent-given';

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true, // Always true, cannot be disabled
    analytics: false,
    marketing: false,
    functional: false,
  });

  useEffect(() => {
    // Check if user has already given consent
    const consentGiven = localStorage.getItem(COOKIE_CONSENT_KEY);
    const savedPreferences = localStorage.getItem(COOKIE_PREFERENCES_KEY);

    if (!consentGiven) {
      setShowBanner(true);
    } else if (savedPreferences) {
      setPreferences(JSON.parse(savedPreferences));
    }
  }, []);

  const acceptAllCookies = () => {
    const allPreferences: CookiePreferences = {
      necessary: true,
      analytics: true,
      marketing: true,
      functional: true,
    };

    setPreferences(allPreferences);
    savePreferences(allPreferences);
    setShowBanner(false);
  };

  const acceptNecessaryOnly = () => {
    const necessaryOnly: CookiePreferences = {
      necessary: true,
      analytics: false,
      marketing: false,
      functional: false,
    };

    setPreferences(necessaryOnly);
    savePreferences(necessaryOnly);
    setShowBanner(false);
  };

  const saveCustomPreferences = () => {
    savePreferences(preferences);
    setShowBanner(false);
    setShowSettings(false);
  };

  const savePreferences = (prefs: CookiePreferences) => {
    localStorage.setItem(COOKIE_PREFERENCES_KEY, JSON.stringify(prefs));
    localStorage.setItem(COOKIE_CONSENT_KEY, 'true');

    // Apply cookie preferences
    applyCookiePreferences(prefs);
  };

  const applyCookiePreferences = (prefs: CookiePreferences) => {
    // Disable Google Analytics if analytics cookies are not accepted
    if (!prefs.analytics && typeof window !== 'undefined' && window.gtag) {
      window.gtag('consent', 'update', {
        analytics_storage: 'denied',
      });
    }

    // Handle marketing cookies
    if (!prefs.marketing && typeof window !== 'undefined' && window.gtag) {
      window.gtag('consent', 'update', {
        ad_storage: 'denied',
      });
    }

    // Handle functional cookies
    if (!prefs.functional) {
      // Disable any functional cookies (chat widgets, etc.)
      // Implementation depends on specific services used
    }
  };

  const updatePreference = (type: keyof CookiePreferences, value: boolean) => {
    if (type === 'necessary') return; // Necessary cookies cannot be disabled

    setPreferences(prev => ({
      ...prev,
      [type]: value,
    }));
  };

  if (!showBanner) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSettings(true)}
          className="bg-white shadow-lg"
        >
          <Settings className="h-4 w-4 mr-2" />
          Cookie Settings
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Cookie Banner */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50 p-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="flex items-center gap-3 flex-1">
            <Cookie className="h-6 w-6 text-blue-600 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">Cookie Preferences</h3>
              <p className="text-sm text-gray-600 mt-1">
                We use cookies to enhance your experience. By continuing to use our site, you agree to our{' '}
                <a href="/privacy-policy" className="text-blue-600 hover:underline">Privacy Policy</a>.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowSettings(true)}>
              Customize
            </Button>
            <Button variant="outline" onClick={acceptNecessaryOnly}>
              Necessary Only
            </Button>
            <Button onClick={acceptAllCookies}>
              Accept All
            </Button>
          </div>
        </div>
      </div>

      {/* Cookie Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Cookie className="h-5 w-5" />
                    Cookie Settings
                  </CardTitle>
                  <CardDescription>
                    Manage your cookie preferences. You can change these settings at any time.
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSettings(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Necessary Cookies */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="necessary"
                    checked={preferences.necessary}
                    disabled
                  />
                  <label htmlFor="necessary" className="font-semibold">
                    Necessary Cookies
                  </label>
                </div>
                <p className="text-sm text-gray-600 ml-6">
                  These cookies are essential for the website to function properly. They cannot be disabled.
                </p>
              </div>

              {/* Analytics Cookies */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="analytics"
                    checked={preferences.analytics}
                    onCheckedChange={(checked) => updatePreference('analytics', checked as boolean)}
                  />
                  <label htmlFor="analytics" className="font-semibold">
                    Analytics Cookies
                  </label>
                </div>
                <p className="text-sm text-gray-600 ml-6">
                  Help us understand how visitors interact with our website by collecting and reporting information anonymously.
                </p>
              </div>

              {/* Marketing Cookies */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="marketing"
                    checked={preferences.marketing}
                    onCheckedChange={(checked) => updatePreference('marketing', checked as boolean)}
                  />
                  <label htmlFor="marketing" className="font-semibold">
                    Marketing Cookies
                  </label>
                </div>
                <p className="text-sm text-gray-600 ml-6">
                  Used to track visitors across websites to display relevant advertisements.
                </p>
              </div>

              {/* Functional Cookies */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="functional"
                    checked={preferences.functional}
                    onCheckedChange={(checked) => updatePreference('functional', checked as boolean)}
                  />
                  <label htmlFor="functional" className="font-semibold">
                    Functional Cookies
                  </label>
                </div>
                <p className="text-sm text-gray-600 ml-6">
                  Enable enhanced functionality and personalization, such as live chat and location-based services.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={acceptNecessaryOnly}>
                  Necessary Only
                </Button>
                <Button onClick={saveCustomPreferences}>
                  Save Preferences
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}