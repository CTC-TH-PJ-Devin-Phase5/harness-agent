import React from 'react';

interface CaptchaChallengeProps {
  code: string;
  onRefresh: () => void;
}

export const CaptchaChallenge: React.FC<CaptchaChallengeProps> = ({ code, onRefresh }) => {
  return (
    <div className="captcha-challenge">
      <div className="captcha-characters">
        {[...code].map((char, i) => (
          <span
            key={`captcha-char-${i}`}
            data-testid="captcha-char"
            style={{
              transform: `rotate(${((i * 37) % 17) - 8}deg) translateY(${((i * 13) % 7) - 3}px)`,
            }}
          >
            {char}
          </span>
        ))}
      </div>
      <svg className="captcha-noise" viewBox="0 0 200 50">
        <path d="M10 10 Q90 90, 190 10" stroke="rgba(0, 0, 0, 0.2)" strokeWidth="2" fill="none" />
        <path d="M10 40 Q90 10, 190 40" stroke="rgba(0, 0, 0, 0.2)" strokeWidth="2" fill="none" />
      </svg>
      <button onClick={onRefresh}>Refresh</button>
    </div>
  );
};
