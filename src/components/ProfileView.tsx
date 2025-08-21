'use client';

import {
  Edit as EditIcon,
  ArrowBack as ArrowBackIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  CalendarToday as CalendarIcon,
} from '@mui/icons-material';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Avatar,
  Chip,
  Stack,
  IconButton,
  Divider,
} from '@mui/material';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { brandColors } from '@/theme/brandTokens';

interface User {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  bio: string | null;
  interests: string[];
  profileCompleted: boolean;
  onboardingStep: string | null;
  addressId: string | null;
  addressVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface ProfileViewProps {
  user: User;
}

const INTEREST_LABELS: Record<string, string> = {
  tools: 'Tools & Hardware',
  sports: 'Sports & Recreation',
  kitchen: 'Kitchen & Dining',
  yard: 'Yard & Garden',
  electronics: 'Electronics',
  books: 'Books & Media',
  clothing: 'Clothing & Accessories',
  furniture: 'Furniture',
  automotive: 'Automotive',
  other: 'Other',
};

export function ProfileView({ user }: ProfileViewProps) {
  const router = useRouter();

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(date));
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
        <IconButton
          onClick={() => router.push('/lobby')}
          sx={{ mr: 2 }}
          aria-label="Back to lobby"
        >
          <ArrowBackIcon />
        </IconButton>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            color: brandColors.charcoal,
            flex: 1,
          }}
        >
          My Profile
        </Typography>
        <Button
          component={Link}
          href="/profile/edit"
          variant="outlined"
          startIcon={<EditIcon />}
          sx={{
            borderRadius: '12px',
            borderColor: brandColors.inkBlue,
            color: brandColors.inkBlue,
            '&:hover': {
              borderColor: brandColors.inkBlue,
              backgroundColor: `${brandColors.inkBlue}10`,
            },
          }}
        >
          Edit Profile
        </Button>
      </Box>

      {/* Profile Card */}
      <Card
        sx={{
          borderRadius: '16px',
          border: `1px solid ${brandColors.softGray}`,
          backgroundColor: brandColors.white,
          mb: 3,
        }}
      >
        <CardContent sx={{ p: 4 }}>
          {/* Profile Header */}
          <Box sx={{ display: 'flex', alignItems: 'start', mb: 4 }}>
            <Avatar
              {...(user.image && { src: user.image })}
              sx={{
                width: 80,
                height: 80,
                mr: 3,
                fontSize: '2rem',
                bgcolor: brandColors.inkBlue,
              }}
            >
              {!user.image && <PersonIcon sx={{ fontSize: '2.5rem' }} />}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 600,
                  color: brandColors.charcoal,
                  mb: 1,
                }}
              >
                {user.name || 'No name set'}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <EmailIcon
                  sx={{
                    fontSize: '1.2rem',
                    color: brandColors.charcoal,
                    opacity: 0.6,
                    mr: 1,
                  }}
                />
                <Typography
                  variant="body2"
                  sx={{ color: brandColors.charcoal, opacity: 0.7 }}
                >
                  {user.email}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CalendarIcon
                  sx={{
                    fontSize: '1.2rem',
                    color: brandColors.charcoal,
                    opacity: 0.6,
                    mr: 1,
                  }}
                />
                <Typography
                  variant="body2"
                  sx={{ color: brandColors.charcoal, opacity: 0.7 }}
                >
                  Member since {formatDate(user.createdAt)}
                </Typography>
              </Box>
            </Box>
          </Box>

          <Divider sx={{ mb: 4 }} />

          {/* Bio Section */}
          <Box sx={{ mb: 4 }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                color: brandColors.charcoal,
                mb: 2,
              }}
            >
              About Me
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: brandColors.charcoal,
                opacity: 0.8,
                lineHeight: 1.6,
              }}
            >
              {user.bio || 'No bio added yet.'}
            </Typography>
          </Box>

          {/* Interests Section */}
          <Box>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                color: brandColors.charcoal,
                mb: 2,
              }}
            >
              Interests
            </Typography>
            {user.interests && user.interests.length > 0 ? (
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {user.interests.map((interest) => (
                  <Chip
                    key={interest}
                    label={INTEREST_LABELS[interest] || interest}
                    sx={{
                      bgcolor: `${brandColors.inkBlue}15`,
                      color: brandColors.inkBlue,
                      fontWeight: 500,
                      '&:hover': {
                        bgcolor: `${brandColors.inkBlue}25`,
                      },
                    }}
                  />
                ))}
              </Stack>
            ) : (
              <Typography
                variant="body2"
                sx={{ color: brandColors.charcoal, opacity: 0.6 }}
              >
                No interests added yet.
              </Typography>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Account Status Card */}
      <Card
        sx={{
          borderRadius: '16px',
          border: `1px solid ${brandColors.softGray}`,
          backgroundColor: brandColors.white,
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              color: brandColors.charcoal,
              mb: 3,
            }}
          >
            Account Status
          </Typography>
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" sx={{ color: brandColors.charcoal }}>
                Profile Completion
              </Typography>
              <Chip
                label={user.profileCompleted ? 'Complete' : 'Incomplete'}
                color={user.profileCompleted ? 'success' : 'warning'}
                size="small"
              />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" sx={{ color: brandColors.charcoal }}>
                Address Verification
              </Typography>
              <Chip
                label={user.addressVerified ? 'Verified' : 'Not Verified'}
                color={user.addressVerified ? 'success' : 'default'}
                size="small"
              />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" sx={{ color: brandColors.charcoal }}>
                Last Updated
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: brandColors.charcoal, opacity: 0.7 }}
              >
                {formatDate(user.updatedAt)}
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Container>
  );
}
