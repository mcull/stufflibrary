import { useState, useEffect } from 'react';

interface UserItem {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  isAvailable: boolean;
  condition: string;
  location?: string | undefined;
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

      // TODO: Remove this dummy data and uncomment real API calls for production
      // Dummy data for testing
      await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate API delay

      // Mock data
      const mockReadyToLend = Array.from({ length: 5 }, (_, i) => {
        const locations = [
          'garage',
          'kitchen',
          'bedroom',
          'basement',
          'office',
        ];
        return {
          id: `ready-${i}`,
          name: `Available Item ${i + 1}`,
          description: 'Mock item for testing',
          isAvailable: true,
          condition: 'good',
          location: locations[i] || undefined,
          createdAt: new Date().toISOString(),
          branch: { id: 'branch-1', name: 'My Branch' },
        };
      });

      const mockOnLoan = Array.from({ length: 4 }, (_, i) => {
        const lentDate = new Date();
        lentDate.setDate(lentDate.getDate() - (i + 1) * 3); // Items lent 3, 6, 9, 12 days ago
        return {
          id: `loan-${i}`,
          status: 'active',
          requestedAt: lentDate.toISOString(),
          borrower: { id: `borrower-${i}`, name: `Borrower ${i + 1}` },
          item: { id: `item-${i}`, name: `Lent Item ${i + 1}` },
        };
      });

      const mockBorrowed = Array.from({ length: 3 }, (_, i) => {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + (i + 1) * 5); // Items due in 5, 10, 15 days
        return {
          id: `borrowed-${i}`,
          status: 'active',
          requestedAt: new Date().toISOString(),
          promisedReturnBy: dueDate.toISOString(),
          item: { id: `borrowed-item-${i}`, name: `Borrowed Item ${i + 1}` },
          lender: { id: `lender-${i}`, name: `Lender ${i + 1}` },
        };
      });

      setReadyToLendItems(mockReadyToLend);
      setOnLoanItems(mockOnLoan);
      setBorrowedItems(mockBorrowed);

      // Real API calls - commented out for testing
      // const [itemsResponse, borrowRequestsResponse] = await Promise.all([
      //   fetch('/api/user/items'),
      //   fetch('/api/borrow-requests'),
      // ]);

      // if (!itemsResponse.ok || !borrowRequestsResponse.ok) {
      //   throw new Error('Failed to fetch user items');
      // }

      // const [itemsData, borrowRequestsData] = await Promise.all([
      //   itemsResponse.json(),
      //   borrowRequestsResponse.json(),
      // ]);

      // setReadyToLendItems(
      //   itemsData.items?.filter((item: UserItem) => item.isAvailable) || []
      // );

      // setBorrowedItems(
      //   borrowRequestsData.activeBorrows?.filter(
      //     (request: BorrowedItem) => request.status === 'active'
      //   ) || []
      // );

      // setOnLoanItems(
      //   borrowRequestsData.receivedRequests?.filter(
      //     (request: LentItem) => request.status === 'active'
      //   ) || []
      // );
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
