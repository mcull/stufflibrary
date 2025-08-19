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
import { ProfileStepComplete } from './profile-wizard/ProfileStepComplete';

const profileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  bio: z.string().optional(),
  interests: z.array(z.string()).min(1, 'Please select at least one interest'),
  profilePicture: z.instanceof(File).optional(),
  profilePictureUrl: z.string().optional(),
  agreedToTerms: z
    .boolean()
    .refine((val) => val === true, 'You must agree to the terms'),
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
  user?: {
    id: string;
    name: string;
    email: string;
    image?: string;
    createdAt: string;
    profileCompleted: boolean;
  };
}

export function ProfileWizard({
  onComplete,
  initialData,
  user,
}: ProfileWizardProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const methods = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      bio: '',
      interests: [],
      agreedToTerms: false,
      ...initialData,
    },
    mode: 'onChange',
  });

  const { handleSubmit, trigger, watch } = methods;

  // Auto-save draft to localStorage
  const watchedValues = watch();
  useEffect(() => {
    const draftKey = 'profile-wizard-draft';
    const timeoutId = setTimeout(() => {
      localStorage.setItem(draftKey, JSON.stringify(watchedValues));
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [watchedValues]);

  // Load draft on mount
  useEffect(() => {
    const draftKey = 'profile-wizard-draft';
    const savedDraft = localStorage.getItem(draftKey);
    if (savedDraft && !initialData) {
      try {
        const draft = JSON.parse(savedDraft);
        methods.reset(draft);
      } catch (error) {
        console.warn('Failed to load profile draft:', error);
      }
    }
  }, [methods, initialData]);

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
    setIsComplete(true);

    // Clear draft
    localStorage.removeItem('profile-wizard-draft');

    onComplete(data);
  };

  function getFieldsForStep(step: number): (keyof ProfileFormData)[] {
    switch (step) {
      case 0:
        return ['name'];
      case 1:
        return ['interests'];
      case 2:
        return ['agreedToTerms'];
      default:
        return [];
    }
  }

  if (isComplete) {
    return <ProfileStepComplete user={user} />;
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
            Help us create a personalized experience for you
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
          <Box component="form" onSubmit={handleSubmit(handleComplete)}>
            {CurrentStepComponent && (
              <CurrentStepComponent
                onNext={handleNext}
                onBack={handleBack}
                isFirstStep={activeStep === 0}
                isLastStep={activeStep === steps.length - 1}
              />
            )}
          </Box>
        </FormProvider>
      </Paper>
    </Container>
  );
}
