'use client';

import { useState, useEffect, useCallback } from 'react';
import { translations, type Language } from './translations';

const STORAGE_KEY = 'bioguard_language';
const EVENT_NAME  = 'bioguard:languagechange';

export function useTranslation() {
  const [lang, setLang] = useState<Language>('en');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'fr') setLang(stored);

    const handler = () => {
      const updated = localStorage.getItem(STORAGE_KEY);
      if (updated === 'en' || updated === 'fr') setLang(updated);
    };
    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
  }, []);

  const switchLanguage = useCallback((newLang: Language) => {
    localStorage.setItem(STORAGE_KEY, newLang);
    setLang(newLang);
    window.dispatchEvent(new Event(EVENT_NAME));
  }, []);

  // t('dashboard.title') resolves nested keys
  const t = useCallback((key: string): string => {
    const parts = key.split('.');
    let node: any = translations[lang];
    for (const part of parts) node = node?.[part];
    return typeof node === 'string' ? node : key;
  }, [lang]);

  return { t, lang, switchLanguage };
}
