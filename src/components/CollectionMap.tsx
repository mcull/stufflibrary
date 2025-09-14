'use client';

import { Box, Paper, Typography } from '@mui/material';
import { useState, useEffect, useRef, memo } from 'react';

// Declare global google object
declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

interface LibraryMember {
  id: string;
  name?: string | null;
  image?: string | null;
  address?: string | null;
  latitude?: number | undefined;
  longitude?: number | undefined;
}

interface LibraryMapProps {
  libraryName: string;
  members: LibraryMember[];
  currentUser?: {
    id: string;
    latitude?: number | undefined;
    longitude?: number | undefined;
  };
}

function LibraryMapComponent({
  libraryName,
  members,
  currentUser,
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

      // If members have coordinates, calculate center
      const membersWithCoords = members.filter(
        (m) => m.latitude && m.longitude
      );
      if (membersWithCoords.length > 0) {
        const avgLat =
          membersWithCoords.reduce((sum, m) => sum + m.latitude!, 0) /
          membersWithCoords.length;
        const avgLng =
          membersWithCoords.reduce((sum, m) => sum + m.longitude!, 0) /
          membersWithCoords.length;
        mapCenter = { lat: avgLat, lng: avgLng };
      }

      const mapOptions = {
        center: mapCenter,
        zoom: 12,
        tilt: 45, // Maximum tilt for 3D perspective
        mapId: process.env.NEXT_PUBLIC_GOOGLE_MAP_ID, // Your configured map ID
        // If mapId doesn't work, we can try styleId as backup
        ...(process.env.NEXT_PUBLIC_GOOGLE_MAPS_STYLE && {
          styleId: process.env.NEXT_PUBLIC_GOOGLE_MAPS_STYLE,
        }),
        disableDefaultUI: true,
        zoomControl: true,
        ...(window.google.maps.ControlPosition && {
          zoomControlOptions: {
            position: window.google.maps.ControlPosition.RIGHT_BOTTOM,
          },
        }),
      };

      const newMap = new window.google.maps.Map(mapRef.current, mapOptions);
      setMap(newMap);
      setIsLoaded(true);

      // Add custom markers for each member
      members.forEach(async (member) => {
        let lat = member.latitude;
        let lng = member.longitude;

        // If no coordinates but has address, geocode it
        if ((!lat || !lng) && member.address) {
          try {
            const geocoder = new window.google.maps.Geocoder();
            const result = await new Promise<any>((resolve, reject) => {
              geocoder.geocode(
                { address: member.address },
                (results: any, status: any) => {
                  if (status === 'OK' && results?.[0]) {
                    resolve(results[0]);
                  } else {
                    reject(new Error('Geocoding failed'));
                  }
                }
              );
            });

            lat = result.geometry.location.lat();
            lng = result.geometry.location.lng();

            // Save the coordinates to the database
            await fetch('/api/profile/update-coordinates', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: member.id,
                latitude: lat,
                longitude: lng,
              }),
            });
          } catch (error) {
            console.warn(
              `Failed to geocode address for ${member.name}:`,
              error
            );
            // Fall back to center with small offset
            lat = mapCenter.lat + (Math.random() - 0.5) * 0.01;
            lng = mapCenter.lng + (Math.random() - 0.5) * 0.01;
          }
        } else if (!lat || !lng) {
          // No address and no coordinates - place near center
          lat = mapCenter.lat + (Math.random() - 0.5) * 0.01;
          lng = mapCenter.lng + (Math.random() - 0.5) * 0.01;
        }

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

        // Create advanced marker
        const marker = new window.google.maps.marker.AdvancedMarkerElement({
          position: { lat, lng },
          map: newMap,
          title: member.name || 'Anonymous',
          content: markerDiv,
        });

        // Add info window
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
  }, [members, currentUser]);

  return (
    <Paper
      sx={{
        position: 'relative',
        width: '100%',
        height: 260,
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
    </Paper>
  );
}

// Memoize the component to prevent unnecessary re-renders
export const LibraryMap = memo(LibraryMapComponent);
