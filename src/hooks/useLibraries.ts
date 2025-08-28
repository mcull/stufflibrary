'use client';

import { useCallback, useEffect, useState } from 'react';

export interface Library {
  id: string;
  name: string;
  description?: string | null;
  location?: string | null;
  isPublic: boolean;
  role: 'owner' | 'admin' | 'member';
  memberCount: number;
  itemCount: number;
  joinedAt: string;
  owner: {
    id: string;
    name?: string | null;
    image?: string | null;
  };
  createdAt?: string;
}

interface UseLibrariesReturn {
  libraries: Library[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createLibrary: (libraryData: {
    name: string;
    description?: string;
    location?: string;
    isPublic?: boolean;
  }) => Promise<Library>;
  joinLibrary: (libraryId: string) => Promise<Library>;
  leaveLibrary: (libraryId: string) => Promise<void>;
}

export function useLibraries(): UseLibrariesReturn {
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLibraries = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/libraries');

      if (!response.ok) {
        throw new Error('Failed to fetch libraries');
      }

      const data = await response.json();
      setLibraries(data.libraries || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load libraries');
      setLibraries([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createLibrary = useCallback(
    async (libraryData: {
      name: string;
      description?: string;
      location?: string;
      isPublic?: boolean;
    }): Promise<Library> => {
      const response = await fetch('/api/libraries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(libraryData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create library');
      }

      const { library } = await response.json();

      // Add the new library to our local state
      setLibraries((prev) => [library, ...prev]);

      return library;
    },
    []
  );

  const joinLibrary = useCallback(async (libraryId: string): Promise<Library> => {
    const response = await fetch(`/api/libraries/${libraryId}/join`, {
      method: 'POST',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to join library');
    }

    const { library } = await response.json();

    // Add the library to our local state
    setLibraries((prev) => {
      const existing = prev.find((l) => l.id === library.id);
      if (existing) {
        // Update existing library
        return prev.map((l) => (l.id === library.id ? library : l));
      } else {
        // Add new library
        return [...prev, library];
      }
    });

    return library;
  }, []);

  const leaveLibrary = useCallback(async (libraryId: string): Promise<void> => {
    const response = await fetch(`/api/libraries/${libraryId}/join`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to leave library');
    }

    // Remove the library from our local state
    setLibraries((prev) => prev.filter((library) => library.id !== libraryId));
  }, []);

  // Load libraries on mount
  useEffect(() => {
    fetchLibraries();
  }, [fetchLibraries]);

  return {
    libraries,
    isLoading,
    error,
    refetch: fetchLibraries,
    createLibrary,
    joinLibrary,
    leaveLibrary,
  };
}
