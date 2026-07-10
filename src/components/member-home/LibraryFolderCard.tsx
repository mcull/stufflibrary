'use client';

import { Box, Typography } from '@mui/material';
import { useRouter } from 'next/navigation';

import type { Collection } from '@/hooks/useCollections';
import { folderTabLabel } from '@/lib/member-home';
import { brandColors } from '@/theme/brandTokens';

import { VintageStamp } from './VintageStamp';
import { vintage, vintageFonts } from './vintageTokens';

const ROLE_STAMP: Record<string, { label: string; ink: string }> = {
  owner: { label: 'OWNER', ink: brandColors.tomatoRed },
  admin: { label: 'ADMIN', ink: vintage.darkMustard },
  member: { label: 'MEMBER', ink: brandColors.inkBlue },
};

/** Manila folder card for one library: tab, watercolor peek, role stamp. */
export function LibraryFolderCard({ collection }: { collection: Collection }) {
  const router = useRouter();
  const previews = collection.itemPreviews ?? [];
  const role = ROLE_STAMP[collection.role] ?? ROLE_STAMP.member!;
  const loansOut = collection.loansOut ?? 0;

  return (
    <Box
      onClick={() => router.push(`/library/${collection.id}`)}
      sx={{ position: 'relative', mt: '14px', cursor: 'pointer' }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: '-14px',
          left: '20px',
          background: brandColors.inkBlue,
          color: brandColors.warmCream,
          fontFamily: vintageFonts.mono,
          fontSize: '12px',
          fontWeight: 700,
          letterSpacing: '0.1em',
          padding: '4px 14px',
          borderRadius: '6px 6px 0 0',
        }}
      >
        {folderTabLabel(collection.name)}
      </Box>
      <Box
        sx={{
          background: vintage.manila,
          border: `2px solid ${brandColors.inkBlue}`,
          borderRadius: '0 8px 8px 8px',
          padding: '24px 24px 20px',
          transition: 'transform 0.25s ease, box-shadow 0.25s ease',
          '&:hover': {
            transform: 'translateY(-5px) rotate(-0.5deg)',
            boxShadow: '0 14px 26px rgba(30,58,95,0.18)',
          },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: '16px',
          }}
        >
          <Box sx={{ height: 58, display: 'flex', alignItems: 'center' }}>
            {previews.length > 0 ? (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {previews.slice(0, 3).map((url, i) => (
                  <Box
                    key={url}
                    component="img"
                    src={url}
                    alt=""
                    sx={{
                      width: 52,
                      height: 52,
                      objectFit: 'cover',
                      borderRadius: '50%',
                      border: `2px solid ${vintage.drawerPaper}`,
                      boxShadow: '0 2px 6px rgba(63,52,43,0.2)',
                      ml: i === 0 ? 0 : '-14px',
                    }}
                  />
                ))}
              </Box>
            ) : (
              // Monogram fallback for a library with no illustrated items yet.
              <Box
                sx={{
                  width: 54,
                  height: 54,
                  border: `2.5px solid ${brandColors.inkBlue}`,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: vintageFonts.serif,
                  fontWeight: 900,
                  fontSize: '27px',
                  color: brandColors.inkBlue,
                }}
              >
                {collection.name.trim()[0]?.toUpperCase() || 'S'}
              </Box>
            )}
          </Box>
          <VintageStamp
            label={role!.label}
            ink={role!.ink}
            rotation={8}
            fontSize={13}
            borderWidth={2.5}
            letterSpacing="0.15em"
          />
        </Box>
        <Typography
          sx={{
            fontFamily: vintageFonts.serif,
            fontWeight: 700,
            fontSize: '21px',
            color: brandColors.inkBlue,
            mb: '6px',
          }}
        >
          {collection.name}
        </Typography>
        <Typography
          sx={{
            fontFamily: vintageFonts.mono,
            fontSize: '12.5px',
            color: 'rgba(63,52,43,0.65)',
            mb: '16px',
          }}
        >
          {collection.memberCount} member
          {collection.memberCount === 1 ? '' : 's'} · {collection.itemCount}{' '}
          item{collection.itemCount === 1 ? '' : 's'} on the shelf
        </Typography>
        <Box
          sx={{
            borderTop: `1.5px dashed ${vintage.ruledLine}`,
            pt: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography
            component="span"
            sx={{
              fontFamily: vintageFonts.mono,
              fontSize: '12px',
              color: vintage.stampBrown,
              whiteSpace: 'nowrap',
            }}
          >
            {loansOut} loan{loansOut === 1 ? '' : 's'} out
          </Typography>
          <Typography
            component="span"
            sx={{
              fontFamily: vintageFonts.mono,
              fontSize: '13px',
              fontWeight: 700,
              color: brandColors.tomatoRed,
              whiteSpace: 'nowrap',
            }}
          >
            Open drawer →
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

/** Dashed "start a new library" folder. */
export function NewLibraryFolderCard({ onClick }: { onClick: () => void }) {
  return (
    <Box
      onClick={onClick}
      sx={{ position: 'relative', mt: '14px', cursor: 'pointer' }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: '-14px',
          left: '20px',
          background: brandColors.mustardYellow,
          color: brandColors.inkBlue,
          fontFamily: vintageFonts.mono,
          fontSize: '12px',
          fontWeight: 700,
          letterSpacing: '0.1em',
          padding: '4px 14px',
          borderRadius: '6px 6px 0 0',
        }}
      >
        NEW
      </Box>
      <Box
        sx={{
          border: `2px dashed ${vintage.darkMustard}`,
          borderRadius: '0 8px 8px 8px',
          padding: '24px',
          minHeight: 208,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          textAlign: 'center',
          transition: 'transform 0.25s ease, background 0.25s ease',
          '&:hover': {
            transform: 'translateY(-5px)',
            background: 'rgba(227,181,5,0.08)',
          },
        }}
      >
        <Box
          sx={{
            width: 54,
            height: 54,
            border: `2px solid ${vintage.darkMustard}`,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px',
            color: vintage.darkMustard,
          }}
        >
          ＋
        </Box>
        <Typography
          sx={{
            fontFamily: vintageFonts.serif,
            fontWeight: 700,
            fontSize: '18px',
            color: brandColors.inkBlue,
          }}
        >
          Start a new library
        </Typography>
        <Typography
          sx={{
            fontFamily: vintageFonts.mono,
            fontSize: '12px',
            color: 'rgba(63,52,43,0.6)',
            maxWidth: 220,
          }}
        >
          Open a branch for your street, building, or crew
        </Typography>
      </Box>
    </Box>
  );
}

/** Dashed empty state for the joined-libraries section. */
export function JoinedEmptyState({
  onInvite,
  previewUrl,
}: {
  onInvite: () => void;
  previewUrl?: string | undefined;
}) {
  return (
    <Box
      sx={{
        border: `1.5px dashed ${vintage.ruledLine}`,
        borderRadius: '8px',
        padding: '28px',
        display: 'flex',
        alignItems: { xs: 'flex-start', sm: 'center' },
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between',
        gap: '24px',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
        {previewUrl && (
          <Box
            component="img"
            src={previewUrl}
            alt=""
            sx={{
              width: 46,
              height: 46,
              objectFit: 'cover',
              borderRadius: '50%',
              opacity: 0.55,
            }}
          />
        )}
        <Box>
          <Typography
            sx={{
              fontFamily: vintageFonts.typewriter,
              fontSize: '18px',
              color: brandColors.inkBlue,
            }}
          >
            No memberships yet.
          </Typography>
          <Typography
            sx={{
              fontFamily: vintageFonts.mono,
              fontSize: '12.5px',
              color: 'rgba(63,52,43,0.6)',
            }}
          >
            When a neighbor invites you, their branch shows up here.
          </Typography>
        </Box>
      </Box>
      <Typography
        component="button"
        onClick={onInvite}
        sx={{
          fontFamily: vintageFonts.mono,
          fontSize: '13px',
          fontWeight: 700,
          color: brandColors.inkBlue,
          background: 'none',
          border: 'none',
          borderBottom: `2px solid ${brandColors.mustardYellow}`,
          paddingBottom: '2px',
          whiteSpace: 'nowrap',
          borderRadius: 0,
          cursor: 'pointer',
          '&:hover': { color: brandColors.tomatoRed },
        }}
      >
        Invite a neighbor instead →
      </Typography>
    </Box>
  );
}
