import { AppBar, Toolbar, Container, Box, Button, Stack } from '@mui/material';

import { brandColors } from '@/theme/brandTokens';

import { Wordmark } from './Wordmark';

export function Header() {
  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{
        backgroundColor: brandColors.warmCream,
        borderBottom: `1px solid ${brandColors.softGray}`,
      }}
    >
      <Container maxWidth="lg">
        <Toolbar
          disableGutters
          sx={{
            minHeight: { xs: 64, md: 80 },
            justifyContent: 'space-between',
            py: 1,
          }}
        >
          {/* Wordmark */}
          <Box sx={{ flexGrow: 0 }}>
            <Wordmark size="medium" color="primary" />
          </Box>

          {/* Navigation */}
          <Stack
            direction="row"
            spacing={{ xs: 1, md: 2 }}
            sx={{
              display: { xs: 'none', sm: 'flex' },
              alignItems: 'center',
            }}
          >
            <Button
              color="inherit"
              sx={{
                color: brandColors.charcoal,
                textTransform: 'none',
                fontWeight: 500,
                '&:hover': {
                  backgroundColor: 'rgba(30, 58, 95, 0.08)',
                },
              }}
            >
              How It Works
            </Button>
            <Button
              color="inherit"
              sx={{
                color: brandColors.charcoal,
                textTransform: 'none',
                fontWeight: 500,
                '&:hover': {
                  backgroundColor: 'rgba(30, 58, 95, 0.08)',
                },
              }}
            >
              About
            </Button>
            <Button
              variant="contained"
              color="primary"
              sx={{
                textTransform: 'none',
                fontWeight: 500,
                px: 3,
              }}
            >
              Coming Soon
            </Button>
          </Stack>

          {/* Mobile Menu Button (placeholder) */}
          <Box sx={{ display: { xs: 'flex', sm: 'none' } }}>
            <Button
              variant="contained"
              color="primary"
              size="small"
              sx={{
                textTransform: 'none',
                fontWeight: 500,
                px: 2,
              }}
            >
              Soon
            </Button>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
