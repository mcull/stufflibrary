'use client';

import {
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Stack,
  CircularProgress,
  Avatar,
} from '@mui/material';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams, useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';

import { useUserItems } from '@/hooks/useUserItems';
import { brandColors, spacing } from '@/theme/brandTokens';

function AddItemCard() {
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
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            minHeight: '2.6rem', // Reserve space for 2 lines like other cards
          }}
        >
          Add Item
        </Typography>

        {/* Info Chip */}
        <Chip
          label="Share something new"
          size="small"
          sx={{
            backgroundColor: brandColors.mustardYellow,
            color: brandColors.charcoal,
            fontSize: '0.7rem',
            alignSelf: 'flex-start',
          }}
        />
      </CardContent>
    </Card>
  );
}

interface ItemCardProps {
  item: any;
  status: 'ready-to-lend' | 'on-loan' | 'offline' | 'borrowed';
}

function ItemCard({ item, status }: ItemCardProps) {
  const router = useRouter();

  const handleClick = () => {
    // Always go to item details page, but extract the correct item ID based on data structure
    const itemId = item.item?.id || item.id; // For borrow requests: item.item.id, for direct items: item.id
    if (itemId) {
      router.push(`/stuff/${itemId}`);
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
            label: item.borrower ? `Lent to ${item.borrower.name}` : 'On Loan',
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

  const getInfoLozengeContent = () => {
    switch (status) {
      case 'ready-to-lend':
        return item.location || 'No location';
      case 'on-loan':
        const borrower = item.borrower?.name || 'Unknown';
        const lentDate = item.requestedAt
          ? new Date(item.requestedAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })
          : '';
        return `Lent to ${borrower}${lentDate ? ` on ${lentDate}` : ''}`;
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
                      router.push(`/profile/${userId}`);
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

interface SectionProps {
  title: string;
  items: any[];
  color: {
    background: string;
    text: string;
  };
  showAddItem?: boolean;
}

function Section({ title, items, color, showAddItem = false }: SectionProps) {
  if (items.length === 0 && !showAddItem) {
    return null;
  }

  return (
    <Box sx={{ mb: spacing.xl / 16 }}>
      {/* Section Header */}
      <Box sx={{ mb: spacing.lg / 16 }}>
        <Typography
          variant="h4"
          sx={{
            fontSize: { xs: '1.5rem', md: '2rem' },
            fontWeight: 700,
            color: brandColors.charcoal,
            mb: spacing.sm / 16,
          }}
        >
          {title}
        </Typography>
        <Chip
          label={`${items.length} item${items.length === 1 ? '' : 's'}`}
          sx={{
            backgroundColor: color.background,
            color: color.text,
            fontWeight: 600,
          }}
        />
      </Box>

      {/* Section Grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(2, 1fr)', // 2 cards on mobile
            sm: 'repeat(3, 1fr)', // 3 cards on small tablets
            md: 'repeat(4, 1fr)', // 4 cards on medium screens
            lg: 'repeat(5, 1fr)', // 5 cards on large screens
            xl: 'repeat(6, 1fr)', // 6 cards on extra large screens
          },
          gap: spacing.md / 16,
        }}
      >
        {showAddItem && <AddItemCard />}
        {items.map((item) => (
          <ItemCard
            key={`${item.status}-${item.id}`}
            item={item}
            status={item.status}
          />
        ))}
      </Box>
    </Box>
  );
}

type FilterType = 'all' | 'ready-to-lend' | 'on-loan' | 'offline' | 'borrowed';

export default function UserInventoryPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const {
    readyToLendItems,
    onLoanItems,
    offlineItems,
    borrowedItems,
    isLoading: itemsLoading,
    error,
  } = useUserItems();

  const userId = params.userId as string;
  const isOwnInventory = session?.user && (session.user as any).id === userId;

  // Set default filter from URL parameter
  useEffect(() => {
    const filterParam = searchParams.get('filter') as FilterType;
    if (
      filterParam &&
      ['ready-to-lend', 'on-loan', 'offline', 'borrowed'].includes(filterParam)
    ) {
      setActiveFilter(filterParam);
    }
  }, [searchParams]);

  if (itemsLoading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          backgroundColor: brandColors.warmCream,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          backgroundColor: brandColors.warmCream,
          py: spacing.xl / 16,
        }}
      >
        <Container maxWidth="sm">
          <Box
            sx={{
              textAlign: 'center',
              py: spacing.xl / 16,
            }}
          >
            {/* Error illustration */}
            <Box
              sx={{
                fontSize: '3rem',
                mb: spacing.lg / 16,
                opacity: 0.6,
              }}
            >
              😅
            </Box>

            <Typography
              variant="h4"
              sx={{
                color: brandColors.charcoal,
                mb: spacing.md / 16,
                fontWeight: 600,
              }}
            >
              Oops! Something went wrong
            </Typography>

            <Typography
              variant="body1"
              sx={{
                color: brandColors.charcoal,
                opacity: 0.8,
                mb: spacing.lg / 16,
                lineHeight: 1.6,
              }}
            >
              We&apos;re having trouble loading the inventory right now.
              Don&apos;t worry, your items are safe!
            </Typography>

            <Stack spacing={spacing.md / 16} alignItems="center">
              <Button
                onClick={() => window.location.reload()}
                variant="contained"
                sx={{
                  backgroundColor: brandColors.inkBlue,
                  '&:hover': { backgroundColor: '#1a2f4f' },
                  textTransform: 'none',
                }}
              >
                Try Again
              </Button>

              <Button
                component={Link}
                href="/stacks"
                variant="text"
                sx={{
                  color: brandColors.inkBlue,
                  textTransform: 'none',
                }}
              >
                Back to Lobby
              </Button>
            </Stack>

            {/* Technical error details (smaller) */}
            <Typography
              variant="caption"
              sx={{
                color: brandColors.charcoal,
                opacity: 0.4,
                mt: spacing.lg / 16,
                fontSize: '0.75rem',
              }}
            >
              Error: {error}
            </Typography>
          </Box>
        </Container>
      </Box>
    );
  }

  const allItems = [
    ...readyToLendItems.map((item) => ({
      ...item,
      status: 'ready-to-lend' as const,
    })),
    ...onLoanItems.map((item) => ({ ...item, status: 'on-loan' as const })),
    ...offlineItems.map((item) => ({ ...item, status: 'offline' as const })),
    ...borrowedItems.map((item) => ({ ...item, status: 'borrowed' as const })),
  ];

  const filteredItems =
    activeFilter === 'all'
      ? allItems
      : allItems.filter((item) => item.status === activeFilter);

  const getChipProps = (
    filterType: FilterType,
    count: number,
    label: string
  ) => ({
    label: `${count} ${label}`,
    onClick: () => setActiveFilter(filterType),
    sx: {
      backgroundColor:
        activeFilter === filterType ? brandColors.inkBlue : '#E8F5E8',
      color: activeFilter === filterType ? brandColors.white : '#2E7D32',
      fontWeight: 600,
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      '&:hover': {
        backgroundColor:
          activeFilter === filterType
            ? brandColors.inkBlue
            : brandColors.inkBlue,
        color: brandColors.white,
      },
    },
  });

  // Prepare sectioned data
  const readyToLendSection = readyToLendItems.map((item) => ({
    ...item,
    status: 'ready-to-lend' as const,
  }));
  const onLoanSection = onLoanItems.map((item) => ({
    ...item,
    status: 'on-loan' as const,
  }));
  const offlineSection = offlineItems.map((item) => ({
    ...item,
    status: 'offline' as const,
  }));
  const borrowedSection = borrowedItems.map((item) => ({
    ...item,
    status: 'borrowed' as const,
  }));

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: brandColors.warmCream,
        py: spacing.lg / 16,
      }}
    >
      <Container maxWidth="lg">
        {/* Header */}
        <Box sx={{ mb: spacing.xl / 16 }}>
          <Button
            component={Link}
            href="/lobby"
            startIcon={<ArrowBackIcon />}
            sx={{
              mb: spacing.md / 16,
              color: brandColors.inkBlue,
              textTransform: 'none',
            }}
          >
            Back to Lobby
          </Button>

          <Typography
            variant="h2"
            sx={{
              fontSize: { xs: '2rem', md: '2.5rem' },
              fontWeight: 700,
              color: brandColors.charcoal,
              mb: spacing.sm / 16,
            }}
          >
            {isOwnInventory ? 'My Inventory' : 'Inventory'}
          </Typography>

          <Typography
            variant="body1"
            sx={{
              color: brandColors.charcoal,
              opacity: 0.8,
              maxWidth: '600px',
              mb: spacing.md / 16,
            }}
          >
            {isOwnInventory
              ? "Manage your items, track what you've lent out, and see what you've borrowed."
              : "Browse available items and see what's currently on loan."}
          </Typography>

          {/* Filter Chips */}
          <Stack
            direction="row"
            spacing={spacing.md / 16}
            sx={{ flexWrap: 'wrap', gap: 1 }}
          >
            <Chip
              label={`All ${allItems.length}`}
              onClick={() => setActiveFilter('all')}
              sx={{
                backgroundColor:
                  activeFilter === 'all' ? brandColors.inkBlue : '#F0F0F0',
                color:
                  activeFilter === 'all'
                    ? brandColors.white
                    : brandColors.charcoal,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: brandColors.inkBlue,
                  color: brandColors.white,
                },
              }}
            />
            <Chip
              {...getChipProps(
                'ready-to-lend',
                readyToLendItems.length,
                'Ready to Lend'
              )}
              sx={{
                ...getChipProps(
                  'ready-to-lend',
                  readyToLendItems.length,
                  'Ready to Lend'
                ).sx,
                backgroundColor:
                  activeFilter === 'ready-to-lend'
                    ? brandColors.inkBlue
                    : '#E8F5E8',
                color:
                  activeFilter === 'ready-to-lend'
                    ? brandColors.white
                    : '#2E7D32',
              }}
            />
            {isOwnInventory && (
              <>
                <Chip
                  {...getChipProps('on-loan', onLoanItems.length, 'On Loan')}
                  sx={{
                    ...getChipProps('on-loan', onLoanItems.length, 'On Loan')
                      .sx,
                    backgroundColor:
                      activeFilter === 'on-loan'
                        ? brandColors.inkBlue
                        : '#FFF3E0',
                    color:
                      activeFilter === 'on-loan'
                        ? brandColors.white
                        : '#F57C00',
                  }}
                />
                <Chip
                  {...getChipProps('offline', offlineItems.length, 'Offline')}
                  sx={{
                    ...getChipProps('offline', offlineItems.length, 'Offline')
                      .sx,
                    backgroundColor:
                      activeFilter === 'offline'
                        ? brandColors.inkBlue
                        : '#F3E5F5',
                    color:
                      activeFilter === 'offline'
                        ? brandColors.white
                        : '#7B1FA2',
                  }}
                />
                <Chip
                  {...getChipProps(
                    'borrowed',
                    borrowedItems.length,
                    'Borrowed'
                  )}
                  sx={{
                    ...getChipProps(
                      'borrowed',
                      borrowedItems.length,
                      'Borrowed'
                    ).sx,
                    backgroundColor:
                      activeFilter === 'borrowed'
                        ? brandColors.inkBlue
                        : '#FFEBEE',
                    color:
                      activeFilter === 'borrowed'
                        ? brandColors.white
                        : '#C62828',
                  }}
                />
              </>
            )}
          </Stack>
        </Box>

        {/* Content */}
        {allItems.length === 0 ? (
          <Box
            sx={{
              textAlign: 'center',
              py: (spacing.xl * 2) / 16,
              px: spacing.lg / 16,
              maxWidth: '500px',
              mx: 'auto',
            }}
          >
            {/* Empty state illustration */}
            <Box
              sx={{
                fontSize: '4rem',
                mb: spacing.lg / 16,
                opacity: 0.7,
              }}
            >
              📦✨
            </Box>

            <Typography
              variant="h4"
              sx={{
                color: brandColors.charcoal,
                mb: spacing.md / 16,
                fontWeight: 600,
              }}
            >
              {isOwnInventory ? 'Your inventory is ready!' : 'No items to show'}
            </Typography>

            <Typography
              variant="body1"
              sx={{
                color: brandColors.charcoal,
                opacity: 0.8,
                mb: spacing.xl / 16,
                lineHeight: 1.6,
              }}
            >
              {isOwnInventory
                ? 'This is where all your stuff will live once you start adding items. Share tools, books, kitchen gadgets, and anything else your neighbors might find useful!'
                : 'This person hasn&apos;t added any items to their inventory yet. Check back later or explore other members&apos; inventories.'}
            </Typography>

            {isOwnInventory && (
              <Stack spacing={spacing.md / 16} alignItems="center">
                <Button
                  component={Link}
                  href="/add-item"
                  variant="contained"
                  size="large"
                  sx={{
                    backgroundColor: brandColors.inkBlue,
                    '&:hover': { backgroundColor: '#1a2f4f' },
                    textTransform: 'none',
                    px: spacing.xl / 16,
                    py: spacing.md / 16,
                    fontSize: '1.1rem',
                    fontWeight: 600,
                  }}
                >
                  📷 Add Your First Item
                </Button>

                <Typography
                  variant="body2"
                  sx={{
                    color: brandColors.charcoal,
                    opacity: 0.6,
                    fontSize: '0.9rem',
                  }}
                >
                  Just snap a photo and we&apos;ll help identify it!
                </Typography>
              </Stack>
            )}
          </Box>
        ) : activeFilter === 'all' ? (
          // Vertical sections view
          <Box>
            <Section
              title="Ready to Lend"
              items={readyToLendSection}
              color={{ background: '#E8F5E8', text: '#2E7D32' }}
              showAddItem={isOwnInventory || false}
            />

            {isOwnInventory && (
              <>
                <Section
                  title="On Loan"
                  items={onLoanSection}
                  color={{ background: '#FFF3E0', text: '#F57C00' }}
                />

                <Section
                  title="Offline"
                  items={offlineSection}
                  color={{ background: '#F3E5F5', text: '#7B1FA2' }}
                />

                <Section
                  title="Borrowed"
                  items={borrowedSection}
                  color={{ background: '#FFEBEE', text: '#C62828' }}
                />
              </>
            )}
          </Box>
        ) : (
          // Filtered single section view
          <Box>
            {filteredItems.length === 0 ? (
              <Box
                sx={{
                  textAlign: 'center',
                  py: spacing.xl / 16,
                }}
              >
                <Typography
                  variant="h6"
                  sx={{
                    color: brandColors.charcoal,
                    mb: spacing.md / 16,
                  }}
                >
                  No{' '}
                  {(activeFilter as string) !== 'all'
                    ? (activeFilter as string).replace('-', ' ') + ' '
                    : ''}
                  items
                </Typography>
                <Button
                  onClick={() => setActiveFilter('all')}
                  variant="outlined"
                  sx={{
                    borderColor: brandColors.inkBlue,
                    color: brandColors.inkBlue,
                    '&:hover': { borderColor: '#1a2f4f', color: '#1a2f4f' },
                    textTransform: 'none',
                  }}
                >
                  View All Items
                </Button>
              </Box>
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: 'repeat(2, 1fr)', // 2 cards on mobile
                    sm: 'repeat(3, 1fr)', // 3 cards on small tablets
                    md: 'repeat(4, 1fr)', // 4 cards on medium screens
                    lg: 'repeat(5, 1fr)', // 5 cards on large screens
                    xl: 'repeat(6, 1fr)', // 6 cards on extra large screens
                  },
                  gap: spacing.md / 16,
                }}
              >
                {activeFilter === 'ready-to-lend' && isOwnInventory && (
                  <AddItemCard />
                )}
                {filteredItems.map((item) => (
                  <ItemCard
                    key={`${item.status}-${item.id}`}
                    item={item}
                    status={item.status}
                  />
                ))}
              </Box>
            )}
          </Box>
        )}
      </Container>
    </Box>
  );
}
