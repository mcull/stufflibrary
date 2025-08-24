import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
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
  Rating,
  LinearProgress,
} from '@mui/material';
import Link from 'next/link';

import { brandColors, spacing } from '@/theme/brandTokens';

export default function ItemCardsDemo() {
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
            Item Cards Redesign
          </Typography>

          <Typography
            variant="body1"
            sx={{
              color: brandColors.charcoal,
              opacity: 0.8,
              maxWidth: '600px',
            }}
          >
            Library pocket styling, borrowing history visualization, and
            community story cards that build trust through honest
            representation.
          </Typography>
        </Box>

        <Stack spacing={spacing.xl / 16}>
          {/* Library Pocket Style Item Card */}
          <Box>
            <Typography
              variant="h4"
              sx={{ mb: spacing.md / 16, fontWeight: 600 }}
            >
              Library Pocket Style
            </Typography>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: spacing.md / 16,
              }}
            >
              {[
                {
                  name: 'Circular Saw - DeWalt',
                  owner: 'Sarah Chen',
                  condition: 'Good',
                  borrowCount: 12,
                  available: true,
                  image: '🪚',
                },
                {
                  name: 'Stand Mixer - KitchenAid',
                  owner: 'Mike Rodriguez',
                  condition: 'Excellent',
                  borrowCount: 8,
                  available: false,
                  dueBack: 'Jan 18',
                  image: '🍰',
                },
                {
                  name: 'Camping Tent - REI 4-Person',
                  owner: 'Emma Wilson',
                  condition: 'Fair',
                  borrowCount: 15,
                  available: true,
                  image: '⛺',
                },
              ].map((item, index) => (
                <Card
                  key={index}
                  sx={{
                    backgroundColor: '#F8F6F0',
                    border: '1px solid #D4C4A8',
                    borderRadius: spacing.md / 16,
                    position: 'relative',
                    overflow: 'visible',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    transition: 'transform 0.2s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                    },
                    // Library pocket tab
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: -8,
                      right: 20,
                      width: 60,
                      height: 16,
                      backgroundColor: '#D4C4A8',
                      borderRadius: '8px 8px 0 0',
                    },
                  }}
                >
                  <CardContent sx={{ p: spacing.md / 16 }}>
                    {/* Item Image/Icon */}
                    <Box
                      sx={{
                        fontSize: '3rem',
                        textAlign: 'center',
                        mb: spacing.sm / 16,
                        height: 80,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'rgba(255,255,255,0.5)',
                        borderRadius: spacing.sm / 16,
                        border: '1px solid #E0E0E0',
                      }}
                    >
                      {item.image}
                    </Box>

                    {/* Item Name */}
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 600,
                        color: brandColors.charcoal,
                        mb: spacing.xs / 16,
                        fontSize: '1rem',
                        lineHeight: 1.3,
                      }}
                    >
                      {item.name}
                    </Typography>

                    {/* Owner */}
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={spacing.xs / 16}
                      sx={{ mb: spacing.sm / 16 }}
                    >
                      <Avatar
                        sx={{ width: 20, height: 20, fontSize: '0.75rem' }}
                      >
                        {item.owner
                          .split(' ')
                          .map((n) => n[0])
                          .join('')}
                      </Avatar>
                      <Typography
                        variant="caption"
                        sx={{ color: brandColors.charcoal, opacity: 0.8 }}
                      >
                        Shared by {item.owner}
                      </Typography>
                    </Stack>

                    {/* Status and Condition */}
                    <Stack
                      direction="row"
                      spacing={spacing.xs / 16}
                      sx={{ mb: spacing.md / 16 }}
                    >
                      <Chip
                        label={
                          item.available ? 'Available' : `Due ${item.dueBack}`
                        }
                        size="small"
                        sx={{
                          backgroundColor: item.available
                            ? '#E8F5E8'
                            : '#FFF3E0',
                          color: item.available ? '#2E7D32' : '#F57C00',
                          fontSize: '0.7rem',
                        }}
                      />
                      <Chip
                        label={item.condition}
                        size="small"
                        sx={{
                          backgroundColor: '#F0F0F0',
                          color: brandColors.charcoal,
                          fontSize: '0.7rem',
                        }}
                      />
                    </Stack>

                    {/* Borrowing History Indicator */}
                    <Box sx={{ mb: spacing.sm / 16 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          color: brandColors.charcoal,
                          opacity: 0.7,
                          fontSize: '0.7rem',
                          mb: spacing.xs / 16,
                          display: 'block',
                        }}
                      >
                        Community Love ({item.borrowCount} borrows)
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min((item.borrowCount / 20) * 100, 100)}
                        sx={{
                          height: 4,
                          borderRadius: 2,
                          backgroundColor: '#E0E0E0',
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: brandColors.mustardYellow,
                          },
                        }}
                      />
                    </Box>

                    {/* Action Button */}
                    <Button
                      variant="contained"
                      fullWidth
                      disabled={!item.available}
                      sx={{
                        backgroundColor: item.available
                          ? brandColors.inkBlue
                          : '#E0E0E0',
                        color: item.available ? 'white' : brandColors.charcoal,
                        fontWeight: 600,
                        textTransform: 'none',
                        borderRadius: spacing.sm / 16,
                        '&:hover': {
                          backgroundColor: item.available
                            ? brandColors.inkBlue
                            : '#E0E0E0',
                          opacity: item.available ? 0.9 : 1,
                        },
                      }}
                    >
                      {item.available ? 'Request to Borrow' : 'View Details'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </Box>

          {/* Community Story Card */}
          <Box>
            <Typography
              variant="h4"
              sx={{ mb: spacing.md / 16, fontWeight: 600 }}
            >
              Community Story Card
            </Typography>

            <Card
              sx={{
                maxWidth: 500,
                backgroundColor: '#F8F6F0',
                border: '1px solid #D4C4A8',
                borderRadius: spacing.md / 16,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
            >
              <CardContent sx={{ p: spacing.lg / 16 }}>
                {/* Header */}
                <Box sx={{ textAlign: 'center', mb: spacing.md / 16 }}>
                  <Typography
                    variant="h6"
                    sx={{
                      fontFamily: 'serif',
                      fontWeight: 600,
                      color: brandColors.inkBlue,
                      mb: spacing.xs / 16,
                    }}
                  >
                    Power Drill Journey
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: brandColors.charcoal,
                      opacity: 0.7,
                      fontStyle: 'italic',
                    }}
                  >
                    How this tool has helped our neighborhood
                  </Typography>
                </Box>

                {/* Story Timeline */}
                <Stack spacing={spacing.md / 16}>
                  {[
                    {
                      date: '3 months ago',
                      user: 'Sarah C.',
                      action: 'shared this drill',
                      note: 'Had it sitting in my garage - figured neighbors could use it!',
                    },
                    {
                      date: '2 months ago',
                      user: 'Mike R.',
                      action: 'built a deck',
                      note: 'Saved $200 not having to buy one. Sarah is a lifesaver!',
                    },
                    {
                      date: '1 month ago',
                      user: 'Emma W.',
                      action: 'hung family photos',
                      note: 'Perfect for mounting frames. Love this community spirit.',
                    },
                    {
                      date: 'This week',
                      user: 'David L.',
                      action: 'is building shelves',
                      note: 'So grateful for neighbors who share. This is what community means.',
                    },
                  ].map((story, index) => (
                    <Box
                      key={index}
                      sx={{
                        display: 'flex',
                        gap: spacing.sm / 16,
                        opacity: index === 3 ? 1 : 0.8,
                      }}
                    >
                      <Avatar
                        sx={{
                          width: 32,
                          height: 32,
                          backgroundColor: brandColors.inkBlue,
                          fontSize: '0.75rem',
                          flexShrink: 0,
                        }}
                      >
                        {story.user
                          .split(' ')
                          .map((n) => n[0])
                          .join('')}
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 600,
                            color: brandColors.charcoal,
                            mb: spacing.xs / 32,
                          }}
                        >
                          {story.user} {story.action}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color: brandColors.charcoal,
                            opacity: 0.7,
                            display: 'block',
                            mb: spacing.xs / 16,
                          }}
                        >
                          {story.date}
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            color: brandColors.charcoal,
                            fontStyle: 'italic',
                            fontSize: '0.875rem',
                            lineHeight: 1.4,
                          }}
                        >
                          &quot;{story.note}&quot;
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Stack>

                {/* Community Impact */}
                <Box
                  sx={{
                    mt: spacing.md / 16,
                    pt: spacing.md / 16,
                    borderTop: '1px solid #D4C4A8',
                    textAlign: 'center',
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      color: brandColors.inkBlue,
                      fontWeight: 600,
                      mb: spacing.xs / 16,
                    }}
                  >
                    Community Impact
                  </Typography>
                  <Stack
                    direction="row"
                    spacing={spacing.lg / 16}
                    justifyContent="center"
                  >
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography
                        variant="h6"
                        sx={{ color: brandColors.tomatoRed, fontWeight: 700 }}
                      >
                        $800+
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ color: brandColors.charcoal, opacity: 0.8 }}
                      >
                        Saved
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography
                        variant="h6"
                        sx={{
                          color: brandColors.mustardYellow,
                          fontWeight: 700,
                        }}
                      >
                        12
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ color: brandColors.charcoal, opacity: 0.8 }}
                      >
                        Projects
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography
                        variant="h6"
                        sx={{ color: brandColors.inkBlue, fontWeight: 700 }}
                      >
                        4
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ color: brandColors.charcoal, opacity: 0.8 }}
                      >
                        Neighbors
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              </CardContent>
            </Card>
          </Box>

          {/* Condition Visualization */}
          <Box>
            <Typography
              variant="h4"
              sx={{ mb: spacing.md / 16, fontWeight: 600 }}
            >
              Honest Condition Indicators
            </Typography>

            <Stack
              direction="row"
              spacing={spacing.lg / 16}
              flexWrap="wrap"
              useFlexGap
            >
              {[
                {
                  condition: 'Like New',
                  description: 'Barely used, pristine condition',
                  color: '#4CAF50',
                  stars: 5,
                  wear: 5,
                },
                {
                  condition: 'Excellent',
                  description: 'Minor wear, fully functional',
                  color: '#8BC34A',
                  stars: 4,
                  wear: 20,
                },
                {
                  condition: 'Good',
                  description: 'Shows use but works perfectly',
                  color: '#FFC107',
                  stars: 3,
                  wear: 40,
                },
                {
                  condition: 'Fair',
                  description: 'Well-used but reliable',
                  color: '#FF9800',
                  stars: 2,
                  wear: 70,
                },
              ].map((item) => (
                <Card
                  key={item.condition}
                  sx={{
                    minWidth: 200,
                    backgroundColor: brandColors.white,
                    border: `2px solid ${item.color}`,
                    borderRadius: spacing.md / 16,
                  }}
                >
                  <CardContent>
                    <Typography
                      variant="h6"
                      sx={{
                        color: item.color,
                        fontWeight: 600,
                        mb: spacing.xs / 16,
                      }}
                    >
                      {item.condition}
                    </Typography>

                    <Rating
                      value={item.stars}
                      readOnly
                      size="small"
                      sx={{ mb: spacing.sm / 16 }}
                    />

                    <Typography
                      variant="body2"
                      sx={{
                        color: brandColors.charcoal,
                        opacity: 0.8,
                        fontSize: '0.875rem',
                        mb: spacing.sm / 16,
                      }}
                    >
                      {item.description}
                    </Typography>

                    <Box>
                      <Typography
                        variant="caption"
                        sx={{
                          color: brandColors.charcoal,
                          opacity: 0.7,
                          fontSize: '0.7rem',
                          mb: spacing.xs / 16,
                          display: 'block',
                        }}
                      >
                        Wear Level
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={item.wear}
                        sx={{
                          height: 4,
                          borderRadius: 2,
                          backgroundColor: '#F0F0F0',
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: item.color,
                          },
                        }}
                      />
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
