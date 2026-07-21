'use client';

import { Box, Paper, Typography } from '@mui/material';
import { useState, useEffect, useRef, memo } from 'react';

import type { MemberArea } from '@/lib/member-location-privacy';

import {
  areaTitle,
  buildAreaBadge,
  buildMemberInfoCard,
  buildMemberPin,
  displayName,
  type LibraryMember,
} from './library-map-markers';

// Declare global google object
declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

// Stable identities: these feed the effect's dependency array, so a fresh []
// per render would tear the map down and rebuild it every time.
const NO_MEMBERS: LibraryMember[] = [];
const NO_AREAS: MemberArea[] = [];

interface LibraryMapBaseProps {
  libraryName: string;
  currentUser?: {
    id: string;
    latitude?: number | null | undefined;
    longitude?: number | null | undefined;
  };
  /**
   * Lock the map's controls — no zoom, pan, or scroll. Purely about the
   * controls; it says nothing about who may see whom. That question is the
   * `view` discriminant's job, and conflating the two is how a viewer ends up
   * with a map they can't drag but can still read names off.
   */
  locked?: boolean;
}

/**
 * Pins or areas — never both, and never neither. The two carry very different
 * amounts of a real person (a pin is a name, a face and a doorstep; an area is
 * a number), so which one a viewer gets is the whole privacy decision. Making
 * it a discriminated union means a caller cannot pass members to an outsider's
 * map by forgetting a flag: there is no shape where that type-checks.
 */
type LibraryMapProps = LibraryMapBaseProps &
  (
    | { view: 'pins'; members: LibraryMember[]; areas?: never }
    | { view: 'areas'; areas: MemberArea[]; members?: never }
  );

function LibraryMapComponent(props: LibraryMapProps) {
  const { libraryName, currentUser, locked = false } = props;
  // Narrowed once, here. Everything downstream reads one of these two and the
  // other is provably empty.
  const members = props.view === 'pins' ? props.members : NO_MEMBERS;
  const areas = props.view === 'areas' ? props.areas : NO_AREAS;
  const mapRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [_map, setMap] = useState<any>(null);
  const retryCountRef = useRef(0);

  useEffect(() => {
    // Reset retry counter when effect runs
    retryCountRef.current = 0;

    const loadGoogleMaps = () => {
      if (window.google) {
        initializeMap();
        return;
      }

      // Check if script is already being loaded
      const existingScript = document.querySelector(
        'script[src*="maps.googleapis.com"]'
      );
      if (existingScript) {
        existingScript.addEventListener('load', initializeMap);
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places,marker&loading=async`;
      script.async = true;
      script.defer = true;
      script.onload = initializeMap;
      document.head.appendChild(script);
    };

    const initializeMap = () => {
      if (
        !mapRef.current ||
        !window.google ||
        !window.google.maps ||
        !window.google.maps.Map
      ) {
        // If API isn't ready, try again in 100ms (max 50 retries = 5 seconds)
        if (retryCountRef.current < 50) {
          retryCountRef.current++;
          setTimeout(initializeMap, 100);
        }
        return;
      }

      // Reset retry counter on success
      retryCountRef.current = 0;

      // Calculate center based on member locations or use default
      let mapCenter = { lat: 37.7749, lng: -122.4194 }; // Default to SF

      // Centre on whatever we were given. The props union guarantees exactly
      // one of these is populated.
      const points: Array<{ lat: number; lng: number }> = [
        ...members.map((m) => ({ lat: m.latitude, lng: m.longitude })),
        ...areas.map((a) => ({ lat: a.lat, lng: a.lng })),
      ];
      if (points.length > 0) {
        mapCenter = {
          lat: points.reduce((sum, p) => sum + p.lat, 0) / points.length,
          lng: points.reduce((sum, p) => sum + p.lng, 0) / points.length,
        };
      }

      const mapOptions: any = {
        center: mapCenter,
        zoom: 12,
        tilt: 45, // Re-enable tilt for 3D perspective
        disableDefaultUI: true,
        zoomControl: !locked,
        gestureHandling: locked ? 'none' : 'greedy',
        draggable: !locked,
        scrollwheel: !locked,
        doubleClickZoom: !locked,
      };
      if (process.env.NEXT_PUBLIC_GOOGLE_MAP_ID) {
        mapOptions.mapId = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID;
      }
      if (process.env.NEXT_PUBLIC_GOOGLE_MAPS_STYLE) {
        mapOptions.styleId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_STYLE;
      }
      if (window.google.maps.ControlPosition) {
        mapOptions.zoomControlOptions = {
          position: window.google.maps.ControlPosition.RIGHT_BOTTOM,
        };
      }

      let newMap: any = null;
      try {
        newMap = new window.google.maps.Map(mapRef.current, mapOptions);
      } catch (err) {
        console.warn(
          'Google Maps init failed, retrying without tilt/WebGL features',
          err
        );
        try {
          const fallbackOptions = { ...mapOptions } as any;
          delete fallbackOptions.tilt;
          newMap = new window.google.maps.Map(mapRef.current, fallbackOptions);
        } catch (err2) {
          console.error('Google Maps failed to initialize', err2);
          // Show fallback overlay; skip markers
          setIsLoaded(true);
          return;
        }
      }
      setMap(newMap);
      setIsLoaded(true);

      // Counted areas for outsiders. The number is the whole story.
      areas.forEach((area) => {
        const position = { lat: area.lat, lng: area.lng };
        const title = areaTitle(area);
        try {
          if (
            window.google?.maps?.marker?.AdvancedMarkerElement &&
            typeof window.google.maps.marker.AdvancedMarkerElement ===
              'function'
          ) {
            new window.google.maps.marker.AdvancedMarkerElement({
              position,
              map: newMap,
              title,
              content: buildAreaBadge(area),
            });
          } else {
            new window.google.maps.Marker({
              position,
              map: newMap,
              title,
              label: String(area.count),
            });
          }
        } catch {
          new window.google.maps.Marker({
            position,
            map: newMap,
            title,
            label: String(area.count),
          });
        }
      });

      // A pin per member. Everyone here has coordinates — the caller drops
      // anyone who doesn't rather than guessing at a spot.
      members.forEach((member) => {
        const position = { lat: member.latitude, lng: member.longitude };
        const isCurrentUser = currentUser?.id === member.id;
        const title = displayName(member.name);

        let marker: any;
        try {
          if (
            window.google?.maps?.marker?.AdvancedMarkerElement &&
            typeof window.google.maps.marker.AdvancedMarkerElement ===
              'function'
          ) {
            marker = new window.google.maps.marker.AdvancedMarkerElement({
              position,
              map: newMap,
              title,
              content: buildMemberPin(member, { isCurrentUser }),
            });
          } else {
            marker = new window.google.maps.Marker({
              position,
              map: newMap,
              title,
            });
          }
        } catch {
          // Fallback to basic marker on any error
          marker = new window.google.maps.Marker({
            position,
            map: newMap,
            title,
          });
        }

        // The card naming this member. Unreachable for outsiders by
        // construction: a props union with view:'areas' carries no members, so
        // this loop has nothing to iterate.
        const infoWindow = new window.google.maps.InfoWindow({
          content: buildMemberInfoCard(member, { isCurrentUser }),
        });

        marker.addListener('click', () => {
          infoWindow.open(newMap, marker);
        });
      });
    };

    loadGoogleMaps();
  }, [members, areas, currentUser, locked]);

  return (
    <Paper
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        borderRadius: 0, // Square corners
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        zIndex: 1, // Stable z-index for map
      }}
    >
      <div
        ref={mapRef}
        style={{
          width: '100%',
          height: '100%',
        }}
      />

      {/* Loading state */}
      {!isLoaded && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: '#f5f5f5',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Loading {libraryName} member map...
          </Typography>
        </Box>
      )}
      {isLoaded && !_map && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: '#f5f5f5',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Map unavailable on this device. Items below are still available.
          </Typography>
        </Box>
      )}
    </Paper>
  );
}

// Memoize the component to prevent unnecessary re-renders
export const LibraryMap = memo(LibraryMapComponent);
