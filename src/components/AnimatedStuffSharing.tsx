'use client';

import { Box, useTheme, useMediaQuery } from '@mui/material';
import { useEffect, useState, useRef, useCallback } from 'react';

import { brandColors } from '@/theme/brandTokens';

// Global cache outside component to prevent multiple fetches
let globalStuffItemsCache: StuffItem[] | null = null;
let globalFetchPromise: Promise<StuffItem[]> | null = null;

// Types
interface House {
  id: string;
  iconPath: string;
  position: number; // 0-1 position across the screen
  color: string; // Random color from theme
}

interface StuffItem {
  id: string;
  name: string;
  displayName: string;
  iconPath: string;
  category: string;
}

interface MovingObject {
  id: string;
  stuffItem: StuffItem;
  fromHouse: string;
  toHouse: string;
  progress: number; // 0-1 animation progress
  startTime: number;
  duration: number; // Animation duration in ms
}

// Available houses (we'll randomly select from these)
const AVAILABLE_HOUSES = [
  { id: 'house1', iconPath: '/house icons/house5.svg' },
  { id: 'house2', iconPath: '/house icons/house5.svg' },
  { id: 'house3', iconPath: '/house icons/house5.svg' },
  { id: 'house4', iconPath: '/house icons/house5.svg' },
];

// House colors from our theme
const HOUSE_COLORS = [
  brandColors.inkBlue,
  brandColors.mustardYellow,
  brandColors.tomatoRed,
];

export function AnimatedStuffSharing() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  // Determine number of houses based on screen size
  const numHouses = isMobile ? 2 : isTablet ? 3 : 4;

  // Fetch stuff items from database (using global cache)
  const fetchStuffItems = useCallback(async (): Promise<StuffItem[]> => {
    // Return cached data if available
    if (globalStuffItemsCache) {
      console.log('AnimatedStuffSharing: Using cached data');
      return globalStuffItemsCache;
    }

    // Return existing promise if already fetching
    if (globalFetchPromise) {
      console.log('AnimatedStuffSharing: Waiting for existing fetch');
      return globalFetchPromise;
    }

    console.log('AnimatedStuffSharing: Starting new fetch');

    // Start new fetch
    globalFetchPromise = (async () => {
      try {
        const response = await fetch('/api/stuff-types');
        if (!response.ok) {
          console.error('Failed to fetch stuff types');
          return [];
        }
        const data = await response.json();
        globalStuffItemsCache = data; // Cache the result globally
        console.log('AnimatedStuffSharing: Cached', data.length, 'items');
        return data;
      } catch (error) {
        console.error('Error fetching stuff types:', error);
        return [];
      } finally {
        globalFetchPromise = null; // Clear the promise reference
      }
    })();

    return globalFetchPromise;
  }, []); // Empty dependency array - function never changes

  // Shuffled items list for non-repetitive selection
  const [shuffledItems, setShuffledItems] = useState<StuffItem[]>([]);
  const [itemIndex, setItemIndex] = useState(0);

  // Calculate house positions
  const getHousePositions = useCallback(
    (count: number): number[] => {
      if (count === 1) return [0.5];
      const positions: number[] = [];

      // On mobile (2 houses), spread them out more
      if (count === 2 && isMobile) {
        return [0.2, 0.8]; // More spacing on mobile
      }

      // Default spacing for other screen sizes
      for (let i = 0; i < count; i++) {
        positions.push((i + 1) / (count + 1));
      }
      return positions;
    },
    [isMobile]
  );

  // State
  const [houses, setHouses] = useState<House[]>([]);
  const [movingObjects, setMovingObjects] = useState<MovingObject[]>([]);
  const [stuffItems, setStuffItems] = useState<StuffItem[]>([]);
  const animationRef = useRef<number>(0);
  const lastAnimationTime = useRef<number>(0);

  // Fetch stuff items from database on mount (only once)

  useEffect(() => {
    console.log(
      'AnimatedStuffSharing: Fetching stuff items (should only happen once)'
    );
    fetchStuffItems().then((items: StuffItem[]) => {
      console.log('AnimatedStuffSharing: Received items:', items.length);
      setStuffItems(items);
      setShuffledItems([...items].sort(() => Math.random() - 0.5));
      setItemIndex(0);
    });
  }, [fetchStuffItems]); // Include fetchStuffItems dependency

  // Initialize houses on mount/resize
  useEffect(() => {
    const positions = getHousePositions(numHouses);
    const selectedHouses = AVAILABLE_HOUSES.sort(() => Math.random() - 0.5) // Shuffle
      .slice(0, numHouses)
      .map((house, index) => ({
        ...house,
        position: positions[index] ?? 0.5,
        color:
          HOUSE_COLORS[Math.floor(Math.random() * HOUSE_COLORS.length)] ??
          brandColors.inkBlue, // Random theme color with fallback
      }));

    setHouses(selectedHouses);
    setMovingObjects([]); // Reset animations when houses change
  }, [numHouses, isMobile, getHousePositions]);

  // Animation logic
  useEffect(() => {
    if (houses.length < 2) return;

    const animate = (currentTime: number) => {
      // Update existing moving objects
      setMovingObjects(
        (prev) =>
          prev
            .map((obj) => ({
              ...obj,
              progress: Math.min(
                1,
                (currentTime - obj.startTime) / obj.duration
              ),
            }))
            .filter((obj) => obj.progress < 1) // Remove completed animations
      );

      // Add new objects if needed (every 3-5 seconds)
      if (
        currentTime - lastAnimationTime.current >
        3000 + Math.random() * 2000
      ) {
        lastAnimationTime.current = currentTime;

        // Find available house pairs (no existing animation between them)
        const availablePairs: [string, string][] = [];
        for (let i = 0; i < houses.length; i++) {
          for (let j = 0; j < houses.length; j++) {
            if (i !== j) {
              const fromHouse = houses[i];
              const toHouse = houses[j];

              if (!fromHouse || !toHouse) continue;

              const fromId = fromHouse.id;
              const toId = toHouse.id;

              // Check if there's already an object moving between these houses
              const hasExistingRoute = movingObjects.some(
                (obj) =>
                  (obj.fromHouse === fromId && obj.toHouse === toId) ||
                  (obj.fromHouse === toId && obj.toHouse === fromId)
              );

              if (!hasExistingRoute) {
                availablePairs.push([fromId, toId]);
              }
            }
          }
        }

        // Start a new animation if we have available pairs
        if (availablePairs.length > 0 && shuffledItems.length > 0) {
          const selectedPair =
            availablePairs[Math.floor(Math.random() * availablePairs.length)];

          // Get next item from shuffled list, loop back if at end
          const stuffItem = shuffledItems[itemIndex];
          const nextIndex = (itemIndex + 1) % shuffledItems.length;

          // If we're looping back, reshuffle the items
          if (nextIndex === 0) {
            setShuffledItems([...stuffItems].sort(() => Math.random() - 0.5));
          }
          setItemIndex(nextIndex);

          if (!selectedPair || !stuffItem) return;

          const [fromHouse, toHouse] = selectedPair;

          const newObject: MovingObject = {
            id: `${fromHouse}-${toHouse}-${currentTime}`,
            stuffItem,
            fromHouse,
            toHouse,
            progress: 0,
            startTime: currentTime,
            duration: 4000 + Math.random() * 2000, // 4-6 seconds
          };

          setMovingObjects((prev) => [...prev, newObject]);
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [houses, movingObjects, shuffledItems, itemIndex, stuffItems]);

  // Calculate object position during animation
  const getObjectPosition = (obj: MovingObject) => {
    const fromHouse = houses.find((h) => h.id === obj.fromHouse);
    const toHouse = houses.find((h) => h.id === obj.toHouse);

    if (!fromHouse || !toHouse) return { left: '0%', top: '50%' };

    const fromX = fromHouse.position * 100;
    const toX = toHouse.position * 100;

    // Easing function for smooth animation
    const easeInOutCubic = (t: number) =>
      t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;

    const easedProgress = easeInOutCubic(obj.progress);
    const currentX = fromX + (toX - fromX) * easedProgress;

    // Add slight arc to the movement
    const arcHeight = 20; // pixels
    const arcY = Math.sin(obj.progress * Math.PI) * arcHeight;

    return {
      left: `${currentX}%`,
      top: `calc(50% - ${arcY}px)`,
    };
  };

  return (
    <Box
      sx={{
        position: 'relative',
        height: { xs: '60px', md: '80px' },
        width: '100%',
        overflow: 'visible',
      }}
    >
      {/* Houses */}
      {houses.map((house) => (
        <Box
          key={house.id}
          sx={{
            position: 'absolute',
            left: `${house.position * 100}%`,
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: { xs: '40px', md: '60px' },
            height: { xs: '40px', md: '60px' },
            zIndex: 2,
          }}
        >
          <img
            src={house.iconPath}
            alt={`House ${house.id}`}
            style={{
              width: '100%',
              height: '100%',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
            }}
          />
        </Box>
      ))}

      {/* Moving Objects */}
      {movingObjects.map((obj) => {
        const position = getObjectPosition(obj);
        return (
          <Box
            key={obj.id}
            sx={{
              position: 'absolute',
              ...position,
              transform: 'translate(-50%, -50%)',
              width: { xs: '40px', md: '60px' },
              height: { xs: '40px', md: '60px' },
              zIndex: 1,
              transition: 'none', // Smooth animation via position updates
            }}
          >
            <img
              src={obj.stuffItem.iconPath}
              alt={obj.stuffItem.displayName}
              style={{
                width: '100%',
                height: '100%',
                filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))',
              }}
            />
          </Box>
        );
      })}
    </Box>
  );
}
