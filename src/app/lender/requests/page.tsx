import { Metadata } from 'next';

import { LenderRequestsPage } from '@/components/lender/LenderRequestsPage';

export const metadata: Metadata = {
  title: 'Lending Requests | StuffLibrary',
  description: 'Review and respond to borrowing requests for your items',
};

export default function LenderRequestsRoute() {
  return <LenderRequestsPage />;
}