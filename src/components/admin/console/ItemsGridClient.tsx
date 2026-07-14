'use client';

import { Box, Button, InputBase, Skeleton } from '@mui/material';
import { useEffect, useState } from 'react';

import { vintage, vintageFonts } from '@/components/member-home/vintageTokens';
import { itemShelfStamp } from '@/lib/admin/desk';
import { brandColors } from '@/theme/brandTokens';

import { DeskErrorLine, StampChip } from './cards';
import { console_, consoleType } from './tokens';

const PAGE_LIMIT = 25;
const SEARCH_DEBOUNCE_MS = 300;

interface ItemRow {
  id: string;
  name: string;
  category: string | null;
  active: boolean;
  isAvailable: boolean;
  imageUrl: string | null;
  watercolorUrl: string | null;
  watercolorThumbUrl: string | null;
  owner: { id: string; name: string | null; email: string | null };
  libraries: Array<{ id: string; name: string }>;
}

interface ItemsResponse {
  items: ItemRow[];
  pagination: { total: number; page: number; limit: number; pages: number };
}

// The chip label is the short mono badge; the key is the real Item.category
// value the endpoint filters on (canonical keys from CATEGORY_CONFIG).
type CategoryChip = { key: string; label: string };

const CATEGORY_CHIPS: CategoryChip[] = [
  { key: '', label: 'ALL' },
  { key: 'tools', label: 'Tools' },
  { key: 'sports', label: 'Sports' },
  { key: 'kitchen', label: 'Kitchen' },
  { key: 'yard', label: 'Yard' },
  { key: 'electronics', label: 'Electronics' },
  { key: 'books', label: 'Books' },
  { key: 'clothing', label: 'Clothing' },
  { key: 'furniture', label: 'Furniture' },
  { key: 'automotive', label: 'Auto' },
  { key: 'other', label: 'Other' },
];

// minmax(0,1fr) tracks only — a bare 1fr lets a long nowrap name blow the
// column out (the #482 trap) instead of truncating inside its card.
const GRID_COLS = {
  xs: 'repeat(2, minmax(0, 1fr))',
  sm: 'repeat(3, minmax(0, 1fr))',
  md: 'repeat(4, minmax(0, 1fr))',
  lg: 'repeat(5, minmax(0, 1fr))',
} as const;

const mono = (fontSize: string) =>
  ({ fontFamily: vintageFonts.mono, fontSize }) as const;

const secondaryButtonSx = {
  ...consoleType.overline,
  backgroundColor: brandColors.white,
  border: `1.5px solid ${brandColors.inkBlue}`,
  borderRadius: '4px',
  color: brandColors.inkBlue,
  padding: '4px 12px',
  minWidth: 0,
  '&:hover': { backgroundColor: console_.rowHover },
  '&.Mui-disabled': { opacity: 0.4, color: brandColors.inkBlue },
} as const;

function ItemCard({ item }: { item: ItemRow }) {
  const stamp = itemShelfStamp(item);
  const artUrl = item.watercolorThumbUrl || item.watercolorUrl || item.imageUrl;
  const library = item.libraries[0]?.name ?? '—';
  // Fall back to the 📦 box if the art URL is missing OR fails to load (stale
  // blob CDN links happen), not just when it's absent.
  const [artBroken, setArtBroken] = useState(false);
  const art = artUrl && !artBroken ? artUrl : null;

  return (
    <Box
      component="a"
      href={`/stuff/${item.id}`}
      target="_blank"
      rel="noopener noreferrer"
      sx={{
        display: 'block',
        textDecoration: 'none',
        backgroundColor: brandColors.white,
        border: `1px solid ${console_.cardBorder}`,
        borderRadius: '8px',
        padding: '10px',
        minWidth: 0,
        '&:hover': { backgroundColor: console_.rowHover },
      }}
    >
      {/* Watercolor with the shelf stamp pinned over its corner */}
      <Box sx={{ position: 'relative', marginBottom: '8px' }}>
        {art ? (
          <Box
            component="img"
            src={art}
            alt=""
            onError={() => setArtBroken(true)}
            sx={{
              width: '100%',
              aspectRatio: '1.05',
              objectFit: 'cover',
              borderRadius: '6px',
              display: 'block',
            }}
          />
        ) : (
          <Box
            aria-hidden
            sx={{
              width: '100%',
              aspectRatio: '1.05',
              borderRadius: '6px',
              backgroundColor: vintage.manila,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '30px',
              opacity: 0.6,
            }}
          >
            📦
          </Box>
        )}
        <Box sx={{ position: 'absolute', top: '6px', right: '6px' }}>
          <StampChip label={stamp.label} tone={stamp.tone} />
        </Box>
      </Box>

      {/* Serif name — must truncate, never push the card wide */}
      <Box
        component="span"
        sx={{
          display: 'block',
          fontFamily: vintageFonts.serif,
          fontWeight: 700,
          fontSize: '13px',
          color: brandColors.inkBlue,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {item.name}
      </Box>
      <Box
        component="span"
        sx={{
          display: 'block',
          ...mono('10px'),
          color: console_.textSecondary,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          marginTop: '3px',
        }}
      >
        {(item.category || '—') + ' · ' + (item.owner.name || '—')}
      </Box>
      <Box
        component="span"
        sx={{
          display: 'block',
          ...mono('9.5px'),
          color: console_.textMuted,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          marginTop: '2px',
        }}
      >
        {library}
      </Box>
    </Box>
  );
}

/** The item catalog: search, category chips, the watercolor card grid. */
export function ItemsGridClient() {
  const [data, setData] = useState<ItemsResponse | null>(null);
  const [listError, setListError] = useState(false);
  const [category, setCategory] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(PAGE_LIMIT),
        });
        if (search) params.set('search', search);
        if (category) params.set('category', category);
        const res = await fetch(`/api/admin/items?${params}`);
        if (!res.ok) throw new Error(`items fetch ${res.status}`);
        const body = (await res.json()) as ItemsResponse;
        if (!cancelled) {
          setData(body);
          setListError(false);
        }
      } catch {
        if (!cancelled) setListError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [category, search, page]);

  const pickCategory = (key: string) => {
    setCategory(key);
    setPage(1);
  };

  const total = data?.pagination.total ?? 0;
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_LIMIT + 1;
  const rangeEnd = total === 0 ? 0 : rangeStart + (data?.items.length ?? 0) - 1;

  return (
    <Box
      sx={{
        backgroundColor: brandColors.white,
        border: `1px solid ${console_.cardBorder}`,
        borderRadius: '8px',
        padding: '16px 18px',
      }}
    >
      {/* Toolbar: search + category chips */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '14px',
        }}
      >
        <InputBase
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search items, owners…"
          inputProps={{ 'aria-label': 'Search items' }}
          sx={{
            ...mono('11px'),
            color: console_.textSecondary,
            border: `1px solid ${console_.cardBorder}`,
            borderRadius: '4px',
            padding: '5px 10px',
            width: { xs: '100%', sm: '240px' },
            backgroundColor: brandColors.warmCream,
          }}
        />
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {CATEGORY_CHIPS.map((chip) => {
            const active = category === chip.key;
            return (
              <Box
                key={chip.key || 'all'}
                component="button"
                type="button"
                aria-pressed={active}
                onClick={() => pickCategory(chip.key)}
                sx={{
                  ...consoleType.overline,
                  cursor: 'pointer',
                  borderRadius: '999px',
                  padding: '5px 12px',
                  color: active
                    ? brandColors.warmCream
                    : console_.textSecondary,
                  backgroundColor: active
                    ? brandColors.inkBlue
                    : brandColors.white,
                  border: active
                    ? `1px solid ${brandColors.inkBlue}`
                    : `1px solid ${console_.cardBorder}`,
                }}
              >
                {chip.label}
              </Box>
            );
          })}
        </Box>
      </Box>

      {listError ? (
        <DeskErrorLine />
      ) : !data ? (
        <Box
          sx={{ display: 'grid', gridTemplateColumns: GRID_COLS, gap: '16px' }}
        >
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton
              key={i}
              variant="rounded"
              height={190}
              sx={{ backgroundColor: console_.rowSelected }}
            />
          ))}
        </Box>
      ) : data.items.length === 0 ? (
        <Box
          component="p"
          sx={{
            ...mono('11px'),
            color: console_.textMuted,
            margin: 0,
            padding: '18px 0',
          }}
        >
          No items match.
        </Box>
      ) : (
        <Box
          sx={{ display: 'grid', gridTemplateColumns: GRID_COLS, gap: '16px' }}
        >
          {data.items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </Box>
      )}

      {/* Pagination footer */}
      {!listError && data && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '14px',
          }}
        >
          <Box
            component="span"
            sx={{ ...consoleType.overline, color: console_.textMuted }}
          >
            {total === 0
              ? 'SHOWING 0 OF 0'
              : `SHOWING ${rangeStart}–${rangeEnd} OF ${total}`}
          </Box>
          <Box sx={{ display: 'flex', gap: '8px' }}>
            <Button
              sx={secondaryButtonSx}
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              PREV
            </Button>
            <Button
              sx={secondaryButtonSx}
              disabled={page >= (data.pagination.pages || 1)}
              onClick={() => setPage((p) => p + 1)}
            >
              NEXT
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
}
