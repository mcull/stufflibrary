'use client';

import { useCallback, useEffect, useState } from 'react';

export interface Branch {
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

interface UseBranchesReturn {
  branches: Branch[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createBranch: (branchData: {
    name: string;
    description?: string;
    location?: string;
    isPublic?: boolean;
  }) => Promise<Branch>;
  joinBranch: (branchId: string) => Promise<Branch>;
  leaveBranch: (branchId: string) => Promise<void>;
}

export function useBranches(): UseBranchesReturn {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBranches = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/branches');

      if (!response.ok) {
        throw new Error('Failed to fetch branches');
      }

      const data = await response.json();
      setBranches(data.branches || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load branches');
      setBranches([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createBranch = useCallback(
    async (branchData: {
      name: string;
      description?: string;
      location?: string;
      isPublic?: boolean;
    }): Promise<Branch> => {
      const response = await fetch('/api/branches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(branchData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create branch');
      }

      const { branch } = await response.json();

      // Add the new branch to our local state
      setBranches((prev) => [branch, ...prev]);

      return branch;
    },
    []
  );

  const joinBranch = useCallback(async (branchId: string): Promise<Branch> => {
    const response = await fetch(`/api/branches/${branchId}/join`, {
      method: 'POST',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to join branch');
    }

    const { branch } = await response.json();

    // Add the branch to our local state
    setBranches((prev) => {
      const existing = prev.find((b) => b.id === branch.id);
      if (existing) {
        // Update existing branch
        return prev.map((b) => (b.id === branch.id ? branch : b));
      } else {
        // Add new branch
        return [...prev, branch];
      }
    });

    return branch;
  }, []);

  const leaveBranch = useCallback(async (branchId: string): Promise<void> => {
    const response = await fetch(`/api/branches/${branchId}/join`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to leave branch');
    }

    // Remove the branch from our local state
    setBranches((prev) => prev.filter((branch) => branch.id !== branchId));
  }, []);

  // Load branches on mount
  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  return {
    branches,
    isLoading,
    error,
    refetch: fetchBranches,
    createBranch,
    joinBranch,
    leaveBranch,
  };
}
