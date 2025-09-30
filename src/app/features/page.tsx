import { Box } from '@mui/material';

import { FAQ } from '@/components/FAQ';
import { FeatureShowcase } from '@/components/FeatureShowcase';
import { brandColors } from '@/theme/brandTokens';

export const metadata = {
  title: 'Features & FAQ | StuffLibrary',
  description:
    'Learn how StuffLibrary works, why neighbors love sharing, and get answers to common questions about our community sharing platform.',
};

export default function FeaturesPage() {
  return (
    <Box
      sx={{
        backgroundColor: brandColors.white,
        minHeight: '100vh',
      }}
    >
      <FeatureShowcase />
      <FAQ />
    </Box>
  );
}
