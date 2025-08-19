'use client';

import { CheckCircle, Dashboard, Explore, Group } from '@mui/icons-material';
import {
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  Typography,
  Paper,
} from '@mui/material';
import { useRouter } from 'next/navigation';

import { LibraryCard } from '@/components/LibraryCard';
import { brandColors } from '@/theme/brandTokens';

interface ProfileStepCompleteProps {
  user?:
    | {
        id: string;
        name: string;
        email: string;
        image?: string | undefined;
        createdAt: string;
        profileCompleted: boolean;
      }
    | undefined;
}

export function ProfileStepComplete({ user }: ProfileStepCompleteProps) {
  const router = useRouter();

  const nextSteps = [
    {
      icon: <Explore />,
      title: 'Explore Libraries',
      description: 'Find and join libraries in your area',
      action: () => router.push('/libraries'),
    },
    {
      icon: <Group />,
      title: 'Connect with Members',
      description: 'See what others are sharing in your community',
      action: () => router.push('/members'),
    },
    {
      icon: <Dashboard />,
      title: 'Go to Dashboard',
      description: 'Start managing your stuff and requests',
      action: () => router.push('/dashboard'),
    },
  ];

  return (
    <Box
      sx={{
        textAlign: 'center',
        py: 4,
        px: 2,
        minHeight: '500px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      {/* Success Icon */}
      <Box sx={{ mb: 3 }}>
        <CheckCircle
          sx={{
            fontSize: '4rem',
            color: '#4caf50',
          }}
        />
      </Box>

      {/* Success Message */}
      <Typography
        variant="h4"
        sx={{
          fontWeight: 700,
          color: brandColors.charcoal,
          mb: 2,
        }}
      >
        Profile Complete! 🎉
      </Typography>

      <Typography
        variant="h6"
        sx={{
          color: brandColors.charcoal,
          opacity: 0.8,
          mb: 4,
          maxWidth: '500px',
          mx: 'auto',
        }}
      >
        Welcome to StuffLibrary! Your profile is now set up and you&apos;re
        ready to start sharing and borrowing with your community.
      </Typography>

      {/* Library Card Display */}
      {user && (
        <Box sx={{ mb: 6 }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              color: brandColors.charcoal,
              mb: 3,
            }}
          >
            🎉 Here&apos;s Your Digital Library Card!
          </Typography>

          <Paper
            elevation={3}
            sx={{
              p: 3,
              mb: 3,
              maxWidth: 650,
              mx: 'auto',
              backgroundColor: '#f8f9fa',
              borderRadius: '16px',
            }}
          >
            <LibraryCard user={user} />
          </Paper>

          <Typography
            variant="body2"
            sx={{
              color: brandColors.charcoal,
              opacity: 0.7,
              maxWidth: '500px',
              mx: 'auto',
              mb: 4,
            }}
          >
            Your library card is your digital identity in the StuffLibrary
            community. Use the QR code to connect with neighbors and access
            shared resources.
          </Typography>
        </Box>
      )}

      {/* Next Steps */}
      <Typography
        variant="h6"
        sx={{
          fontWeight: 600,
          color: brandColors.charcoal,
          mb: 3,
        }}
      >
        What would you like to do next?
      </Typography>

      <Stack spacing={2} sx={{ maxWidth: '500px', mx: 'auto', mb: 4 }}>
        {nextSteps.map((step, index) => (
          <Card
            key={index}
            elevation={0}
            sx={{
              border: `1px solid ${brandColors.softGray}`,
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              '&:hover': {
                borderColor: brandColors.inkBlue,
                backgroundColor: 'rgba(37, 99, 235, 0.02)',
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
              },
            }}
            onClick={step.action}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: '50%',
                    backgroundColor: brandColors.inkBlue,
                    color: brandColors.white,
                  }}
                >
                  {step.icon}
                </Box>

                <Box sx={{ textAlign: 'left', flex: 1 }}>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      color: brandColors.charcoal,
                      mb: 0.5,
                    }}
                  >
                    {step.title}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: brandColors.charcoal,
                      opacity: 0.7,
                    }}
                  >
                    {step.description}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Stack>

      {/* Alternative Action */}
      <Typography
        variant="body2"
        sx={{
          color: brandColors.charcoal,
          opacity: 0.6,
          mb: 2,
        }}
      >
        Or you can always update your profile later in settings
      </Typography>

      <Button
        variant="outlined"
        onClick={() => router.push('/profile/settings')}
        sx={{
          px: 3,
          py: 1,
          borderRadius: '8px',
          textTransform: 'none',
          borderColor: brandColors.softGray,
          color: brandColors.charcoal,
          '&:hover': {
            borderColor: brandColors.charcoal,
          },
        }}
      >
        Profile Settings
      </Button>
    </Box>
  );
}
