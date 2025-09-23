'use client';

import {
  Person as PersonIcon,
  Notifications as NotificationsIcon,
} from '@mui/icons-material';
import {
  Card,
  CardContent,
  Typography,
  Chip,
  Box,
  Avatar,
  Badge,
} from '@mui/material';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

import { brandColors, spacing } from '@/theme/brandTokens';

interface LibraryItemCardProps {
  item: {
    id: string;
    name: string;
    description?: string;
    condition: string;
    imageUrl?: string;
    watercolorThumbUrl?: string;
    isAvailable: boolean;
    createdAt: string;
    category: string;
    stuffType?: {
      displayName: string;
      iconPath: string;
      category: string;
    };
    owner: {
      id: string;
      name?: string;
      image?: string;
    };
    isOwnedByUser: boolean;
    currentBorrow?: {
      id: string;
      borrower: {
        id: string;
        name?: string;
        image?: string;
      };
      lender: {
        id: string;
        name?: string;
        image?: string;
      };
      dueDate: string;
      borrowedAt: string;
    };
    notificationQueue: Array<{
      id: string;
      user: {
        id: string;
        name?: string;
        image?: string;
      };
      requestedAt: string;
    }>;
    queueDepth: number;
  };
  libraryId?: string;
}

export function LibraryItemCard({ item, libraryId }: LibraryItemCardProps) {
  const router = useRouter();

  const handleClick = () => {
    const qp = libraryId ? `?src=library&lib=${libraryId}` : '';
    router.push(`/stuff/${item.id}${qp}`);
  };

  const getStatusConfig = () => {
    if (item.currentBorrow) {
      // Check if this is a self-borrow (offline item)
      const isOffline =
        item.currentBorrow.borrower.id === item.currentBorrow.lender.id;

      if (isOffline) {
        return {
          backgroundColor: '#F3E5F5',
          borderColor: '#9C27B0',
          statusChip: {
            label: 'Offline',
            color: '#F3E5F5',
            textColor: '#7B1FA2',
          },
        };
      } else {
        return {
          backgroundColor: '#FFF8E1',
          borderColor: brandColors.mustardYellow,
          statusChip: {
            label: 'Checked out',
            color: '#FFF3E0',
            textColor: '#F57C00',
          },
        };
      }
    } else if (item.isAvailable) {
      return {
        backgroundColor: brandColors.warmCream,
        borderColor: '#D4C4A8',
        statusChip: {
          label: 'Available',
          color: '#E8F5E8',
          textColor: '#2E7D32',
        },
      };
    } else {
      // If not available and no currentBorrow, this might be a data inconsistency
      // Show as checked out but with generic message since we don't have borrower info
      return {
        backgroundColor: '#FFF8E1',
        borderColor: brandColors.mustardYellow,
        statusChip: {
          label: 'Checked out',
          color: '#FFF3E0',
          textColor: '#F57C00',
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
          {item.watercolorThumbUrl ? (
            <>
              <Image
                src={item.watercolorThumbUrl}
                alt={item.name || 'Item'}
                fill
                style={{
                  objectFit: 'cover',
                  filter: !item.isAvailable ? 'grayscale(100%)' : 'none',
                  transition: 'filter 0.3s ease',
                }}
              />
              {/* Avatar Overlay for offline/borrowed items */}
              {(!item.isAvailable || item.currentBorrow) &&
                (() => {
                  // Check if this is a self-borrow (offline item)
                  const isOffline =
                    item.currentBorrow &&
                    item.currentBorrow.borrower.id ===
                      item.currentBorrow.lender.id;

                  // For offline items, show owner's avatar; for borrowed items, show borrower's avatar
                  const displayUser = isOffline
                    ? item.owner
                    : item.currentBorrow?.borrower;
                  const userId = displayUser?.id;

                  return (
                    <Avatar
                      {...(displayUser?.image && {
                        src: displayUser.image,
                      })}
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
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
                      {!displayUser?.image && (displayUser?.name?.[0] || '?')}
                    </Avatar>
                  );
                })()}
            </>
          ) : (
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: 0.5,
                bgcolor: 'rgba(255,255,255,0.6)',
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: brandColors.charcoal,
                  opacity: 0.8,
                  fontWeight: 600,
                }}
              >
                Illustrating…
              </Typography>
            </Box>
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
            minHeight: '2.6rem', // Reserve space for 2 lines
          }}
        >
          {item.name}
        </Typography>

        {/* Owner and Status Info */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Avatar sx={{ width: 16, height: 16, fontSize: '0.6rem' }}>
            {item.owner.image ? (
              <Image
                src={item.owner.image}
                alt=""
                fill
                style={{ objectFit: 'cover' }}
              />
            ) : (
              <PersonIcon sx={{ fontSize: 10 }} />
            )}
          </Avatar>
          <Typography variant="caption" color="text.secondary">
            {item.owner.name || 'Anonymous'}
          </Typography>
        </Box>

        {/* Status Chip */}
        <Chip
          label={config.statusChip.label}
          size="small"
          sx={{
            backgroundColor: config.statusChip.color,
            color: config.statusChip.textColor,
            fontSize: '0.7rem',
            alignSelf: 'flex-start',
          }}
        />

        {/* Notification Queue Indicator */}
        {item.queueDepth > 0 && (
          <Box sx={{ mt: 1 }}>
            <Badge badgeContent={item.queueDepth} color="primary">
              <NotificationsIcon
                sx={{ fontSize: 16, color: 'text.secondary' }}
              />
            </Badge>
            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
              in queue
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
