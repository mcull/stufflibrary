'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Close as CloseIcon, Logout as LogoutIcon } from '@mui/icons-material';
import {
  Alert,
  Box,
  Container,
  Paper,
  Typography,
  IconButton,
  Tooltip,
} from '@mui/material';
import { signOut } from 'next-auth/react';
import { useEffect, useState } from 'react';
import type { FieldErrors } from 'react-hook-form';
import { useForm, FormProvider } from 'react-hook-form';
import { z } from 'zod';

import { brandColors } from '@/theme/brandTokens';

import {
  profileCardStatus,
  completedCardCount,
  type CompletenessKey,
} from './profile-wizard/completeness';
import { canSubmitMinimal } from './profile-wizard/minimalEntry';
import { ProfileCompleteness } from './profile-wizard/ProfileCompleteness';
import { ProfileStep1 } from './profile-wizard/ProfileStep1';
import { ProfileStep2 } from './profile-wizard/ProfileStep2';
import { Wordmark } from './Wordmark';

const profileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  address: z.string().min(1, 'Address is required to find your neighbors'),
  bio: z.string().optional(),
  profilePicture: z
    .instanceof(File)
    .refine((file) => file instanceof File, 'Profile picture is required')
    .refine(
      (file) => file.size <= 10 * 1024 * 1024, // 10MB limit
      'Profile picture must be less than 10MB'
    )
    .refine(
      (file) =>
        ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(
          file.type
        ),
      'Profile picture must be a JPEG, PNG, or WebP image'
    ),
  profilePictureUrl: z.string().optional(),
  agreedToHouseholdGoods: z.boolean(),
  agreedToTrustAndCare: z.boolean(),
  agreedToCommunityValues: z.boolean(),
  agreedToAgeRestrictions: z.boolean(),
  agreedToTerms: z.boolean(),
  // Store parsed address data from Google Places
  parsedAddress: z.any().optional(),
});

export type ProfileFormData = z.infer<typeof profileSchema>;

// Two steps: minimal entry, then a single "complete your card" screen that
// collects photo + address together (Cancel / Done), so finishing from a
// just-in-time prompt feels like one quick task rather than a multi-step wizard.
const steps = [
  { label: 'Get started', component: ProfileStep1 },
  { label: 'Complete your card', component: ProfileStep2 },
];

export type ProfileSubmitMode = 'minimal' | 'full';

interface ProfileWizardProps {
  onComplete: (data: ProfileFormData, mode: ProfileSubmitMode) => void;
  initialData?: Partial<ProfileFormData>;
  initialStep?: number;
  isSubmittingMinimal?: boolean;
  /** When provided, shows a "close" affordance that exits back to the app. */
  onExit?: () => void;
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

/**
 * A friendly, field-aware explanation for why a full-profile submit was
 * blocked. Prevents the "button looks active but does nothing" dead end by
 * turning silent react-hook-form validation failures into visible guidance.
 */
export function profileSubmitBlockMessage(
  errors: FieldErrors<ProfileFormData>
): string {
  if (errors.profilePicture) {
    return 'Please add a profile photo before you finish.';
  }
  if (errors.address || errors.parsedAddress) {
    return 'Please pick your address from the suggestions so we can verify it.';
  }
  if (errors.name) {
    return 'Please enter your name.';
  }
  if (
    errors.agreedToHouseholdGoods ||
    errors.agreedToTrustAndCare ||
    errors.agreedToCommunityValues ||
    errors.agreedToAgeRestrictions ||
    errors.agreedToTerms
  ) {
    return 'Please accept the community agreements to continue.';
  }
  return 'Please complete the highlighted fields to continue.';
}

export function ProfileWizard({
  onComplete,
  initialData,
  initialStep,
  isSubmittingMinimal,
  onExit,
  user,
}: ProfileWizardProps) {
  const [activeStep, setActiveStep] = useState(initialStep ?? 0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [profilePicturePreviewUrl, setProfilePicturePreviewUrl] = useState<
    string | null
  >(null);

  const methods = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      address: '',
      bio: undefined,
      profilePictureUrl: undefined,
      agreedToHouseholdGoods: false,
      agreedToTrustAndCare: false,
      agreedToCommunityValues: false,
      agreedToAgeRestrictions: false,
      agreedToTerms: false,
      parsedAddress: undefined,
      ...initialData,
    },
    mode: 'onBlur',
  });

  const { handleSubmit, trigger, watch, getValues } = methods;

  // Watch profilePicture to create/update preview URL
  const profilePicture = watch('profilePicture');
  useEffect(() => {
    if (profilePicture instanceof File) {
      // Create new preview URL
      const newUrl = URL.createObjectURL(profilePicture);
      setProfilePicturePreviewUrl((prevUrl) => {
        // Revoke old URL to prevent memory leaks
        if (prevUrl) {
          URL.revokeObjectURL(prevUrl);
        }
        return newUrl;
      });
    } else if (!profilePicture) {
      // Clean up when file is removed
      setProfilePicturePreviewUrl((prevUrl) => {
        if (prevUrl) {
          URL.revokeObjectURL(prevUrl);
        }
        return null;
      });
    }
  }, [profilePicture]);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (profilePicturePreviewUrl) {
        URL.revokeObjectURL(profilePicturePreviewUrl);
      }
    };
  }, [profilePicturePreviewUrl]);

  // Auto-save draft to localStorage (user-specific)
  const watchedValues = watch();
  useEffect(() => {
    // Create user-specific key to prevent data leakage between users
    const draftKey = user?.email
      ? `profile-wizard-draft-${user.email}`
      : 'profile-wizard-draft-temp';
    const timeoutId = setTimeout(() => {
      localStorage.setItem(draftKey, JSON.stringify(watchedValues));
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [watchedValues, user?.email]);

  // Load draft on mount and clean up stale drafts
  useEffect(() => {
    // Create user-specific key
    const draftKey = user?.email
      ? `profile-wizard-draft-${user.email}`
      : 'profile-wizard-draft-temp';

    // Clean up any old non-user-specific drafts first
    localStorage.removeItem('profile-wizard-draft');

    // Clean up drafts from other users by removing all profile wizard draft keys except current user
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('profile-wizard-draft-') && key !== draftKey) {
        localStorage.removeItem(key);
      }
    });

    // Load current user's draft
    const savedDraft = localStorage.getItem(draftKey);
    if (savedDraft && !initialData) {
      try {
        const draft = JSON.parse(savedDraft);
        methods.reset(draft);
      } catch (error) {
        console.warn('Failed to load profile draft:', error);
        // Clear corrupted draft
        localStorage.removeItem(draftKey);
      }
    }
  }, [methods, initialData, user?.email]);

  const handleNext = async () => {
    const fieldsToValidate = getFieldsForStep(activeStep);
    const isStepValid = await trigger(fieldsToValidate);

    if (isStepValid) {
      setSubmitError(null);
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setSubmitError(null);
    setActiveStep((prev) => prev - 1);
  };

  const handleComplete = async (data: ProfileFormData) => {
    // Validate checkboxes before proceeding
    if (
      !data.agreedToHouseholdGoods ||
      !data.agreedToTrustAndCare ||
      !data.agreedToCommunityValues ||
      !data.agreedToAgeRestrictions ||
      !data.agreedToTerms
    ) {
      // The agreements live on Step 1; surface the reason rather than
      // silently no-op'ing (which reads as a dead "Complete Profile" button).
      setSubmitError('Please accept the community agreements to continue.');
      return;
    }

    setSubmitError(null);

    // Clear user-specific draft
    const draftKey = user?.email
      ? `profile-wizard-draft-${user.email}`
      : 'profile-wizard-draft-temp';
    localStorage.removeItem(draftKey);

    // Skip interstitial and go directly to onComplete callback
    // which will handle the redirect to lobby
    onComplete(data, 'full');
  };

  // react-hook-form calls this when zod validation blocks the submit. Without
  // it the failure is silent and the button appears to do nothing.
  const handleInvalid = (errors: FieldErrors<ProfileFormData>) => {
    setSubmitError(profileSubmitBlockMessage(errors));
  };

  // Minimal entry: name + agreements only. Bypasses the full zod schema
  // (which requires address + photo); UI gating in Step 1 enforces the
  // agreements via canSubmitMinimal.
  const handleMinimalSubmit = () => {
    const data = getValues();
    if (
      !data.agreedToHouseholdGoods ||
      !data.agreedToTrustAndCare ||
      !data.agreedToCommunityValues ||
      !data.agreedToAgeRestrictions ||
      !data.agreedToTerms ||
      !data.name?.trim()
    ) {
      return;
    }

    const draftKey = user?.email
      ? `profile-wizard-draft-${user.email}`
      : 'profile-wizard-draft-temp';
    localStorage.removeItem(draftKey);

    onComplete(data, 'minimal');
  };

  function getFieldsForStep(step: number): (keyof ProfileFormData)[] {
    switch (step) {
      case 0:
        return [
          'name',
          'agreedToHouseholdGoods',
          'agreedToTrustAndCare',
          'agreedToCommunityValues',
          'agreedToAgeRestrictions',
          'agreedToTerms',
        ];
      case 1:
        // Combined completion step: photo + address together.
        return ['profilePicture', 'address'];
      default:
        return [];
    }
  }

  // Cancel out of the wizard: exit to the app when opened from a prompt
  // (onExit), otherwise step back to the minimal entry.
  const handleCancel = () => {
    setSubmitError(null);
    if (onExit) {
      onExit();
    } else {
      setActiveStep(0);
    }
  };

  const CurrentStepComponent = steps[activeStep]?.component;

  // Derive card completeness for the indicator that replaced the stepper.
  const pa = watchedValues.parsedAddress;
  const cardStatus = profileCardStatus({
    hasBasics: canSubmitMinimal({
      name: watchedValues.name ?? '',
      agreedToHouseholdGoods: !!watchedValues.agreedToHouseholdGoods,
      agreedToTrustAndCare: !!watchedValues.agreedToTrustAndCare,
      agreedToCommunityValues: !!watchedValues.agreedToCommunityValues,
      agreedToAgeRestrictions: !!watchedValues.agreedToAgeRestrictions,
      agreedToTerms: !!watchedValues.agreedToTerms,
    }),
    hasPhoto:
      watchedValues.profilePicture instanceof File ||
      Boolean(watchedValues.profilePictureUrl),
    hasAddress: Boolean(pa?.address1 && pa?.city && pa?.state && pa?.zip),
  });

  // You-are-here highlight: basics on step 0; on the combined completion step,
  // point at whichever of photo/address is still outstanding.
  const currentCardKey: CompletenessKey =
    activeStep === 0
      ? 'basics'
      : cardStatus.find((i) => i.key === 'photo')?.done
        ? 'address'
        : 'photo';

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, sm: 4 },
          borderRadius: '16px',
          border: `1px solid ${brandColors.softGray}`,
          backgroundColor: brandColors.white,
        }}
      >
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          {/* Top row (hidden on the completion step, which has Cancel/Done):
              close on the left, sign out on the right. */}
          {activeStep < steps.length - 1 && (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 2,
              }}
            >
              {onExit ? (
                <Tooltip title="Close and go back" arrow>
                  <IconButton
                    onClick={onExit}
                    size="small"
                    sx={{
                      color: brandColors.charcoal,
                      opacity: 0.7,
                      '&:hover': {
                        opacity: 1,
                        backgroundColor: 'rgba(0, 0, 0, 0.04)',
                      },
                    }}
                    aria-label="Close"
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              ) : (
                <Box />
              )}
              <Tooltip title="Sign out" arrow>
                <IconButton
                  onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                  size="small"
                  sx={{
                    color: brandColors.charcoal,
                    opacity: 0.7,
                    '&:hover': {
                      opacity: 1,
                      backgroundColor: 'rgba(0, 0, 0, 0.04)',
                    },
                  }}
                  aria-label="Sign out"
                >
                  <LogoutIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          )}

          {/* Centered header content */}
          <Box sx={{ textAlign: 'center' }}>
            <Box sx={{ mb: 3 }}>
              <Box sx={{ transform: 'rotate(-1.2deg)' }}>
                <Wordmark size="medium" color="primary" />
              </Box>
            </Box>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                color: brandColors.charcoal,
                mb: 1,
              }}
            >
              Your Library Card
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: brandColors.charcoal,
                opacity: 0.7,
              }}
            >
              {activeStep === 0
                ? 'Just your name and a few community basics — you can be in in under a minute.'
                : "Add a photo and your address so neighbors know who they're sharing with."}
            </Typography>
          </Box>
        </Box>

        {/* Card completeness — what the library card holds, filling in as you
            go (replaces the linear 1-2-3 stepper). */}
        <Box sx={{ mb: 4 }}>
          <ProfileCompleteness items={cardStatus} currentKey={currentCardKey} />
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              textAlign: 'center',
              mt: 1.5,
              color: brandColors.charcoal,
              opacity: 0.6,
            }}
          >
            {completedCardCount(cardStatus) < cardStatus.length
              ? 'You can fill in the rest anytime.'
              : 'Your card is all set!'}
          </Typography>
        </Box>

        {/* Form Content */}
        <FormProvider {...methods}>
          <Box
            component="form"
            onSubmit={handleSubmit(
              handleComplete as (data: ProfileFormData) => void,
              handleInvalid
            )}
          >
            {submitError && (
              <Alert
                severity="warning"
                onClose={() => setSubmitError(null)}
                sx={{ mb: 3, borderRadius: 2 }}
              >
                {submitError}
              </Alert>
            )}
            {CurrentStepComponent && (
              <CurrentStepComponent
                onNext={handleNext}
                onBack={handleBack}
                isFirstStep={activeStep === 0}
                isLastStep={activeStep === steps.length - 1}
                profilePicturePreviewUrl={profilePicturePreviewUrl}
                onMinimalSubmit={handleMinimalSubmit}
                isSubmittingMinimal={Boolean(isSubmittingMinimal)}
                onCancel={handleCancel}
              />
            )}
          </Box>
        </FormProvider>
      </Paper>
    </Container>
  );
}
