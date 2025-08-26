import { useState, useEffect } from 'react';

interface UserItem {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  isAvailable: boolean;
  condition: string;
  createdAt: string;
  stuffType?: {
    displayName: string;
    category: string;
  };
  branch: {
    id: string;
    name: string;
  };
}

interface BorrowedItem {
  id: string;
  status: string;
  requestedAt: string;
  promisedReturnBy?: string;
  item: {
    id: string;
    name: string;
    imageUrl?: string;
  };
  lender: {
    id: string;
    name: string;
  };
}

interface LentItem {
  id: string;
  status: string;
  requestedAt: string;
  borrower: {
    id: string;
    name: string;
  };
  item: {
    id: string;
    name: string;
    imageUrl?: string;
  };
}

interface UseUserItemsResult {
  // Items I own
  readyToLendItems: UserItem[];
  onLoanItems: LentItem[];
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
  const [readyToLendItems, setReadyToLendItems] = useState<UserItem[]>([]);
  const [onLoanItems, setOnLoanItems] = useState<LentItem[]>([]);
  const [borrowedItems, setBorrowedItems] = useState<BorrowedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserItems = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch user's items and borrow requests in parallel
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

      // Set ready to lend items (available items I own)
      setReadyToLendItems(
        itemsData.items?.filter((item: UserItem) => item.isAvailable) || []
      );

      // Set borrowed items (items I've borrowed that are active)
      setBorrowedItems(
        borrowRequestsData.activeBorrows?.filter(
          (request: BorrowedItem) => request.status === 'active'
        ) || []
      );

      // Set on loan items (my items that others have borrowed)
      setOnLoanItems(
        borrowRequestsData.receivedRequests?.filter(
          (request: LentItem) => request.status === 'active'
        ) || []
      );
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
    fetchUserItems();
  }, []);

  const refetch = () => {
    fetchUserItems();
  };

  return {
    readyToLendItems,
    onLoanItems,
    borrowedItems,
    readyToLendCount: readyToLendItems.length,
    onLoanCount: onLoanItems.length,
    borrowedCount: borrowedItems.length,
    isLoading,
    error,
    refetch,
  };
}
