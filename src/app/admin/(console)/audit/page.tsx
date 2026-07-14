import { Box } from '@mui/material';

import { console_, consoleType } from '@/components/admin/console/tokens';
import { VintageStamp } from '@/components/member-home/VintageStamp';
import { brandColors } from '@/theme/brandTokens';

const GHOST_HEADERS = ['TIME', 'ACTOR', 'ACTION', 'TARGET', 'DETAIL'];

const SKELETON_ROW_OPACITIES = [0.85, 0.65, 0.45, 0.25];

const WILL_RECORD_CHIPS = [
  'Admin actions',
  'Security events',
  'System jobs',
  'Append-only, exportable',
];

export default function AdminConsoleAuditPage() {
  return (
    <Box
      sx={{
        border: `2px dashed ${console_.dashedLine}`,
        borderRadius: '8px',
        padding: '40px',
        textAlign: 'left',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box
          component="span"
          sx={{ ...consoleType.overline, color: brandColors.inkBlue }}
        >
          AUDIT LEDGER — BLOCKED OUT
        </Box>
        <VintageStamp label="PLACEHOLDER" ink="#8B6A00" rotation={2} />
      </Box>

      <Box
        component="p"
        sx={{
          fontFamily: '"Roboto Mono", monospace',
          fontSize: '11px',
          color: console_.textSecondary,
          margin: '16px 0 0 0',
        }}
      >
        This tab is reserved for an append-only admin event log. It ships
        blocked out on purpose — no fake data — and gets wired up when the
        server-side ledger exists.
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
          gap: '12px',
          borderBottom: `2px solid ${brandColors.inkBlue}`,
          paddingBottom: '8px',
          marginTop: '24px',
        }}
      >
        {GHOST_HEADERS.map((header) => (
          <Box
            key={header}
            component="span"
            sx={{ ...consoleType.overline, color: console_.textMuted }}
          >
            {header}
          </Box>
        ))}
      </Box>

      {SKELETON_ROW_OPACITIES.map((opacity, rowIndex) => (
        <Box
          key={rowIndex}
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
            gap: '12px',
            marginTop: '14px',
            opacity,
          }}
        >
          {GHOST_HEADERS.map((header) => (
            <Box
              key={`${rowIndex}-${header}`}
              sx={{
                height: '10px',
                borderRadius: '2px',
                backgroundColor: console_.dashedLineFaint,
              }}
            />
          ))}
        </Box>
      ))}

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
          marginTop: '28px',
        }}
      >
        <Box
          component="span"
          sx={{
            fontFamily: '"Roboto Mono", monospace',
            fontSize: '10px',
            color: console_.textMuted,
            marginRight: '4px',
          }}
        >
          WILL RECORD:
        </Box>
        {WILL_RECORD_CHIPS.map((chip) => (
          <Box
            key={chip}
            component="span"
            sx={{
              border: `1px solid ${console_.cardBorder}`,
              borderRadius: '3px',
              padding: '3px 8px',
              fontFamily: '"Roboto Mono", monospace',
              fontSize: '10px',
              color: console_.textSecondary,
            }}
          >
            {chip}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
