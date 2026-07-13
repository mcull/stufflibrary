'use client';

import { Box, Skeleton } from '@mui/material';
import { useEffect, useState } from 'react';

import { VintageStamp } from '@/components/member-home/VintageStamp';

import { ConsoleCard, DeskErrorLine } from './cards';
import { console_, consoleType } from './tokens';

// Shape of GET /api/health (src/app/api/health/route.ts): status plus a
// services map of { status: 'OK' | 'ERROR', message }. No latency fields
// exist, so none are shown.
interface HealthService {
  status: string;
  message?: string;
}

interface HealthResponse {
  status: string;
  services: Record<string, HealthService>;
  timestamp?: string;
}

const SERVICE_LABELS: Record<string, string> = {
  database: 'Database',
  redis: 'Redis cache',
  storage: 'Storage',
  ai: 'AI service',
};

/**
 * One fetch of /api/health on mount. The route answers 503 with a full
 * per-service body when degraded, so we read the body regardless of HTTP
 * status; only an unreachable/shapeless response is a fetch failure.
 */
export function SystemHealthCard() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/health');
        const data = (await res.json().catch(() => null)) as unknown;
        if (cancelled) return;
        if (
          data &&
          typeof data === 'object' &&
          'services' in data &&
          data.services &&
          typeof data.services === 'object'
        ) {
          setHealth(data as HealthResponse);
        } else {
          setFailed(true);
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const services = health ? Object.entries(health.services) : [];
  const allHealthy =
    services.length > 0 && services.every(([, s]) => s.status === 'OK');

  return (
    <ConsoleCard title="SYSTEM HEALTH">
      {failed ? (
        <DeskErrorLine />
      ) : !health ? (
        <Box sx={{ display: 'grid', gap: '10px' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton
              key={i}
              variant="rounded"
              height={18}
              sx={{ backgroundColor: console_.rowSelected }}
            />
          ))}
        </Box>
      ) : (
        <>
          <Box>
            {services.map(([name, service], i) => (
              <Box
                key={name}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 2px',
                  borderTop:
                    i > 0 ? `1px dashed ${console_.dashedLine}` : 'none',
                }}
              >
                <Box
                  component="span"
                  sx={{
                    fontFamily: '"Roboto Mono", monospace',
                    fontSize: '11px',
                    color: console_.textSecondary,
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  {SERVICE_LABELS[name] ?? name}
                </Box>
                <Box
                  component="span"
                  aria-hidden="true"
                  sx={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    flexShrink: 0,
                    backgroundColor:
                      service.status === 'OK'
                        ? console_.okGreen
                        : console_.stampRed,
                  }}
                />
                <Box
                  component="span"
                  sx={{
                    ...consoleType.deltaLine,
                    color:
                      service.status === 'OK'
                        ? console_.textMuted
                        : console_.stampRed,
                  }}
                >
                  {service.status}
                </Box>
              </Box>
            ))}
          </Box>
          <Box sx={{ textAlign: 'center', marginTop: '12px' }}>
            <VintageStamp
              label={allHealthy ? 'ALL SYSTEMS NOMINAL' : 'ATTENTION'}
              ink={allHealthy ? console_.okGreen : console_.stampRed}
              rotation={-2}
              fontSize={10}
              borderWidth={1.5}
            />
          </Box>
        </>
      )}
    </ConsoleCard>
  );
}
