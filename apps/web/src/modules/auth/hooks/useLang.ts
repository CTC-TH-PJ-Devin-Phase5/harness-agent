import { createContext, useContext, useState, useEffect, createElement } from 'react';
import type { ReactNode, ReactElement } from 'react';
import { authTranslations } from '@/modules/auth/i18n/auth.i18n';

type Lang = 'en' | 'th';

const STORAGE_KEY = 'app_lang';

function getInitialLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'th') {
      return stored;
    }
  } catch {
    // localStorage may be unavailable in SSR or sandboxed environments
  }
  return 'en';
}

interface LangContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
}

const LangContext = createContext<LangContextValue | null>(null);

interface LanguageProviderProps {
  children: ReactNode;
}

function LanguageProvider({ children }: LanguageProviderProps): ReactElement {
  const [lang, setLangState] = useState<Lang>(getInitialLang);

  const setLang = (next: Lang): void => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage may be unavailable
    }
  };

  const t = (key: string): string => {
    return authTranslations[lang][key] ?? key;
  };

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'en' || stored === 'th') {
        setLangState(stored);
      }
    } catch {
      // localStorage may be unavailable
    }
  }, []);

  return createElement(LangContext.Provider, { value: { lang, setLang, t } }, children);
}

function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (ctx === null) {
    throw new Error('useLang must be used within a LanguageProvider');
  }
  return ctx;
}

export { LanguageProvider, useLang };
export type { Lang };
