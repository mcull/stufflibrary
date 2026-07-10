'use client';

import { Box, Typography } from '@mui/material';

import { CivicMarkdown } from '@/components/civic/CivicMarkdown';
import { CivicPage } from '@/components/civic/CivicPage';
import {
  stateSlug,
  type DirectoryEntry,
  type DirectoryState,
} from '@/lib/lending-libraries';
import { brandColors } from '@/theme/brandTokens';

const TYPEWRITER = '"Special Elite", "Courier New", monospace';
const MONO = '"Roboto Mono", monospace';

function Entry({ entry }: { entry: DirectoryEntry }) {
  return (
    <Box
      component="article"
      sx={{
        background: brandColors.white,
        border: '1.5px solid #E4DCC8',
        borderRadius: '8px',
        p: { xs: 2, md: 2.5 },
        mb: 2,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'baseline',
          gap: 1,
        }}
      >
        <Typography
          component="h3"
          sx={{
            fontWeight: 700,
            fontSize: '17px',
            color: brandColors.inkBlue,
            m: 0,
          }}
        >
          {entry.url ? (
            <Box
              component="a"
              href={entry.url}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                color: 'inherit',
                textDecorationColor: brandColors.mustardYellow,
                textDecorationThickness: '2px',
                textUnderlineOffset: '3px',
                '&:hover': { color: brandColors.tomatoRed },
              }}
            >
              {entry.name}
            </Box>
          ) : (
            entry.name
          )}
        </Typography>
        <Typography sx={{ fontSize: '14px', color: 'rgba(63,52,43,0.7)' }}>
          {entry.city}
        </Typography>
        {!entry.verified && (
          <Typography
            component="span"
            sx={{
              fontFamily: MONO,
              fontSize: '10px',
              letterSpacing: '0.1em',
              color: '#8b4513',
              border: '1px solid #8b4513',
              borderRadius: '3px',
              px: '6px',
              py: '1px',
            }}
            title={
              entry.verifiedNote ??
              'Signs of life we could not fully confirm; call before you drive.'
            }
          >
            UNVERIFIED
          </Typography>
        )}
      </Box>
      <Typography
        sx={{
          fontFamily: MONO,
          fontSize: '11px',
          letterSpacing: '0.06em',
          color: 'rgba(63,52,43,0.6)',
          mt: 0.5,
          mb: 1,
          textTransform: 'lowercase',
        }}
      >
        {entry.type}
      </Typography>
      <Box sx={{ fontSize: '15px', '& p': { m: 0 } }}>
        <CivicMarkdown content={entry.description} />
      </Box>
      {(entry.address || entry.hours) && (
        <Typography
          sx={{ fontSize: '13px', color: 'rgba(63,52,43,0.7)', mt: 1 }}
        >
          {entry.address}
          {entry.address && entry.hours ? ' · ' : ''}
          {entry.hours ? `Hours: ${entry.hours}` : ''}
        </Typography>
      )}
      {entry.verified && (
        <Typography
          sx={{
            fontFamily: MONO,
            fontSize: '11px',
            color: 'rgba(63,52,43,0.5)',
            mt: 1,
          }}
        >
          verified July 2026
          {entry.verifiedNote ? ` — ${entry.verifiedNote}` : ''}
        </Typography>
      )}
    </Box>
  );
}

export function DirectoryContent({
  intro,
  states,
}: {
  intro: string;
  states: DirectoryState[];
}) {
  return (
    <CivicPage
      kicker="BORROW NEARBY"
      title="Lending Libraries of Things: A State-by-State Directory"
      snapshot="Snapshot: July 2026 · re-verified annually"
    >
      <CivicMarkdown content={intro} />

      {/* State index — anchor navigation for a long reference page. */}
      <Box
        component="nav"
        aria-label="Jump to a state"
        sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, my: 4 }}
      >
        {states.map((state) => (
          <Box
            key={state.name}
            component="a"
            href={`#${stateSlug(state.name)}`}
            sx={{
              fontFamily: MONO,
              fontSize: '12px',
              color: brandColors.inkBlue,
              textDecoration: 'none',
              border: '1px solid rgba(30,58,95,0.3)',
              borderRadius: '3px',
              px: '8px',
              py: '3px',
              '&:hover': {
                background: brandColors.inkBlue,
                color: brandColors.warmCream,
              },
            }}
          >
            {state.name}
          </Box>
        ))}
      </Box>

      {states.map((state) => (
        <Box
          key={state.name}
          component="section"
          id={stateSlug(state.name)}
          sx={{ mb: 5, scrollMarginTop: '90px' }}
        >
          <Typography
            component="h2"
            sx={{
              fontFamily: TYPEWRITER,
              fontSize: { xs: '25px', md: '30px' },
              color: brandColors.inkBlue,
              borderBottom: `2px solid ${brandColors.inkBlue}`,
              pb: 1,
              mb: 2,
            }}
          >
            {state.name}
          </Typography>
          {state.entries.map((entry) => (
            <Entry key={`${entry.name}-${entry.city}`} entry={entry} />
          ))}
        </Box>
      ))}

      <Typography sx={{ fontSize: '15px', color: 'rgba(63,52,43,0.8)', mt: 4 }}>
        Know one we missed, or spot something stale?{' '}
        <Box
          component="a"
          href="/feedback"
          sx={{
            color: brandColors.inkBlue,
            textDecorationColor: brandColors.mustardYellow,
            '&:hover': { color: brandColors.tomatoRed },
          }}
        >
          Tell us
        </Box>{' '}
        — this page gets better the way everything in the commons does: neighbor
        by neighbor.
      </Typography>
    </CivicPage>
  );
}
