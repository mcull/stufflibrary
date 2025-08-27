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

  const formatSignature = (name: string | null, signature?: string | null) => {
    if (signature) {
      // If we have actual signature data, we'd render it here
      // For now, use a stylized name
      return name || 'Anonymous';
    }
    return name || 'Anonymous';
  };

  return (
    <Card
      sx={{
        bgcolor: '#f9f7f4',
        boxShadow:
          '0 4px 12px rgba(0,0,0,0.15), inset 0 0 20px rgba(139,69,19,0.05)',
        position: 'relative',
        border: '1px solid rgba(139,69,19,0.2)',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            radial-gradient(circle at 20% 30%, rgba(139,69,19,0.05) 1px, transparent 1px),
            radial-gradient(circle at 80% 70%, rgba(160,82,45,0.03) 1px, transparent 1px),
            radial-gradient(circle at 40% 80%, rgba(101,67,33,0.04) 1px, transparent 1px),
            linear-gradient(to bottom, transparent 0%, rgba(139,69,19,0.02) 100%)
          `,
          pointerEvents: 'none',
        },
      }}
    >
      <CardContent sx={{ p: compact ? 2 : 3 }}>
        {showTitle && (
          <Box sx={{ mb: 3, textAlign: 'center' }}>
            <Typography
              className="vintage-impact-label"
              sx={{
                fontSize: compact ? '0.9rem' : '1.1rem',
                fontWeight: 'bold',
                letterSpacing: '2px',
                color: '#2c1810',
                textTransform: 'uppercase',
              }}
            >
              ★ LIBRARY CHECKOUT CARD ★
            </Typography>
            <Box
              sx={{
                width: '100%',
                height: '2px',
                bgcolor: '#8b4513',
                mt: 1,
                opacity: 0.6,
              }}
            />
          </Box>
        )}

        {/* Item name */}
        <Box sx={{ mb: 3 }}>
          <Typography
            className="vintage-stamp-press"
            sx={{
              fontSize: compact ? '1rem' : '1.2rem',
              fontWeight: 'bold',
              color: '#1a1a1a',
              textAlign: 'center',
              letterSpacing: '1px',
            }}
          >
            {itemName}
          </Typography>
        </Box>

        {/* Checkout records */}
        <Box sx={{ position: 'relative' }}>
          {/* Header row */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: compact ? '1fr 80px 80px' : '2fr 1fr 1fr',
              gap: 1,
              mb: 2,
              pb: 1,
              borderBottom: '1px solid #8b4513',
              opacity: 0.7,
            }}
          >
            <Typography
              className="vintage-stampette"
              sx={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#2c1810' }}
            >
              BORROWER
            </Typography>
            <Typography
              className="vintage-stampette"
              sx={{
                fontSize: '0.75rem',
                fontWeight: 'bold',
                color: '#2c1810',
                textAlign: 'center',
              }}
            >
              OUT
            </Typography>
            <Typography
              className="vintage-stampette"
              sx={{
                fontSize: '0.75rem',
                fontWeight: 'bold',
                color: '#2c1810',
                textAlign: 'center',
              }}
            >
              RETURN
            </Typography>
          </Box>

          {/* Checkout records */}
          {enrichedHistory.slice(0, compact ? 3 : 8).map((record) => (
            <Box
              key={record.id}
              sx={{ mb: compact ? 1.5 : 2, position: 'relative' }}
            >
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: compact
                    ? '1fr 80px 80px'
                    : '2fr 1fr 1fr',
                  gap: 1,
                  alignItems: 'center',
                }}
              >
                {/* Signature */}
                <Box sx={{ position: 'relative' }}>
                  <Typography
                    className={`vintage-stampette ${record.inkColor}`}
                    sx={{
                      fontSize: compact ? '0.9rem' : '1rem',
                      fontStyle: 'italic',
                      transform: `rotate(${record.rotation}deg)`,
                      transformOrigin: 'left center',
                      fontWeight: 500,
                    }}
                  >
                    {formatSignature(record.borrower.name, record.signature)}
                  </Typography>
                </Box>

                {/* Checkout date */}
                <Typography
                  className="vintage-stampette"
                  sx={{
                    fontSize: compact ? '0.8rem' : '0.9rem',
                    color: '#1a1a1a',
                    textAlign: 'center',
                    fontFamily: 'monospace',
                  }}
                >
                  {formatDate(record.borrowedAt || record.approvedAt)}
                </Typography>

                {/* Return date */}
                <Typography
                  className="vintage-stampette"
                  sx={{
                    fontSize: compact ? '0.8rem' : '0.9rem',
                    color: record.returnedAt ? '#1a1a1a' : '#dc2626',
                    textAlign: 'center',
                    fontFamily: 'monospace',
                    fontStyle: record.returnedAt ? 'normal' : 'italic',
                  }}
                >
                  {record.returnedAt
                    ? formatDate(record.returnedAt)
                    : 'OVERDUE'}
                </Typography>
              </Box>

              {/* Promise stamp */}
              {record.promiseText && record.promisedReturnBy && (
                <Box
                  sx={{
                    position: 'absolute',
                    right: compact ? -10 : -20,
                    top: -5,
                    transform: `rotate(${record.stampRotation}deg)`,
                    zIndex: 1,
                  }}
                >
                  <Typography
                    className="vintage-impact-label ink-blue"
                    sx={{
                      fontSize: compact ? '0.6rem' : '0.7rem',
                      border: '2px solid #1e40af',
                      borderRadius: '4px',
                      padding: '2px 6px',
                      backgroundColor: 'rgba(30, 64, 175, 0.1)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      fontWeight: 'bold',
                      opacity: 0.8,
                    }}
                  >
                    DUE {formatDate(record.promisedReturnBy)}
                  </Typography>
                </Box>
              )}
            </Box>
          ))}

          {/* Empty rows for that authentic library card feel */}
          {enrichedHistory.length < (compact ? 3 : 8) && (
            <>
              {Array.from({
                length: (compact ? 3 : 8) - enrichedHistory.length,
              }).map((_, index) => (
                <Box
                  key={`empty-${index}`}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: compact
                      ? '1fr 80px 80px'
                      : '2fr 1fr 1fr',
                    gap: 1,
                    mb: compact ? 1.5 : 2,
                    height: compact ? '20px' : '24px',
                    borderBottom: '1px dotted #ccc',
                    opacity: 0.3,
                  }}
                >
                  <Box />
                  <Box />
                  <Box />
                </Box>
              ))}
            </>
          )}
        </Box>

        {/* Library stamp/seal */}
        <Box sx={{ textAlign: 'center', mt: 3, opacity: 0.6 }}>
          <Typography
            className="vintage-impact-label"
            sx={{
              fontSize: compact ? '0.7rem' : '0.8rem',
              color: '#8b4513',
              letterSpacing: '2px',
              transform: 'rotate(-1deg)',
            }}
          >
            RETURN PROMPTLY • FINE 5¢ PER DAY
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}
