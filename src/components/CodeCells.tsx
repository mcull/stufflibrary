'use client';

import { Box } from '@mui/material';
import { useRef, useState } from 'react';

import { brandColors } from '@/theme/brandTokens';

export interface CodeCellsProps {
  value: string;
  onChange: (value: string) => void;
  /** Fires whenever the value reaches full length with all digits — may fire
   *  more than once (e.g. editing the last cell of a full code), so the
   *  consumer must be idempotent about what it triggers. */
  onComplete?: (value: string) => void;
  disabled?: boolean;
  length?: number;
}

// Six single-digit cells that behave like one field: type to advance, paste or
// autofill to fill, backspace to retreat. Emits the assembled string; knows
// nothing about auth. Value is the source of truth; each cell renders value[i].
export function CodeCells({
  value,
  onChange,
  onComplete,
  disabled,
  length = 6,
}: CodeCellsProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const emit = (next: string) => {
    onChange(next);
    if (next.length === length && /^\d+$/.test(next)) onComplete?.(next);
  };

  const setCharAt = (index: number, char: string) => {
    const chars = value.padEnd(length, ' ').split('');
    chars[index] = char;
    return chars.join('').replace(/ /g, '').slice(0, length);
  };

  const fillFrom = (digits: string) => {
    const next = digits.slice(0, length);
    emit(next);
    refs.current[Math.min(next.length, length - 1)]?.focus();
  };

  const handleChange = (index: number, raw: string) => {
    const digits = raw.replace(/\D/g, '');
    if (!digits) return; // non-digit ignored, cell stays empty
    // A multi-character payload arriving on a single cell is autofill (iOS/
    // Android one-time-code, password managers) — fan it out like a paste.
    if (digits.length > 1) {
      fillFrom(digits);
      return;
    }
    const next = setCharAt(index, digits);
    emit(next);
    if (index < length - 1) refs.current[index + 1]?.focus();
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === 'Backspace') {
      if (!value[index] && index > 0) {
        refs.current[index - 1]?.focus();
      } else {
        emit(setCharAt(index, ''));
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const digits = e.clipboardData.getData('text').replace(/\D/g, '');
    if (!digits) return;
    fillFrom(digits);
  };

  return (
    <Box
      role="group"
      aria-label={`Enter the ${length}-digit code`}
      sx={{ display: 'flex', gap: 1, justifyContent: 'center', mb: 3 }}
    >
      {Array.from({ length }).map((_, i) => {
        const focused = focusedIndex === i;
        return (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            aria-label={`Digit ${i + 1} of ${length}`}
            maxLength={1}
            disabled={disabled}
            value={value[i] ?? ''}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            onFocus={() => setFocusedIndex(i)}
            onBlur={() => setFocusedIndex((cur) => (cur === i ? null : cur))}
            style={{
              width: 44,
              height: 54,
              textAlign: 'center',
              fontSize: '1.5rem',
              fontFamily: 'monospace',
              color: disabled ? brandColors.softGray : brandColors.inkBlue,
              borderStyle: 'solid',
              borderWidth: 2,
              borderColor: focused ? brandColors.inkBlue : brandColors.softGray,
              borderRadius: 8,
              background: disabled ? '#f5f5f5' : brandColors.white,
              opacity: disabled ? 0.6 : 1,
              outline: 'none',
            }}
          />
        );
      })}
    </Box>
  );
}
