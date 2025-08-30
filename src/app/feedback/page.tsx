import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';

import { authOptions } from '@/lib/auth';

import { FeedbackPageClient } from './FeedbackPageClient';

export const metadata: Metadata = {
  title: 'Feedback & Feature Requests | StuffLibrary',
  description:
    'Share your feedback, report bugs, or request new features for StuffLibrary.',
};

export default async function FeedbackPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/signin?callbackUrl=/feedback');
  }

  return <FeedbackPageClient />;
}
