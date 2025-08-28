import { useState, useEffect } from 'react';

interface UserItem {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  currentBorrowRequestId?: string;
  condition: string;
  location?: string | undefined;
  createdAt: string;
  stuffType?: {
    displayName: string;
    category: string;
  };
  libraries?: {
    library: {
      id: string;
      name: string;
    };
  }[];
}

interface BorrowedItem {
  id: string;
  status: string;
  createdAt: string;
  requestedReturnDate: string;
  actualReturnDate?: string;
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
  createdAt: string;
  requestedReturnDate: string;
  actualReturnDate?: string;
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
  offlineItems: UserItem[];
  onLoanItems: LentItem[];
  // Items I've borrowed
  borrowedItems: BorrowedItem[];

  // Summary counts
  readyToLendCount: number;
  offlineCount: number;
  onLoanCount: number;
  borrowedCount: number;

  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useUserItems(): UseUserItemsResult {
  const [readyToLendItems, setReadyToLendItems] = useState<UserItem[]>([]);
  const [offlineItems, setOfflineItems] = useState<UserItem[]>([]);
  const [onLoanItems, setOnLoanItems] = useState<LentItem[]>([]);
  const [borrowedItems, setBorrowedItems] = useState<BorrowedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserItems = async () => {
    try {
      setIsLoading(true);
      setError(null);

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

      setReadyToLendItems(
        itemsData.items?.filter(
          (item: UserItem) => !item.currentBorrowRequestId
        ) || []
      );

      setOfflineItems(
        itemsData.items?.filter(
          (item: UserItem) => item.currentBorrowRequestId
        ) || []
      );

      setBorrowedItems(
        borrowRequestsData.activeBorrows?.filter(
          (request: BorrowedItem) => request.status === 'ACTIVE'
        ) || []
      );

      setOnLoanItems(
        borrowRequestsData.receivedRequests?.filter(
          (request: LentItem) => request.status === 'ACTIVE'
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
    offlineItems,
    onLoanItems,
    borrowedItems,
    readyToLendCount: readyToLendItems.length,
    offlineCount: offlineItems.length,
    onLoanCount: onLoanItems.length,
    borrowedCount: borrowedItems.length,
    isLoading,
    error,
    refetch,
  };
}
