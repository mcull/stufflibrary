'use client';

import { Add as AddIcon } from '@mui/icons-material';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Avatar,
} from '@mui/material';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

import { brandColors, spacing } from '@/theme/brandTokens';

interface ItemCardProps {
  item: any;
  status: 'ready-to-lend' | 'on-loan' | 'offline' | 'borrowed';
}

export function UserItemCard({ item, status }: ItemCardProps) {
  const router = useRouter();

  const handleClick = () => {
    // Always go to item details page, but extract the correct item ID based on data structure
    const itemId = item.item?.id || item.id; // For borrow requests: item.item.id, for direct items: item.id
    if (itemId) {
      router.push(`/stuff/${itemId}?src=mystuff`);
    }
  };

  const getStatusConfig = () => {
    switch (status) {
      case 'ready-to-lend':
        return {
          backgroundColor: brandColors.warmCream,
          borderColor: '#D4C4A8',
        };
      case 'on-loan':
        return {
          backgroundColor: '#FFF8E1',
          borderColor: brandColors.mustardYellow,
          statusChip: {
            label: 'Checked out',
            color: '#FFF3E0',
            textColor: '#F57C00',
          },
        };
      case 'offline':
        return {
          backgroundColor: '#F3E5F5',
          borderColor: '#9C27B0',
          statusChip: {
            label: 'Taken offline',
            color: '#F3E5F5',
            textColor: '#7B1FA2',
          },
        };
      case 'borrowed':
        return {
          backgroundColor: '#FFEBEE',
          borderColor: brandColors.tomatoRed,
          statusChip: {
            label: item.lender ? `From ${item.lender.name}` : 'Borrowed',
            color: '#FFEBEE',
            textColor: '#C62828',
          },
        };
      default:
        return {
          backgroundColor: brandColors.warmCream,
          borderColor: '#D4C4A8',
        };
    }
  };

  const config = getStatusConfig();

  const truncateText = (text: string, maxLength: number = 18) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  const getInfoLozengeContent = () => {
    switch (status) {
      case 'ready-to-lend':
        const location = item.location || 'No location';
        return truncateText(location);
      case 'on-loan':
        return 'Checked out';
      case 'offline':
        return 'Not available to lend';
      case 'borrowed':
        const lender = item.lender?.name || 'Unknown';
        const dueDate = item.promisedReturnBy
          ? new Date(item.promisedReturnBy).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })
          : '';
        return `From ${lender}${dueDate ? ` due ${dueDate}` : ''}`;
      default:
        return '';
    }
  };

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
        // Library pocket tab
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
        {/* Item Image - Square */}
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            aspectRatio: '1/1', // Square aspect ratio
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
          {item.watercolorThumbUrl ||
          item.imageUrl ||
          item.item?.watercolorThumbUrl ||
          item.item?.imageUrl ? (
            <>
              <Image
                src={
                  (item.watercolorThumbUrl ||
                    item.imageUrl ||
                    item.item?.watercolorThumbUrl ||
                    item.item?.imageUrl)!
                }
                alt={item.name || 'Item'}
                fill
                style={{
                  objectFit: 'cover',
                  filter: !item.isAvailable ? 'grayscale(100%)' : 'none',
                  transition: 'filter 0.3s ease',
                }}
              />
              {/* Avatar Overlay for offline items - show borrower or owner */}
              {!item.isAvailable && (
                <Avatar
                  {...((item.activeBorrower?.image || item.owner?.image) && {
                    src: item.activeBorrower?.image || item.owner?.image,
                  })}
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    const userId = item.activeBorrower?.id || item.owner?.id;
                    if (userId) {
                      router.push(`/stuff/m/${userId}`);
                    }
                  }}
                  sx={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    width: 24,
                    height: 24,
                    cursor: 'pointer',
                    border: '1px solid white',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                    fontSize: '0.7rem',
                    '&:hover': {
                      transform: 'scale(1.1)',
                      transition: 'transform 0.2s ease',
                    },
                  }}
                >
                  {!(item.activeBorrower?.image || item.owner?.image) &&
                    (item.activeBorrower?.name?.[0] || item.owner?.name?.[0])}
                </Avatar>
              )}
            </>
          ) : (
            <Typography variant="h4" sx={{ opacity: 0.5 }}>
              📦
            </Typography>
          )}
        </Box>

        {/* Item Name */}
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
          {item.name || item.item?.name}
        </Typography>

        {/* Single Info Lozenge */}
        <Chip
          label={getInfoLozengeContent()}
          size="small"
          sx={{
            backgroundColor: config.statusChip?.color || '#F0F0F0',
            color: config.statusChip?.textColor || brandColors.charcoal,
            fontSize: '0.7rem',
            alignSelf: 'flex-start',
          }}
        />
      </CardContent>
    </Card>
  );
}

export function AddItemCard() {
  const router = useRouter();

  const handleClick = () => {
    router.push('/add-item');
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
        // Library pocket tab to match other cards
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
        {/* Square area matching item image dimensions */}
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            aspectRatio: '1/1', // Square aspect ratio like item images
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

        {/* Item Name */}
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
          Add Item
        </Typography>

        {/* No chip needed for AddItem card */}
      </CardContent>
    </Card>
  );
}
