'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Check } from '@mui/icons-material';
import {
  Box,
  Container,
  Paper,
  Step,
  StepConnector,
  StepLabel,
  Stepper,
  Typography,
  styled,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { z } from 'zod';

import { brandColors } from '@/theme/brandTokens';

import { ProfileStep1 } from './profile-wizard/ProfileStep1';
import { ProfileStep2 } from './profile-wizard/ProfileStep2';
import { ProfileStep3 } from './profile-wizard/ProfileStep3';
import { Wordmark } from './Wordmark';

const profileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  address: z.string().min(1, 'Address is required to find your neighbors'),
  bio: z.string().optional(),
  shareInterests: z.array(z.string()).default([]),
  borrowInterests: z.array(z.string()).default([]),
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
  agreedToHouseholdGoods: z.boolean().default(false),
  agreedToTrustAndCare: z.boolean().default(false),
  agreedToCommunityValues: z.boolean().default(false),
  agreedToAgeRestrictions: z.boolean().default(false),
  agreedToTerms: z.boolean().default(false),
  // Store parsed address data from Google Places
  parsedAddress: z.any().optional(),
});

export type ProfileFormData = z.infer<typeof profileSchema>;

const CustomConnector = styled(StepConnector)(() => ({
  '& .MuiStepConnector-line': {
    height: 3,
    border: 0,
    backgroundColor: brandColors.softGray,
    borderRadius: 1,
  },
  '&.Mui-active .MuiStepConnector-line': {
    backgroundImage: `linear-gradient(95deg, ${brandColors.inkBlue} 0%, ${brandColors.inkBlue} 100%)`,
  },
  '&.Mui-completed .MuiStepConnector-line': {
    backgroundImage: `linear-gradient(95deg, ${brandColors.inkBlue} 0%, ${brandColors.inkBlue} 100%)`,
  },
}));

const CustomStepIcon = styled('div')<{
  ownerState: { completed?: boolean; active?: boolean };
}>(({ ownerState }) => ({
  backgroundColor:
    ownerState.completed || ownerState.active
      ? brandColors.inkBlue
      : brandColors.softGray,
  zIndex: 1,
  color: '#fff',
  width: 50,
  height: 50,
  display: 'flex',
  borderRadius: '50%',
  justifyContent: 'center',
  alignItems: 'center',
  fontSize: '1.2rem',
  fontWeight: 600,
  ...(ownerState.active && {
    backgroundImage: `linear-gradient(95deg, ${brandColors.inkBlue} 0%, ${brandColors.inkBlue} 100%)`,
    boxShadow: '0 4px 10px 0 rgba(0,0,0,.25)',
  }),
}));

function StepIcon(props: {
  icon: React.ReactNode;
  completed?: boolean;
  active?: boolean;
}) {
  const { icon, completed, active } = props;

  return (
    <CustomStepIcon
      ownerState={{ completed: completed || false, active: active || false }}
    >
      {completed ? <Check /> : icon}
    </CustomStepIcon>
  );
}

const steps = [
  { label: 'Basic Info', component: ProfileStep1 },
  { label: 'Profile & Interests', component: ProfileStep2 },
  { label: 'Review & Complete', component: ProfileStep3 },
];

interface ProfileWizardProps {
  onComplete: (data: ProfileFormData) => void;
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

export function ProfileWizard({
  onComplete,
  initialData,
  user,
}: ProfileWizardProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [profilePicturePreviewUrl, setProfilePicturePreviewUrl] = useState<
    string | null
  >(null);

  const methods = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema) as any,
    defaultValues: {
      name: '',
      address: '',
      bio: undefined,
      shareInterests: [],
      borrowInterests: [],
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

  const { handleSubmit, trigger, watch } = methods;

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
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
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
      // This shouldn't happen due to UI logic, but just in case
      return;
    }

    // Clear user-specific draft
    const draftKey = user?.email
      ? `profile-wizard-draft-${user.email}`
      : 'profile-wizard-draft-temp';
    localStorage.removeItem(draftKey);

    // Skip interstitial and go directly to onComplete callback
    // which will handle the redirect to lobby
    onComplete(data);
  };

  function getFieldsForStep(step: number): (keyof ProfileFormData)[] {
    switch (step) {
      case 0:
        return ['name', 'address'];
      case 1:
        return ['profilePicture'];
      case 2:
        return [
          'agreedToHouseholdGoods',
          'agreedToTrustAndCare',
          'agreedToCommunityValues',
          'agreedToAgeRestrictions',
          'agreedToTerms',
        ];
      default:
        return [];
    }
  }

  const CurrentStepComponent = steps[activeStep]?.component;

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
        <Box sx={{ mb: 4, textAlign: 'center' }}>
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
            Complete Your Profile
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: brandColors.charcoal,
              opacity: 0.7,
            }}
          >
            Let your neighbors know who you are and where your stuff is
          </Typography>
        </Box>

        {/* Progress Stepper */}
        <Stepper
          activeStep={activeStep}
          connector={<CustomConnector />}
          sx={{ mb: 4 }}
        >
          {steps.map((step, index) => (
            <Step key={step.label}>
              <StepLabel
                StepIconComponent={() => (
                  <StepIcon
                    icon={index + 1}
                    completed={index < activeStep}
                    active={index === activeStep}
                  />
                )}
                sx={{
                  '& .MuiStepLabel-label': {
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color:
                      index <= activeStep
                        ? brandColors.charcoal
                        : brandColors.softGray,
                    mt: 1,
                    // Hide labels on mobile for cleaner UI
                    display: { xs: 'none', sm: 'block' },
                  },
                }}
              >
                {step.label}
              </StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Form Content */}
        <FormProvider {...methods}>
          <Box component="form" onSubmit={handleSubmit(handleComplete as any)}>
            {CurrentStepComponent && (
              <CurrentStepComponent
                onNext={handleNext}
                onBack={handleBack}
                isFirstStep={activeStep === 0}
                isLastStep={activeStep === steps.length - 1}
                profilePicturePreviewUrl={profilePicturePreviewUrl}
              />
            )}
          </Box>
        </FormProvider>
      </Paper>
    </Container>
  );
}
