'use client';

import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Stack,
} from '@mui/material';

import { brandColors, spacing } from '@/theme/brandTokens';

export default function AboutPage() {
  return (
    <Box
      sx={{
        backgroundColor: brandColors.warmCream,
        minHeight: '100vh',
        py: { xs: spacing.sm, md: spacing.lg },
      }}
    >
      <Container maxWidth="md">
        {/* Personal Intro */}
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          {/* Optional: Add photo when ready */}
          {/* <Avatar
            src="/assets/marc-cull.jpg"
            alt="Marc Cull"
            sx={{
              width: 120,
              height: 120,
              mx: 'auto',
              mb: 3,
              border: `4px solid ${brandColors.inkBlue}`,
            }}
          /> */}
          <Typography
            variant="h3"
            component="h1"
            sx={{
              fontWeight: 700,
              color: brandColors.charcoal,
              mb: 2,
              fontSize: { xs: '2rem', md: '2.5rem' },
            }}
          >
            Hi, I&apos;m Marc.
          </Typography>
          <Typography
            variant="h6"
            sx={{
              color: brandColors.charcoal,
              opacity: 0.8,
              fontWeight: 400,
              mb: 4,
            }}
          >
            I made this because I wanted it to exist.
          </Typography>
        </Box>

        {/* Main Content */}
        <Stack spacing={4}>
          {/* The Problem */}
          <Card sx={{ backgroundColor: brandColors.white }}>
            <CardContent sx={{ p: { xs: 3, md: 4 } }}>
              <Typography
                variant="h5"
                component="h2"
                sx={{
                  fontWeight: 600,
                  color: brandColors.charcoal,
                  mb: 2,
                }}
              >
                We buy so much stuff we barely use.
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: brandColors.charcoal,
                  lineHeight: 1.8,
                  fontSize: '1.1rem',
                  mb: 2,
                }}
              >
                Think about your garage or closet. How much of it do you
                actually use regularly? For me, it&apos;s maybe 20%. The rest
                sits there—a drill I need twice a year, camping gear that gets
                one summer trip, kitchen gadgets for special occasions.
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: brandColors.charcoal,
                  lineHeight: 1.8,
                  fontSize: '1.1rem',
                }}
              >
                And here&apos;s the thing: my neighbors probably have the exact
                same stuff, also sitting unused. We&apos;re all storing the same
                things, all paying for them, all running out of space. It just
                feels wasteful.
              </Typography>
            </CardContent>
          </Card>

          {/* The Aha */}
          <Card
            sx={{
              backgroundColor: brandColors.inkBlue,
              color: 'white',
            }}
          >
            <CardContent sx={{ p: { xs: 3, md: 4 } }}>
              <Typography
                variant="h5"
                component="h2"
                sx={{
                  fontWeight: 600,
                  color: 'white',
                  mb: 2,
                }}
              >
                What if we just... shared?
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: 'white',
                  lineHeight: 1.8,
                  fontSize: '1.1rem',
                  mb: 2,
                }}
              >
                Not in a complicated way. Just: &quot;Hey, I have a ladder if
                you need one.&quot; &quot;Can I borrow your leaf blower this
                weekend?&quot; That&apos;s it.
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: 'white',
                  lineHeight: 1.8,
                  fontSize: '1.1rem',
                }}
              >
                The awkwardness is what stops us. You don&apos;t want to impose.
                You don&apos;t know who has what. You feel weird asking to
                borrow from someone you barely know. So we all just buy more
                stuff instead.
              </Typography>
            </CardContent>
          </Card>

          {/* The Solution */}
          <Card sx={{ backgroundColor: brandColors.white }}>
            <CardContent sx={{ p: { xs: 3, md: 4 } }}>
              <Typography
                variant="h5"
                component="h2"
                sx={{
                  fontWeight: 600,
                  color: brandColors.charcoal,
                  mb: 2,
                }}
              >
                So I built StuffLibrary.
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: brandColors.charcoal,
                  lineHeight: 1.8,
                  fontSize: '1.1rem',
                  mb: 2,
                }}
              >
                It&apos;s pretty simple: you can see what your neighbors have
                and are willing to share. They can see what you have. When you
                need something, you check the library first. No awkward knocking
                on doors, no guessing who might have a power drill.
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: brandColors.charcoal,
                  lineHeight: 1.8,
                  fontSize: '1.1rem',
                }}
              >
                I wanted to make something useful and kind of beautiful, without
                it having to be commercial. No ads, no data mining, no
                &quot;growth hacking.&quot; Just neighbors helping neighbors,
                with nice design that doesn&apos;t feel like a corporate
                product.
              </Typography>
            </CardContent>
          </Card>

          {/* Why It Matters */}
          <Card sx={{ backgroundColor: brandColors.mustardYellow }}>
            <CardContent sx={{ p: { xs: 3, md: 4 } }}>
              <Typography
                variant="h5"
                component="h2"
                sx={{
                  fontWeight: 600,
                  color: brandColors.charcoal,
                  mb: 2,
                }}
              >
                Why this matters
              </Typography>
              <Stack spacing={2}>
                <Box>
                  <Typography
                    variant="body1"
                    sx={{
                      color: brandColors.charcoal,
                      lineHeight: 1.8,
                      fontSize: '1.05rem',
                    }}
                  >
                    <strong>Save money.</strong> Borrow instead of buying things
                    you&apos;ll use once or twice.
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant="body1"
                    sx={{
                      color: brandColors.charcoal,
                      lineHeight: 1.8,
                      fontSize: '1.05rem',
                    }}
                  >
                    <strong>Less waste.</strong> The stuff we already own gets
                    used more. We buy less new stuff.
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant="body1"
                    sx={{
                      color: brandColors.charcoal,
                      lineHeight: 1.8,
                      fontSize: '1.05rem',
                    }}
                  >
                    <strong>Actual community.</strong> You get to know your
                    neighbors. Not in a forced way—just through the normal act
                    of helping each other out.
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>

          {/* How It Works */}
          <Card sx={{ backgroundColor: brandColors.white }}>
            <CardContent sx={{ p: { xs: 3, md: 4 } }}>
              <Typography
                variant="h5"
                component="h2"
                sx={{
                  fontWeight: 600,
                  color: brandColors.charcoal,
                  mb: 3,
                }}
              >
                How it works
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', md: 'row' },
                  gap: 3,
                }}
              >
                <Box sx={{ textAlign: 'center', flex: 1 }}>
                  <Typography
                    variant="h2"
                    sx={{
                      color: brandColors.charcoal,
                      mb: 2,
                    }}
                  >
                    📱
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      color: brandColors.charcoal,
                      mb: 1,
                    }}
                  >
                    Add your stuff
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: brandColors.charcoal,
                      lineHeight: 1.6,
                    }}
                  >
                    Snap a photo of things you don&apos;t use often
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center', flex: 1 }}>
                  <Typography
                    variant="h2"
                    sx={{
                      color: brandColors.charcoal,
                      mb: 2,
                    }}
                  >
                    🔍
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      color: brandColors.charcoal,
                      mb: 1,
                    }}
                  >
                    Browse what&apos;s available
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: brandColors.charcoal,
                      lineHeight: 1.6,
                    }}
                  >
                    See what your neighbors are sharing
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center', flex: 1 }}>
                  <Typography
                    variant="h2"
                    sx={{
                      color: brandColors.charcoal,
                      mb: 2,
                    }}
                  >
                    🤝
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      color: brandColors.charcoal,
                      mb: 1,
                    }}
                  >
                    Coordinate & borrow
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: brandColors.charcoal,
                      lineHeight: 1.6,
                    }}
                  >
                    Work out pickup/return that works for both of you
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Where We Are */}
          <Card
            sx={{
              backgroundColor: brandColors.charcoal,
              color: 'white',
            }}
          >
            <CardContent sx={{ p: { xs: 3, md: 4 } }}>
              <Typography
                variant="h5"
                component="h2"
                sx={{
                  fontWeight: 600,
                  color: 'white',
                  mb: 2,
                }}
              >
                We&apos;re just getting started.
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: 'white',
                  lineHeight: 1.8,
                  fontSize: '1.1rem',
                  mb: 2,
                }}
              >
                I soft-launched this in Oakland with friends and family. We
                &apos;re learning what works, what doesn&apos;t, and what people
                actually need.
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: 'white',
                  lineHeight: 1.8,
                  fontSize: '1.1rem',
                  mb: 2,
                }}
              >
                This is a side project, not a startup. I&apos;m the CTO at a
                nonprofit called FreeWorld, and I built StuffLibrary because I
                wanted to make something useful that doesn&apos;t have to be a
                business.
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: 'white',
                  lineHeight: 1.8,
                  fontSize: '1.1rem',
                }}
              >
                If you&apos;re in the Bay Area and want to start a library in
                your neighborhood, give it a try. If you have feedback, I
                &apos;d love to hear it. Let&apos;s see if we can make sharing
                less awkward and more normal.
              </Typography>
            </CardContent>
          </Card>
        </Stack>
      </Container>
    </Box>
  );
}
