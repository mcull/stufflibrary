'use client';

import { Box } from '@mui/material';
import { useEffect, useRef, useState } from 'react';

import type { AdminLibraryRow } from '@/app/api/admin/libraries/route';
import { vintageFonts } from '@/components/member-home/vintageTokens';
import { markerRadiusPx } from '@/lib/admin/desk';
import { brandColors } from '@/theme/brandTokens';

import { console_ } from './tokens';

// The map is a nice-to-have; the register below is the real, full list. So
// every failure here degrades to an honest mono note, never a broken grey box.

declare global {
  interface Window {
    google: any;
  }
}

interface BranchAtlasMapProps {
  /** Only located branches (centroid !== null) reach the map. */
  libraries: AdminLibraryRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  maxItemCount: number;
}

const NOTE =
  'Map needs NEXT_PUBLIC_GOOGLE_MAPS_API_KEY — the register below is the full list';

function MapNote({ text }: { text: string }) {
  return (
    <Box
      role="status"
      sx={{
        height: '100%',
        minHeight: 320,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '24px',
        backgroundColor: brandColors.warmCream,
        border: `1px dashed ${console_.dashedLine}`,
        borderRadius: '6px',
      }}
    >
      <Box
        component="span"
        sx={{
          fontFamily: vintageFonts.mono,
          fontSize: '11px',
          lineHeight: 1.6,
          color: console_.textMuted,
          maxWidth: 360,
        }}
      >
        {text}
      </Box>
    </Box>
  );
}

/** The circle marker DIV for one branch — sized by shelf, inked by selection. */
function markerContent(radius: number, selected: boolean): HTMLDivElement {
  const el = document.createElement('div');
  const d = radius * 2;
  el.style.cssText = [
    `width:${d}px`,
    `height:${d}px`,
    'border-radius:50%',
    'box-sizing:border-box',
    'cursor:pointer',
    'transition:transform 0.15s ease',
    selected
      ? `background:${brandColors.inkBlue};border:3px solid ${brandColors.tomatoRed}`
      : `background:${brandColors.warmCream};border:2px solid ${brandColors.inkBlue}`,
    'box-shadow:0 1px 4px rgba(0,0,0,0.25)',
  ].join(';');
  return el;
}

/**
 * The Atlas map. Copies LibraryMap's script-loader + AdvancedMarker pattern,
 * but plots ONE marker per located branch (a styled circle) and never
 * geocodes or fabricates a position. In jsdom (no window.google) or without
 * an API key, it renders the honest note and the rest of the Atlas carries on.
 */
export function BranchAtlasMap({
  libraries,
  selectedId,
  onSelect,
  maxItemCount,
}: BranchAtlasMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapObjRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const retryRef = useRef(0);
  // Latest onSelect without re-running the whole init effect on each render.
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const hasKey = Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);
  const [failed, setFailed] = useState(false);

  // Load + init the map, then drop one marker per located branch.
  useEffect(() => {
    if (!hasKey) return;
    retryRef.current = 0;
    let cancelled = false;

    const initializeMap = () => {
      if (cancelled) return;
      if (
        !mapRef.current ||
        !window.google?.maps?.Map ||
        !window.google.maps.LatLngBounds
      ) {
        if (retryRef.current < 50) {
          retryRef.current++;
          setTimeout(initializeMap, 100);
        } else {
          setFailed(true);
        }
        return;
      }

      const mapOptions: any = {
        center: { lat: 37.7749, lng: -122.4194 },
        zoom: 11,
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: 'greedy',
      };
      if (process.env.NEXT_PUBLIC_GOOGLE_MAP_ID) {
        mapOptions.mapId = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID;
      }
      if (process.env.NEXT_PUBLIC_GOOGLE_MAPS_STYLE) {
        mapOptions.styleId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_STYLE;
      }

      let map: any;
      try {
        map = new window.google.maps.Map(mapRef.current, mapOptions);
      } catch (err) {
        console.error('Branch Atlas map failed to initialize', err);
        setFailed(true);
        return;
      }
      mapObjRef.current = map;
      drawMarkers();
    };

    const loadGoogleMaps = () => {
      if (window.google?.maps) {
        initializeMap();
        return;
      }
      const existing = document.querySelector(
        'script[src*="maps.googleapis.com"]'
      );
      if (existing) {
        existing.addEventListener('load', initializeMap);
        existing.addEventListener('error', () => setFailed(true));
        return;
      }
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=marker&loading=async`;
      script.async = true;
      script.defer = true;
      script.onload = initializeMap;
      script.onerror = () => setFailed(true);
      document.head.appendChild(script);
    };

    loadGoogleMaps();

    return () => {
      cancelled = true;
    };
    // Only (re)load when the key presence flips; markers redraw in a separate
    // effect keyed on the data.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasKey]);

  // (Re)draw markers whenever the located set or selection changes.
  const drawMarkersDep = libraries.map((l) => l.id).join(',');
  function drawMarkers() {
    const map = mapObjRef.current;
    if (!map || !window.google?.maps) return;

    // Clear previous markers.
    markersRef.current.forEach((m) => {
      if (m) m.map = null;
    });
    markersRef.current.clear();

    const bounds = new window.google.maps.LatLngBounds();
    let plotted = 0;

    for (const lib of libraries) {
      if (!lib.centroid) continue;
      const radius = markerRadiusPx(lib.itemCount, maxItemCount);
      const selected = lib.id === selectedId;
      const position = { lat: lib.centroid.lat, lng: lib.centroid.lng };
      const content = markerContent(radius, selected);
      content.addEventListener('click', () => onSelectRef.current(lib.id));

      let marker: any;
      try {
        if (
          typeof window.google.maps.marker?.AdvancedMarkerElement === 'function'
        ) {
          marker = new window.google.maps.marker.AdvancedMarkerElement({
            position,
            map,
            title: lib.name,
            content,
          });
        } else {
          marker = new window.google.maps.Marker({
            position,
            map,
            title: lib.name,
          });
          marker.addListener('click', () => onSelectRef.current(lib.id));
        }
      } catch {
        marker = new window.google.maps.Marker({
          position,
          map,
          title: lib.name,
        });
        marker.addListener('click', () => onSelectRef.current(lib.id));
      }

      markersRef.current.set(lib.id, marker);
      bounds.extend(position);
      plotted++;
    }

    if (plotted === 1) {
      map.setCenter(bounds.getCenter());
      map.setZoom(13);
    } else if (plotted > 1) {
      map.fitBounds(bounds, 48);
    }
  }

  useEffect(() => {
    drawMarkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawMarkersDep, selectedId, maxItemCount]);

  if (!hasKey || failed) {
    return <MapNote text={NOTE} />;
  }

  return (
    <Box
      ref={mapRef}
      aria-label="Branch atlas map"
      sx={{
        width: '100%',
        height: '100%',
        minHeight: 360,
        borderRadius: '6px',
        overflow: 'hidden',
        border: `1px solid ${console_.cardBorder}`,
      }}
    />
  );
}
