// Surface + ink tokens for the vintage library-artifact language (#429).
// Core palette lives in brandTokens; these are the paper stocks and stamp
// inks the design handoff introduces on top.

export const vintage = {
  drawerPaper: '#FDF9EF',
  manila: '#F6EFDC',
  cardBorder: '#E4DCC8',
  ruledLine: '#c9a97e',
  stampBrown: '#8b4513',
  darkMustard: '#b8860b',
  bodyInk: '#3F342B',
} as const;

export const vintageFonts = {
  typewriter: '"Special Elite", "Courier New", monospace',
  stamp: 'Stampette, monospace',
  label: 'ImpactLabelVintage, sans-serif',
  serif: 'Merriweather, Georgia, serif',
  mono: '"Roboto Mono", monospace',
} as const;
