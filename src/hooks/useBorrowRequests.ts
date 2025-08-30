import { useState, useEffect } from 'react';

interface BorrowRequest {
  id: string;
  status: 'pending' | 'approved' | 'declined' | 'active' | 'returned';
  requestedAt: string;
  approvedAt?: string;
  respondedAt?: string;
  promisedReturnBy?: string;
  promiseText?: string;
  videoUrl?: string;
  lenderResponse?: string;
  item: {
    id: string;
    name: string;
    imageUrl?: string;
  };
  lender: {
    id: string;
    name: string;
    image?: string;
  };
  borrower?: {
    id: string;
    name: string;
    image?: string;
  };
}

interface UseBorrowRequestsResult {
  sentRequests: BorrowRequest[];
  receivedRequests: BorrowRequest[];
  activeBorrows: BorrowRequest[];
  onLoan: BorrowRequest[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useBorrowRequests(): UseBorrowRequestsResult {
  const [sentRequests, setSentRequests] = useState<BorrowRequest[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<BorrowRequest[]>([]);
  const [activeBorrows, setActiveBorrows] = useState<BorrowRequest[]>([]);
  const [onLoan, setOnLoan] = useState<BorrowRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBorrowRequests = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/borrow-requests');

      if (!response.ok) {
        throw new Error('Failed to fetch borrow requests');
      }

      const data = await response.json();

      setSentRequests(data.sentRequests || []);
      setReceivedRequests(data.receivedRequests || []);
      setActiveBorrows(data.activeBorrows || []);
      setOnLoan(data.onLoan || []);
    } catch (err) {
      console.error('Error fetching borrow requests:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to fetch borrow requests'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBorrowRequests();
  }, []);

  const refetch = () => {
    fetchBorrowRequests();
  };

  return {
    sentRequests,
    receivedRequests,
    activeBorrows,
    onLoan,
    isLoading,
    error,
    refetch,
  };
}
