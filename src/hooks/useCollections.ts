'use client';

import { useCallback, useEffect, useState } from 'react';

export interface Collection {
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

interface UseCollectionsReturn {
  collections: Collection[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createCollection: (collectionData: {
    name: string;
    description?: string;
    location?: string;
    isPublic?: boolean;
  }) => Promise<Collection>;
  joinCollection: (collectionId: string) => Promise<Collection>;
  leaveCollection: (collectionId: string) => Promise<void>;
}

export function useCollections(): UseCollectionsReturn {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCollections = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/libraries');

      if (!response.ok) {
        throw new Error('Failed to fetch collections');
      }

      const data = await response.json();
      setCollections(data.libraries || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load collections'
      );
      setCollections([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createCollection = useCallback(
    async (collectionData: {
      name: string;
      description?: string;
      location?: string;
      isPublic?: boolean;
    }): Promise<Collection> => {
      const response = await fetch('/api/libraries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(collectionData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create collection');
      }

      const { library: collection } = await response.json();

      // Add the new collection to our local state
      setCollections((prev) => [collection, ...prev]);

      return collection;
    },
    []
  );

  const joinCollection = useCallback(
    async (collectionId: string): Promise<Collection> => {
      const response = await fetch(`/api/libraries/${collectionId}/join`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to join collection');
      }

      const { library: collection } = await response.json();

      // Add the collection to our local state
      setCollections((prev) => {
        const existing = prev.find((c) => c.id === collection.id);
        if (existing) {
          // Update existing collection
          return prev.map((c) => (c.id === collection.id ? collection : c));
        } else {
          // Add new collection
          return [...prev, collection];
        }
      });

      return collection;
    },
    []
  );

  const leaveCollection = useCallback(
    async (collectionId: string): Promise<void> => {
      const response = await fetch(`/api/libraries/${collectionId}/join`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to leave collection');
      }

      // Remove the collection from our local state
      setCollections((prev) =>
        prev.filter((collection) => collection.id !== collectionId)
      );
    },
    []
  );

  // Load collections on mount
  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  return {
    collections,
    isLoading,
    error,
    refetch: fetchCollections,
    createCollection,
    joinCollection,
    leaveCollection,
  };
}
