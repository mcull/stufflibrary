'use client';

import { Box, Paper, Typography } from '@mui/material';
import { useState, useEffect, useRef, memo } from 'react';

import type { MemberArea } from '@/lib/member-location-privacy';

// Declare global google object
declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

// Only members the caller could actually place. Coordinates are required:
// a member whose location we don't know is left off the map, never invented.
interface LibraryMember {
  id: string;
  name?: string | null;
  image?: string | null;
  latitude: number;
  longitude: number;
}

interface LibraryMapProps {
  libraryName: string;
  /** Real people with real pins — members and above only. */
  members: LibraryMember[];
  /**
   * What an outsider gets instead: coordinates rounded to ~1.1km with
   * identical points merged, shown as a counted cluster. Nobody in an area is
   * named, faced or individually locatable, so there is nothing to blur.
   */
  areas?: MemberArea[];
  currentUser?: {
    id: string;
    latitude?: number | null | undefined;
    longitude?: number | null | undefined;
  };
  isGuest?: boolean;
}

function LibraryMapComponent({
  libraryName,
  members,
  areas = [],
  currentUser,
  isGuest = false,
}: LibraryMapProps) {
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

      // Centre on whatever we were given — pins for insiders, areas for
      // everyone else. Exactly one of the two is ever populated.
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
        zoomControl: !isGuest,
        gestureHandling: isGuest ? 'none' : 'greedy',
        draggable: !isGuest,
        scrollwheel: !isGuest,
        doubleClickZoom: !isGuest,
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

      // Counted areas for outsiders. One badge per rounded coordinate; the
      // number is the whole story. No name, no face, no click target — there
      // is no individual behind a badge to reveal.
      areas.forEach((area) => {
        const badge = document.createElement('div');
        badge.innerHTML = `
          <div style="
            min-width: 40px;
            height: 40px;
            padding: 0 8px;
            border-radius: 20px;
            border: 2px solid #ffffff;
            background: rgba(30, 58, 95, 0.85);
            color: #ffffff;
            font-family: 'Roboto', sans-serif;
            font-weight: 700;
            font-size: 16px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
          ">${area.count}</div>
        `;

        const title = `${area.count} member${area.count === 1 ? '' : 's'} near here`;
        try {
          if (
            window.google?.maps?.marker?.AdvancedMarkerElement &&
            typeof window.google.maps.marker.AdvancedMarkerElement ===
              'function'
          ) {
            new window.google.maps.marker.AdvancedMarkerElement({
              position: { lat: area.lat, lng: area.lng },
              map: newMap,
              title,
              content: badge,
            });
          } else {
            new window.google.maps.Marker({
              position: { lat: area.lat, lng: area.lng },
              map: newMap,
              title,
              label: String(area.count),
            });
          }
        } catch {
          new window.google.maps.Marker({
            position: { lat: area.lat, lng: area.lng },
            map: newMap,
            title,
            label: String(area.count),
          });
        }
      });

      // Add custom markers for each member. Everyone here has coordinates —
      // the caller drops anyone who doesn't rather than guessing at a spot.
      members.forEach((member) => {
        const { latitude: lat, longitude: lng } = member;
        const isCurrentUser = currentUser?.id === member.id;
        const markerSize = isCurrentUser ? 56 : 40;
        const borderColor = isCurrentUser ? '#1976d2' : '#ffffff';
        const borderWidth = isCurrentUser ? 3 : 2;

        // Create custom marker HTML
        const markerDiv = document.createElement('div');
        markerDiv.innerHTML = `
          <div style="
            width: ${markerSize}px;
            height: ${markerSize}px;
            border-radius: 50%;
            border: ${borderWidth}px solid ${borderColor};
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            overflow: hidden;
            cursor: pointer;
            transition: transform 0.2s ease;
            background: #f0f0f0;
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            ${
              member.image
                ? `
              <img
                src="${member.image}"
                alt="${member.name || 'Anonymous'}"
                style="width: 100%; height: 100%; object-fit: cover;"
                onerror="this.style.display='none'; this.parentElement.innerHTML='${(member.name || 'A')[0]}'; this.parentElement.style.fontSize='${markerSize * 0.4}px'; this.parentElement.style.fontWeight='bold'; this.parentElement.style.color='#666';"
              />
            `
                : `
              <span style="font-size: ${markerSize * 0.4}px; font-weight: bold; color: #666;">
                ${(member.name || 'A')[0]}
              </span>
            `
            }
          </div>
        `;

        // Add hover effect
        markerDiv.addEventListener('mouseenter', () => {
          markerDiv.style.transform = 'scale(1.1)';
        });
        markerDiv.addEventListener('mouseleave', () => {
          markerDiv.style.transform = 'scale(1)';
        });

        // Create marker (use AdvancedMarkerElement if available, else fallback to Marker)
        let marker: any;
        try {
          if (
            window.google?.maps?.marker?.AdvancedMarkerElement &&
            typeof window.google.maps.marker.AdvancedMarkerElement ===
              'function'
          ) {
            marker = new window.google.maps.marker.AdvancedMarkerElement({
              position: { lat, lng },
              map: newMap,
              title: member.name || 'Anonymous',
              content: markerDiv,
            });
          } else {
            marker = new window.google.maps.Marker({
              position: { lat, lng },
              map: newMap,
              title: member.name || 'Anonymous',
            });
          }
        } catch {
          // Fallback to basic marker on any error
          marker = new window.google.maps.Marker({
            position: { lat, lng },
            map: newMap,
            title: member.name || 'Anonymous',
          });
        }

        // Add info window. Only reachable for insiders: outsiders are given
        // areas, not members, so this loop is empty for them.
        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div style="padding: 12px; text-align: center; font-family: 'Roboto', sans-serif;">
              <div style="margin-bottom: 8px;">
                ${
                  member.image
                    ? `
                  <img 
                    src="${member.image}" 
                    alt="${member.name || 'Anonymous'}" 
                    style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 2px solid #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.3);"
                  />
                `
                    : `
                  <div style="width: 32px; height: 32px; border-radius: 50%; background: #1976d2; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; margin: 0 auto;">
                    ${(member.name || 'A')[0]}
                  </div>
                `
                }
              </div>
              <strong style="color: #333;">${member.name || 'Anonymous'}</strong>
              ${isCurrentUser ? '<br><span style="color: #1976d2; font-weight: 600;">(You)</span>' : ''}
            </div>
          `,
        });

        marker.addListener('click', () => {
          infoWindow.open(newMap, marker);
        });
      });
    };

    loadGoogleMaps();
  }, [members, areas, currentUser, isGuest]);

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
