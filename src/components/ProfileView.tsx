'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { PhotoCamera } from '@mui/icons-material';
import {
  Avatar,
  Box,
  Button,
  Container,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
  Chip,
  Autocomplete,
  CircularProgress,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { brandColors } from '@/theme/brandTokens';

// Predefined interest options for autocomplete
const INTEREST_OPTIONS = [
  'Tools (power tools, hand tools)',
  'Kitchen appliances',
  'Sports equipment',
  'Books and magazines',
  'Games and puzzles',
  'Camping gear',
  'Photography equipment',
  'Art supplies',
  'Musical instruments',
  'Exercise equipment',
  'Garden tools',
  'Party supplies',
  'Seasonal decorations',
  'Electronics',
  'Home improvement supplies',
  "Children's toys",
  'Pet supplies',
  'Cleaning equipment',
];

const profileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  bio: z.string().optional(),
  shareInterests: z.array(z.string()),
  borrowInterests: z.array(z.string()),
  address: z.string().min(1, 'Address is required'),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface User {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  bio: string | null;
  shareInterests: string[];
  borrowInterests: string[];
  profileCompleted: boolean;
  onboardingStep: string | null;
  currentAddressId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface Address {
  formattedAddress: string | null;
  address1: string;
  address2: string | null;
  city: string;
  state: string;
  zip: string;
}

interface ProfileViewProps {
  user: User;
  currentAddress: Address | null;
}

export function ProfileView({ user, currentAddress }: ProfileViewProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(
    user.image
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user.name || '',
      bio: user.bio || '',
      shareInterests: user.shareInterests || [],
      borrowInterests: user.borrowInterests || [],
      address:
        currentAddress?.formattedAddress ||
        `${currentAddress?.address1 || ''}${currentAddress?.address2 ? ', ' + currentAddress.address2 : ''}, ${currentAddress?.city || ''}, ${currentAddress?.state || ''} ${currentAddress?.zip || ''}`
          .trim()
          .replace(/^,\s*|,\s*$/g, '') ||
        '',
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = form;

  const shareInterests = watch('shareInterests');
  const borrowInterests = watch('borrowInterests');

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setProfileImage(file);
      const previewUrl = URL.createObjectURL(file);
      setProfileImagePreview(previewUrl);
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    setIsLoading(true);
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('name', data.name);
      formData.append('bio', data.bio || '');
      formData.append('shareInterests', JSON.stringify(data.shareInterests));
      formData.append('borrowInterests', JSON.stringify(data.borrowInterests));
      formData.append('address', data.address);

      if (profileImage) {
        formData.append('profileImage', profileImage);
      }

      const response = await fetch('/api/profile', {
        method: 'PUT',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      // Refresh the page to show updated data
      router.refresh();
    } catch (error) {
      console.error('Error updating profile:', error);
      // TODO: Add proper error handling/toast notification
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper
        elevation={0}
        sx={{
          p: 4,
          borderRadius: '16px',
          border: `1px solid ${brandColors.softGray}`,
          backgroundColor: brandColors.white,
        }}
      >
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color: brandColors.charcoal,
              mb: 1,
            }}
          >
            My Profile
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: brandColors.charcoal,
              opacity: 0.7,
            }}
          >
            Update your profile information and interests
          </Typography>
        </Box>

        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          <Stack spacing={4}>
            {/* Profile Photo Section */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Box sx={{ position: 'relative' }}>
                <Avatar
                  src={profileImagePreview || undefined}
                  alt={user.name || 'Profile'}
                  sx={{
                    width: 100,
                    height: 100,
                    border: `3px solid ${brandColors.inkBlue}`,
                  }}
                />
                <IconButton
                  onClick={() => fileInputRef.current?.click()}
                  sx={{
                    position: 'absolute',
                    bottom: -8,
                    right: -8,
                    backgroundColor: brandColors.inkBlue,
                    color: brandColors.white,
                    width: 36,
                    height: 36,
                    '&:hover': {
                      backgroundColor: brandColors.charcoal,
                    },
                  }}
                >
                  <PhotoCamera fontSize="small" />
                </IconButton>
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Profile Photo
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Click the camera icon to update your photo
                </Typography>
              </Box>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageChange}
                accept="image/*"
                style={{ display: 'none' }}
              />
            </Box>

            {/* Name Field */}
            <TextField
              label="Full Name"
              fullWidth
              {...register('name')}
              error={!!errors.name}
              helperText={errors.name?.message}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            />

            {/* Address Field */}
            <TextField
              label="Address"
              fullWidth
              placeholder="Your current address"
              {...register('address')}
              error={!!errors.address}
              helperText={
                errors.address?.message || 'This helps neighbors find you'
              }
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            />

            {/* Bio Field */}
            <TextField
              label="About Me"
              fullWidth
              multiline
              rows={3}
              placeholder="Tell your neighbors a bit about yourself..."
              {...register('bio')}
              error={!!errors.bio}
              helperText={errors.bio?.message}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            />

            {/* Share Interests */}
            <Box>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Things I can share
              </Typography>
              <Autocomplete
                multiple
                value={shareInterests}
                onChange={(_, newValue) =>
                  setValue('shareInterests', newValue, { shouldDirty: true })
                }
                options={INTEREST_OPTIONS}
                freeSolo
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      variant="outlined"
                      label={option}
                      {...getTagProps({ index })}
                      key={index}
                      sx={{
                        borderColor: brandColors.inkBlue,
                        color: brandColors.inkBlue,
                      }}
                    />
                  ))
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Add items you're willing to share..."
                    helperText="Type to add custom items or select from suggestions"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                      },
                    }}
                  />
                )}
              />
            </Box>

            {/* Borrow Interests */}
            <Box>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Things I might borrow
              </Typography>
              <Autocomplete
                multiple
                value={borrowInterests}
                onChange={(_, newValue) =>
                  setValue('borrowInterests', newValue, { shouldDirty: true })
                }
                options={INTEREST_OPTIONS}
                freeSolo
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      variant="outlined"
                      label={option}
                      {...getTagProps({ index })}
                      key={index}
                      sx={{
                        borderColor: brandColors.mustardYellow,
                        color: brandColors.charcoal,
                        backgroundColor: brandColors.mustardYellow,
                      }}
                    />
                  ))
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Add items you might want to borrow..."
                    helperText="This helps neighbors know what you're looking for"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                      },
                    }}
                  />
                )}
              />
            </Box>

            {/* Submit Button */}
            <Box sx={{ pt: 2 }}>
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={!isDirty || isLoading}
                sx={{
                  borderRadius: 3,
                  px: 4,
                  py: 1.5,
                  textTransform: 'none',
                  fontSize: '1.1rem',
                  fontWeight: 600,
                }}
              >
                {isLoading ? (
                  <>
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </Box>

            {/* Sign Out Section */}
            <Box
              sx={{
                pt: 4,
                borderTop: `1px solid ${brandColors.softGray}`,
                mt: 4,
              }}
            >
              <Box sx={{ textAlign: 'center' }}>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  Need to switch accounts?
                </Typography>
                <Button
                  onClick={() => signOut()}
                  variant="outlined"
                  color="error"
                  sx={{
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 500,
                  }}
                >
                  Sign Out
                </Button>
              </Box>
            </Box>
          </Stack>
        </Box>
      </Paper>
    </Container>
  );
}
