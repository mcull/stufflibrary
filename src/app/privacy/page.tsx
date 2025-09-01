import {
  Container,
  Typography,
  Box,
  Paper,
  Stack,
  Divider,
  Alert,
} from '@mui/material';

import { brandColors } from '@/theme/brandTokens';

export default function PrivacyPolicyPage() {
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
              Privacy Policy
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

          {/* Critical Warning */}
          <Alert
            severity="warning"
            sx={{
              backgroundColor: '#FFF8E1',
              border: '2px solid #FF9800',
              '& .MuiAlert-message': {
                fontSize: '1rem',
              },
            }}
          >
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
              IMPORTANT PRIVACY NOTICE
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              Do not contribute any content to StuffLibrary that you consider
              &ldquo;private.&rdquo; You should proceed as though anything you
              share may become public, including: &ldquo;the person at this
              address and this email address has this stuff.&rdquo; While we
              take reasonable measures to protect your data, true privacy cannot
              be guaranteed.
            </Typography>
          </Alert>

          {/* Introduction */}
          <Box>
            <Typography
              variant="h5"
              gutterBottom
              sx={{ color: brandColors.charcoal, fontWeight: 600 }}
            >
              1. OVERVIEW
            </Typography>
            <Typography
              variant="body1"
              paragraph
              sx={{ color: brandColors.charcoal }}
            >
              StuffLibrary is a civic utility designed to facilitate community
              resource sharing. This Privacy Policy explains how we collect,
              use, and protect your information. By using our Service, you
              acknowledge that you understand the inherent risks of sharing
              personal information online and agree to proceed with full
              awareness of these risks.
            </Typography>
          </Box>

          {/* Information We Collect */}
          <Box>
            <Typography
              variant="h5"
              gutterBottom
              sx={{ color: brandColors.charcoal, fontWeight: 600 }}
            >
              2. INFORMATION WE COLLECT
            </Typography>
            <Typography
              variant="body1"
              paragraph
              sx={{ color: brandColors.charcoal }}
            >
              When you use StuffLibrary, we collect various types of information
              that you should consider potentially public:
            </Typography>

            <Typography
              variant="h6"
              gutterBottom
              sx={{ color: brandColors.charcoal, fontWeight: 600, mt: 2 }}
            >
              Personal Information
            </Typography>
            <Box component="ul" sx={{ pl: 3, color: brandColors.charcoal }}>
              <li>
                <strong>Name and Contact Details:</strong> Your full name, email
                address, phone number
              </li>
              <li>
                <strong>Physical Address:</strong> Your home address for local
                community connections
              </li>
              <li>
                <strong>Profile Information:</strong> Any additional details you
                choose to share
              </li>
            </Box>

            <Typography
              variant="h6"
              gutterBottom
              sx={{ color: brandColors.charcoal, fontWeight: 600, mt: 2 }}
            >
              Content You Upload
            </Typography>
            <Box component="ul" sx={{ pl: 3, color: brandColors.charcoal }}>
              <li>
                <strong>Photographs:</strong> Images of objects in your home
                environment that may reveal personal details about your living
                situation, belongings, and lifestyle
              </li>
              <li>
                <strong>Item Descriptions:</strong> Written descriptions of your
                personal belongings
              </li>
              <li>
                <strong>Video Requests:</strong> Video messages you send when
                requesting to borrow items
              </li>
              <li>
                <strong>Written Communications:</strong> Messages, responses,
                and all text-based interactions with other users
              </li>
              <li>
                <strong>Location Data:</strong> Information that may reveal
                patterns about where you live and what you own
              </li>
            </Box>

            <Typography
              variant="h6"
              gutterBottom
              sx={{ color: brandColors.charcoal, fontWeight: 600, mt: 2 }}
            >
              Automatically Collected Information
            </Typography>
            <Box component="ul" sx={{ pl: 3, color: brandColors.charcoal }}>
              <li>Device information and IP addresses</li>
              <li>Usage patterns and interaction data</li>
              <li>Browser type and operating system</li>
              <li>Cookies and similar tracking technologies</li>
            </Box>
          </Box>

          {/* Privacy Limitations */}
          <Box>
            <Typography
              variant="h5"
              gutterBottom
              sx={{ color: brandColors.charcoal, fontWeight: 600 }}
            >
              3. PRIVACY LIMITATIONS AND RISKS
            </Typography>
            <Typography
              variant="body1"
              paragraph
              sx={{ color: brandColors.charcoal, fontWeight: 600 }}
            >
              IMPORTANT: You should assume that any information you share on
              StuffLibrary could potentially become public knowledge.
            </Typography>
            <Typography
              variant="body1"
              paragraph
              sx={{ color: brandColors.charcoal }}
            >
              The nature of community sharing means that your participation
              reveals personal information, including but not limited to:
            </Typography>
            <Box component="ul" sx={{ pl: 3, color: brandColors.charcoal }}>
              <li>
                Your identity and location (&ldquo;who lives where&rdquo;)
              </li>
              <li>
                Your possessions and lifestyle (&ldquo;what stuff you
                have&rdquo;)
              </li>
              <li>Your home environment as seen in photographs</li>
              <li>Your communication style and personal interactions</li>
              <li>Your availability and borrowing patterns</li>
              <li>Connections between your identity and your belongings</li>
            </Box>
          </Box>

          {/* How We Protect Your Data */}
          <Box>
            <Typography
              variant="h5"
              gutterBottom
              sx={{ color: brandColors.charcoal, fontWeight: 600 }}
            >
              4. REASONABLE MEASURES WE TAKE
            </Typography>
            <Typography
              variant="body1"
              paragraph
              sx={{ color: brandColors.charcoal }}
            >
              While we cannot guarantee complete privacy, StuffLibrary
              implements reasonable measures to protect your data:
            </Typography>

            <Typography
              variant="h6"
              gutterBottom
              sx={{ color: brandColors.charcoal, fontWeight: 600, mt: 2 }}
            >
              Technical Safeguards
            </Typography>
            <Box component="ul" sx={{ pl: 3, color: brandColors.charcoal }}>
              <li>Encrypted data transmission (HTTPS)</li>
              <li>Secure server infrastructure</li>
              <li>Regular security updates and monitoring</li>
              <li>Access controls and authentication systems</li>
            </Box>

            <Typography
              variant="h6"
              gutterBottom
              sx={{ color: brandColors.charcoal, fontWeight: 600, mt: 2 }}
            >
              Privacy by Default
            </Typography>
            <Box component="ul" sx={{ pl: 3, color: brandColors.charcoal }}>
              <li>
                <strong>Private Libraries:</strong> All libraries are private by
                default, requiring explicit invitation to join
              </li>
              <li>
                <strong>Controlled Access:</strong> Only library members can
                view shared items and personal information
              </li>
              <li>
                <strong>No Public Listings:</strong> Your information is not
                displayed on public directories or search engines
              </li>
            </Box>

            <Typography
              variant="h6"
              gutterBottom
              sx={{ color: brandColors.charcoal, fontWeight: 600, mt: 2 }}
            >
              Operational Commitments
            </Typography>
            <Box component="ul" sx={{ pl: 3, color: brandColors.charcoal }}>
              <li>
                We do not share your data with third parties for commercial
                purposes
              </li>
              <li>We do not sell access to your information</li>
              <li>We have no current intent to monetize your personal data</li>
              <li>
                Staff access is limited to necessary operational purposes only
              </li>
            </Box>
          </Box>

          {/* Data Sharing */}
          <Box>
            <Typography
              variant="h5"
              gutterBottom
              sx={{ color: brandColors.charcoal, fontWeight: 600 }}
            >
              5. WHEN WE SHARE INFORMATION
            </Typography>
            <Typography
              variant="body1"
              paragraph
              sx={{ color: brandColors.charcoal }}
            >
              We do not share your personal information with other entities,
              except in these limited circumstances:
            </Typography>
            <Box component="ul" sx={{ pl: 3, color: brandColors.charcoal }}>
              <li>
                <strong>Within Libraries:</strong> Your information is visible
                to other members of the same private libraries
              </li>
              <li>
                <strong>Legal Requirements:</strong> When required by law, court
                order, or legal process
              </li>
              <li>
                <strong>Safety Concerns:</strong> To prevent harm to users or
                the public
              </li>
              <li>
                <strong>Service Providers:</strong> With trusted vendors who
                help operate the platform (under strict confidentiality
                agreements)
              </li>
              <li>
                <strong>Business Transfer:</strong> In the event of a merger,
                acquisition, or sale of assets
              </li>
            </Box>
          </Box>

          {/* User Control */}
          <Box>
            <Typography
              variant="h5"
              gutterBottom
              sx={{ color: brandColors.charcoal, fontWeight: 600 }}
            >
              6. YOUR CONTROL OVER YOUR INFORMATION
            </Typography>
            <Typography
              variant="body1"
              paragraph
              sx={{ color: brandColors.charcoal }}
            >
              You have several options for managing your information:
            </Typography>
            <Box component="ul" sx={{ pl: 3, color: brandColors.charcoal }}>
              <li>
                <strong>Account Settings:</strong> Update your profile
                information at any time
              </li>
              <li>
                <strong>Content Management:</strong> Edit or remove items
                you&rsquo;ve shared
              </li>
              <li>
                <strong>Library Participation:</strong> Leave libraries or
                decline invitations
              </li>
              <li>
                <strong>Account Deletion:</strong> Request complete account
                removal
              </li>
              <li>
                <strong>Data Export:</strong> Request a copy of your personal
                data
              </li>
            </Box>
            <Typography
              variant="body1"
              paragraph
              sx={{ color: brandColors.charcoal }}
            >
              However, remember that some information may remain visible to
              others even after you delete it, particularly content that has
              been shared in communications or transactions.
            </Typography>
          </Box>

          {/* Data Retention */}
          <Box>
            <Typography
              variant="h5"
              gutterBottom
              sx={{ color: brandColors.charcoal, fontWeight: 600 }}
            >
              7. DATA RETENTION
            </Typography>
            <Typography
              variant="body1"
              paragraph
              sx={{ color: brandColors.charcoal }}
            >
              We retain your information for as long as your account is active
              or as needed to provide services. Even after account deletion,
              some data may be retained for:
            </Typography>
            <Box component="ul" sx={{ pl: 3, color: brandColors.charcoal }}>
              <li>Legal compliance and dispute resolution</li>
              <li>Safety and security purposes</li>
              <li>Transaction history for active borrows/loans</li>
              <li>System backups (automatically purged over time)</li>
            </Box>
          </Box>

          {/* International Users */}
          <Box>
            <Typography
              variant="h5"
              gutterBottom
              sx={{ color: brandColors.charcoal, fontWeight: 600 }}
            >
              8. INTERNATIONAL DATA TRANSFERS
            </Typography>
            <Typography
              variant="body1"
              paragraph
              sx={{ color: brandColors.charcoal }}
            >
              StuffLibrary operates primarily in the United States. If you are
              located outside the US, your information may be transferred to and
              processed in the United States, where privacy laws may differ from
              your country&rsquo;s laws.
            </Typography>
          </Box>

          {/* Security Incidents */}
          <Box>
            <Typography
              variant="h5"
              gutterBottom
              sx={{ color: brandColors.charcoal, fontWeight: 600 }}
            >
              9. SECURITY INCIDENTS AND BREACHES
            </Typography>
            <Typography
              variant="body1"
              paragraph
              sx={{ color: brandColors.charcoal }}
            >
              Despite our reasonable security measures, no system is completely
              secure. In the event of a data breach or security incident:
            </Typography>
            <Box component="ul" sx={{ pl: 3, color: brandColors.charcoal }}>
              <li>We will investigate and respond promptly</li>
              <li>We will notify affected users as required by law</li>
              <li>We will take steps to prevent similar incidents</li>
              <li>We will cooperate with law enforcement as appropriate</li>
            </Box>
            <Typography
              variant="body1"
              paragraph
              sx={{ color: brandColors.charcoal }}
            >
              However, you should always assume that any information you share
              could potentially be exposed and plan accordingly.
            </Typography>
          </Box>

          {/* Children's Privacy */}
          <Box>
            <Typography
              variant="h5"
              gutterBottom
              sx={{ color: brandColors.charcoal, fontWeight: 600 }}
            >
              10. CHILDREN&rsquo;S PRIVACY
            </Typography>
            <Typography
              variant="body1"
              paragraph
              sx={{ color: brandColors.charcoal }}
            >
              StuffLibrary is not intended for children under 13 years of age.
              We do not knowingly collect personal information from children
              under 13. If you are a parent or guardian and believe your child
              has provided us with personal information, please contact us
              immediately.
            </Typography>
          </Box>

          {/* Policy Changes */}
          <Box>
            <Typography
              variant="h5"
              gutterBottom
              sx={{ color: brandColors.charcoal, fontWeight: 600 }}
            >
              11. CHANGES TO THIS POLICY
            </Typography>
            <Typography
              variant="body1"
              paragraph
              sx={{ color: brandColors.charcoal }}
            >
              We may update this Privacy Policy from time to time. We will
              notify you of material changes by posting the new Privacy Policy
              on this page and updating the effective date. Your continued use
              of the Service after changes constitutes acceptance of the updated
              policy.
            </Typography>
          </Box>

          {/* Final Reminder */}
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
              FINAL PRIVACY REMINDER
            </Typography>
            <Typography
              variant="body1"
              sx={{ color: '#BF360C', fontWeight: 600 }}
            >
              Remember: Community sharing inherently involves revealing personal
              information. While StuffLibrary takes reasonable measures to
              protect your data and keeps libraries private by default, you
              should never share anything you truly want to keep private. Always
              assume that your participation could connect your identity with
              your location, belongings, and personal interactions.
            </Typography>
          </Box>

          {/* Contact Information */}
          <Box textAlign="center">
            <Typography
              variant="body2"
              sx={{ color: brandColors.charcoal, opacity: 0.7 }}
            >
              For questions about this Privacy Policy, please contact us at{' '}
              <strong>privacy@stufflibrary.org</strong>
            </Typography>
          </Box>
        </Stack>
      </Paper>
    </Container>
  );
}
