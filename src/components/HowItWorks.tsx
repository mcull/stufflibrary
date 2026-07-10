import { Box, Typography } from '@mui/material';

import { brandColors } from '@/theme/brandTokens';

const TYPEWRITER = '"Special Elite", "Courier New", monospace';
const MONO = '"Roboto Mono", monospace';
const STAMP = 'Stampette, monospace';
const CARD_INK = '#2c1810';
const RULE = '#c9a97e';

const STEPS = [
  {
    number: '01',
    numberTilt: -1.5,
    ink: '#1e40af',
    title: 'Borrow what you need',
    body: "Browse your neighborhood's shelf and check items out — no awkward asking, no buying things you'll use twice.",
    stamp: 'DUE: 2 WKS',
    stampTilt: -8,
  },
  {
    number: '02',
    numberTilt: 1,
    ink: '#dc2626',
    title: 'Lend without stress',
    body: "Your idle stuff gets a catalog entry and a checkout card. You see who has what, and when it's coming back.",
    stamp: 'RETURNED',
    stampTilt: 6,
  },
  {
    number: '03',
    numberTilt: -0.5,
    ink: '#7c2d12',
    title: 'Belong to your branch',
    body: 'Every library is a real group of neighbors with shared norms. Borrowing is how you end up knowing the people next door.',
    stamp: 'WELL KEPT',
    stampTilt: -5,
  },
] as const;

/** How it works, told as a library checkout card on an ink-blue band. */
export function HowItWorks() {
  return (
    <Box
      id="how"
      component="section"
      sx={{
        background: brandColors.inkBlue,
        padding: { xs: '60px 20px', md: '90px 72px' },
      }}
    >
      <Typography
        component="h2"
        sx={{
          fontFamily: TYPEWRITER,
          fontWeight: 400,
          fontSize: { xs: '34px', md: '44px' },
          color: brandColors.warmCream,
          m: '0 0 12px 0',
          textAlign: 'center',
        }}
      >
        How it works
      </Typography>
      <Typography
        sx={{
          fontFamily: MONO,
          fontSize: '14px',
          color: 'rgba(249,245,235,0.65)',
          textAlign: 'center',
          m: '0 0 56px 0',
          letterSpacing: '0.1em',
        }}
      >
        SAME AS THE LIBRARY, BUT FOR STUFF
      </Typography>

      <Box
        sx={{
          maxWidth: 880,
          mx: 'auto',
          background: '#F6EFDC',
          borderRadius: '4px',
          boxShadow: '0 16px 36px rgba(0,0,0,0.3)',
          padding: { xs: '28px 20px', md: '44px 52px' },
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box
          component="img"
          src="/coffee_stains/noun-coffee-ring-1071952.svg"
          alt=""
          sx={{
            position: 'absolute',
            width: 190,
            right: 24,
            bottom: 12,
            opacity: 0.08,
            pointerEvents: 'none',
          }}
        />
        <Typography
          sx={{
            textAlign: 'center',
            fontFamily: STAMP,
            fontSize: '17px',
            letterSpacing: '0.25em',
            color: CARD_INK,
            mb: '26px',
          }}
        >
          ★ LIBRARY CHECKOUT CARD ★
        </Typography>

        {/* Column headers */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '48px 1fr', md: '90px 1fr 190px' },
            gap: '16px',
            borderBottom: '2px solid #8b4513',
            pb: '8px',
            fontFamily: STAMP,
            fontSize: '13px',
            letterSpacing: '0.12em',
            color: CARD_INK,
          }}
        >
          <Box>STEP</Box>
          <Box>WHAT HAPPENS</Box>
          <Box sx={{ display: { xs: 'none', md: 'block' } }}>STAMPED</Box>
        </Box>

        {STEPS.map((step, i) => (
          <Box
            key={step.number}
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '48px 1fr', md: '90px 1fr 190px' },
              gap: '16px',
              alignItems: 'center',
              padding: '22px 0',
              borderBottom: i < STEPS.length - 1 ? `1px solid ${RULE}` : 'none',
            }}
          >
            <Typography
              sx={{
                fontFamily: TYPEWRITER,
                fontSize: '30px',
                color: step.ink,
                transform: `rotate(${step.numberTilt}deg)`,
              }}
            >
              {step.number}
            </Typography>
            <Box>
              <Typography
                sx={{
                  fontFamily: TYPEWRITER,
                  fontSize: '20px',
                  color: step.ink,
                  mb: '4px',
                }}
              >
                {step.title}
              </Typography>
              <Typography
                sx={{
                  fontSize: '15px',
                  color: 'rgba(44,24,16,0.75)',
                  lineHeight: 1.5,
                }}
              >
                {step.body}
              </Typography>
            </Box>
            <Box
              sx={{
                display: { xs: 'none', md: 'block' },
                transform: `rotate(${step.stampTilt}deg)`,
                transition: 'transform 0.25s ease',
                '&:hover': {
                  transform: `rotate(${step.stampTilt / 2}deg) scale(1.06)`,
                },
              }}
            >
              <Box
                component="span"
                sx={{
                  border: `2.5px solid ${step.ink}`,
                  color: step.ink,
                  fontFamily: STAMP,
                  fontSize: '15px',
                  letterSpacing: '0.15em',
                  padding: '4px 12px',
                  borderRadius: '4px',
                  display: 'inline-block',
                  opacity: 0.85,
                  whiteSpace: 'nowrap',
                }}
              >
                {step.stamp}
              </Box>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
