import {
  ArrowBack as ArrowBackIcon,
  TrendingUp as TrendingUpIcon,
  Group as GroupIcon,
  Inventory as InventoryIcon,
  SwapHoriz as SwapHorizIcon,
} from '@mui/icons-material';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Stack,
  Chip,
  Avatar,
  Badge,
  Grid,
  Paper,
} from '@mui/material';
import Link from 'next/link';

import { brandColors, spacing } from '@/theme/brandTokens';

export default function DashboardConceptsDemo() {
  const recentActivity = [
    {
      type: 'borrowed',
      user: 'Emma Wilson',
      item: 'Stand Mixer',
      time: '2 hours ago',
      avatar: 'EW',
    },
    {
      type: 'returned',
      user: 'Mike Rodriguez',
      item: 'Power Drill',
      time: '4 hours ago',
      avatar: 'MR',
    },
    {
      type: 'shared',
      user: 'Sarah Chen',
      item: 'Garden Hose',
      time: '1 day ago',
      avatar: 'SC',
    },
    {
      type: 'borrowed',
      user: 'David Lee',
      item: 'Camping Tent',
      time: '2 days ago',
      avatar: 'DL',
    },
  ];

  const neighborhoodStats = [
    {
      label: 'Active Members',
      value: '47',
      icon: GroupIcon,
      color: brandColors.inkBlue,
    },
    {
      label: 'Items Shared',
      value: '186',
      icon: InventoryIcon,
      color: brandColors.mustardYellow,
    },
    {
      label: 'Monthly Borrows',
      value: '89',
      icon: SwapHorizIcon,
      color: brandColors.tomatoRed,
    },
    {
      label: 'Money Saved',
      value: '$3.2k',
      icon: TrendingUpIcon,
      color: '#27AE60',
    },
  ];

  const nearbyItems = [
    {
      name: 'Leaf Blower',
      owner: 'Tom',
      distance: '0.1 mi',
      available: true,
      emoji: '🍃',
    },
    {
      name: 'Ladder',
      owner: 'Lisa',
      distance: '0.2 mi',
      available: false,
      emoji: '🪜',
    },
    {
      name: 'Pressure Washer',
      owner: 'Bob',
      distance: '0.3 mi',
      available: true,
      emoji: '💦',
    },
    {
      name: 'Hedge Trimmer',
      owner: 'Jane',
      distance: '0.4 mi',
      available: true,
      emoji: '✂️',
    },
  ];

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
            href="/demo"
            startIcon={<ArrowBackIcon />}
            sx={{
              mb: spacing.md / 16,
              color: brandColors.inkBlue,
              textTransform: 'none',
            }}
          >
            Back to Demos
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
            Dashboard Concepts
          </Typography>

          <Typography
            variant="body1"
            sx={{
              color: brandColors.charcoal,
              opacity: 0.8,
              maxWidth: '600px',
            }}
          >
            Community-first interfaces that prioritize neighborhood activity,
            shared stewardship, and the living commons over individual profiles.
          </Typography>
        </Box>

        <Stack spacing={spacing.xl / 16}>
          {/* Community Activity Hero */}
          <Box>
            <Typography
              variant="h4"
              sx={{ mb: spacing.md / 16, fontWeight: 600 }}
            >
              Community Activity Hero
            </Typography>

            <Card
              sx={{
                backgroundColor: brandColors.white,
                borderRadius: spacing.md / 16,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                border: '1px solid #E0E0E0',
              }}
            >
              <CardContent sx={{ p: spacing.lg / 16 }}>
                {/* Header */}
                <Box sx={{ mb: spacing.lg / 16 }}>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 600,
                      color: brandColors.charcoal,
                      mb: spacing.xs / 16,
                    }}
                  >
                    Your Neighborhood Commons
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: brandColors.charcoal, opacity: 0.7 }}
                  >
                    Live activity from the Sunset District sharing community
                  </Typography>
                </Box>

                {/* Stats Row */}
                <Grid
                  container
                  spacing={spacing.md / 16}
                  sx={{ mb: spacing.lg / 16 }}
                >
                  {neighborhoodStats.map((stat) => {
                    const IconComponent = stat.icon;
                    return (
                      <Grid item xs={6} md={3} key={stat.label}>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: spacing.sm / 16,
                            p: spacing.md / 16,
                            borderRadius: spacing.sm / 16,
                            backgroundColor: `${stat.color}10`,
                            border: `1px solid ${stat.color}30`,
                          }}
                        >
                          <IconComponent
                            sx={{ color: stat.color, fontSize: '1.5rem' }}
                          />
                          <Box>
                            <Typography
                              variant="h6"
                              sx={{
                                color: stat.color,
                                fontWeight: 700,
                                fontSize: '1.25rem',
                              }}
                            >
                              {stat.value}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{
                                color: brandColors.charcoal,
                                opacity: 0.8,
                                fontSize: '0.75rem',
                              }}
                            >
                              {stat.label}
                            </Typography>
                          </Box>
                        </Box>
                      </Grid>
                    );
                  })}
                </Grid>

                {/* Activity Feed */}
                <Box>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      color: brandColors.charcoal,
                      mb: spacing.md / 16,
                    }}
                  >
                    Recent Community Activity
                  </Typography>

                  <Stack spacing={spacing.md / 16}>
                    {recentActivity.map((activity, index) => {
                      const actionColors = {
                        borrowed: { bg: '#E3F2FD', text: '#1976D2' },
                        returned: { bg: '#E8F5E8', text: '#2E7D32' },
                        shared: { bg: '#FFF3E0', text: '#F57C00' },
                      };
                      const colors =
                        actionColors[
                          activity.type as keyof typeof actionColors
                        ];

                      return (
                        <Box
                          key={index}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: spacing.md / 16,
                            p: spacing.md / 16,
                            borderRadius: spacing.sm / 16,
                            backgroundColor:
                              index === 0 ? '#F0F8FF' : 'transparent',
                            border: index === 0 ? '1px solid #E3F2FD' : 'none',
                          }}
                        >
                          <Avatar
                            sx={{
                              backgroundColor: brandColors.inkBlue,
                              fontSize: '0.875rem',
                              width: 40,
                              height: 40,
                            }}
                          >
                            {activity.avatar}
                          </Avatar>

                          <Box sx={{ flex: 1 }}>
                            <Typography
                              variant="body1"
                              sx={{
                                color: brandColors.charcoal,
                                fontWeight: 500,
                                mb: spacing.xs / 32,
                              }}
                            >
                              <strong>{activity.user}</strong>{' '}
                              <Chip
                                label={activity.type}
                                size="small"
                                sx={{
                                  backgroundColor: colors.bg,
                                  color: colors.text,
                                  fontSize: '0.7rem',
                                  height: 20,
                                  mx: spacing.xs / 16,
                                }}
                              />{' '}
                              <strong>{activity.item}</strong>
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{
                                color: brandColors.charcoal,
                                opacity: 0.6,
                                fontSize: '0.75rem',
                              }}
                            >
                              {activity.time}
                            </Typography>
                          </Box>

                          {index === 0 && (
                            <Chip
                              label="New"
                              size="small"
                              sx={{
                                backgroundColor: brandColors.mustardYellow,
                                color: 'white',
                                fontSize: '0.7rem',
                                fontWeight: 600,
                              }}
                            />
                          )}
                        </Box>
                      );
                    })}
                  </Stack>

                  <Button
                    sx={{
                      mt: spacing.md / 16,
                      color: brandColors.inkBlue,
                      textTransform: 'none',
                      fontWeight: 500,
                    }}
                  >
                    View All Activity
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Box>

          {/* Neighborhood Map View */}
          <Box>
            <Typography
              variant="h4"
              sx={{ mb: spacing.md / 16, fontWeight: 600 }}
            >
              Neighborhood Commons View
            </Typography>

            <Card
              sx={{
                backgroundColor: brandColors.white,
                borderRadius: spacing.md / 16,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                height: 400,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Mock Map Background */}
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  background: `
                    radial-gradient(circle at 20% 30%, rgba(30, 58, 95, 0.1) 0%, transparent 50%),
                    radial-gradient(circle at 80% 70%, rgba(209, 73, 91, 0.1) 0%, transparent 50%),
                    radial-gradient(circle at 40% 80%, rgba(227, 181, 5, 0.1) 0%, transparent 50%),
                    linear-gradient(135deg, ${brandColors.warmCream} 0%, #F0F8F0 100%)
                  `,
                }}
              />

              {/* Items Scattered on Map */}
              {nearbyItems.map((item, index) => {
                const positions = [
                  { top: '25%', left: '30%' },
                  { top: '60%', left: '70%' },
                  { top: '40%', left: '15%' },
                  { top: '70%', left: '85%' },
                ];

                return (
                  <Box
                    key={index}
                    sx={{
                      position: 'absolute',
                      ...positions[index],
                      transform: 'translate(-50%, -50%)',
                      cursor: 'pointer',
                      transition: 'transform 0.2s ease',
                      '&:hover': {
                        transform: 'translate(-50%, -50%) scale(1.1)',
                      },
                    }}
                  >
                    <Badge
                      badgeContent={
                        item.available ? (
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              backgroundColor: '#4CAF50',
                            }}
                          />
                        ) : (
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              backgroundColor: '#FF9800',
                            }}
                          />
                        )
                      }
                    >
                      <Paper
                        sx={{
                          p: spacing.sm / 16,
                          borderRadius: spacing.md / 16,
                          backgroundColor: brandColors.white,
                          boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
                          border: '1px solid #E0E0E0',
                          minWidth: 120,
                          textAlign: 'center',
                        }}
                      >
                        <Typography
                          variant="h6"
                          sx={{ fontSize: '1.5rem', mb: spacing.xs / 16 }}
                        >
                          {item.emoji}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color: brandColors.charcoal,
                            fontWeight: 600,
                            fontSize: '0.7rem',
                            display: 'block',
                          }}
                        >
                          {item.name}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color: brandColors.charcoal,
                            opacity: 0.7,
                            fontSize: '0.65rem',
                            display: 'block',
                          }}
                        >
                          {item.owner} • {item.distance}
                        </Typography>
                      </Paper>
                    </Badge>
                  </Box>
                );
              })}

              {/* Legend */}
              <Box
                sx={{
                  position: 'absolute',
                  bottom: spacing.md / 16,
                  left: spacing.md / 16,
                  display: 'flex',
                  gap: spacing.md / 16,
                  alignItems: 'center',
                  backgroundColor: 'rgba(255,255,255,0.9)',
                  p: spacing.sm / 16,
                  borderRadius: spacing.sm / 16,
                  border: '1px solid #E0E0E0',
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.xs / 16,
                  }}
                >
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      backgroundColor: '#4CAF50',
                    }}
                  />
                  <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                    Available
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.xs / 16,
                  }}
                >
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      backgroundColor: '#FF9800',
                    }}
                  />
                  <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                    In Use
                  </Typography>
                </Box>
              </Box>
            </Card>
          </Box>

          {/* Library Shelf Browser */}
          <Box>
            <Typography
              variant="h4"
              sx={{ mb: spacing.md / 16, fontWeight: 600 }}
            >
              Library Shelf Browser
            </Typography>

            <Card
              sx={{
                backgroundColor: brandColors.white,
                borderRadius: spacing.md / 16,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                overflow: 'hidden',
              }}
            >
              <CardContent sx={{ p: spacing.lg / 16 }}>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 600,
                    color: brandColors.charcoal,
                    mb: spacing.md / 16,
                  }}
                >
                  Browse by Category
                </Typography>

                {/* Category Shelves */}
                <Stack spacing={spacing.lg / 16}>
                  {[
                    {
                      name: 'Power Tools',
                      items: ['🔨', '🪚', '🔧', '⚒️', '🪛'],
                      color: brandColors.inkBlue,
                    },
                    {
                      name: 'Kitchen & Cooking',
                      items: ['🍰', '☕', '🥘', '🍳', '🔪'],
                      color: brandColors.tomatoRed,
                    },
                    {
                      name: 'Outdoor & Garden',
                      items: ['🌱', '💦', '🍃', '✂️', '⛺'],
                      color: '#27AE60',
                    },
                  ].map((category, categoryIndex) => (
                    <Box key={categoryIndex}>
                      <Typography
                        variant="h6"
                        sx={{
                          color: category.color,
                          fontWeight: 600,
                          mb: spacing.sm / 16,
                          fontSize: '1rem',
                        }}
                      >
                        {category.name}
                      </Typography>

                      <Box
                        sx={{
                          display: 'flex',
                          gap: spacing.sm / 16,
                          overflowX: 'auto',
                          pb: spacing.sm / 16,
                          '&::-webkit-scrollbar': {
                            height: 4,
                          },
                          '&::-webkit-scrollbar-track': {
                            backgroundColor: '#F0F0F0',
                            borderRadius: 2,
                          },
                          '&::-webkit-scrollbar-thumb': {
                            backgroundColor: category.color,
                            borderRadius: 2,
                          },
                        }}
                      >
                        {category.items.map((emoji, itemIndex) => (
                          <Paper
                            key={itemIndex}
                            sx={{
                              minWidth: 80,
                              height: 80,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: spacing.sm / 16,
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              border: `2px solid ${category.color}20`,
                              '&:hover': {
                                transform: 'translateY(-4px)',
                                boxShadow: '0 8px 16px rgba(0,0,0,0.15)',
                                borderColor: category.color,
                              },
                            }}
                          >
                            <Typography variant="h4" sx={{ fontSize: '2rem' }}>
                              {emoji}
                            </Typography>
                          </Paper>
                        ))}
                      </Box>
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
