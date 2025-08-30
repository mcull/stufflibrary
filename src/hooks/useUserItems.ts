import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { ItemWithStatus } from '@/lib/item-status-utils';

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

      // Use existing API endpoints instead of direct database calls
      const [itemsResponse, borrowRequestsResponse] = await Promise.all([
        fetch('/api/user/items'),
        fetch('/api/borrow-requests'),
      ]);

      if (!itemsResponse.ok || !borrowRequestsResponse.ok) {
        throw new Error('Failed to fetch user items');
      }

      const [itemsData, borrowRequestsData] = await Promise.all([
        itemsResponse.json(),
        borrowRequestsResponse.json(),
      ]);

      // Process items with status logic
      const allItems = itemsData.items || [];
      const readyToLendItems: ItemWithStatus[] = allItems
        .filter((item: any) => !item.currentBorrowRequestId)
        .map((item: any) => ({ ...item, status: 'ready-to-lend' as const }));
      
      const onLoanItems: ItemWithStatus[] = allItems
        .filter((item: any) => item.currentBorrowRequestId)
        .map((item: any) => ({ ...item, status: 'on-loan' as const }));

      const borrowedItems = borrowRequestsData.activeBorrows?.filter(
        (request: BorrowedItem) =>
          request.status === 'ACTIVE' || request.status === 'APPROVED'
      ) || [];

      setReadyToLendItems(readyToLendItems);
      setOnLoanItems(onLoanItems);
      setBorrowedItems(borrowedItems);
      setReadyToLendCount(readyToLendItems.length);
      setOnLoanCount(onLoanItems.length);
      setBorrowedCount(borrowedItems.length);
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
  }, [session?.user]);

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
