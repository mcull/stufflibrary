'use client';

import { Box, Typography } from '@mui/material';
import { useRouter } from 'next/navigation';

import { itemStamp, restingRotation } from '@/lib/member-home';
import { brandColors } from '@/theme/brandTokens';

import { VintageStamp } from './VintageStamp';
import { vintage, vintageFonts } from './vintageTokens';

const STAMP_ROTATIONS = [-3, 2, -2, 3] as const;

/** The minimal shape a shelf card needs (owned or borrowed items alike). */
export interface ShelfItem {
  id: string;
  name: string;
  imageUrl?: string | null | undefined;
  watercolorUrl?: string | null | undefined;
  watercolorThumbUrl?: string | null | undefined;
  status: string;
  borrowRequest?:
    | { requestedReturnDate?: string | Date | null | undefined }
    | null
    | undefined;
}

/** One item on the shelf: watercolor, typed name, status stamp. */
export function ShelfItemCard({
  item,
  index,
}: {
  item: ShelfItem;
  index: number;
}) {
  const router = useRouter();
  const stamp = itemStamp(item);
  const art = item.watercolorThumbUrl || item.watercolorUrl || item.imageUrl;

  return (
    <Box
      onClick={() => router.push(`/stuff/${item.id}?src=mystuff`)}
      sx={{
        background: brandColors.white,
        border: `1.5px solid ${vintage.cardBorder}`,
        borderRadius: '8px',
        padding: '16px 16px 14px',
        transform: `rotate(${restingRotation(index)}deg)`,
        transition: 'transform 0.3s ease',
        cursor: 'pointer',
        '&:hover': { transform: 'rotate(0deg) translateY(-5px)' },
      }}
    >
      {art ? (
        <Box
          component="img"
          src={art}
          alt={item.name}
          sx={{
            width: '100%',
            aspectRatio: '1.05',
            objectFit: 'cover',
            borderRadius: '6px',
            display: 'block',
            mb: '12px',
          }}
        />
      ) : (
        <Box
          sx={{
            width: '100%',
            aspectRatio: '1.05',
            borderRadius: '6px',
            mb: '12px',
            background: vintage.manila,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '34px',
            opacity: 0.6,
          }}
        >
          📦
        </Box>
      )}
      <Typography
        sx={{
          fontFamily: vintageFonts.mono,
          fontSize: '13px',
          color: brandColors.inkBlue,
          mb: '8px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {item.name}
      </Typography>
      <VintageStamp
        label={stamp.label}
        ink={stamp.ink}
        rotation={STAMP_ROTATIONS[index % STAMP_ROTATIONS.length]!}
      />
    </Box>
  );
}

/** Dashed "add to your shelf" card. */
export function AddShelfCard({ onClick }: { onClick: () => void }) {
  return (
    <Box
      onClick={onClick}
      sx={{
        border: `2px dashed ${vintage.darkMustard}`,
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        textAlign: 'center',
        padding: '16px',
        minHeight: 220,
        cursor: 'pointer',
        transition: 'transform 0.25s ease, background 0.25s ease',
        '&:hover': {
          transform: 'translateY(-5px)',
          background: 'rgba(227,181,5,0.08)',
        },
      }}
    >
      <Box
        sx={{
          width: 46,
          height: 46,
          border: `2px solid ${vintage.darkMustard}`,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          color: vintage.darkMustard,
        }}
      >
        ＋
      </Box>
      <Typography
        sx={{
          fontFamily: vintageFonts.serif,
          fontWeight: 700,
          fontSize: '16px',
          color: brandColors.inkBlue,
        }}
      >
        Add to your shelf
      </Typography>
      <Typography
        sx={{
          fontFamily: vintageFonts.mono,
          fontSize: '11.5px',
          color: 'rgba(63,52,43,0.6)',
        }}
      >
        Snap a photo — we paint the watercolor
      </Typography>
    </Box>
  );
}
