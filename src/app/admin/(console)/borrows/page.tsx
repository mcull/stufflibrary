import { Box } from '@mui/material';

import { console_, consoleType } from '@/components/admin/console/tokens';
import { VintageStamp } from '@/components/member-home/VintageStamp';
import { brandColors } from '@/theme/brandTokens';

export default function AdminConsoleBorrowsPage() {
  return (
    <Box
      sx={{
        border: `2px dashed ${console_.dashedLine}`,
        borderRadius: '8px',
        padding: '40px',
        textAlign: 'center',
      }}
    >
      <Box
        component="span"
        sx={{
          ...consoleType.overline,
          color: brandColors.inkBlue,
          display: 'block',
          marginBottom: '12px',
        }}
      >
        BORROW BOARD — QUEUED
      </Box>
      <Box
        component="p"
        sx={{
          fontFamily: '"Roboto Mono", monospace',
          fontSize: '11px',
          color: console_.textSecondary,
          margin: '0 0 16px 0',
        }}
      >
        The four-column state board (requested · out · overdue · returned) lands
        in its own PR.
      </Box>
      <VintageStamp label="PLACEHOLDER" ink="#8B6A00" rotation={-3} />
    </Box>
  );
}
