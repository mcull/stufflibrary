'use client';

import { Box, Typography, Card, CardContent } from '@mui/material';
import { useMemo } from 'react';

import '@/styles/vintage-fonts.css';

interface BorrowRecord {
  id: string;
  status: string;
  borrower: {
    id: string;
    name: string | null;
  };
  signature?: string | null;
  promiseText?: string | null;
  promisedReturnBy?: Date | null;
  borrowedAt?: Date | null;
  returnedAt?: Date | null;
  approvedAt?: Date | null;
  requestedAt: Date;
}

interface VintageCheckoutCardProps {
  itemName: string;
  borrowHistory: BorrowRecord[];
  showTitle?: boolean;
  compact?: boolean;
}

export function VintageCheckoutCard({
  itemName,
  borrowHistory,
  showTitle = true,
  compact = false,
}: VintageCheckoutCardProps) {
  // Generate consistent random values for each record
  const enrichedHistory = useMemo(() => {
    return borrowHistory.map((record) => {
      const seed = record.id
        .split('')
        .reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const random1 = ((seed * 9301 + 49297) % 233280) / 233280;
      const random2 = (((seed + 1) * 9301 + 49297) % 233280) / 233280;
      const random3 = (((seed + 2) * 9301 + 49297) % 233280) / 233280;

      const inkColors = [
        'ink-blue',
        'ink-black',
        'ink-red',
        'ink-brown',
        'ink-purple',
      ];
      const inkColor = inkColors[Math.floor(random1 * inkColors.length)];

      const rotation = (random2 - 0.5) * 4; // -2 to +2 degrees
      const stampRotation = (random3 - 0.5) * 6; // -3 to +3 degrees

      return {
        ...record,
        inkColor,
        rotation,
        stampRotation,
      };
    });
  }, [borrowHistory]);

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return '___________';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: '2-digit',
    });
  };

  return (
    <Card
      sx={{
        bgcolor: '#f8f6f0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        position: 'relative',
        border: '2px solid #8b4513',
        borderRadius: 2,
      }}
    >
      <CardContent sx={{ p: compact ? 3 : 4 }}>
        {showTitle && (
          <Box sx={{ mb: 4, textAlign: 'center' }}>
            <Typography
              className="vintage-impact-label"
              sx={{
                fontSize: compact ? '1rem' : '1.2rem',
                fontWeight: 'bold',
                letterSpacing: '3px',
                color: '#2c1810',
                textTransform: 'uppercase',
              }}
            >
              ★ LIBRARY CHECKOUT CARD ★
            </Typography>
            <Box
              sx={{
                width: '80%',
                height: '3px',
                bgcolor: '#8b4513',
                mt: 2,
                mx: 'auto',
              }}
            />
          </Box>
        )}

        {/* Item name in center - like traditional library checkout card */}
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Typography
            className="vintage-stamp-press"
            sx={{
              fontSize: compact ? '1.2rem' : '1.6rem',
              fontWeight: 'bold',
              color: '#1a1a1a',
              letterSpacing: '1px',
            }}
          >
            {itemName}
          </Typography>
        </Box>

        {/* Header row with columns */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 2,
            mb: 2,
            pb: 1,
            borderBottom: '2px solid #8b4513',
          }}
        >
          <Typography
            className="vintage-stampette"
            sx={{
              fontSize: '0.8rem',
              fontWeight: 'bold',
              color: '#2c1810',
              textAlign: 'center',
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}
          >
            BORROWER&apos;S NAME
          </Typography>
          <Typography
            className="vintage-stampette"
            sx={{
              fontSize: '0.8rem',
              fontWeight: 'bold',
              color: '#2c1810',
              textAlign: 'center',
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}
          >
            DUE DATE
          </Typography>
          <Typography
            className="vintage-stampette"
            sx={{
              fontSize: '0.8rem',
              fontWeight: 'bold',
              color: '#2c1810',
              textAlign: 'center',
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}
          >
            RETURNED
          </Typography>
        </Box>

        {/* Checkout rows */}
        {Array.from({ length: compact ? 6 : 10 }).map((_, index) => {
          const record = enrichedHistory[index];
          return (
            <Box
              key={`row-${index}`}
              sx={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: 2,
                mb: 2,
                minHeight: '32px',
                alignItems: 'end',
              }}
            >
              {/* Borrower name */}
              <Box sx={{ textAlign: 'center' }}>
                <Box
                  sx={{
                    borderBottom: '1px solid #333',
                    pb: 0.5,
                    minHeight: '24px',
                    display: 'flex',
                    alignItems: 'end',
                    justifyContent: 'center',
                  }}
                >
                  {record && (
                    <Typography
                      sx={{
                        fontSize: '0.95rem',
                        fontFamily: 'Courier, monospace',
                        color: '#1a1a1a',
                        fontWeight: 'normal',
                      }}
                    >
                      {record.borrower.name}
                    </Typography>
                  )}
                </Box>
              </Box>

              {/* Due date */}
              <Box sx={{ textAlign: 'center' }}>
                <Box
                  sx={{
                    borderBottom: '1px solid #333',
                    pb: 0.5,
                    minHeight: '24px',
                    display: 'flex',
                    alignItems: 'end',
                    justifyContent: 'center',
                  }}
                >
                  {record && record.promisedReturnBy && (
                    <Typography
                      className="vintage-impact-label"
                      sx={{
                        fontSize: '0.8rem',
                        color: '#dc2626',
                        fontWeight: 'bold',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        transform: 'rotate(-1deg)',
                      }}
                    >
                      {formatDate(record.promisedReturnBy)}
                    </Typography>
                  )}
                </Box>
              </Box>

              {/* Return date */}
              <Box sx={{ textAlign: 'center' }}>
                <Box
                  sx={{
                    borderBottom: '1px solid #333',
                    pb: 0.5,
                    minHeight: '24px',
                    display: 'flex',
                    alignItems: 'end',
                    justifyContent: 'center',
                  }}
                >
                  {record && record.returnedAt && (
                    <Typography
                      className="vintage-impact-label"
                      sx={{
                        fontSize: '0.8rem',
                        color: '#2e7d32',
                        fontWeight: 'bold',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        transform: 'rotate(1deg)',
                      }}
                    >
                      {formatDate(record.returnedAt)}
                    </Typography>
                  )}
                </Box>
              </Box>
            </Box>
          );
        })}

        {/* Library stamp/seal */}
        <Box sx={{ textAlign: 'center', mt: 4, opacity: 0.8 }}>
          <Typography
            className="vintage-impact-label"
            sx={{
              fontSize: compact ? '0.8rem' : '0.9rem',
              color: '#8b4513',
              letterSpacing: '2px',
              textTransform: 'uppercase',
            }}
          >
            RETURN PROMPTLY • FINE 5¢ PER DAY
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}
