import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { Box, IconButton } from '@mui/material';
import { useRouter } from 'next/navigation';

import { brandColors } from '@/theme/brandTokens';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const router = useRouter();

  const handleBackClick = () => {
    router.push('/');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: brandColors.warmCream,
      }}
    >
      {/* Back Button */}
      <Box
        sx={{
          position: 'absolute',
          top: { xs: 16, sm: 24 },
          left: { xs: 16, sm: 24 },
          zIndex: 10,
        }}
      >
        <IconButton
          onClick={handleBackClick}
          sx={{
            color: brandColors.charcoal,
            backgroundColor: brandColors.white,
            border: `1px solid ${brandColors.softGray}`,
            width: 40,
            height: 40,
            '&:hover': {
              backgroundColor: brandColors.white,
              borderColor: brandColors.inkBlue,
            },
          }}
        >
          <ArrowBackIcon />
        </IconButton>
      </Box>

      {/* Content */}
      {children}
    </Box>
  );
}
