import {
  Container,
  Typography,
  Box,
  Paper,
  Stack,
  Divider,
} from '@mui/material';

import { brandColors } from '@/theme/brandTokens';

export default function TermsOfServicePage() {
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
              Terms of Service
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

          {/* Introduction */}
          <Box>
            <Typography
              variant="h5"
              gutterBottom
              sx={{ color: brandColors.charcoal, fontWeight: 600 }}
            >
              1. ACCEPTANCE OF TERMS
            </Typography>
            <Typography
              variant="body1"
              paragraph
              sx={{ color: brandColors.charcoal }}
            >
              By accessing, using, or creating an account on StuffLibrary.org
              (the &ldquo;Service&rdquo;), you agree to be bound by these Terms
              of Service (&ldquo;Terms&rdquo;). StuffLibrary is a civic utility
              designed to facilitate good-faith sharing of physical objects
              between friends, neighbors, and community members. If you do not
              agree to all terms stated herein, you may not use or access the
              Service in any manner.
            </Typography>
          </Box>

          {/* Good Faith Usage */}
          <Box>
            <Typography
              variant="h5"
              gutterBottom
              sx={{ color: brandColors.charcoal, fontWeight: 600 }}
            >
              2. GOOD FAITH USAGE REQUIREMENT
            </Typography>
            <Typography
              variant="body1"
              paragraph
              sx={{ color: brandColors.charcoal }}
            >
              You expressly agree and covenant that you will use the Service
              exclusively in good faith for its intended purpose: the sharing of
              physical objects with friends, neighbors, and community members.
              Good faith usage includes, but is not limited to:
            </Typography>
            <Box component="ul" sx={{ pl: 3, color: brandColors.charcoal }}>
              <li>Being honest and accurate in all item descriptions</li>
              <li>Treating borrowed items with reasonable care</li>
              <li>Returning items in the same condition as received</li>
              <li>Communicating respectfully with all community members</li>
              <li>Honoring agreed-upon return dates and terms</li>
              <li>
                Using messaging and video features for legitimate communication
                purposes
              </li>
            </Box>
          </Box>

          {/* User Responsibility */}
          <Box>
            <Typography
              variant="h5"
              gutterBottom
              sx={{ color: brandColors.charcoal, fontWeight: 600 }}
            >
              3. USER RESPONSIBILITY AND ASSUMPTION OF RISK
            </Typography>
            <Typography
              variant="body1"
              paragraph
              sx={{ color: brandColors.charcoal, fontWeight: 600 }}
            >
              BY USING THIS SERVICE, YOU ACKNOWLEDGE AND AGREE THAT YOU ARE
              TAKING FULL RESPONSIBILITY FOR WHAT YOU SEE, READ, HEAR, AND
              EXPERIENCE ON THE PLATFORM.
            </Typography>
            <Typography
              variant="body1"
              paragraph
              sx={{ color: brandColors.charcoal }}
            >
              This Service creates an open channel for dialogue, messaging,
              video communication, and content sharing between users. While we
              implement moderation systems and community guidelines, you
              understand and acknowledge that:
            </Typography>
            <Box component="ul" sx={{ pl: 3, color: brandColors.charcoal }}>
              <li>
                User-generated content may contain opinions, statements, or
                material that is inaccurate, offensive, or inappropriate
              </li>
              <li>
                You may encounter content that you find objectionable or
                disturbing
              </li>
              <li>
                Physical items shared through the Service may have defects,
                dangers, or risks not apparent in descriptions
              </li>
              <li>
                Interactions with other users occur at your own risk and
                discretion
              </li>
              <li>
                You are solely responsible for evaluating the safety and
                suitability of any shared items
              </li>
            </Box>
          </Box>

          {/* Content Disclaimer */}
          <Box>
            <Typography
              variant="h5"
              gutterBottom
              sx={{ color: brandColors.charcoal, fontWeight: 600 }}
            >
              4. CONTENT DISCLAIMER AND LIMITATION OF LIABILITY
            </Typography>
            <Typography
              variant="body1"
              paragraph
              sx={{ color: brandColors.charcoal, fontWeight: 600 }}
            >
              STUFFLIBRARY CANNOT AND DOES NOT GUARANTEE THE ACCURACY,
              COMPLETENESS, SAFETY, OR APPROPRIATENESS OF ANY USER-GENERATED
              CONTENT, INCLUDING BUT NOT LIMITED TO MESSAGES, VIDEOS, ITEM
              DESCRIPTIONS, OR COMMUNICATIONS.
            </Typography>
            <Typography
              variant="body1"
              paragraph
              sx={{ color: brandColors.charcoal }}
            >
              Although we employ automated and manual content moderation systems
              and strive to maintain a safe and respectful community
              environment, we cannot and do not review, monitor, or control all
              content in real-time. Therefore:
            </Typography>
            <Box component="ul" sx={{ pl: 3, color: brandColors.charcoal }}>
              <li>
                We are not responsible for the content of user messages, videos,
                or communications
              </li>
              <li>
                We cannot guarantee that all inappropriate content will be
                detected or removed immediately
              </li>
              <li>
                We are not liable for any harm, damage, or loss arising from
                user-generated content
              </li>
              <li>
                You use the Service at your own risk regarding exposure to
                potentially harmful content
              </li>
            </Box>
          </Box>

          {/* Civic Utility Status */}
          <Box>
            <Typography
              variant="h5"
              gutterBottom
              sx={{ color: brandColors.charcoal, fontWeight: 600 }}
            >
              5. CIVIC UTILITY STATUS AND NON-COMMERCIAL NATURE
            </Typography>
            <Typography
              variant="body1"
              paragraph
              sx={{ color: brandColors.charcoal }}
            >
              StuffLibrary operates as a civic utility, not as a commercial
              business entity. This Service is designed to strengthen
              communities through resource sharing and is not intended for
              commercial transactions, profit-making activities, or business
              operations. Users agree not to:
            </Typography>
            <Box component="ul" sx={{ pl: 3, color: brandColors.charcoal }}>
              <li>
                Use the Service for commercial selling, renting, or
                profit-making purposes
              </li>
              <li>Charge fees for items shared through the platform</li>
              <li>
                Use the platform to advertise or promote commercial services
              </li>
              <li>
                Attempt to circumvent the non-commercial nature of the Service
              </li>
            </Box>
          </Box>

          {/* Prohibited Conduct */}
          <Box>
            <Typography
              variant="h5"
              gutterBottom
              sx={{ color: brandColors.charcoal, fontWeight: 600 }}
            >
              6. PROHIBITED CONDUCT
            </Typography>
            <Typography
              variant="body1"
              paragraph
              sx={{ color: brandColors.charcoal }}
            >
              Users are strictly prohibited from engaging in the following
              activities:
            </Typography>
            <Box component="ul" sx={{ pl: 3, color: brandColors.charcoal }}>
              <li>Harassment, threatening, or intimidating other users</li>
              <li>Sharing illegal, harmful, or dangerous items</li>
              <li>
                Posting or transmitting obscene, defamatory, or hateful content
              </li>
              <li>Violating any applicable local, state, or federal laws</li>
              <li>Attempting to hack, disrupt, or compromise the Service</li>
              <li>Creating false accounts or impersonating others</li>
              <li>Spamming or sending unsolicited communications</li>
              <li>Sharing items that violate intellectual property rights</li>
            </Box>
          </Box>

          {/* Liability Limitations */}
          <Box>
            <Typography
              variant="h5"
              gutterBottom
              sx={{ color: brandColors.charcoal, fontWeight: 600 }}
            >
              7. LIMITATION OF LIABILITY AND DISCLAIMERS
            </Typography>
            <Typography
              variant="body1"
              paragraph
              sx={{ color: brandColors.charcoal, fontWeight: 600 }}
            >
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, STUFFLIBRARY,
              ITS OPERATORS, EMPLOYEES, AGENTS, AND AFFILIATES SHALL NOT BE
              LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR
              PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO:
            </Typography>
            <Box component="ul" sx={{ pl: 3, color: brandColors.charcoal }}>
              <li>Property damage or loss arising from shared items</li>
              <li>Personal injury or harm from using shared items</li>
              <li>Financial losses from transactions between users</li>
              <li>
                Emotional distress from user interactions or content exposure
              </li>
              <li>Data loss or service interruptions</li>
              <li>
                Any damages arising from user-generated content or
                communications
              </li>
            </Box>
            <Typography
              variant="body1"
              paragraph
              sx={{ color: brandColors.charcoal }}
            >
              THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS
              AVAILABLE&rdquo; WITHOUT ANY WARRANTIES OF ANY KIND, EXPRESS OR
              IMPLIED.
            </Typography>
          </Box>

          {/* Indemnification */}
          <Box>
            <Typography
              variant="h5"
              gutterBottom
              sx={{ color: brandColors.charcoal, fontWeight: 600 }}
            >
              8. INDEMNIFICATION
            </Typography>
            <Typography
              variant="body1"
              paragraph
              sx={{ color: brandColors.charcoal }}
            >
              You agree to indemnify, defend, and hold harmless StuffLibrary,
              its operators, employees, agents, and affiliates from and against
              any and all claims, damages, obligations, losses, liabilities,
              costs, and expenses (including attorney&rsquo;s fees) arising
              from: (a) your use of the Service; (b) your violation of these
              Terms; (c) your violation of any third party rights; (d) any
              content you post or transmit; and (e) any interactions or
              transactions with other users.
            </Typography>
          </Box>

          {/* Privacy and Data */}
          <Box>
            <Typography
              variant="h5"
              gutterBottom
              sx={{ color: brandColors.charcoal, fontWeight: 600 }}
            >
              9. PRIVACY AND DATA COLLECTION
            </Typography>
            <Typography
              variant="body1"
              paragraph
              sx={{ color: brandColors.charcoal }}
            >
              Your privacy is important to us. Our collection and use of
              personal information is governed by our Privacy Policy, which is
              incorporated by reference into these Terms. By using the Service,
              you consent to our Privacy Policy and agree that we may collect,
              use, and share your information as described therein.
            </Typography>
          </Box>

          {/* Account Termination */}
          <Box>
            <Typography
              variant="h5"
              gutterBottom
              sx={{ color: brandColors.charcoal, fontWeight: 600 }}
            >
              10. ACCOUNT TERMINATION
            </Typography>
            <Typography
              variant="body1"
              paragraph
              sx={{ color: brandColors.charcoal }}
            >
              We reserve the right to suspend or terminate your account
              immediately, without prior notice or liability, for any reason
              whatsoever, including without limitation if you breach the Terms.
              Upon termination, your right to use the Service will cease
              immediately, and you may not create new accounts without our
              express permission.
            </Typography>
          </Box>

          {/* Governing Law */}
          <Box>
            <Typography
              variant="h5"
              gutterBottom
              sx={{ color: brandColors.charcoal, fontWeight: 600 }}
            >
              11. GOVERNING LAW AND DISPUTE RESOLUTION
            </Typography>
            <Typography
              variant="body1"
              paragraph
              sx={{ color: brandColors.charcoal }}
            >
              These Terms shall be governed by and construed in accordance with
              the laws of the State of California, without regard to its
              conflict of law provisions. Any legal suit, action, or proceeding
              arising out of or related to these Terms or the Service shall be
              instituted exclusively in the federal courts of California or the
              courts of the State of California. You waive any and all
              objections to the exercise of jurisdiction over you by such
              courts.
            </Typography>
          </Box>

          {/* Severability */}
          <Box>
            <Typography
              variant="h5"
              gutterBottom
              sx={{ color: brandColors.charcoal, fontWeight: 600 }}
            >
              12. SEVERABILITY AND MODIFICATIONS
            </Typography>
            <Typography
              variant="body1"
              paragraph
              sx={{ color: brandColors.charcoal }}
            >
              If any provision of these Terms is held to be invalid or
              unenforceable, such provision shall be struck and the remaining
              provisions shall be enforced to the fullest extent under law. We
              reserve the right to modify these Terms at any time. Your
              continued use of the Service after changes to the Terms
              constitutes acceptance of those changes.
            </Typography>
          </Box>

          {/* Final Warning */}
          <Box
            sx={{
              backgroundColor: '#FFF3E0',
              border: '2px solid #FF9800',
              borderRadius: 2,
              p: 3,
            }}
          >
            <Typography
              variant="h6"
              gutterBottom
              sx={{ color: '#E65100', fontWeight: 700 }}
            >
              IMPORTANT FINAL NOTICE
            </Typography>
            <Typography
              variant="body1"
              sx={{ color: '#BF360C', fontWeight: 600 }}
            >
              By clicking &ldquo;I Agree&rdquo; or by using this Service in any
              manner, you acknowledge that you have read, understood, and agree
              to be bound by these Terms of Service in their entirety. You
              acknowledge that you are using this Service at your own risk and
              that StuffLibrary cannot be held responsible for user-generated
              content, interactions, or any consequences arising from your use
              of the platform.
            </Typography>
          </Box>

          {/* Contact Information */}
          <Box textAlign="center">
            <Typography
              variant="body2"
              sx={{ color: brandColors.charcoal, opacity: 0.7 }}
            >
              For questions about these Terms of Service, please contact us at{' '}
              <strong>legal@stufflibrary.org</strong>
            </Typography>
          </Box>
        </Stack>
      </Paper>
    </Container>
  );
}
