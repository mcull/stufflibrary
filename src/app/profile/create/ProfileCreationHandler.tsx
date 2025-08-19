'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import {
  ProfileWizard,
  type ProfileFormData,
} from '@/components/ProfileWizard';

interface ProfileCreationHandlerProps {
  userId: string;
  initialData?: Partial<ProfileFormData>;
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

export function ProfileCreationHandler({
  userId,
  initialData,
  user,
}: ProfileCreationHandlerProps) {
  const router = useRouter();
  const [_isSubmitting, setIsSubmitting] = useState(false);

  const handleProfileComplete = async (data: ProfileFormData) => {
    setIsSubmitting(true);

    try {
      let imageUrl: string | undefined;

      // Upload profile picture if provided
      if (data.profilePicture) {
        const formData = new FormData();
        formData.append('file', data.profilePicture);
        formData.append(
          'filename',
          `profiles/${userId}/avatar.${data.profilePicture.name.split('.').pop()}`
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
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          bio: data.bio || null,
          interests: data.interests,
          image: imageUrl || data.profilePictureUrl || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create profile');
      }

      // Clear any draft data
      localStorage.removeItem('profile-wizard-draft');

      // Redirect to dashboard
      router.push('/dashboard');
      router.refresh(); // Refresh to update session data
    } catch (error) {
      console.error('Profile creation error:', error);
      alert(
        error instanceof Error ? error.message : 'Failed to create profile'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ProfileWizard
      onComplete={handleProfileComplete}
      user={user}
      {...(initialData ? { initialData } : {})}
    />
  );
}
