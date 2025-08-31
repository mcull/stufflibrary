import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';

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
    watercolorUrl?: string | null;
    watercolorThumbUrl?: string | null;
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
  offlineItems: ItemWithStatus[];
  // Items I've borrowed
  borrowedItems: BorrowedItem[];

  // Summary counts
  readyToLendCount: number;
  onLoanCount: number;
  offlineCount: number;
  borrowedCount: number;

  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useUserItems(): UseUserItemsResult {
  const { data: session } = useSession();
  const [readyToLendItems, setReadyToLendItems] = useState<ItemWithStatus[]>(
    []
  );
  const [onLoanItems, setOnLoanItems] = useState<ItemWithStatus[]>([]);
  const [offlineItems, setOfflineItems] = useState<ItemWithStatus[]>([]);
  const [borrowedItems, setBorrowedItems] = useState<BorrowedItem[]>([]);
  const [readyToLendCount, setReadyToLendCount] = useState(0);
  const [onLoanCount, setOnLoanCount] = useState(0);
  const [offlineCount, setOfflineCount] = useState(0);
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
      const allBorrowRequests = borrowRequestsData.all || [];

      // Find self-borrow request IDs (offline items)
      const selfBorrowRequestIds = allBorrowRequests
        .filter(
          (request: any) =>
            request.borrowerId === userId &&
            request.lenderId === userId &&
            (request.status === 'ACTIVE' || request.status === 'APPROVED')
        )
        .map((request: any) => request.id);

      const readyToLendItems: ItemWithStatus[] = allItems
        .filter((item: any) => !item.currentBorrowRequestId)
        .map((item: any) => ({ ...item, status: 'ready-to-lend' as const }));

      // Identify offline items (items with currentBorrowRequestId that matches a self-borrow)
      const offlineItems: ItemWithStatus[] = allItems
        .filter(
          (item: any) =>
            item.currentBorrowRequestId &&
            selfBorrowRequestIds.includes(item.currentBorrowRequestId)
        )
        .map((item: any) => ({ ...item, status: 'offline' as const }));

      // Use the filtered onLoan data from API (which excludes self-borrows)
      // Deduplicate by itemId, prioritizing ACTIVE over APPROVED status
      const onLoanRequests = borrowRequestsData.onLoan || [];
      const uniqueOnLoanItems = new Map();

      onLoanRequests.forEach((request: any) => {
        const itemId = request.item.id;
        const existing = uniqueOnLoanItems.get(itemId);

        // If no existing item or current request has higher priority (ACTIVE > APPROVED)
        if (
          !existing ||
          (request.status === 'ACTIVE' && existing.status === 'APPROVED')
        ) {
          uniqueOnLoanItems.set(itemId, request);
        }
      });

      const onLoanItems: ItemWithStatus[] = Array.from(
        uniqueOnLoanItems.values()
      ).map((request: any) => ({
        ...request.item,
        status: 'on-loan' as const,
        borrower: request.borrower,
        borrowRequest: {
          id: request.id,
          status: request.status,
          requestedReturnDate: request.requestedReturnDate,
          createdAt: request.createdAt,
        },
      }));

      // Filter borrowed items to exclude self-borrows
      const borrowedItems =
        borrowRequestsData.activeBorrows?.filter(
          (request: BorrowedItem) =>
            (request.status === 'ACTIVE' || request.status === 'APPROVED') &&
            request.lender.id !== userId // Exclude items borrowed from myself (self-borrows)
        ) || [];

      setReadyToLendItems(readyToLendItems);
      setOnLoanItems(onLoanItems);
      setOfflineItems(offlineItems);
      setBorrowedItems(borrowedItems);
      setReadyToLendCount(readyToLendItems.length);
      setOnLoanCount(onLoanItems.length);
      setOfflineCount(offlineItems.length);
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
    offlineItems,
    borrowedItems,
    readyToLendCount,
    onLoanCount,
    offlineCount,
    borrowedCount,
    isLoading,
    error,
    refetch,
  };
}
