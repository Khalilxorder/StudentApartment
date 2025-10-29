'use client';

import { createContext, useContext, ReactNode, useState, useEffect } from 'react';

export type Locale = 'en' | 'hu';

const I18nContext = createContext<{
  t: (key: string, defaultValue?: string) => string;
  locale: Locale;
}>({
  t: (key) => key,
  locale: 'en',
});

export async function getMessages(locale: Locale): Promise<Record<string, any>> {
  try {
    if (locale === 'hu') {
      const messages = await import('./messages/hu.json');
      return messages.default || messages;
    }
    const messages = await import('./messages/en.json');
    return messages.default || messages;
  } catch {
    const messages = await import('./messages/en.json');
    return messages.default || messages;
  }
}

export function getLocaleFromRequest(req: any): Locale {
  if (!req) return 'en';

  try {
    const url = new URL(req.url);
    const urlLocale = url.searchParams.get('lang');
    if (urlLocale === 'hu') return 'hu';

    const acceptLanguage = req.headers.get('accept-language');
    if (acceptLanguage?.includes('hu')) return 'hu';
  } catch {
    // Continue with default
  }

  return 'en';
}

export function useTranslations(): (key: string, defaultValue?: string) => string {
  const { t } = useContext(I18nContext);
  return t;
}

export function useLocale(): Locale {
  const { locale } = useContext(I18nContext);
  return locale;
}

export const I18nProvider = ({
  children,
  locale = 'en',
}: {
  children: ReactNode;
  locale?: Locale;
}) => {
  const [messages, setMessages] = useState<Record<string, any>>({});

  useEffect(() => {
    getMessages(locale).then(setMessages);
    if (typeof window !== 'undefined') {
      localStorage.setItem('locale', locale);
    }
  }, [locale]);

  const t = (key: string, defaultValue?: string): string => {
    const keys = key.split('.');
    let value: any = messages;

    for (const k of keys) {
      value = value?.[k];
    }

    return typeof value === 'string' ? value : defaultValue || key;
  };

  return (
    <I18nContext.Provider value={{ t, locale }}>
      {children}
    </I18nContext.Provider>
  );
};
