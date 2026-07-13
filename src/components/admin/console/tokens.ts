// Palette additions for the admin "Circulation Desk" (design handoff
// docs/StuffLibrary admin dashboard design.zip). Core palette lives in
// brandTokens/vintageTokens; these are the console-only inks and papers.
export const console_ = {
  inkHover: '#162C4A',
  stampRed: '#B3261E',
  okGreen: '#1E6E42',
  darkMustardText: '#8B6A00',
  cardBorder: '#E6E0CE',
  dashedLine: '#DCD5BF',
  dashedLineFaint: '#ECE5D2',
  rowHover: '#FBF8EE',
  rowSelected: '#F4EEDD',
  rowFlash: '#FFF6D8',
  textSecondary: '#55503F',
  textMuted: '#8A8371',
  textFaint: '#A99F84',
} as const;

export const consoleType = {
  overline: {
    fontFamily: '"Roboto Mono", monospace',
    fontSize: '10px',
    letterSpacing: '2px',
    textTransform: 'uppercase' as const,
  },
  kpiNumeral: {
    fontFamily: 'Merriweather, Georgia, serif',
    fontWeight: 900,
    fontSize: '30px',
  },
  deltaLine: {
    fontFamily: '"Roboto Mono", monospace',
    fontSize: '10.5px',
  },
} as const;
