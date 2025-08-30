import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { ItemWithStatus, getUserItemsWithStatus, getUserBorrowedItems, getUserItemsSummary } from '@/lib/item-status-utils';

interface BorrowedItem {
  id: string;
  status: string;
  createdAt: string;
  requestedReturnDate: string;
  actualReturnDate?: string | null;
  item: {
    id: string;
    name: string;
    imageUrl?: string | null;
  };
  lender: {
    id: string;
    name: string | null;
  };
}

interface UseUserItemsResult {
  // Items I own
  readyToLendItems: ItemWithStatus[];
  onLoanItems: ItemWithStatus[];
  // Items I've borrowed
  borrowedItems: BorrowedItem[];

  // Summary counts
  readyToLendCount: number;
  onLoanCount: number;
  borrowedCount: number;

  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useUserItems(): UseUserItemsResult {
  const { data: session } = useSession();
  const [readyToLendItems, setReadyToLendItems] = useState<ItemWithStatus[]>([]);
  const [onLoanItems, setOnLoanItems] = useState<ItemWithStatus[]>([]);
  const [borrowedItems, setBorrowedItems] = useState<BorrowedItem[]>([]);
  const [readyToLendCount, setReadyToLendCount] = useState(0);
  const [onLoanCount, setOnLoanCount] = useState(0);
  const [borrowedCount, setBorrowedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserItems = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const userId = (session?.user as any)?.id;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const [ownedItems, borrowedItemsData, summary] = await Promise.all([
        getUserItemsWithStatus(userId),
        getUserBorrowedItems(userId),
        getUserItemsSummary(userId),
      ]);

      setReadyToLendItems(ownedItems.readyToLendItems);
      setOnLoanItems(ownedItems.onLoanItems);
      setBorrowedItems(borrowedItemsData);
      setReadyToLendCount(summary.readyToLendCount);
      setOnLoanCount(summary.onLoanCount);
      setBorrowedCount(summary.borrowedCount);
    } catch (err) {
      console.error('Error fetching user items:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to fetch user items'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const userId = (session?.user as any)?.id;
    if (userId) {
      fetchUserItems();
    }
  }, [(session?.user as any)?.id]);

  const refetch = () => {
    fetchUserItems();
  };

  return {
    readyToLendItems,
    onLoanItems,
    borrowedItems,
    readyToLendCount,
    onLoanCount,
    borrowedCount,
    isLoading,
    error,
    refetch,
  };
}
