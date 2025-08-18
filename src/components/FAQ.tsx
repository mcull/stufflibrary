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
    question: 'How do I know I can trust my neighbors?',
    answer:
      'Every user goes through identity verification and builds a reputation through successful sharing. Our community guidelines and rating system help maintain trust and accountability.',
  },
  {
    question: 'What if something gets damaged or lost?',
    answer:
      'We have clear community guidelines about item care. Most issues are resolved between neighbors, but we provide support for disputes and have optional coverage for valuable items.',
  },
  {
    question: 'How much does it cost to use StuffLibrary?',
    answer:
      'StuffLibrary is free to use! We believe sharing should be accessible to everyone. We may introduce premium features in the future, but basic sharing will always be free.',
  },
  {
    question: 'What kinds of items can I share?',
    answer:
      'Almost anything! Tools, outdoor equipment, kitchen appliances, books, games, and more. We prohibit items that are unsafe, illegal, or consumable for safety reasons.',
  },
  {
    question: 'How do I arrange pickup and return?',
    answer:
      'You and the item owner coordinate directly through our messaging system. Most people arrange porch pickups, but you can meet however works best for both parties.',
  },
  {
    question: 'What if I need something that no one has shared yet?',
    answer:
      "You can post a request describing what you need! Your neighbors will get notified and can offer to share if they have it. It's a great way to discover items you didn't know were available.",
  },
  {
    question: 'How do I get started?',
    answer:
      "Once we launch in your area, simply sign up, verify your identity, and start browsing or sharing items. We'll send updates as we expand to new neighborhoods.",
  },
  {
    question: 'Is my personal information safe?',
    answer:
      'We take privacy seriously. We only share the minimum information needed for safe transactions. Your full address is never public - only general neighborhood area.',
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
