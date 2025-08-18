import { Share, LibraryBooks, Home as HomeIcon } from '@mui/icons-material';
import {
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  TextField,
  AppBar,
  Toolbar,
  Box,
  Stack,
} from '@mui/material';

export default function Home() {
  return (
    <>
      <AppBar position="static" elevation={0}>
        <Toolbar>
          <LibraryBooks sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            StuffLibrary.org
          </Typography>
          <Button color="inherit">Sign In</Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Box textAlign="center" sx={{ mb: 6 }}>
          <Typography variant="h1" component="h1" gutterBottom>
            Share more, buy less
          </Typography>
          <Typography variant="h5" color="text.secondary" paragraph>
            A platform for neighbors to safely share under-used items like
            ladders, lawnmowers, and camping gear.
          </Typography>
          <Stack
            direction="row"
            spacing={2}
            justifyContent="center"
            sx={{ mt: 4 }}
          >
            <Button variant="contained" size="large" startIcon={<Share />}>
              Get Started
            </Button>
            <Button variant="outlined" size="large" startIcon={<HomeIcon />}>
              Find My Neighborhood
            </Button>
          </Stack>
        </Box>

        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={4}
          sx={{ mb: 6 }}
        >
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                Borrow Safely
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Find and request items from verified neighbors in your area.
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                Lend Easily
              </Typography>
              <Typography variant="body2" color="text.secondary">
                List your unused items and help neighbors save money.
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                Build Community
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Strengthen neighborhood connections through sharing and trust.
              </Typography>
            </CardContent>
          </Card>
        </Stack>

        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h4" gutterBottom>
              MUI Theme Demo
            </Typography>
            <Typography variant="body1" paragraph>
              This page demonstrates the MUI theme system in action:
            </Typography>
            <Stack spacing={2}>
              <TextField
                label="Search items"
                variant="outlined"
                fullWidth
                placeholder="e.g., ladder, lawnmower, camping gear"
              />
              <Stack direction="row" spacing={2}>
                <Button variant="contained">Primary Action</Button>
                <Button variant="outlined">Secondary Action</Button>
                <Button variant="text">Text Button</Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Container>
    </>
  );
}
