import React, { useState } from 'react';
import { useLang } from '@/modules/auth/hooks/useLang';
import { CaptchaChallenge } from '@/modules/auth/components/CaptchaChallenge';
import { LanguageToggle } from '@/modules/auth/components/LanguageToggle';

interface LoginPageProps {
  onAuthSuccess: (payload: { email: string }) => void;
}

const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function generateCaptcha(): string {
  return Array.from({ length: 5 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('');
}

export function LoginPage({ onAuthSuccess }: LoginPageProps) {
  const [step, setStep] = useState<'credentials' | 'twofa'>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaCode, setCaptchaCode] = useState(generateCaptcha());
  const [captchaRequired, setCaptchaRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { t } = useLang();

  const FIXTURE = { email: 'tanaka@acme.co', password: '1234' };

  const handleSubmit = (event: React.FormEvent): void => {
    event.preventDefault();

    if (captchaRequired && captchaInput.toUpperCase() !== captchaCode) {
      setError(t('captcha_incorrect'));
      setCaptchaCode(generateCaptcha());
      return;
    }

    if (email !== FIXTURE.email) {
      setError(t('login_no_account'));
      return;
    }

    if (password !== FIXTURE.password) {
      setError(t('login_bad_password'));
      setCaptchaRequired(true);
      setCaptchaCode(generateCaptcha());
      return;
    }

    setStep('twofa');
  };

  if (step === 'twofa') {
    return <div>2FA step placeholder</div>;
  }

  return (
    <div>
      <h1>{t('app_title')}</h1>
      <p>{t('app_subtitle')}</p>
      <form onSubmit={handleSubmit}>
        <label htmlFor='email-input'>{t('work_email')}</label>
        <input id='email-input' type='email' value={email} onChange={(e) => setEmail(e.target.value)} />

        <label htmlFor='password-input'>{t('password')}</label>
        <input id='password-input' type='password' value={password} onChange={(e) => setPassword(e.target.value)} />

        {captchaRequired && (
          <div>
            <CaptchaChallenge code={captchaCode} onRefresh={() => setCaptchaCode(generateCaptcha())} />
            <label htmlFor='captcha-input'>{t('captcha_label')}</label>
            <input id='captcha-input' type='text' value={captchaInput} onChange={(e) => setCaptchaInput(e.target.value)} />
          </div>
        )}

        {error && <p>{error}</p>}

        <button type='submit'>{t('sign_in')}</button>
      </form>

      <LanguageToggle />
    </div>
  );
}
