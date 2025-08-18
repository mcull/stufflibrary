import { Email, Construction, Palette } from '@mui/icons-material';
import {
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Stack,
  Chip,
  Box,
} from '@mui/material';

export default function ThemeDemoPage() {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h1" gutterBottom>
        StuffLibrary Design System
      </Typography>

      <Typography variant="body1" sx={{ mb: 4, maxWidth: '600px' }}>
        This page demonstrates our brand tokens and MUI theme system in action.
        Based on trustworthy utility with mid-century warmth.
      </Typography>

      {/* Typography Scale */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h2" gutterBottom>
            Typography Scale
          </Typography>

          <Stack spacing={2}>
            <Typography variant="h1">H1 - Main Headlines (48px)</Typography>
            <Typography variant="h2">H2 - Section Headers (36px)</Typography>
            <Typography variant="h3">H3 - Subsection Headers (30px)</Typography>
            <Typography variant="h4">H4 - Card Headers (24px)</Typography>
            <Typography variant="h5">H5 - Small Headers (20px)</Typography>
            <Typography variant="h6">H6 - Subheaders (18px)</Typography>
            <Typography variant="body1">
              Body 1 - Main body text with relaxed line height for comfortable
              reading
            </Typography>
            <Typography variant="body2">
              Body 2 - Secondary text, slightly smaller
            </Typography>
            <Typography variant="caption">
              Caption - Small text for labels and metadata
            </Typography>
            <Typography variant="overline">
              Overline - Uppercase labels
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      {/* Color Palette */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h2" gutterBottom>
            Brand Colors
          </Typography>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: 3,
            }}
          >
            <Box
              sx={{
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                p: 3,
                borderRadius: 2,
                textAlign: 'center',
              }}
            >
              <Typography variant="h6">Ink Blue</Typography>
              <Typography variant="body2">#1E3A5F</Typography>
              <Typography variant="caption">Primary</Typography>
            </Box>

            <Box
              sx={{
                bgcolor: 'secondary.main',
                color: 'secondary.contrastText',
                p: 3,
                borderRadius: 2,
                textAlign: 'center',
                border: '1px solid #ddd',
              }}
            >
              <Typography variant="h6">Warm Cream</Typography>
              <Typography variant="body2">#F9F5EB</Typography>
              <Typography variant="caption">Secondary</Typography>
            </Box>

            <Box
              sx={{
                bgcolor: 'warning.main',
                color: 'warning.contrastText',
                p: 3,
                borderRadius: 2,
                textAlign: 'center',
              }}
            >
              <Typography variant="h6">Mustard Yellow</Typography>
              <Typography variant="body2">#E3B505</Typography>
              <Typography variant="caption">Accent 1</Typography>
            </Box>

            <Box
              sx={{
                bgcolor: 'error.main',
                color: 'error.contrastText',
                p: 3,
                borderRadius: 2,
                textAlign: 'center',
              }}
            >
              <Typography variant="h6">Tomato Red</Typography>
              <Typography variant="body2">#D1495B</Typography>
              <Typography variant="caption">Accent 2</Typography>
            </Box>

            <Box
              sx={{
                bgcolor: '#E0E0E0',
                color: 'text.primary',
                p: 3,
                borderRadius: 2,
                textAlign: 'center',
              }}
            >
              <Typography variant="h6">Soft Gray</Typography>
              <Typography variant="body2">#E0E0E0</Typography>
              <Typography variant="caption">Neutral</Typography>
            </Box>

            <Box
              sx={{
                bgcolor: 'text.primary',
                color: '#fff',
                p: 3,
                borderRadius: 2,
                textAlign: 'center',
              }}
            >
              <Typography variant="h6">Charcoal</Typography>
              <Typography variant="body2">#333333</Typography>
              <Typography variant="caption">Text</Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Button Variations */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h2" gutterBottom>
            Button Styles
          </Typography>

          <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ mb: 3 }}>
            <Button variant="contained" startIcon={<Email />}>
              Join the Waitlist
            </Button>
            <Button
              variant="contained"
              color="secondary"
              startIcon={<Construction />}
            >
              View Progress
            </Button>
            <Button variant="outlined" startIcon={<Palette />}>
              Learn More
            </Button>
            <Button variant="text">Text Button</Button>
          </Stack>

          <Stack direction="row" spacing={2} flexWrap="wrap">
            <Button variant="contained" size="large">
              Large Button
            </Button>
            <Button variant="contained" size="medium">
              Medium Button
            </Button>
            <Button variant="contained" size="small">
              Small Button
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Chips and Tags */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h2" gutterBottom>
            Chips & Tags
          </Typography>

          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Chip label="Coming Soon" color="primary" />
            <Chip label="Mid-Century Design" />
            <Chip label="Trustworthy" variant="outlined" />
            <Chip label="Community" color="secondary" />
          </Stack>
        </CardContent>
      </Card>

      {/* Spacing Examples */}
      <Card>
        <CardContent>
          <Typography variant="h2" gutterBottom>
            Spacing Scale (8px base)
          </Typography>

          <Stack spacing={1}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ bgcolor: 'primary.main', width: 0.5, height: 2 }} />
              <Typography variant="body2">4px (0.5x)</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ bgcolor: 'primary.main', width: 1, height: 2 }} />
              <Typography variant="body2">8px (1x base)</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ bgcolor: 'primary.main', width: 2, height: 2 }} />
              <Typography variant="body2">16px (2x)</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ bgcolor: 'primary.main', width: 3, height: 2 }} />
              <Typography variant="body2">24px (3x)</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ bgcolor: 'primary.main', width: 4, height: 2 }} />
              <Typography variant="body2">32px (4x)</Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Container>
  );
}
