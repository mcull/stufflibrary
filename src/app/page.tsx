'use client';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect } from 'react';

import { FeatureShowcase } from '@/components/FeatureShowcase';
import { Hero } from '@/components/Hero';
import { HowItWorks } from '@/components/HowItWorks';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      router.replace('/lobby');
    }
  }, [session, status, router]);

  // Show loading or nothing while checking authentication
  if (status === 'loading') {
    return null;
  }

  // If user is authenticated, they'll be redirected, so don't show content
  if (status === 'authenticated') {
    return null;
  }

  // Only show homepage content for unauthenticated users
  return (
    <>
      <Hero />
      <FeatureShowcase />
      <HowItWorks />
    </>
  );
}
