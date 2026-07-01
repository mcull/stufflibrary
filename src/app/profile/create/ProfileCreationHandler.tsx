'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import {
  ProfileWizard,
  type ProfileFormData,
  type ProfileSubmitMode,
} from '@/components/ProfileWizard';

interface ProfileCreationHandlerProps {
  userId?: string;
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
  userId: userIdProp,
  initialData,
  user: userProp,
}: ProfileCreationHandlerProps) {
  const router = useRouter();
  const [_isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingMinimal, setIsSubmittingMinimal] = useState(false);
  const [loadingUser, setLoadingUser] = useState(false);
  const [userId, setUserId] = useState<string | undefined>(userIdProp);
  const [user, setUser] = useState<typeof userProp>(userProp);
  const searchParams = useSearchParams();

  // Ensure we have the current user and id; redirect if unauthorized
  useEffect(() => {
    if (userId && user) return; // Already provided

    let mounted = true;
    setLoadingUser(true);
    (async () => {
      try {
        const resp = await fetch('/api/profile');
        if (resp.status === 401) {
          router.replace('/auth/signin');
          return;
        }
        if (!resp.ok) throw new Error('Failed to load profile');
        const data = await resp.json();
        if (!mounted) return;
        setUserId(data.user?.id);
        setUser({
          id: data.user?.id,
          name: data.user?.name,
          email: data.user?.email,
          image: data.user?.image ?? undefined,
          createdAt: data.user?.createdAt,
          profileCompleted: !!data.user?.profileCompleted,
        });
      } catch {
        // ignore
      } finally {
        if (mounted) setLoadingUser(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [userId, user, router]);

  const handleMinimalComplete = async (data: ProfileFormData) => {
    setIsSubmittingMinimal(true);
    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'minimal',
          name: data.name,
          agreedToTerms: true,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(
          error.error || error.message || 'Failed to get started'
        );
      }

      const draftKey = user?.email
        ? `profile-wizard-draft-${user.email}`
        : 'profile-wizard-draft-temp';
      localStorage.removeItem(draftKey);

      router.replace('/stacks?welcome=true');
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to get started');
      setIsSubmittingMinimal(false);
    }
  };

  const handleProfileComplete = async (
    data: ProfileFormData,
    mode: ProfileSubmitMode
  ) => {
    if (mode === 'minimal') {
      await handleMinimalComplete(data);
      return;
    }
    setIsSubmitting(true);

    try {
      let imageUrl: string | undefined;

      // Upload profile picture if provided
      if (data.profilePicture) {
        // If we somehow still don't have userId, fetch it before upload
        let ensuredUserId = userId;
        if (!ensuredUserId) {
          try {
            const r = await fetch('/api/profile');
            if (r.ok) {
              const d = await r.json();
              ensuredUserId = d.user?.id;
            }
          } catch {}
        }
        const formData = new FormData();
        formData.append('file', data.profilePicture);
        formData.append(
          'filename',
          `profiles/${ensuredUserId ?? 'me'}/avatar.${data.profilePicture.name
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
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          address: data.address,
          bio: data.bio || null,
          image: imageUrl || data.profilePictureUrl || null,
          parsedAddress: data.parsedAddress,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create profile');
      }

      // Clear any draft data
      localStorage.removeItem('profile-wizard-draft');

      // Redirect to intended destination if provided, otherwise to lobby
      const returnTo = searchParams?.get('returnTo');
      if (returnTo) {
        try {
          const decoded = decodeURIComponent(returnTo);
          router.push(decoded);
        } catch {
          router.push('/stacks?welcome=true');
        }
      } else {
        router.push('/stacks?welcome=true');
      }
      router.refresh(); // Refresh to update session data
    } catch (error) {
      alert(
        error instanceof Error ? error.message : 'Failed to create profile'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {loadingUser ? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Preparing your profile…</p>
          </div>
        </div>
      ) : (
        <ProfileWizard
          onComplete={handleProfileComplete}
          user={user}
          isSubmittingMinimal={isSubmittingMinimal}
          {...(searchParams?.get('continue')
            ? {
                initialStep: 1,
                // Reached here from the app (a just-in-time prompt), so offer a
                // way back instead of trapping the user in the wizard.
                onExit: () => {
                  const returnTo = searchParams?.get('returnTo');
                  router.push(
                    returnTo ? decodeURIComponent(returnTo) : '/stacks'
                  );
                },
              }
            : {})}
          {...(initialData ? { initialData } : {})}
        />
      )}
    </>
  );
}
