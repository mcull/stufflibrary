import { useState, useEffect } from 'react';

interface BorrowRecord {
  id: string;
  status: string;
  borrower: {
    id: string;
    name: string | null;
  };
  signature?: string | null;
  promiseText?: string | null;
  promisedReturnBy?: Date | null;
  borrowedAt?: Date | null;
  returnedAt?: Date | null;
  approvedAt?: Date | null;
  requestedAt: Date;
}

interface BorrowHistoryData {
  itemName: string;
  borrowHistory: BorrowRecord[];
}

interface UseBorrowHistoryResult {
  data: BorrowHistoryData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useBorrowHistory(itemId: string): UseBorrowHistoryResult {
  const [data, setData] = useState<BorrowHistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBorrowHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/items/${itemId}/borrow-history`);

      if (!response.ok) {
        if (response.status === 403 || response.status === 401) {
          // Access denied or unauthorized - this is expected for non-members or unauthenticated users
          setData(null);
          setError(null);
          return;
        }
        throw new Error(
          `Failed to fetch borrow history: ${response.statusText}`
        );
      }

      const result = await response.json();

      // Parse dates from strings
      const parsedHistory = result.borrowHistory.map((record: any) => ({
        ...record,
        promisedReturnBy: record.promisedReturnBy
          ? new Date(record.promisedReturnBy)
          : null,
        borrowedAt: record.borrowedAt ? new Date(record.borrowedAt) : null,
        returnedAt: record.returnedAt ? new Date(record.returnedAt) : null,
        approvedAt: record.approvedAt ? new Date(record.approvedAt) : null,
        requestedAt: new Date(record.requestedAt),
      }));

      setData({
        itemName: result.itemName,
        borrowHistory: parsedHistory,
      });
    } catch (err) {
      console.error('Error fetching borrow history:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to fetch borrow history'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (itemId) {
      fetchBorrowHistory();
    }
  }, [itemId]);

  const refetch = () => {
    fetchBorrowHistory();
  };

  return { data, loading, error, refetch };
}
