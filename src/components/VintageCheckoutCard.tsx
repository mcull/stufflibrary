'use client';

import { Box, Typography } from '@mui/material';
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
  itemId?: string;
}

export function VintageCheckoutCard({
  itemName: _itemName,
  borrowHistory,
  showTitle = true,
  compact = false,
  itemId: _itemId,
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
    <Box
      sx={{
        width: '100%',
        height: '100%',
        p: 0,
      }}
    >
      {/* Title section */}
      {showTitle && (
        <Box sx={{ mb: 2, textAlign: 'center' }}>
          <Typography
            className="vintage-stampette"
            sx={{
              fontSize: { xs: '0.9rem', sm: '1rem' },
              fontWeight: 'bold',
              color: '#2c1810',
              textTransform: 'uppercase',
              letterSpacing: '2px',
            }}
          >
            ★ LIBRARY CHECKOUT CARD ★
          </Typography>
        </Box>
      )}

      {/* Header row with columns */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '50% 25% 25%',
          mb: 2,
          pb: 1,
          borderBottom: '2px solid #8b4513',
        }}
      >
        <Typography
          className="vintage-stampette"
          sx={{
            fontSize: { xs: '0.7rem', sm: '0.8rem' },
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
            fontSize: { xs: '0.7rem', sm: '0.8rem' },
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
            fontSize: { xs: '0.7rem', sm: '0.8rem' },
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
      {Array.from({ length: compact ? 12 : 18 }).map((_, index) => {
        const record = enrichedHistory[index];
        return (
          <Box
            key={`row-${index}`}
            sx={{
              display: 'grid',
              gridTemplateColumns: '50% 25% 25%',
              mb: 1,
              minHeight: { xs: '28px', sm: '32px' },
              alignItems: 'end',
              borderBottom: '1px solid #333',
              pb: { xs: 0.5, sm: 1 },
            }}
          >
            {/* Borrower name */}
            <Box sx={{ textAlign: 'left', pl: { xs: 1, sm: 2 } }}>
              {record && (
                <Typography
                  sx={{
                    fontSize: { xs: '0.8rem', sm: '0.95rem' },
                    fontFamily: 'Courier, monospace',
                    color: '#1a1a1a',
                    fontWeight: 'normal',
                  }}
                >
                  {record.borrower.name}
                </Typography>
              )}
            </Box>

            {/* Due date */}
            <Box sx={{ textAlign: 'center' }}>
              {record && record.promisedReturnBy && (
                <Typography
                  className="vintage-impact-label"
                  sx={{
                    fontSize: { xs: '0.7rem', sm: '0.8rem' },
                    color: '#dc2626',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    transform: `rotate(${record.rotation}deg)`,
                  }}
                >
                  {formatDate(record.promisedReturnBy)}
                </Typography>
              )}
            </Box>

            {/* Return date */}
            <Box sx={{ textAlign: 'center' }}>
              {record && record.returnedAt && (
                <Typography
                  className="vintage-impact-label"
                  sx={{
                    fontSize: { xs: '0.7rem', sm: '0.8rem' },
                    color: '#2e7d32',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    transform: `rotate(${record.stampRotation}deg)`,
                  }}
                >
                  {formatDate(record.returnedAt)}
                </Typography>
              )}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
