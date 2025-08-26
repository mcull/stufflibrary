'use client';

import {
  Search as SearchIcon,
  Close as CloseIcon,
  Public as PublicIcon,
  People as PeopleIcon,
  LocationOn as LocationIcon,
} from '@mui/icons-material';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  TextField,
  Typography,
  IconButton,
  Card,
  CardContent,
  Button,
  Stack,
  Chip,
  InputAdornment,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useState, useEffect, useCallback } from 'react';

import { brandColors } from '@/theme/brandTokens';

interface PublicBranch {
  id: string;
  name: string;
  description?: string | null;
  location?: string | null;
  memberCount: number;
  itemCount: number;
  owner: {
    id: string;
    name?: string | null;
    image?: string | null;
  };
}

interface LibraryDiscoveryModalProps {
  open: boolean;
  onClose: () => void;
  onJoinBranch: (branchId: string) => Promise<unknown>;
}

export function LibraryDiscoveryModal({
  open,
  onClose,
  onJoinBranch,
}: LibraryDiscoveryModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [publicBranches, setPublicBranches] = useState<PublicBranch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joiningBranch, setJoiningBranch] = useState<string | null>(null);

  const fetchPublicBranches = useCallback(async (query = '') => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (query.trim()) {
        params.set('search', query.trim());
      }

      const response = await fetch(`/api/branches/discover?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch public libraries');
      }

      const data = await response.json();
      setPublicBranches(data.branches || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load public libraries'
      );
      setPublicBranches([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchPublicBranches();
    }
  }, [open, fetchPublicBranches]);

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (open) {
        fetchPublicBranches(searchQuery);
      }
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchQuery, open, fetchPublicBranches]);

  const handleJoinBranch = async (branchId: string) => {
    try {
      setJoiningBranch(branchId);
      await onJoinBranch(branchId);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join library');
    } finally {
      setJoiningBranch(null);
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setError(null);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          backgroundColor: brandColors.warmCream,
          maxHeight: '80vh',
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography
            variant="h5"
            component="h2"
            sx={{ fontWeight: 600, color: brandColors.inkBlue }}
          >
            Discover Libraries
          </Typography>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Find and join sharing communities in your area
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {/* Search */}
        <TextField
          fullWidth
          placeholder="Search by library name or location..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: 'text.secondary' }} />
              </InputAdornment>
            ),
          }}
          sx={{
            mb: 3,
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              backgroundColor: brandColors.white,
            },
          }}
        />

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Results */}
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={40} />
          </Box>
        ) : publicBranches.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
              {searchQuery
                ? 'No libraries found'
                : 'No public libraries available'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {searchQuery
                ? 'Try adjusting your search terms'
                : 'Be the first to create a public library in your area!'}
            </Typography>
          </Box>
        ) : (
          <Stack spacing={3}>
            {publicBranches.map((branch) => (
              <Card
                key={branch.id}
                sx={{
                  borderRadius: 3,
                  border: `1px solid ${brandColors.softGray}`,
                  backgroundColor: brandColors.white,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  },
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      mb: 2,
                    }}
                  >
                    <Box sx={{ flex: 1 }}>
                      <Box
                        sx={{ display: 'flex', alignItems: 'center', mb: 1 }}
                      >
                        <Typography
                          variant="h6"
                          sx={{ fontWeight: 600, mr: 1 }}
                        >
                          {branch.name}
                        </Typography>
                        <Chip
                          icon={<PublicIcon />}
                          label="Public"
                          size="small"
                          sx={{
                            backgroundColor: brandColors.inkBlue,
                            color: brandColors.white,
                            height: 20,
                            fontSize: '0.7rem',
                          }}
                        />
                      </Box>

                      {branch.description && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mb: 2 }}
                        >
                          {branch.description}
                        </Typography>
                      )}

                      <Stack direction="row" spacing={3} sx={{ mb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <PeopleIcon
                            sx={{
                              fontSize: 16,
                              color: 'text.secondary',
                              mr: 0.5,
                            }}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {branch.memberCount} members
                          </Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {branch.itemCount} items
                        </Typography>
                      </Stack>

                      {branch.location && (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <LocationIcon
                            sx={{
                              fontSize: 16,
                              color: 'text.secondary',
                              mr: 0.5,
                            }}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {branch.location}
                          </Typography>
                        </Box>
                      )}
                    </Box>

                    <Button
                      variant="contained"
                      onClick={() => handleJoinBranch(branch.id)}
                      disabled={joiningBranch === branch.id}
                      sx={{
                        borderRadius: 2,
                        textTransform: 'none',
                        backgroundColor: brandColors.mustardYellow,
                        color: brandColors.charcoal,
                        '&:hover': {
                          backgroundColor: '#C19E04',
                        },
                        minWidth: 80,
                      }}
                    >
                      {joiningBranch === branch.id ? (
                        <CircularProgress size={20} />
                      ) : (
                        'Join'
                      )}
                    </Button>
                  </Box>

                  {branch.owner.name && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontStyle: 'italic' }}
                    >
                      Created by {branch.owner.name}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}
