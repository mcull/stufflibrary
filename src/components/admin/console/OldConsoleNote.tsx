import { Box } from '@mui/material';

import { console_ } from './tokens';

/**
 * A mono note flagging a screen that still runs the pre-revamp admin tool
 * under the new console chrome. Honest about what hasn't been restyled yet
 * instead of pretending it has.
 */
export function OldConsoleNote() {
  return (
    <Box
      component="p"
      sx={{
        fontFamily: '"Roboto Mono", monospace',
        fontSize: '10.5px',
        color: console_.textMuted,
        letterSpacing: '1.5px',
        textTransform: 'uppercase',
        marginBottom: '16px',
        marginTop: 0,
      }}
    >
      OLD CONSOLE — the Circulation Desk restyle for this screen is queued.
    </Box>
  );
}
