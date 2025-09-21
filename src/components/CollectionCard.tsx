'use client';

import { Add as AddIcon, People as PeopleIcon } from '@mui/icons-material';
import ConstructionIcon from '@mui/icons-material/Construction';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Tooltip,
} from '@mui/material';
import { useRouter } from 'next/navigation';

import { brandColors, spacing } from '@/theme/brandTokens';

interface CollectionCardProps {
  collection: {
    id: string;
    name: string;
    description?: string | null;
    location?: string | null;
    memberCount: number;
    itemCount: number;
    role: string;
  };
}

export function CollectionCard({ collection }: CollectionCardProps) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/collection/${collection.id}`);
  };

  const getStatusConfig = () => {
    switch (collection.role) {
      case 'owner':
        return {
          backgroundColor: brandColors.warmCream,
          borderColor: brandColors.inkBlue,
          roleChip: {
            label: '👑 Owner',
            color: brandColors.inkBlue,
            textColor: brandColors.white,
          },
        };
      case 'admin':
        return {
          backgroundColor: '#FFF8E1',
          borderColor: brandColors.mustardYellow,
          roleChip: {
            label: '⭐ Admin',
            color: brandColors.mustardYellow,
            textColor: brandColors.charcoal,
          },
        };
      default:
        return {
          backgroundColor: '#F0F7FF',
          borderColor: '#B8D4F0',
          roleChip: {
            label: '👤 Member',
            color: '#B8D4F0',
            textColor: brandColors.charcoal,
          },
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Card
      onClick={handleClick}
      sx={{
        backgroundColor: config.backgroundColor,
        border: `1px solid ${config.borderColor}`,
        borderRadius: spacing.md / 16,
        position: 'relative',
        overflow: 'visible',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        transition: 'transform 0.2s ease',
        cursor: 'pointer',
        mb: 1, // 8px bottom margin for vertical spacing
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
        },
        // Collection pocket tab to match item cards
        '&::before': {
          content: '""',
          position: 'absolute',
          top: -8,
          right: 20,
          width: 60,
          height: 16,
          backgroundColor: config.borderColor,
          borderRadius: '8px 8px 0 0',
        },
      }}
    >
      <CardContent sx={{ p: spacing.md / 16 }}>
        {/* Collection Icon Area - Square */}
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            aspectRatio: '1/1', // Square aspect ratio like item images
            backgroundColor: 'rgba(255,255,255,0.5)',
            borderRadius: spacing.sm / 16,
            border: '1px solid #E0E0E0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: spacing.sm / 16,
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
            }}
          >
            <PeopleIcon
              sx={{
                fontSize: 32,
                color: config.borderColor,
              }}
            />
            <Typography
              variant="caption"
              sx={{
                fontWeight: 600,
                color: brandColors.charcoal,
                fontSize: '0.8rem',
              }}
            >
              {collection.memberCount}{' '}
              {collection.memberCount === 1 ? 'member' : 'members'}
            </Typography>
          </Box>

          {/* Owner indicator: egalitarian "Started" chip with leaf icon */}
          {collection.role === 'owner' && (
            <Tooltip title="You own this library" arrow>
              <Chip
                icon={<ConstructionIcon sx={{ fontSize: 16 }} />}
                label="Owner"
                size="small"
                sx={{
                  position: 'absolute',
                  top: 4,
                  left: 4,
                  backgroundColor: '#E8F5E8',
                  color: '#2E7D32',
                  fontWeight: 600,
                  '& .MuiChip-icon': {
                    color: '#2E7D32',
                    mr: 0.5,
                  },
                }}
                aria-label="You own this library"
              />
            </Tooltip>
          )}
        </Box>

        {/* Collection Name */}
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            color: brandColors.charcoal,
            mb: spacing.sm / 16,
            fontSize: '1rem',
            lineHeight: 1.3,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {collection.name}
        </Typography>

        {/* Info Chip - Items count */}
        <Chip
          label={`${collection.itemCount} ${collection.itemCount === 1 ? 'item' : 'items'}`}
          size="small"
          sx={{
            backgroundColor: config.roleChip.color,
            color: config.roleChip.textColor,
            fontSize: '0.7rem',
            alignSelf: 'flex-start',
          }}
        />
      </CardContent>
    </Card>
  );
}

interface CreateCollectionCardProps {
  onClick: () => void;
}

export function CreateCollectionCard({ onClick }: CreateCollectionCardProps) {
  const handleClick = () => {
    onClick();
  };

  return (
    <Card
      onClick={handleClick}
      sx={{
        cursor: 'pointer',
        position: 'relative',
        border: '2px dashed',
        borderColor: brandColors.mustardYellow,
        backgroundColor: 'rgba(244, 187, 68, 0.1)',
        borderRadius: spacing.md / 16,
        overflow: 'visible',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        transition: 'all 0.3s ease',
        mb: 1, // 8px bottom margin for vertical spacing
        '&:hover': {
          borderColor: brandColors.charcoal,
          backgroundColor: 'rgba(244, 187, 68, 0.2)',
          transform: 'translateY(-2px)',
          boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
        },
        // Collection pocket tab to match other cards
        '&::before': {
          content: '""',
          position: 'absolute',
          top: -8,
          right: 20,
          width: 60,
          height: 16,
          backgroundColor: brandColors.mustardYellow,
          borderRadius: '8px 8px 0 0',
        },
      }}
    >
      <CardContent sx={{ p: spacing.md / 16 }}>
        {/* Square area matching collection card dimensions */}
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            aspectRatio: '1/1', // Square aspect ratio like collection cards
            backgroundColor: 'rgba(244, 187, 68, 0.1)',
            borderRadius: spacing.sm / 16,
            border: '2px dashed',
            borderColor: brandColors.mustardYellow,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: spacing.sm / 16,
            overflow: 'hidden',
          }}
        >
          <AddIcon
            sx={{
              fontSize: 48,
              color: brandColors.mustardYellow,
            }}
          />
        </Box>

        {/* Collection Name */}
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            color: brandColors.charcoal,
            mb: spacing.sm / 16,
            fontSize: '1rem',
            lineHeight: 1.3,
            textAlign: 'center',
          }}
        >
          Start a New Library
        </Typography>

        {/* No chip needed for CreateCollection card */}
      </CardContent>
    </Card>
  );
}
