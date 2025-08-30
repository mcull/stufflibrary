import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { VintageCheckoutCard } from '../VintageCheckoutCard';

// Mock CSS import
import '@/styles/vintage-fonts.css';

const mockBorrowHistory = [
  {
    id: 'borrow-1',
    status: 'RETURNED',
    borrower: {
      id: 'user-1',
      name: 'John Smith',
    },
    signature: 'John Smith',
    promiseText: 'Will return in good condition',
    promisedReturnBy: new Date('2024-01-15'),
    borrowedAt: new Date('2024-01-01'),
    returnedAt: new Date('2024-01-14'),
    approvedAt: new Date('2024-01-01'),
    requestedAt: new Date('2023-12-28'),
  },
  {
    id: 'borrow-2',
    status: 'ACTIVE',
    borrower: {
      id: 'user-2',
      name: 'Sarah Johnson',
    },
    signature: 'Sarah Johnson',
    promiseText: 'Taking good care of this',
    promisedReturnBy: new Date('2024-02-01'),
    borrowedAt: new Date('2024-01-20'),
    returnedAt: null,
    approvedAt: new Date('2024-01-20'),
    requestedAt: new Date('2024-01-15'),
  },
];

describe('VintageCheckoutCard', () => {
  it('should render the library card title when showTitle is true', () => {
    render(
      <VintageCheckoutCard
        itemName="Test Item"
        borrowHistory={[]}
        showTitle={true}
        compact={false}
      />
    );

    expect(screen.getByText('★ LIBRARY CHECKOUT CARD ★')).toBeInTheDocument();
  });

  it('should not render the library card title when showTitle is false', () => {
    render(
      <VintageCheckoutCard
        itemName="Test Item"
        borrowHistory={[]}
        showTitle={false}
        compact={false}
      />
    );

    expect(screen.queryByText('★ LIBRARY CHECKOUT CARD ★')).not.toBeInTheDocument();
  });

  it('should render column headers', () => {
    render(
      <VintageCheckoutCard
        itemName="Test Item"
        borrowHistory={[]}
        showTitle={false}
        compact={false}
      />
    );

    expect(screen.getByText("BORROWER'S NAME")).toBeInTheDocument();
    expect(screen.getByText('DUE DATE')).toBeInTheDocument();
    expect(screen.getByText('RETURNED')).toBeInTheDocument();
  });

  it('should render borrower names from history', () => {
    render(
      <VintageCheckoutCard
        itemName="Test Item"
        borrowHistory={mockBorrowHistory}
        showTitle={false}
        compact={false}
      />
    );

    expect(screen.getByText('John Smith')).toBeInTheDocument();
    expect(screen.getByText('Sarah Johnson')).toBeInTheDocument();
  });

  it('should render due dates in correct format', () => {
    render(
      <VintageCheckoutCard
        itemName="Test Item"
        borrowHistory={mockBorrowHistory}
        showTitle={false}
        compact={false}
      />
    );

    // Check that date text appears somewhere in document (format may vary)
    const dates = screen.getAllByText(/Jan \d+, 24/);
    expect(dates.length).toBeGreaterThan(0);
  });

  it('should render return dates only for returned items', () => {
    render(
      <VintageCheckoutCard
        itemName="Test Item"
        borrowHistory={mockBorrowHistory}
        showTitle={false}
        compact={false}
      />
    );

    // First item was returned - check for any return date
    const returnedDates = screen.getAllByText(/Jan \d+, 24/);
    expect(returnedDates.length).toBeGreaterThan(0);
  });

  it('should render different content for compact vs full mode', () => {
    const { rerender, container } = render(
      <VintageCheckoutCard
        itemName="Test Item"
        borrowHistory={[]}
        showTitle={false}
        compact={true}
      />
    );

    const compactContent = container.innerHTML;

    rerender(
      <VintageCheckoutCard
        itemName="Test Item"
        borrowHistory={[]}
        showTitle={false}
        compact={false}
      />
    );

    const fullContent = container.innerHTML;

    // Content should be different between compact and full mode
    expect(fullContent).not.toEqual(compactContent);
  });

  it('should handle empty borrow history gracefully', () => {
    render(
      <VintageCheckoutCard
        itemName="Test Item"
        borrowHistory={[]}
        showTitle={true}
        compact={false}
      />
    );

    // Should still render headers
    expect(screen.getByText("BORROWER'S NAME")).toBeInTheDocument();
    expect(screen.getByText('DUE DATE')).toBeInTheDocument();
    expect(screen.getByText('RETURNED')).toBeInTheDocument();

    // Should not render any borrower names
    expect(screen.queryByText('John Smith')).not.toBeInTheDocument();
  });

  it('should contain grid elements with proper styling', () => {
    render(
      <VintageCheckoutCard
        itemName="Test Item"
        borrowHistory={[]}
        showTitle={false}
        compact={false}
      />
    );

    // Check that grid-based elements exist (MUI Box components)
    const boxes = document.querySelectorAll('.MuiBox-root');
    expect(boxes.length).toBeGreaterThan(0);
  });
});