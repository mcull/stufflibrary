'use client';

import { Box, useTheme, useMediaQuery } from '@mui/material';
import { useEffect, useState, useRef } from 'react';

// Types
interface House {
  id: string;
  iconPath: string;
  position: number; // 0-1 position across the screen
}

interface StuffItem {
  id: string;
  name: string;
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
  { id: 'house1', iconPath: '/house icons/house1.svg' },
  { id: 'house2', iconPath: '/house icons/house2.svg' },
  { id: 'house3', iconPath: '/house icons/house3.svg' },
  { id: 'house4', iconPath: '/house icons/house4.svg' },
  { id: 'house5', iconPath: '/house icons/house5.svg' },
];

// Mock stuff items (will be replaced with database data)
const MOCK_STUFF_ITEMS: StuffItem[] = [
  {
    id: '1',
    name: 'toolbox',
    iconPath: '/stuff icons/noun-toolbox-8029186.svg',
    category: 'tools',
  },
  {
    id: '2',
    name: 'bicycle',
    iconPath: '/stuff icons/noun-bicycle-6169822.svg',
    category: 'sports',
  },
  {
    id: '3',
    name: 'drill',
    iconPath: '/stuff icons/noun-drill-8029214.svg',
    category: 'tools',
  },
  {
    id: '4',
    name: 'backpack',
    iconPath: '/stuff icons/noun-backpack-4997875.svg',
    category: 'outdoor',
  },
  {
    id: '5',
    name: 'lawn mower',
    iconPath: '/stuff icons/noun-lawn-mower-8029224.svg',
    category: 'yard',
  },
  {
    id: '6',
    name: 'tent',
    iconPath: '/stuff icons/noun-tent-4997877.svg',
    category: 'outdoor',
  },
  {
    id: '7',
    name: 'chainsaw',
    iconPath: '/stuff icons/noun-chainsaw-8029187.svg',
    category: 'tools',
  },
  {
    id: '8',
    name: 'basketball',
    iconPath: '/stuff icons/noun-basketball-ball-4390463.svg',
    category: 'sports',
  },
];

export function AnimatedStuffSharing() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  // Determine number of houses based on screen size
  const numHouses = isMobile ? 2 : isTablet ? 3 : 4;

  // Calculate house positions
  const getHousePositions = (count: number): number[] => {
    if (count === 1) return [0.5];
    const positions: number[] = [];
    for (let i = 0; i < count; i++) {
      positions.push((i + 1) / (count + 1));
    }
    return positions;
  };

  // State
  const [houses, setHouses] = useState<House[]>([]);
  const [movingObjects, setMovingObjects] = useState<MovingObject[]>([]);
  const animationRef = useRef<number>(0);
  const lastAnimationTime = useRef<number>(0);

  // Initialize houses on mount/resize
  useEffect(() => {
    const positions = getHousePositions(numHouses);
    const selectedHouses = AVAILABLE_HOUSES.sort(() => Math.random() - 0.5) // Shuffle
      .slice(0, numHouses)
      .map((house, index) => ({
        ...house,
        position: positions[index] ?? 0.5,
      }));

    setHouses(selectedHouses);
    setMovingObjects([]); // Reset animations when houses change
  }, [numHouses]);

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
        if (availablePairs.length > 0) {
          const selectedPair =
            availablePairs[Math.floor(Math.random() * availablePairs.length)];
          const stuffItem =
            MOCK_STUFF_ITEMS[
              Math.floor(Math.random() * MOCK_STUFF_ITEMS.length)
            ];

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
  }, [houses, movingObjects]);

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
        height: { xs: '80px', md: '120px' },
        width: '100%',
        overflow: 'hidden',
        background: 'linear-gradient(to bottom, #e0f2fe 0%, #f5f5f5 100%)',
        borderBottom: '1px solid #e0e0e0',
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
              width: { xs: '20px', md: '30px' },
              height: { xs: '20px', md: '30px' },
              zIndex: 1,
              transition: 'none', // Smooth animation via position updates
            }}
          >
            <img
              src={obj.stuffItem.iconPath}
              alt={obj.stuffItem.name}
              style={{
                width: '100%',
                height: '100%',
                filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))',
              }}
            />
          </Box>
        );
      })}

      {/* Optional: Connection lines between houses */}
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '10%',
          right: '10%',
          height: '1px',
          background:
            'linear-gradient(to right, transparent, #bdbdbd, transparent)',
          zIndex: 0,
        }}
      />
    </Box>
  );
}
