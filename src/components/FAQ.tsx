'use client';

import { ExpandMore } from '@mui/icons-material';
import {
  Box,
  Container,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
} from '@mui/material';
import { useState } from 'react';

import { brandColors, spacing } from '@/theme/brandTokens';

const faqs = [
  {
    category: 'Getting Started',
    question: 'How do I get started?',
    answer:
      'Simply sign up, verify your identity, and start browsing or sharing items in your neighborhood library. You can join an existing library or create a new one for your community.',
  },
  {
    category: 'Getting Started',
    question: 'Do I need to own items to join?',
    answer:
      'Not at all! You can join purely to borrow from neighbors. Sharing items is optional—some people love lending, others prefer borrowing. Both strengthen the community.',
  },
  {
    category: 'Getting Started',
    question: 'How do I create or join a library?',
    answer:
      'During signup, you can search for existing libraries in your area or create a new one. Libraries are typically organized by neighborhood, building, or community group.',
  },
  {
    category: 'Using the Platform',
    question: 'What kinds of items can I share?',
    answer:
      'Almost anything! Tools, outdoor equipment, kitchen appliances, books, games, camping gear, and more. We only prohibit items that require registration or licensing (like firearms), age-restricted items, or consumables.',
  },
  {
    category: 'Using the Platform',
    question: 'How do I arrange pickup and return?',
    answer:
      'You coordinate directly with the item owner through notifications. Most people arrange porch pickups or quick doorstep handoffs, but you can meet however works best for both of you.',
  },
  {
    category: 'Using the Platform',
    question: 'How long can I borrow something?',
    answer:
      'That depends on the item and what you work out with the owner. Some items like ladders might be needed for just a day, while books could be borrowed for weeks. Communication is key!',
  },
  {
    category: 'Using the Platform',
    question: 'Can I borrow multiple items at once?',
    answer:
      'Yes! You can borrow from multiple neighbors simultaneously. Just be respectful of return times and item care—your reliability builds trust in the community.',
  },
  {
    category: 'Using the Platform',
    question: 'What if I need something that no one has shared yet?',
    answer:
      'Use the feedback button in the lower right corner to share your idea! Your neighbors will get notified, and it helps the community understand what items would be most valuable to share.',
  },
  {
    category: 'Trust & Safety',
    question: 'How do I know I can trust my neighbors?',
    answer:
      'Every user verifies their identity during signup. Beyond that, trust is built through successful sharing experiences. Our community guidelines emphasize care, accountability, and neighborly respect.',
  },
  {
    category: 'Trust & Safety',
    question: 'What if something gets damaged or lost?',
    answer:
      'We have clear community guidelines about item care and responsibility. Most issues are resolved between neighbors through honest communication. Accidents happen—approach with understanding, and most people step up to make things right.',
  },
  {
    category: 'Trust & Safety',
    question: "What happens if someone doesn't return my item?",
    answer:
      "Reach out to them first—sometimes people just forget! If that doesn't work, you can report the issue. Repeated violations affect community trust, and we take these seriously.",
  },
  {
    category: 'Trust & Safety',
    question: 'Is my personal information safe?',
    answer:
      "Yes. We only share the minimum information needed for safe transactions. Your full address is never public—only your general neighborhood. We don't sell data, show ads, or track your stuff for commercial purposes. This is a civic utility, not a business.",
  },
  {
    category: 'Cost & Philosophy',
    question: 'How much does it cost to use StuffLibrary?',
    answer:
      "StuffLibrary is completely free. No ads, no affiliate links, no hidden fees. We believe sharing should be accessible to everyone, and we're committed to keeping it that way.",
  },
  {
    category: 'Cost & Philosophy',
    question: 'Can I charge for lending my items?',
    answer:
      "No. StuffLibrary is designed for neighborly sharing, not rental transactions. If you're looking to rent items commercially, other platforms serve that purpose. Here, we're building community through generosity.",
  },
  {
    category: 'Cost & Philosophy',
    question: "How do you make money if it's free?",
    answer:
      "We don't—not yet, anyway. StuffLibrary is a passion project focused on proving that community-driven sharing can work. We're exploring sustainable funding models that preserve our values: no ads, no data collection, no commercialization of neighborly trust.",
  },
  {
    category: 'Technical',
    question: 'Do I need to download an app?',
    answer:
      'No! StuffLibrary works in your mobile browser. Just visit stufflibrary.org from your phone, and it works like an app. You can even add it to your home screen for quick access.',
  },
  {
    category: 'Technical',
    question: 'What are those watercolor illustrations?',
    answer:
      "When you add an item, AI analyzes your photo and generates a unique watercolor illustration. It's part of our library card aesthetic—nostalgic, friendly, and distinctly StuffLibrary. Plus it keeps your actual photos private.",
  },
];

export function FAQ() {
  const [expanded, setExpanded] = useState<string | false>(false);

  const handleChange =
    (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
      setExpanded(isExpanded ? panel : false);
    };

  return (
    <Box
      component="section"
      sx={{
        py: { xs: spacing.xxxl / 4, md: spacing.xxxl / 2 },
        backgroundColor: brandColors.warmCream,
        position: 'relative',
      }}
    >
      <Container maxWidth="md">
        {/* Section Header */}
        <Box sx={{ textAlign: 'center', mb: { xs: 6, md: 8 } }}>
          <Typography
            variant="h2"
            component="h2"
            sx={{
              fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
              fontWeight: 700,
              color: brandColors.charcoal,
              mb: 3,
              letterSpacing: '-0.01em',
            }}
          >
            Frequently asked{' '}
            <Box
              component="span"
              sx={{
                color: brandColors.inkBlue,
              }}
            >
              questions
            </Box>
          </Typography>

          <Typography
            variant="body1"
            sx={{
              fontSize: { xs: '1.125rem', md: '1.25rem' },
              color: brandColors.charcoal,
              opacity: 0.8,
              maxWidth: '600px',
              mx: 'auto',
              lineHeight: 1.6,
            }}
          >
            Everything you need to know about sharing with StuffLibrary
          </Typography>
        </Box>

        {/* FAQ Accordions */}
        <Stack spacing={2}>
          {faqs.map((faq, index) => (
            <Accordion
              key={index}
              expanded={expanded === `panel${index}`}
              onChange={handleChange(`panel${index}`)}
              elevation={0}
              sx={{
                backgroundColor: brandColors.white,
                border: `1px solid ${brandColors.softGray}`,
                borderRadius: '12px !important',
                '&:before': {
                  display: 'none',
                },
                '&.Mui-expanded': {
                  margin: '8px 0',
                  borderColor: brandColors.inkBlue,
                  boxShadow: '0 4px 12px 0 rgba(30, 58, 95, 0.1)',
                },
              }}
            >
              <AccordionSummary
                expandIcon={
                  <ExpandMore
                    sx={{
                      color: brandColors.inkBlue,
                      fontSize: 28,
                    }}
                  />
                }
                sx={{
                  py: 2,
                  px: 3,
                  minHeight: '72px',
                  '& .MuiAccordionSummary-content': {
                    margin: '16px 0',
                  },
                  '&:hover': {
                    backgroundColor: 'rgba(30, 58, 95, 0.04)',
                  },
                }}
              >
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 600,
                    color: brandColors.charcoal,
                    fontSize: { xs: '1.1rem', md: '1.2rem' },
                    lineHeight: 1.3,
                  }}
                >
                  {faq.question}
                </Typography>
              </AccordionSummary>

              <AccordionDetails
                sx={{
                  px: 3,
                  pb: 3,
                  pt: 0,
                }}
              >
                <Typography
                  variant="body1"
                  sx={{
                    color: brandColors.charcoal,
                    opacity: 0.8,
                    lineHeight: 1.6,
                    fontSize: '1rem',
                  }}
                >
                  {faq.answer}
                </Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </Stack>

        {/* Bottom CTA */}
        <Box sx={{ textAlign: 'center', mt: { xs: 6, md: 8 } }}>
          <Typography
            variant="body1"
            sx={{
              fontSize: '1.1rem',
              color: brandColors.charcoal,
              opacity: 0.8,
              mb: 1,
            }}
          >
            Still have questions?
          </Typography>
          <Typography
            component="a"
            href="mailto:hello@stufflibrary.org"
            sx={{
              color: brandColors.inkBlue,
              fontWeight: 500,
              textDecoration: 'none',
              fontSize: '1.1rem',
              '&:hover': {
                textDecoration: 'underline',
              },
            }}
          >
            Get in touch →
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
