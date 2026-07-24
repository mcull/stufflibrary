import {
  Box,
  Container,
  Divider,
  Link,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import type { Metadata } from 'next';

import {
  SMS_CONSENT_HEADLINE,
  SMS_HELP_KEYWORDS,
  SMS_MESSAGE_TYPES,
  SMS_OPT_IN_CONFIRMATION,
  SMS_OPT_IN_URL,
  SMS_OPT_OUT_KEYWORDS,
  SMS_SIGNUP_URL,
} from '@/lib/sms-consent';
import { brandColors } from '@/theme/brandTokens';

import { SmsConsentPreview } from './SmsConsentPreview';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Text Message Notifications',
  description:
    'How StuffLibrary members opt in to text messages, what we send, how often, and how to stop. Consent is optional and never a condition of using StuffLibrary.',
  robots: { index: true, follow: true },
};

const OPT_IN_STEPS: { title: string; body: string; url?: string }[] = [
  {
    title: 'Create a StuffLibrary account',
    body: 'Anyone can sign up — no invitation needed. Accounts are verified by a code sent to the email address you enter.',
    url: SMS_SIGNUP_URL,
  },
  {
    title: 'Open your profile settings',
    body: 'Text notifications live in the "Text Notifications" section of your own profile, alongside your name, photo, and address.',
    url: SMS_OPT_IN_URL,
  },
  {
    title: 'Enter your mobile number and check the consent box',
    body: 'The box is unchecked when you arrive. Nothing is sent unless you check it yourself and save. Entering a number without checking the box stores the number for account recovery but sends you no texts.',
  },
  {
    title: 'Save',
    body: 'We record the date and time of your consent, then send a single confirmation message. Notifications begin only after that.',
  },
];

export default function SmsNotificationsPage() {
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
              Text Message Notifications
            </Typography>
            <Typography
              variant="subtitle1"
              sx={{
                color: brandColors.charcoal,
                opacity: 0.8,
                fontStyle: 'italic',
              }}
            >
              How members opt in, what we send, and how to stop
            </Typography>
          </Box>

          <Divider sx={{ borderColor: brandColors.softGray }} />

          <Typography
            variant="body1"
            paragraph
            sx={{
              color: brandColors.charcoal,
              fontSize: '1.1rem',
              lineHeight: 1.6,
            }}
          >
            StuffLibrary is a free neighborhood item-lending platform operated
            by Cull Ventures LLC. We text members about their own lending
            activity — a neighbor asking to borrow something, a request
            answered, an item due back — and nothing else. We do not send
            marketing or promotional texts, and we do not text people who have
            not asked us to. Text notifications are optional and{' '}
            <strong>not a condition of using StuffLibrary</strong>; every
            notification is also available by email.
          </Typography>

          {/* Opt-in flow */}
          <Box>
            <Typography
              variant="h5"
              gutterBottom
              sx={{ color: brandColors.charcoal, fontWeight: 600 }}
            >
              How members opt in
            </Typography>
            <Stack spacing={2.5} sx={{ mt: 2 }}>
              {OPT_IN_STEPS.map((step, index) => (
                <Box key={step.title} sx={{ display: 'flex', gap: 2 }}>
                  <Typography
                    aria-hidden
                    sx={{
                      color: brandColors.charcoal,
                      opacity: 0.5,
                      fontWeight: 700,
                      lineHeight: 1.6,
                      minWidth: '1.5rem',
                    }}
                  >
                    {index + 1}.
                  </Typography>
                  <Box>
                    <Typography
                      variant="subtitle1"
                      sx={{ color: brandColors.charcoal, fontWeight: 600 }}
                    >
                      {step.title}
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{ color: brandColors.charcoal }}
                    >
                      {step.body}
                    </Typography>
                    {step.url ? (
                      <Typography
                        component="p"
                        sx={{
                          mt: 0.5,
                          fontFamily: 'monospace',
                          fontSize: '0.9rem',
                          wordBreak: 'break-all',
                          color: brandColors.charcoal,
                        }}
                      >
                        {step.url}
                      </Typography>
                    ) : null}
                  </Box>
                </Box>
              ))}
            </Stack>
          </Box>

          {/* The checkbox itself */}
          <Box>
            <Typography
              variant="h5"
              gutterBottom
              sx={{ color: brandColors.charcoal, fontWeight: 600 }}
            >
              The consent box, exactly as it appears
            </Typography>
            <Typography
              variant="body1"
              paragraph
              sx={{ color: brandColors.charcoal }}
            >
              This is the same checkbox that appears in profile settings,
              rendered here from the same source. It is unchecked by default —
              consent is an action a member takes, never a default we set for
              them.
            </Typography>
            <Paper
              variant="outlined"
              sx={{
                p: 2.5,
                borderRadius: 2,
                backgroundColor: brandColors.white,
                borderColor: brandColors.softGray,
              }}
            >
              <Typography
                variant="overline"
                sx={{ color: brandColors.charcoal, opacity: 0.6 }}
              >
                Text Notifications
              </Typography>
              <SmsConsentPreview />
            </Paper>
            <Typography
              variant="body2"
              sx={{ color: brandColors.charcoal, opacity: 0.8, mt: 1.5 }}
            >
              After saving, a member receives one confirmation message:{' '}
              <Box component="span" sx={{ fontStyle: 'italic' }}>
                “{SMS_OPT_IN_CONFIRMATION}”
              </Box>
            </Typography>
          </Box>

          {/* What we send */}
          <Box>
            <Typography
              variant="h5"
              gutterBottom
              sx={{ color: brandColors.charcoal, fontWeight: 600 }}
            >
              What we send
            </Typography>
            <Typography
              variant="body1"
              paragraph
              sx={{ color: brandColors.charcoal }}
            >
              Every message is triggered by the member&rsquo;s own account
              activity. Message frequency varies with how much a member lends
              and borrows — typically zero to ten messages a month. Message and
              data rates may apply.
            </Typography>
            <Stack spacing={2}>
              {SMS_MESSAGE_TYPES.map((type) => (
                <Box key={type.label}>
                  <Typography
                    variant="subtitle2"
                    sx={{ color: brandColors.charcoal, fontWeight: 600 }}
                  >
                    {type.label}
                  </Typography>
                  <Typography
                    component="p"
                    sx={{
                      mt: 0.5,
                      p: 1.5,
                      borderRadius: 1,
                      backgroundColor: brandColors.white,
                      border: `1px solid ${brandColors.softGray}`,
                      fontFamily: 'monospace',
                      fontSize: '0.85rem',
                      lineHeight: 1.5,
                      color: brandColors.charcoal,
                      wordBreak: 'break-word',
                    }}
                  >
                    {type.example}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Box>

          {/* Stopping */}
          <Box>
            <Typography
              variant="h5"
              gutterBottom
              sx={{ color: brandColors.charcoal, fontWeight: 600 }}
            >
              How to stop, and how to get help
            </Typography>
            <Box component="ul" sx={{ pl: 3, color: brandColors.charcoal }}>
              <li>
                <strong>Reply STOP to any message</strong> and the texts stop
                immediately. {SMS_OPT_OUT_KEYWORDS.join(', ')} all work. You
                keep getting the same notifications by email.
              </li>
              <li>
                <strong>Reply HELP to any message</strong> for contact
                information, or write to support@stufflibrary.org.{' '}
                {SMS_HELP_KEYWORDS.join(' and ')} both work.
              </li>
              <li>
                <strong>Or uncheck the box.</strong> Clearing “
                {SMS_CONSENT_HEADLINE}” in profile settings turns text
                notifications off just as completely.
              </li>
            </Box>
          </Box>

          {/* Privacy */}
          <Box>
            <Typography
              variant="h5"
              gutterBottom
              sx={{ color: brandColors.charcoal, fontWeight: 600 }}
            >
              What happens to your number
            </Typography>
            <Typography
              variant="body1"
              paragraph
              sx={{ color: brandColors.charcoal }}
            >
              We collect mobile numbers only through the opt-in above. We never
              buy them, import them, or accept them from third parties, and one
              member cannot enter another member&rsquo;s number.
            </Typography>
            <Typography
              variant="body1"
              paragraph
              sx={{ color: brandColors.charcoal, fontWeight: 500 }}
            >
              No mobile information will be shared with third parties or
              affiliates for marketing or promotional purposes. All other
              categories exclude text messaging originator opt-in data and
              consent; this information will not be shared with any third
              parties.
            </Typography>
            <Typography variant="body1" sx={{ color: brandColors.charcoal }}>
              Full details are in our{' '}
              <Link href="/privacy" sx={{ color: brandColors.inkBlue }}>
                Privacy Policy
              </Link>{' '}
              and section 10 of our{' '}
              <Link href="/terms" sx={{ color: brandColors.inkBlue }}>
                Terms of Service
              </Link>
              .
            </Typography>
          </Box>
        </Stack>
      </Paper>
    </Container>
  );
}
