'use client';

import { useState, useEffect } from 'react';

export type FontOption = 'accessible' | 'large-print' | 'dyslexia-friendly';

interface FontConfig {
  name: string;
  family: string;
  weights: {
    light: number;
    regular: number;
    medium: number;
    semibold: number;
    bold: number;
  };
  description: string;
  sizeMultiplier?: number;
  letterSpacing?: string;
  lineHeight?: number;
}

const fontConfigs: Record<FontOption, FontConfig> = {
  accessible: {
    name: 'Accessible (Default)',
    family: 'var(--font-inter), "Helvetica Neue", Helvetica, Arial, sans-serif',
    weights: {
      light: 300,
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    description: 'Clean, modern fonts optimized for readability',
  },
  'large-print': {
    name: 'Large Print',
    family: 'var(--font-inter), "Helvetica Neue", Helvetica, Arial, sans-serif',
    weights: {
      light: 300,
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    description: 'Larger text sizes for improved visibility',
    sizeMultiplier: 1.25,
  },
  'dyslexia-friendly': {
    name: 'Dyslexia Friendly',
    family:
      'var(--font-inter), OpenDyslexic, "Helvetica Neue", Helvetica, Arial, sans-serif',
    weights: {
      light: 300,
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    description: 'Enhanced letter spacing and optimized for dyslexic readers',
    letterSpacing: '0.05em',
    lineHeight: 1.7,
  },
};

export function useFontToggle() {
  const [currentFont, setCurrentFont] = useState<FontOption>('accessible');

  useEffect(() => {
    const savedFont = localStorage.getItem(
      'font-preference'
    ) as FontOption | null;
    if (savedFont && fontConfigs[savedFont as FontOption]) {
      setCurrentFont(savedFont as FontOption);
    }
  }, []);

  useEffect(() => {
    const config = fontConfigs[currentFont];

    // Apply accessibility enhancements
    document.documentElement.style.setProperty('--font-primary', config.family);

    // Apply size multiplier for large print
    if (config.sizeMultiplier) {
      document.documentElement.style.setProperty(
        '--font-size-multiplier',
        config.sizeMultiplier.toString()
      );
    } else {
      document.documentElement.style.setProperty('--font-size-multiplier', '1');
    }

    // Apply letter spacing for dyslexia-friendly mode
    if (config.letterSpacing) {
      document.documentElement.style.setProperty(
        '--letter-spacing',
        config.letterSpacing
      );
    } else {
      document.documentElement.style.setProperty('--letter-spacing', 'normal');
    }

    // Apply line height for dyslexia-friendly mode
    if (config.lineHeight) {
      document.documentElement.style.setProperty(
        '--line-height-multiplier',
        config.lineHeight.toString()
      );
    } else {
      document.documentElement.style.setProperty(
        '--line-height-multiplier',
        '1'
      );
    }

    // Save preference
    localStorage.setItem('font-preference', currentFont);
  }, [currentFont]);

  const toggleFont = () => {
    const fonts: FontOption[] = [
      'accessible',
      'large-print',
      'dyslexia-friendly',
    ];
    const currentIndex = fonts.indexOf(currentFont);
    const nextIndex = (currentIndex + 1) % fonts.length;
    const nextFont = fonts[nextIndex];
    if (nextFont) {
      setCurrentFont(nextFont);
    }
  };

  const setFont = (font: FontOption) => {
    setCurrentFont(font);
  };

  return {
    currentFont,
    currentFontName: fontConfigs[currentFont].name,
    toggleFont,
    setFont,
    fontConfigs,
  };
}
