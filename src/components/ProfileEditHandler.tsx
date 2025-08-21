'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  Person as PersonIcon,
  PhotoCamera as PhotoCameraIcon,
} from '@mui/icons-material';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  Avatar,
  Chip,
  Stack,
  IconButton,
  Divider,
  Alert,
  CircularProgress,
  FormControl,
  FormLabel,
  FormHelperText,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { brandColors } from '@/theme/brandTokens';

interface User {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  bio: string | null;
  interests: string[];
  profileCompleted: boolean;
  createdAt: Date;
}

interface ProfileEditHandlerProps {
  user: User;
}

const profileEditSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  bio: z.string().optional(),
  interests: z.array(z.string()).min(1, 'Please select at least one interest'),
  profilePicture: z.instanceof(File).optional(),
});

type ProfileEditData = z.infer<typeof profileEditSchema>;

const INTEREST_OPTIONS = [
  { value: 'tools', label: 'Tools & Hardware' },
  { value: 'sports', label: 'Sports & Recreation' },
  { value: 'kitchen', label: 'Kitchen & Dining' },
  { value: 'yard', label: 'Yard & Garden' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'books', label: 'Books & Media' },
  { value: 'clothing', label: 'Clothing & Accessories' },
  { value: 'furniture', label: 'Furniture' },
  { value: 'automotive', label: 'Automotive' },
  { value: 'other', label: 'Other' },
];

export function ProfileEditHandler({ user }: ProfileEditHandlerProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProfileEditData>({
    resolver: zodResolver(profileEditSchema),
    defaultValues: {
      name: user.name || '',
      bio: user.bio || '',
      interests: user.interests || [],
    },
  });

  const watchedInterests = watch('interests');

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setValue('profilePicture', file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleInterest = (interest: string) => {
    const currentInterests = watchedInterests || [];
    const newInterests = currentInterests.includes(interest)
      ? currentInterests.filter((i) => i !== interest)
      : [...currentInterests, interest];
    setValue('interests', newInterests);
  };

  const onSubmit = async (data: ProfileEditData) => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      let imageUrl: string | undefined;

      // Upload profile picture if provided
      if (data.profilePicture) {
        const formData = new FormData();
        formData.append('file', data.profilePicture);
        formData.append(
          'filename',
          `profiles/${user.id}/avatar.${data.profilePicture.name
            .split('.')
            .pop()}`
        );

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) {
          const error = await uploadResponse.json();
          throw new Error(error.message || 'Failed to upload image');
        }

        const uploadResult = await uploadResponse.json();
        imageUrl = uploadResult.url;
      }

      // Update user profile
      const response = await fetch('/api/profile', {
        method: 'PUT', // Use PUT for updates
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          bio: data.bio || null,
          interests: data.interests,
          ...(imageUrl && { image: imageUrl }),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update profile');
      }

      setSuccess(true);

      // Redirect to profile view after short delay
      setTimeout(() => {
        router.push('/profile');
      }, 1500);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Failed to update profile'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
        <IconButton
          onClick={() => router.push('/profile')}
          sx={{ mr: 2 }}
          aria-label="Back to profile"
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
          Edit Profile
        </Typography>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Profile updated successfully! Redirecting...
        </Alert>
      )}

      {/* Edit Form */}
      <Card
        sx={{
          borderRadius: '16px',
          border: `1px solid ${brandColors.softGray}`,
          backgroundColor: brandColors.white,
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Box component="form" onSubmit={handleSubmit(onSubmit)}>
            {/* Profile Picture Section */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
              <Avatar
                {...((previewImage || user.image) && {
                  src: previewImage || user.image,
                })}
                sx={{
                  width: 80,
                  height: 80,
                  mr: 3,
                  fontSize: '2rem',
                  bgcolor: brandColors.inkBlue,
                }}
              >
                {!previewImage && !user.image && (
                  <PersonIcon sx={{ fontSize: '2.5rem' }} />
                )}
              </Avatar>
              <Box>
                <Button
                  variant="outlined"
                  startIcon={<PhotoCameraIcon />}
                  onClick={() => fileInputRef.current?.click()}
                  sx={{
                    borderRadius: '12px',
                    borderColor: brandColors.inkBlue,
                    color: brandColors.inkBlue,
                  }}
                >
                  Change Photo
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  style={{ display: 'none' }}
                />
                <Typography
                  variant="caption"
                  display="block"
                  sx={{ mt: 1, color: brandColors.charcoal, opacity: 0.6 }}
                >
                  JPG, PNG or GIF (max 5MB)
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ mb: 4 }} />

            {/* Name Field */}
            <TextField
              {...register('name')}
              label="Full Name"
              fullWidth
              error={!!errors.name}
              helperText={errors.name?.message}
              sx={{
                mb: 3,
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                },
              }}
            />

            {/* Bio Field */}
            <TextField
              {...register('bio')}
              label="Bio"
              multiline
              rows={4}
              fullWidth
              helperText="Tell other members about yourself"
              sx={{
                mb: 4,
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                },
              }}
            />

            {/* Interests Section */}
            <FormControl
              error={!!errors.interests}
              sx={{ mb: 4, width: '100%' }}
            >
              <FormLabel sx={{ mb: 2, fontWeight: 600 }}>
                Interests & Categories
              </FormLabel>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {INTEREST_OPTIONS.map((option) => (
                  <Chip
                    key={option.value}
                    label={option.label}
                    clickable
                    onClick={() => toggleInterest(option.value)}
                    sx={{
                      bgcolor: watchedInterests?.includes(option.value)
                        ? brandColors.inkBlue
                        : `${brandColors.softGray}30`,
                      color: watchedInterests?.includes(option.value)
                        ? 'white'
                        : brandColors.charcoal,
                      '&:hover': {
                        bgcolor: watchedInterests?.includes(option.value)
                          ? `${brandColors.inkBlue}dd`
                          : `${brandColors.softGray}60`,
                      },
                    }}
                  />
                ))}
              </Stack>
              {errors.interests && (
                <FormHelperText>{errors.interests.message}</FormHelperText>
              )}
            </FormControl>

            {/* Submit Buttons */}
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                onClick={() => router.push('/profile')}
                disabled={isSubmitting}
                sx={{ borderRadius: '12px' }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={isSubmitting}
                startIcon={
                  isSubmitting ? <CircularProgress size={20} /> : <SaveIcon />
                }
                sx={{
                  borderRadius: '12px',
                  px: 4,
                }}
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
}
