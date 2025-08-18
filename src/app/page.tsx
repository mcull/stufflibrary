import { LibraryBooks, Email, Construction } from '@mui/icons-material';
import {
  Container,
  Typography,
  Button,
  AppBar,
  Toolbar,
  Box,
  Stack,
  Chip,
} from '@mui/material';

export default function Home() {
  return (
    <>
      <AppBar
        component="header"
        position="static"
        elevation={0}
        sx={{ bgcolor: 'primary.main' }}
      >
        <Toolbar>
          <LibraryBooks sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            StuffLibrary.org
          </Typography>
        </Toolbar>
      </AppBar>

      <Container
        component="main"
        maxWidth="md"
        sx={{
          py: { xs: 8, md: 12 },
          minHeight: 'calc(100vh - 64px)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          textAlign: 'center',
        }}
      >
        <Box sx={{ mb: 6 }}>
          <Chip
            label="Coming Soon"
            color="primary"
            sx={{ mb: 3, fontSize: '0.875rem' }}
          />

          <Typography
            variant="h2"
            component="h1"
            gutterBottom
            sx={{
              fontSize: { xs: '2.5rem', sm: '3.5rem', md: '4rem' },
              fontWeight: 'bold',
              mb: 2,
            }}
          >
            StuffLibrary.org
          </Typography>

          <Typography
            variant="h4"
            component="h2"
            color="primary"
            gutterBottom
            sx={{
              fontSize: { xs: '1.5rem', sm: '2rem', md: '2.25rem' },
              fontWeight: 'medium',
              mb: 3,
            }}
          >
            Share more, buy less
          </Typography>

          <Typography
            variant="h6"
            color="text.secondary"
            paragraph
            sx={{
              maxWidth: '600px',
              mx: 'auto',
              fontSize: { xs: '1rem', md: '1.25rem' },
              lineHeight: 1.6,
            }}
          >
            A platform for neighbors to safely share under-used items like
            ladders, lawnmowers, and camping gear. Building stronger communities
            through sharing and trust.
          </Typography>
        </Box>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          justifyContent="center"
          alignItems="center"
          sx={{ mb: 8 }}
        >
          <Button
            variant="contained"
            size="large"
            startIcon={<Email />}
            sx={{ minWidth: { xs: '200px', sm: 'auto' } }}
          >
            Notify Me When Ready
          </Button>
          <Button
            variant="outlined"
            size="large"
            startIcon={<Construction />}
            sx={{ minWidth: { xs: '200px', sm: 'auto' } }}
          >
            View Progress
          </Button>
        </Stack>

        <Box sx={{ mt: 'auto', pt: 4 }}>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ opacity: 0.8 }}
          >
            Building something special for the community.
            <br />
            Stay tuned for updates!
          </Typography>
        </Box>
      </Container>
    </>
  );
}
