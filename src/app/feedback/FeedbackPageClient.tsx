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
  Link as MUILink,
  Radio,
  RadioGroup,
  TextField,
  Typography,
} from '@mui/material';
import { Snackbar } from '@mui/material';
import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';

interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string;
  state: string;
  created_at: string;
  closed_at?: string | null;
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
  const [issues, setIssues] = useState<GitHubIssue[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(true);
  const [upvoting, setUpvoting] = useState<Record<number, boolean>>({});
  const [voted, setVoted] = useState<Record<number, boolean>>({});
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  // Load open issues on component mount
  useEffect(() => {
    loadOpenIssues();
  }, []);

  const sortIssues = (list: GitHubIssue[]) => {
    const isClosed = (s?: string) => (s || '').toLowerCase() === 'closed';
    const byVotesThenCreatedDesc = (a: GitHubIssue, b: GitHubIssue) => {
      const va = a.reactions?.['+1'] || 0;
      const vb = b.reactions?.['+1'] || 0;
      if (vb !== va) return vb - va; // primary: votes desc
      // secondary: created_at desc (newer first)
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    };
    const byClosedAtDesc = (a: GitHubIssue, b: GitHubIssue) => {
      const ad = a.closed_at ? new Date(a.closed_at).getTime() : 0;
      const bd = b.closed_at ? new Date(b.closed_at).getTime() : 0;
      return bd - ad; // newer closed first
    };
    const open = list
      .filter((i) => !isClosed(i.state))
      .sort(byVotesThenCreatedDesc);
    const closed = list.filter((i) => isClosed(i.state)).sort(byClosedAtDesc);
    return [...open, ...closed];
  };

  const loadOpenIssues = async () => {
    try {
      const response = await fetch('/api/feedback/issues');
      if (response.ok) {
        const data: GitHubIssue[] = await response.json();
        const sorted = sortIssues(data);
        setIssues(sorted);
        // Sync local voted flags from localStorage for visible issues
        try {
          const map: Record<number, boolean> = {};
          sorted.forEach((it) => {
            if (
              typeof window !== 'undefined' &&
              localStorage.getItem(`sl_feedback_voted_${it.number}`) === '1'
            ) {
              map[it.number] = true;
            }
          });
          setVoted(map);
        } catch {}
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
      let response: Response;
      if (imageFile) {
        const fd = new FormData();
        fd.append('type', formData.type);
        fd.append('message', formData.message);
        fd.append('image', imageFile);
        response = await fetch('/api/feedback/submit', {
          method: 'POST',
          body: fd,
        });
      } else {
        response = await fetch('/api/feedback/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });
      }

      if (!response.ok) throw new Error('Failed to submit feedback');
      const data = await response.json();
      setSubmitSuccess(true);
      setSnackbarOpen(true);
      if (data?.issueUrl && data?.issueNumber) {
        setSubmittedIssue({ url: data.issueUrl, number: data.issueNumber });
      } else {
        setSubmittedIssue(null);
      }
      setFormData({ type: 'feature', message: '' });
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(null);
      setImageFile(null);
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

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 3,
        }}
      >
        <Box>
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
                <Box sx={{ mt: 2 }}>
                  <Button variant="outlined" component="label">
                    {imageFile ? 'Change Screenshot' : 'Attach Screenshot'}
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        if (previewUrl) {
                          try {
                            URL.revokeObjectURL(previewUrl);
                          } catch {}
                        }
                        setImageFile(file);
                        setPreviewUrl(file ? URL.createObjectURL(file) : null);
                      }}
                    />
                  </Button>
                  {imageFile && (
                    <Typography variant="caption" sx={{ ml: 1 }}>
                      {imageFile.name}
                    </Typography>
                  )}
                  {previewUrl && (
                    <Box sx={{ mt: 1 }}>
                      <Box
                        component="img"
                        src={previewUrl}
                        alt="Screenshot preview"
                        sx={{
                          width: 160,
                          maxWidth: '100%',
                          height: 'auto',
                          borderRadius: 1,
                          border: '1px solid #e0e0e0',
                        }}
                      />
                    </Box>
                  )}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box>
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
                  {issues.map((issue, idx) => {
                    const _isClosed = issue.state.toLowerCase() === 'closed';
                    const alreadyVoted = Boolean(voted[issue.number]);
                    return (
                      <Box
                        key={issue.id}
                        sx={{ py: 1.5, opacity: _isClosed ? 0.88 : 1 }}
                      >
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
                              {issue.title}
                            </MUILink>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ display: 'block', mt: 0.5 }}
                            >
                              Opened {formatDate(issue.created_at)}
                              {issue.state?.toLowerCase() === 'closed' &&
                                issue.closed_at && (
                                  <> • Closed {formatDate(issue.closed_at)}</>
                                )}
                            </Typography>
                            <Box
                              sx={{
                                mt: 1,
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: 0.5,
                              }}
                            >
                              {_isClosed && (
                                <Chip
                                  label="Closed"
                                  size="small"
                                  variant="outlined"
                                  sx={{
                                    backgroundColor: '#f3f4f6',
                                    color: '#6b7280',
                                    borderColor: '#e5e7eb',
                                  }}
                                />
                              )}
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
                            disabled={
                              Boolean(upvoting[issue.number]) ||
                              _isClosed ||
                              alreadyVoted
                            }
                            title={
                              _isClosed
                                ? 'Voting disabled on closed issues'
                                : undefined
                            }
                            onClick={async () => {
                              if (_isClosed) return;
                              try {
                                setUpvoting((s) => ({
                                  ...s,
                                  [issue.number]: true,
                                }));
                                const res = await fetch(
                                  `/api/feedback/issues/${issue.number}/upvote`,
                                  { method: 'POST' }
                                );
                                if (res.ok) {
                                  // Mark locally to prevent multiple votes in this browser
                                  try {
                                    localStorage.setItem(
                                      `sl_feedback_voted_${issue.number}`,
                                      '1'
                                    );
                                    setVoted((m) => ({
                                      ...m,
                                      [issue.number]: true,
                                    }));
                                  } catch {}
                                  // Reload issues to reflect the actual count from GitHub
                                  await loadOpenIssues();
                                }
                              } catch (e) {
                                console.warn('Failed to upvote issue', e);
                              } finally {
                                setUpvoting((s) => ({
                                  ...s,
                                  [issue.number]: false,
                                }));
                              }
                            }}
                          >
                            {alreadyVoted
                              ? 'Voted'
                              : issue.reactions['+1'] || 0}
                          </Button>
                        </Box>
                        {idx < issues.length - 1 && (
                          <Divider sx={{ mt: 1.5 }} />
                        )}
                      </Box>
                    );
                  })}
                </Box>
              )}

              {/* Footer link removed per request */}
            </CardContent>
          </Card>
        </Box>
      </Box>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity="success"
          sx={{ width: '100%' }}
        >
          Thanks for your feedback!
        </Alert>
      </Snackbar>
    </Container>
  );
}
