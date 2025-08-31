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
      <Container maxWidth="lg">
        {/* Hero Section */}
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography
            variant="h2"
            component="h1"
            sx={{
              fontWeight: 700,
              color: brandColors.charcoal,
              mb: 3,
              fontSize: { xs: '2rem', md: '3rem' },
            }}
          >
            The Magic of Sharing
          </Typography>
          <Typography
            variant="h5"
            sx={{
              color: brandColors.charcoal,
              opacity: 0.8,
              lineHeight: 1.6,
              maxWidth: '600px',
              mx: 'auto',
            }}
          >
            Why working together makes everyone&apos;s life better
          </Typography>
        </Box>

        {/* Main Content */}
        <Stack spacing={4}>
          {/* The Problem */}
          <Card sx={{ backgroundColor: brandColors.white }}>
            <CardContent sx={{ p: { xs: 3, md: 4 } }}>
              <Typography
                variant="h4"
                component="h2"
                sx={{
                  fontWeight: 600,
                  color: brandColors.charcoal,
                  mb: 3,
                }}
              >
                🏠 Too Much Stuff, Not Enough Use
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: brandColors.charcoal,
                  lineHeight: 1.7,
                  fontSize: '1.1rem',
                  mb: 2,
                }}
              >
                Think about your garage or closet. How many things do you have
                that you only use once in a while? Maybe it&apos;s a drill for
                hanging pictures, or a fancy cake pan for birthdays, or camping
                gear you use twice a year.
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: brandColors.charcoal,
                  lineHeight: 1.7,
                  fontSize: '1.1rem',
                }}
              >
                Now think about your neighbors. They probably have the same
                problem! Everyone buying the same things, using them rarely, and
                running out of space to store them all.
              </Typography>
            </CardContent>
          </Card>

          {/* The Solution */}
          <Card sx={{ backgroundColor: brandColors.inkBlue, color: 'white' }}>
            <CardContent sx={{ p: { xs: 3, md: 4 } }}>
              <Typography
                variant="h4"
                component="h2"
                sx={{
                  fontWeight: 600,
                  mb: 3,
                }}
              >
                🤝 A Better Way: Sharing
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  lineHeight: 1.7,
                  fontSize: '1.1rem',
                  mb: 2,
                }}
              >
                What if you could borrow that drill from your neighbor instead
                of buying one? What if someone could use your cake pan when
                you&apos;re not making birthdays special?
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  lineHeight: 1.7,
                  fontSize: '1.1rem',
                }}
              >
                This is called &ldquo;sharing the commons&rdquo; - when a
                community works together to use things more wisely. Instead of
                everyone owning everything, we share what we have.
              </Typography>
            </CardContent>
          </Card>

          {/* The Science Behind It */}
          <Card sx={{ backgroundColor: brandColors.white }}>
            <CardContent sx={{ p: { xs: 3, md: 4 } }}>
              <Typography
                variant="h4"
                component="h2"
                sx={{
                  fontWeight: 600,
                  color: brandColors.charcoal,
                  mb: 3,
                }}
              >
                🧠 Smart People Studied This
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: brandColors.charcoal,
                  lineHeight: 1.7,
                  fontSize: '1.1rem',
                  mb: 2,
                }}
              >
                A very smart scientist named Elinor Ostrom spent her whole life
                studying how people share things. She won a big prize called the
                Nobel Prize for figuring out something amazing.
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: brandColors.charcoal,
                  lineHeight: 1.7,
                  fontSize: '1.1rem',
                  mb: 2,
                }}
              >
                She found out that when neighbors work together and share things
                fairly, everyone ends up happier and richer. She called this
                &ldquo;the triumph of the commons.&rdquo;
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: brandColors.charcoal,
                  lineHeight: 1.7,
                  fontSize: '1.1rem',
                }}
              >
                It turns out that sharing isn&apos;t just nice - it&apos;s
                actually the smartest way to live!
              </Typography>
            </CardContent>
          </Card>

          {/* How It Works */}
          <Card sx={{ backgroundColor: brandColors.mustardYellow }}>
            <CardContent sx={{ p: { xs: 3, md: 4 } }}>
              <Typography
                variant="h4"
                component="h2"
                sx={{
                  fontWeight: 600,
                  color: brandColors.charcoal,
                  mb: 3,
                }}
              >
                ✨ How Stuff Libraries Work
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', md: 'row' },
                  gap: 3,
                  justifyContent: 'space-between',
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
                    Share Your Stuff
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: brandColors.charcoal,
                      lineHeight: 1.6,
                    }}
                  >
                    Take pictures of things you don&apos;t use often and share
                    them with neighbors
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
                    Find What You Need
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: brandColors.charcoal,
                      lineHeight: 1.6,
                    }}
                  >
                    Look for things you need instead of buying them new
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
                    Make Friends
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: brandColors.charcoal,
                      lineHeight: 1.6,
                    }}
                  >
                    Get to know your neighbors while helping each other out
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* The Benefits */}
          <Card sx={{ backgroundColor: brandColors.white }}>
            <CardContent sx={{ p: { xs: 3, md: 4 } }}>
              <Typography
                variant="h4"
                component="h2"
                sx={{
                  fontWeight: 600,
                  color: brandColors.charcoal,
                  mb: 3,
                }}
              >
                🌟 Why This Makes Everything Better
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', md: 'row' },
                  gap: 3,
                }}
              >
                <Box sx={{ flex: 1 }}>
                  <Stack spacing={2}>
                    <Box>
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 600,
                          color: brandColors.charcoal,
                          mb: 1,
                        }}
                      >
                        💰 Save Money
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{
                          color: brandColors.charcoal,
                          lineHeight: 1.6,
                        }}
                      >
                        Instead of buying things you rarely use, borrow them
                        when you need them.
                      </Typography>
                    </Box>
                    <Box>
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 600,
                          color: brandColors.charcoal,
                          mb: 1,
                        }}
                      >
                        🏠 Less Clutter
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{
                          color: brandColors.charcoal,
                          lineHeight: 1.6,
                        }}
                      >
                        Your house stays neat when you don&apos;t have to store
                        everything yourself.
                      </Typography>
                    </Box>
                    <Box>
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 600,
                          color: brandColors.charcoal,
                          mb: 1,
                        }}
                      >
                        🌍 Help the Planet
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{
                          color: brandColors.charcoal,
                          lineHeight: 1.6,
                        }}
                      >
                        When we share instead of always buying new, we make less
                        waste.
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Stack spacing={2}>
                    <Box>
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 600,
                          color: brandColors.charcoal,
                          mb: 1,
                        }}
                      >
                        👥 Build Community
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{
                          color: brandColors.charcoal,
                          lineHeight: 1.6,
                        }}
                      >
                        Get to know your neighbors and make your neighborhood
                        friendlier.
                      </Typography>
                    </Box>
                    <Box>
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 600,
                          color: brandColors.charcoal,
                          mb: 1,
                        }}
                      >
                        ⚡ Get Things Done
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{
                          color: brandColors.charcoal,
                          lineHeight: 1.6,
                        }}
                      >
                        Don&apos;t put off projects because you don&apos;t have
                        the right tools.
                      </Typography>
                    </Box>
                    <Box>
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 600,
                          color: brandColors.charcoal,
                          mb: 1,
                        }}
                      >
                        🎉 Feel Good
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{
                          color: brandColors.charcoal,
                          lineHeight: 1.6,
                        }}
                      >
                        Helping others and being helped feels amazing.
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Call to Action */}
          <Card
            sx={{
              backgroundColor: brandColors.charcoal,
              color: 'white',
              textAlign: 'center',
            }}
          >
            <CardContent sx={{ p: { xs: 3, md: 4 } }}>
              <Typography
                variant="h4"
                component="h2"
                sx={{
                  fontWeight: 600,
                  mb: 3,
                }}
              >
                🚀 Join the Sharing Revolution
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  lineHeight: 1.7,
                  fontSize: '1.1rem',
                  mb: 2,
                  maxWidth: '600px',
                  mx: 'auto',
                }}
              >
                Elinor Ostrom showed us that communities work best when people
                share fairly and help each other. Stuff libraries are a simple
                way to make this happen in your neighborhood.
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  lineHeight: 1.7,
                  fontSize: '1.1rem',
                  fontWeight: 600,
                }}
              >
                Together, we can share more and buy less. It&apos;s better for
                everyone!
              </Typography>
            </CardContent>
          </Card>
        </Stack>
      </Container>
    </Box>
  );
}
