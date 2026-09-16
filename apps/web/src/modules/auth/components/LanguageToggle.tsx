import type { ReactElement } from 'react';
import { useLang } from '@/modules/auth/hooks/useLang';
import type { Lang } from '@/modules/auth/hooks/useLang';

export function LanguageToggle(): ReactElement {
  const { lang, setLang } = useLang();

  const handleEn = (): void => {
    setLang('en' as Lang);
  };

  const handleTh = (): void => {
    setLang('th' as Lang);
  };

  return (
    <div className="flex gap-1">
      <button
        type="button"
        aria-pressed={lang === 'en'}
        onClick={handleEn}
        className={`px-2 py-1 text-xs font-medium rounded ${
          lang === 'en'
            ? 'bg-primary text-white'
            : 'bg-transparent text-muted hover:bg-bg-soft'
        }`}
      >
        EN
      </button>
      <button
        type="button"
        aria-pressed={lang === 'th'}
        onClick={handleTh}
        className={`px-2 py-1 text-xs font-medium rounded ${
          lang === 'th'
            ? 'bg-primary text-white'
            : 'bg-transparent text-muted hover:bg-bg-soft'
        }`}
      >
        TH
      </button>
    </div>
  );
}
