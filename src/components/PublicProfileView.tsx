'use client';

import {
  ArrowBack as ArrowBackIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
  Inventory as InventoryIcon,
} from '@mui/icons-material';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Avatar,
  Chip,
  Grid,
  Paper,
  Stack,
} from '@mui/material';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

import { brandColors } from '@/theme/brandTokens';

interface UserData {
  id: string;
  name: string | null;
  image: string | null;
  bio: string | null;
  shareInterests: string[];
  createdAt: Date;
  items: Array<{
    id: string;
    name: string;
    description: string | null;
    imageUrl: string | null;
    condition: string;
    category: string | null;
    stuffType: {
      displayName: string;
      category: string;
    } | null;
  }>;
  _count: {
    items: number;
  };
}

interface PublicProfileViewProps {
  user: UserData;
}

export function PublicProfileView({ user }: PublicProfileViewProps) {
  const router = useRouter();

  const handleItemClick = (itemId: string) => {
    router.push(`/items/${itemId}`);
  };

  const joinDate = new Date(user.createdAt).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.back()}
          sx={{ mr: 2 }}
        >
          Back
        </Button>
        <Typography variant="h5" component="h1">
          {user.name}'s Profile
        </Typography>
      </Box>

      <Grid container spacing={4}>
        {/* Profile Information */}
        <Grid {...({item: true, xs: 12, md: 4} as any)}>
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ textAlign: 'center', p: 4 }}>
              <Avatar
                src={user.image ?? ''}
                sx={{
                  width: 120,
                  height: 120,
                  mx: 'auto',
                  mb: 2,
                  fontSize: '2rem',
                }}
              >
                {!user.image && user.name?.[0]}
              </Avatar>
              
              <Typography variant="h4" gutterBottom>
                {user.name || 'Anonymous User'}
              </Typography>

              {user.bio && (
                <Typography
                  variant="body1"
                  color="text.secondary"
                  sx={{ mb: 3, lineHeight: 1.6 }}
                >
                  {user.bio}
                </Typography>
              )}

              <Stack direction="row" spacing={2} justifyContent="center" sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <CalendarIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    Joined {joinDate}
                  </Typography>
                </Box>
              </Stack>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
                <InventoryIcon sx={{ fontSize: '1.2rem', color: brandColors.inkBlue }} />
                <Typography variant="h6" color="primary">
                  {user._count.items} item{user._count.items !== 1 ? 's' : ''} shared
                </Typography>
              </Box>
            </CardContent>
          </Card>

          {/* Interests */}
          {user.shareInterests.length > 0 && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Sharing Interests
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {user.shareInterests.map((interest) => (
                    <Chip
                      key={interest}
                      label={interest}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          )}
        </Grid>

        {/* Items Grid */}
        <Grid {...({item: true, xs: 12, md: 8} as any)}>
          <Typography variant="h5" gutterBottom>
            Available Items
          </Typography>
          
          {user.items.length === 0 ? (
            <Paper
              sx={{
                p: 6,
                textAlign: 'center',
                backgroundColor: 'grey.50',
              }}
            >
              <InventoryIcon sx={{ fontSize: '4rem', color: 'grey.400', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No items available
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {user.name} hasn't shared any items yet.
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {user.items.map((item) => (
                <Grid {...({item: true, xs: 12, sm: 6, md: 4, key: item.id} as any)}>
                  <Card
                    onClick={() => handleItemClick(item.id)}
                    sx={{
                      cursor: 'pointer',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                      },
                    }}
                  >
                    <Box
                      sx={{
                        position: 'relative',
                        aspectRatio: '1',
                        backgroundColor: 'grey.100',
                        overflow: 'hidden',
                      }}
                    >
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          fill
                          style={{ objectFit: 'cover' }}
                        />
                      ) : (
                        <Box
                          sx={{
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Typography variant="h3" sx={{ opacity: 0.5 }}>
                            📦
                          </Typography>
                        </Box>
                      )}
                    </Box>
                    
                    <CardContent sx={{ p: 2 }}>
                      <Typography
                        variant="subtitle1"
                        fontWeight={600}
                        sx={{
                          mb: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {item.name}
                      </Typography>
                      
                      {item.description && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            mb: 2,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            minHeight: '2.4em',
                          }}
                        >
                          {item.description}
                        </Typography>
                      )}

                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {item.stuffType && (
                          <Chip
                            label={item.stuffType.category}
                            size="small"
                            variant="outlined"
                            sx={{ textTransform: 'capitalize' }}
                          />
                        )}
                        
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ textTransform: 'capitalize' }}
                        >
                          {item.condition}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}

          {user._count.items > 12 && (
            <Box sx={{ textAlign: 'center', mt: 4 }}>
              <Typography variant="body2" color="text.secondary">
                Showing 12 of {user._count.items} items
              </Typography>
            </Box>
          )}
        </Grid>
      </Grid>
    </Container>
  );
}