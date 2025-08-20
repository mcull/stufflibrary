'use client';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Suspense, useEffect, useState } from 'react';

import { ProfileCreationHandler } from './ProfileCreationHandler';

export default function CreateProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [retryCount, setRetryCount] = useState(0);
  const [isWaiting, setIsWaiting] = useState(true);
  const [checkedProfile, setCheckedProfile] = useState(false);

  useEffect(() => {
    if (status === 'loading') {
      return; // Still loading
    }

    if (status === 'unauthenticated' && retryCount < 3) {
      // Session not ready yet, wait a bit and retry
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
      }, 1000);
      return;
    }

    if (status === 'unauthenticated' && retryCount >= 3) {
      router.push('/auth/signin');
      return;
    }

    if (status === 'authenticated' && session?.user && !checkedProfile) {
      // Safety net: if profile already completed, send to dashboard
      (async () => {
        try {
          const resp = await fetch('/api/profile', { method: 'GET' });
          if (resp.ok) {
            const data = await resp.json();
            if (data?.user?.profileCompleted) {
              router.replace('/dashboard');
              return;
            }
          }
        } catch {
          // ignore
        } finally {
          setCheckedProfile(true);
          setIsWaiting(false);
        }
      })();
    }
  }, [session, status, router, retryCount, checkedProfile]);

  if (status === 'loading' || isWaiting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {retryCount > 0 ? `Connecting... (${retryCount}/3)` : 'Loading your profile...'}
          </p>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return null; // Will redirect via useEffect
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProfileCreationHandler />
    </Suspense>
  );
}
