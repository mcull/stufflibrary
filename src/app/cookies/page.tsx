import {
  Container,
  Typography,
  Box,
  Paper,
  Stack,
  Divider,
} from '@mui/material';

import { brandColors } from '@/theme/brandTokens';

export default function CookiePolicyPage() {
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper
        elevation={2}
        sx={{
          p: { xs: 3, md: 4 },
          borderRadius: 2,
          backgroundColor: brandColors.warmCream,
          border: `1px solid ${brandColors.softGray}`,
        }}
      >
        <Stack spacing={4}>
          {/* Header */}
          <Box textAlign="center">
            <Typography
              variant="h3"
              component="h1"
              gutterBottom
              sx={{
                color: brandColors.charcoal,
                fontWeight: 700,
                fontSize: { xs: '2rem', md: '2.5rem' },
              }}
            >
              Cookie Policy
            </Typography>
            <Typography
              variant="subtitle1"
              sx={{
                color: brandColors.charcoal,
                opacity: 0.8,
                fontStyle: 'italic',
              }}
            >
              Effective Date:{' '}
              {new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Typography>
          </Box>

          <Divider sx={{ borderColor: brandColors.softGray }} />

          {/* Cookie Usage Statement */}
          <Box>
            <Typography
              variant="body1"
              paragraph
              sx={{
                color: brandColors.charcoal,
                fontSize: '1.1rem',
                lineHeight: 1.6,
                textAlign: 'center',
              }}
            >
              StuffLibrary uses essential cookies for sign-in and security. Our
              analytics are cookieless. We do not sell or share personal
              information for cross-context advertising.
            </Typography>
          </Box>

          {/* Do Not Track Statement */}
          <Box>
            <Typography
              variant="body1"
              paragraph
              sx={{
                color: brandColors.charcoal,
                fontSize: '1.1rem',
                lineHeight: 1.6,
                textAlign: 'center',
              }}
            >
              We do not respond to browser &ldquo;Do Not Track&rdquo; signals,
              but if we ever engage in selling or sharing personal information,
              we will honor Global Privacy Control (GPC) opt-out signals.
            </Typography>
          </Box>

          {/* Contact Information */}
          <Box textAlign="center" sx={{ mt: 4 }}>
            <Typography
              variant="body2"
              sx={{ color: brandColors.charcoal, opacity: 0.7 }}
            >
              For questions about this Cookie Policy, please contact us at{' '}
              <strong>privacy@stufflibrary.org</strong>
            </Typography>
          </Box>
        </Stack>
      </Paper>
    </Container>
  );
}
