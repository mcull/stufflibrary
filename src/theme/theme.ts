import { createTheme } from '@mui/material/styles';

import {
  brandColors,
  spacing,
  borderRadius,
  typography,
  shadows,
} from './brandTokens';

// Custom MUI theme based on StuffLibrary branding
export const theme = createTheme({
  palette: {
    mode: 'light',

    // Primary - Ink Blue for trust and headers
    primary: {
      main: brandColors.inkBlue,
      light: '#2D4A70', // Lighter shade of ink blue
      dark: '#152B47', // Darker shade of ink blue
      contrastText: brandColors.white,
    },

    // Secondary - Warm Cream for backgrounds
    secondary: {
      main: brandColors.warmCream,
      light: '#FAF7F0', // Lighter cream
      dark: '#F5F0E1', // Darker cream
      contrastText: brandColors.charcoal,
    },

    // Error - Tomato Red
    error: {
      main: brandColors.tomatoRed,
      light: '#E06B7A', // Lighter tomato
      dark: '#B33A4A', // Darker tomato
      contrastText: brandColors.white,
    },

    // Warning - Mustard Yellow
    warning: {
      main: brandColors.mustardYellow,
      light: '#EACA47', // Lighter mustard
      dark: '#C19E04', // Darker mustard
      contrastText: brandColors.charcoal,
    },

    // Success - Keep default green but adjust to brand
    success: {
      main: '#4CAF50',
      contrastText: brandColors.white,
    },

    // Info - Use ink blue variant
    info: {
      main: '#2D4A70',
      contrastText: brandColors.white,
    },

    // Backgrounds
    background: {
      default: brandColors.warmCream,
      paper: brandColors.white,
    },

    // Text colors
    text: {
      primary: brandColors.charcoal,
      secondary: '#666666', // Lighter charcoal
      disabled: '#999999',
    },

    // Dividers and borders
    divider: brandColors.softGray,

    // Action colors
    action: {
      active: brandColors.inkBlue,
      hover: 'rgba(30, 58, 95, 0.08)', // Ink blue with opacity
      selected: 'rgba(30, 58, 95, 0.12)',
      disabled: '#CCCCCC',
      disabledBackground: '#F5F5F5',
    },
  },

  // Typography system - New accessible font hierarchy
  typography: {
    fontFamily: typography.fontFamily.ui, // Default to Inter for UI

    // H1 - Hero Headlines (Merriweather, Bold, 48-64px desktop / 32-40px mobile)
    h1: {
      fontFamily: typography.fontFamily.hero,
      fontSize: typography.fontSize['5xl'], // 48px (will be responsive)
      fontWeight: typography.fontWeight.bold, // 700
      lineHeight: typography.lineHeight.tight,
      color: brandColors.charcoal,
      '@media (max-width: 768px)': {
        fontSize: typography.fontSize['3xl'], // 30px mobile
      },
    },

    // H2 - Section Headers (Roboto Mono, Medium, 24-32px desktop / 20-24px mobile)
    h2: {
      fontFamily: typography.fontFamily.section,
      fontSize: typography.fontSize['2xl'], // 24px
      fontWeight: typography.fontWeight.medium, // 500
      lineHeight: typography.lineHeight.tight,
      color: brandColors.charcoal,
      '@media (min-width: 1024px)': {
        fontSize: '2rem', // 32px desktop
      },
    },

    // H3 - Tertiary Headers / UI Labels (Inter, Semibold, 18-20px desktop / 16-18px mobile)
    h3: {
      fontFamily: typography.fontFamily.ui,
      fontSize: typography.fontSize.lg, // 18px
      fontWeight: typography.fontWeight.semibold, // 600
      lineHeight: typography.lineHeight.tight,
      color: brandColors.charcoal,
      '@media (min-width: 1024px)': {
        fontSize: typography.fontSize.xl, // 20px desktop
      },
    },

    // H4-H6 - Additional hierarchy levels using Inter
    h4: {
      fontFamily: typography.fontFamily.ui,
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.semibold,
      lineHeight: typography.lineHeight.normal,
      color: brandColors.charcoal,
    },
    h5: {
      fontFamily: typography.fontFamily.ui,
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.semibold,
      lineHeight: typography.lineHeight.normal,
      color: brandColors.charcoal,
    },
    h6: {
      fontFamily: typography.fontFamily.ui,
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.semibold,
      lineHeight: typography.lineHeight.normal,
      color: brandColors.charcoal,
    },

    // Body text - Inter for readability
    body1: {
      fontFamily: typography.fontFamily.ui,
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.regular,
      lineHeight: typography.lineHeight.relaxed,
      color: brandColors.charcoal,
    },
    body2: {
      fontFamily: typography.fontFamily.ui,
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.regular,
      lineHeight: typography.lineHeight.normal,
      color: brandColors.charcoal,
    },

    // UI elements - Inter for clarity
    button: {
      fontFamily: typography.fontFamily.ui,
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.medium,
      textTransform: 'none', // Keep natural casing
      letterSpacing: '0.01em',
    },
    caption: {
      fontFamily: typography.fontFamily.ui,
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.regular,
      lineHeight: typography.lineHeight.normal,
      color: '#666666',
    },
    overline: {
      fontFamily: typography.fontFamily.ui,
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.medium,
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      color: '#666666',
    },
  },

  // Spacing system (8px base)
  spacing: (factor: number) => spacing.sm * factor,

  // Shape/Border radius
  shape: {
    borderRadius: borderRadius.md,
  },

  // Shadows - subtle and warm
  shadows: [
    shadows.none,
    shadows.sm,
    shadows.base,
    shadows.md,
    shadows.lg,
    shadows.xl,
    shadows.xl, // Repeat for Material-UI's expected array length
    shadows.xl,
    shadows.xl,
    shadows.xl,
    shadows.xl,
    shadows.xl,
    shadows.xl,
    shadows.xl,
    shadows.xl,
    shadows.xl,
    shadows.xl,
    shadows.xl,
    shadows.xl,
    shadows.xl,
    shadows.xl,
    shadows.xl,
    shadows.xl,
    shadows.xl,
    shadows.xl,
  ],

  // Component overrides
  components: {
    // Button styling
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: borderRadius.lg,
          textTransform: 'none',
          fontFamily: typography.fontFamily.ui, // Use Inter for buttons
          fontWeight: typography.fontWeight.medium,
          padding: `${spacing.sm}px ${spacing.lg}px`,
          fontSize: typography.fontSize.base,
        },
        containedPrimary: {
          backgroundColor: brandColors.inkBlue,
          color: brandColors.white,
          '&:hover': {
            backgroundColor: '#152B47', // Darker ink blue
          },
        },
        containedSecondary: {
          backgroundColor: brandColors.mustardYellow,
          color: brandColors.charcoal,
          '&:hover': {
            backgroundColor: '#C19E04', // Darker mustard
          },
        },
        outlined: {
          borderColor: brandColors.inkBlue,
          color: brandColors.inkBlue,
          borderWidth: 2,
          '&:hover': {
            borderWidth: 2,
            backgroundColor: 'rgba(30, 58, 95, 0.08)',
          },
        },
      },
    },

    // Card styling
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: borderRadius.lg,
          boxShadow: shadows.base,
          backgroundColor: brandColors.white,
        },
      },
    },

    // Paper styling
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: brandColors.white,
        },
        elevation1: {
          boxShadow: shadows.sm,
        },
        elevation2: {
          boxShadow: shadows.base,
        },
        elevation3: {
          boxShadow: shadows.md,
        },
      },
    },

    // Chip styling
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: borderRadius.xl,
          fontWeight: typography.fontWeight.medium,
        },
        colorPrimary: {
          backgroundColor: brandColors.inkBlue,
          color: brandColors.white,
        },
      },
    },
  },
});
