/**
 * StuffLibrary Brand Design Tokens
 * Based on branding guidelines: trustworthy utility with mid-century warmth
 */

// Brand Color Palette
export const brandColors = {
  // Primary - Ink Blue (trust, anchors wordmark & headers)
  inkBlue: '#1E3A5F',

  // Background - Warm Cream (evokes paper/postcards)
  warmCream: '#F9F5EB',

  // Accents - for CTAs and playful emphasis
  mustardYellow: '#E3B505',
  tomatoRed: '#D1495B',

  // Neutrals - structure and legibility
  softGray: '#E0E0E0',
  charcoal: '#333333',

  // Additional semantic colors
  white: '#FFFFFF',
  black: '#000000',
} as const;

// Spacing Scale (8px base)
export const spacing = {
  xs: 4, // 0.5x
  sm: 8, // 1x base
  md: 16, // 2x
  lg: 24, // 3x
  xl: 32, // 4x
  xxl: 48, // 6x
  xxxl: 64, // 8x
} as const;

// Border Radius Scale
export const borderRadius = {
  sm: 4, // Small elements
  md: 8, // Default
  lg: 12, // Cards, larger elements
  xl: 16, // Hero elements
  xxl: 24, // Special cases
  round: '50%', // Fully rounded
} as const;

// Typography Scale (based on geometric sans serif)
export const typography = {
  // Font families
  fontFamily: {
    primary:
      'Inter, "Avenir Next", "Helvetica Neue", Helvetica, Arial, sans-serif',
    fallback: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
    mono: 'Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  },

  // Font weights
  fontWeight: {
    light: 300,
    regular: 400,
    medium: 500,
    bold: 700,
  },

  // Line heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.6,
    loose: 1.8,
  },

  // Font sizes (16px base)
  fontSize: {
    xs: '0.75rem', // 12px
    sm: '0.875rem', // 14px
    base: '1rem', // 16px
    lg: '1.125rem', // 18px
    xl: '1.25rem', // 20px
    '2xl': '1.5rem', // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
    '5xl': '3rem', // 48px
    '6xl': '4rem', // 64px
  },
} as const;

// Shadows (subtle, mid-century inspired)
export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  none: 'none',
} as const;

// Z-index scale
export const zIndex = {
  hide: -1,
  auto: 'auto',
  base: 0,
  docked: 10,
  dropdown: 1000,
  sticky: 1100,
  banner: 1200,
  overlay: 1300,
  modal: 1400,
  popover: 1500,
  skipLink: 1600,
  toast: 1700,
  tooltip: 1800,
} as const;
