'use client';

import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
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
} from '@mui/material';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';

import { useUserItems } from '@/hooks/useUserItems';
import { brandColors, spacing } from '@/theme/brandTokens';

interface ItemCardProps {
  item: {
    id: string;
    name?: string;
    imageUrl?: string;
    location?: string;
    borrower?: { name: string };
    lender?: { name: string };
    requestedAt?: string;
    promisedReturnBy?: string;
    item?: { name: string };
  };
  status: 'ready-to-lend' | 'on-loan' | 'borrowed';
}

function ItemCard({ item, status }: ItemCardProps) {
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
          {item.imageUrl ? (
            <Image
              src={item.imageUrl}
              alt={item.name || 'Item'}
              fill
              style={{
                objectFit: 'cover',
              }}
            />
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
  items: ItemCardProps['item'][];
  color: {
    background: string;
    text: string;
  };
}

function Section({ title, items, color }: SectionProps) {
  if (items.length === 0) {
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

type FilterType = 'all' | 'ready-to-lend' | 'on-loan' | 'borrowed';

export default function UserInventoryPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const {
    readyToLendItems,
    onLoanItems,
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
      ['ready-to-lend', 'on-loan', 'borrowed'].includes(filterParam)
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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography color="error">Error loading inventory: {error}</Typography>
      </Box>
    );
  }

  const allItems = [
    ...readyToLendItems.map((item) => ({
      ...item,
      status: 'ready-to-lend' as const,
    })),
    ...onLoanItems.map((item) => ({ ...item, status: 'on-loan' as const })),
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
              {...getChipProps('all', allItems.length, '')}
              sx={{
                ...getChipProps('all', allItems.length, '').sx,
                backgroundColor:
                  activeFilter === 'all' ? brandColors.inkBlue : '#F0F0F0',
                color:
                  activeFilter === 'all'
                    ? brandColors.white
                    : brandColors.charcoal,
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
              No items yet
            </Typography>
            {isOwnInventory && (
              <Button
                component={Link}
                href="/add-item"
                variant="contained"
                sx={{
                  backgroundColor: brandColors.inkBlue,
                  '&:hover': { backgroundColor: '#1a2f4f' },
                  textTransform: 'none',
                }}
              >
                Add Your First Item
              </Button>
            )}
          </Box>
        ) : activeFilter === 'all' ? (
          // Vertical sections view
          <Box>
            <Section
              title="Ready to Lend"
              items={readyToLendSection}
              emptyMessage="No items available to lend"
              color={{ background: '#E8F5E8', text: '#2E7D32' }}
            />

            {isOwnInventory && (
              <>
                <Section
                  title="On Loan"
                  items={onLoanSection}
                  emptyMessage="No items currently lent out"
                  color={{ background: '#FFF3E0', text: '#F57C00' }}
                />

                <Section
                  title="Borrowed"
                  items={borrowedSection}
                  emptyMessage="No items currently borrowed"
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
                  {activeFilter === 'all' ? '' : activeFilter.replace('-', ' ')}{' '}
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
