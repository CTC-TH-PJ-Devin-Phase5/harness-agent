import React, { useEffect, useRef } from 'react';

interface OtpInputProps {
  value: string;
  onChange: (v: string) => void;
  length?: number;
  autoFocus?: boolean;
}

export const OtpInput: React.FC<OtpInputProps> = ({
  value,
  onChange,
  length = 6,
  autoFocus = false,
}) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>): void {
  if (e.key === 'Backspace') {
    e.preventDefault();
    const digits = Array.from({ length }, (_, k) => value[k] ?? '');
    if (digits[i]) {
      const next = digits.slice();
      next[i] = '';
      onChange(next.join(''));
    } else if (i > 0) {
      const next = digits.slice();
      next[i - 1] = '';
      onChange(next.join(''));
      inputRefs.current[i - 1]?.focus();
    }
  }
}

const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (/\d/.test(newValue)) {
      const newValues = value.split('').slice(0, length);
      newValues[index] = newValue;
      onChange(newValues.join(''));
      if (index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    } else if (newValue === '' && index > 0) {
      if (index > 0) {
        if (index > 0 && value[index - 1]) {
        inputRefs.current[index - 1]?.focus();
        inputRefs.current[index - 1]!.value = '';
        onChange(value.slice(0, index - 1));
      }
      }
    }
  };

  const handlePaste = (index: number, e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, length - index);
    const newValues = value.split('').slice(0, length);
    for (let i = 0; i < pastedData.length; i++) {
      if (/\d/.test(pastedData[i])) {
        newValues[index + i] = pastedData[i];
      }
    }
    onChange(newValues.join(''));
    inputRefs.current[Math.min(index + pastedData.length, length - 1)]?.focus();
  };

  return (
    <div className="otp-input-container">
      {[...Array(length)].map((_, i) => (
        <input
          key={`otp-${i}`}
          ref={(el) => (inputRefs.current[i] = el)}
          type="text"
          inputMode="numeric"
          value={value[i] || ''}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={(e) => handlePaste(i, e)}
          className="otp-input-box"
        />
      ))}
    </div>
  );
};
