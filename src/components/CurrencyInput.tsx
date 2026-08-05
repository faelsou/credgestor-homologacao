import React, { useEffect, useState } from 'react';
import {
  formatCurrencyInput,
  parseCurrencyInput,
  sanitizeCurrencyInput,
} from '@/utils/currencyInput';

type CurrencyInputProps = {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  id?: string;
  name?: string;
  'aria-label'?: string;
};

/**
 * Text input for monetary values in Brazilian format (xxx,xx).
 * Allows free manual editing; normalizes to two decimals on blur.
 */
export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  value,
  onChange,
  className = '',
  placeholder = '0,00',
  disabled = false,
  autoFocus = false,
  id,
  name,
  'aria-label': ariaLabel,
}) => {
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState(() => (value > 0 ? formatCurrencyInput(value) : ''));

  useEffect(() => {
    if (!focused) {
      setText(value > 0 ? formatCurrencyInput(value) : '');
    }
  }, [value, focused]);

  const handleChange = (raw: string) => {
    const sanitized = sanitizeCurrencyInput(raw);
    setText(sanitized);

    if (sanitized === '' || sanitized === ',' || sanitized.endsWith(',')) {
      if (sanitized === '' || sanitized === ',') {
        onChange(0);
      }
      return;
    }

    const parsed = parseCurrencyInput(sanitized);
    if (parsed !== null) {
      onChange(parsed);
    }
  };

  const handleBlur = () => {
    setFocused(false);
    const parsed = parseCurrencyInput(text);
    if (parsed === null) {
      setText('');
      onChange(0);
      return;
    }

    onChange(parsed);
    setText(formatCurrencyInput(parsed));
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      id={id}
      name={name}
      aria-label={ariaLabel}
      value={text}
      onChange={e => handleChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={handleBlur}
      disabled={disabled}
      autoFocus={autoFocus}
      placeholder={placeholder}
      className={className}
    />
  );
};
