'use client';

import ThumbUpOffAltIcon from '@mui/icons-material/ThumbUpOffAlt';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  FormControl,
  FormControlLabel,
  FormLabel,
  Grid,
  Link as MUILink,
  Radio,
  RadioGroup,
  TextField,
  Typography,
} from '@mui/material';
import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';

interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string;
  state: string;
  created_at: string;
  labels: Array<{ name: string; color: string }>;
  reactions: {
    '+1': number;
  };
  html_url: string;
}

interface FeedbackFormData {
  type: 'bug' | 'feature' | 'polish';
  message: string;
}

export function FeedbackPageClient() {
  const { data: _session } = useSession();
  const [formData, setFormData] = useState<FeedbackFormData>({
    type: 'feature',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submittedIssue, setSubmittedIssue] = useState<{
    url: string;
    number: number;
  } | null>(null);
  const [openIssues, setOpenIssues] = useState<GitHubIssue[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(true);

  // Load open issues on component mount
  useEffect(() => {
    loadOpenIssues();
  }, []);

  const loadOpenIssues = async () => {
    try {
      const response = await fetch('/api/feedback/issues');
      if (response.ok) {
        const issues = await response.json();
        setOpenIssues(issues);
      }
    } catch (error) {
      console.error('Failed to load issues:', error);
    } finally {
      setLoadingIssues(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.message.trim()) return;

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/feedback/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to submit feedback');
      const data = await response.json();
      setSubmitSuccess(true);
      if (data?.issueUrl && data?.issueNumber) {
        setSubmittedIssue({ url: data.issueUrl, number: data.issueNumber });
      } else {
        setSubmittedIssue(null);
      }
      setFormData({ type: 'feature', message: '' });
      // Reload issues to show the new one
      loadOpenIssues();
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert(
        'Sorry, there was an error submitting your feedback. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTypeInfo = (type: string) => {
    switch (type) {
      case 'bug':
        return {
          emoji: '🐛',
          label: 'Bug Report',
          description: "Something isn't working as expected",
          placeholder:
            'Describe what went wrong, what you expected to happen, and any steps to reproduce the issue...',
        };
      case 'feature':
        return {
          emoji: '💡',
          label: 'Feature Request',
          description: 'A new idea or enhancement',
          placeholder:
            'Describe your idea, why it would be useful, and how you envision it working...',
        };
      case 'polish':
        return {
          emoji: '✨',
          label: 'Polish & UX',
          description: 'Make something better or more delightful',
          placeholder:
            'Describe what could be improved, smoother, or more intuitive...',
        };
      default:
        return {
          emoji: '💭',
          label: 'Feedback',
          description: '',
          placeholder: '',
        };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const currentTypeInfo = getTypeInfo(formData.type);

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          💬 Share Your Thoughts
        </Typography>
        <Typography color="text.secondary">
          Help us make StuffLibrary better! Report bugs, request features, or
          suggest improvements.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                What&apos;s on your mind?
              </Typography>

              {submitSuccess && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  We&apos;ve logged your feedback.
                  {submittedIssue && (
                    <>
                      {' '}
                      See issue{' '}
                      <MUILink
                        href={submittedIssue.url}
                        target="_blank"
                        underline="hover"
                      >
                        #{submittedIssue.number}
                      </MUILink>
                      .
                    </>
                  )}
                </Alert>
              )}

              <Box component="form" onSubmit={handleSubmit} noValidate>
                <FormControl component="fieldset" fullWidth sx={{ mb: 2 }}>
                  <FormLabel component="legend">
                    What type of feedback is this?
                  </FormLabel>
                  <RadioGroup
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        type: e.target.value as FeedbackFormData['type'],
                      })
                    }
                  >
                    {(['bug', 'feature', 'polish'] as const).map((type) => {
                      const info = getTypeInfo(type);
                      return (
                        <FormControlLabel
                          key={type}
                          value={type}
                          control={<Radio />}
                          label={
                            <Box>
                              <Typography sx={{ fontWeight: 600 }}>
                                {info.emoji} {info.label}
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                {info.description}
                              </Typography>
                            </Box>
                          }
                        />
                      );
                    })}
                  </RadioGroup>
                </FormControl>

                <TextField
                  label={`${currentTypeInfo.emoji} Tell us more`}
                  value={formData.message}
                  onChange={(e) =>
                    setFormData({ ...formData, message: e.target.value })
                  }
                  multiline
                  rows={6}
                  fullWidth
                  placeholder={currentTypeInfo.placeholder}
                  sx={{ mb: 2 }}
                  required
                />

                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  disabled={isSubmitting || !formData.message.trim()}
                  startIcon={
                    isSubmitting ? <CircularProgress size={18} /> : undefined
                  }
                >
                  {isSubmitting ? 'Sending…' : 'Submit Feedback'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                📋 Community Feedback
              </Typography>

              {loadingIssues ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <Box>
                  {openIssues.map((issue, idx) => {
                    const _isClosed = issue.state.toLowerCase() === 'closed';
                    return (
                      <Box key={issue.id} sx={{ py: 1.5 }}>
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            gap: 2,
                          }}
                        >
                          <Box sx={{ minWidth: 0 }}>
                            <MUILink
                              href={issue.html_url}
                              target="_blank"
                              underline="hover"
                              sx={{ fontWeight: 600 }}
                            >
                              #{issue.number} — {issue.title}
                            </MUILink>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ display: 'block', mt: 0.5 }}
                            >
                              Opened {formatDate(issue.created_at)}
                            </Typography>
                            <Box
                              sx={{
                                mt: 1,
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: 0.5,
                              }}
                            >
                              {issue.labels.map((label) => (
                                <Chip
                                  key={label.name}
                                  label={label.name}
                                  size="small"
                                  variant="outlined"
                                  sx={{
                                    borderColor: `#${label.color}`,
                                    color: `#${label.color}`,
                                  }}
                                />
                              ))}
                            </Box>
                          </Box>
                          <Button
                            size="small"
                            variant="text"
                            startIcon={<ThumbUpOffAltIcon fontSize="small" />}
                            onClick={() =>
                              console.log('Upvote issue', issue.number)
                            }
                          >
                            {issue.reactions['+1'] || 0}
                          </Button>
                        </Box>
                        {idx < openIssues.length - 1 && (
                          <Divider sx={{ mt: 1.5 }} />
                        )}
                      </Box>
                    );
                  })}
                </Box>
              )}

              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <MUILink
                  href="https://github.com/mcull/stufflibrary/issues"
                  target="_blank"
                  underline="hover"
                >
                  Explore on GitHub →
                </MUILink>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}
