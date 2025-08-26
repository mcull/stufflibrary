'use client';

import { useState, useEffect } from 'react';

export type FontOption = 'inter' | 'syne-mono' | 'special-elite';

const fontConfigs = {
  inter: {
    name: 'Inter',
    family:
      'Inter, "Avenir Next", "Helvetica Neue", Helvetica, Arial, sans-serif',
    weights: { light: 300, regular: 400, medium: 500, bold: 700 },
  },
  'syne-mono': {
    name: 'Syne Mono',
    family:
      '"Syne Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    weights: { light: 400, regular: 400, medium: 400, bold: 400 },
  },
  'special-elite': {
    name: 'Special Elite',
    family:
      '"Special Elite", "Courier New", Monaco, Consolas, "Liberation Mono", monospace',
    weights: { light: 400, regular: 400, medium: 400, bold: 400 },
  },
};

export function useFontToggle() {
  const [currentFont, setCurrentFont] = useState<FontOption>('special-elite');

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

    // Apply font family to CSS custom property
    document.documentElement.style.setProperty('--font-primary', config.family);

    // Save preference
    localStorage.setItem('font-preference', currentFont);
  }, [currentFont]);

  const toggleFont = () => {
    const fonts: FontOption[] = ['inter', 'syne-mono', 'special-elite'];
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
