'use client';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Suspense, useEffect } from 'react';

import { ProfileCreationHandler } from './ProfileCreationHandler';

export default function CreateProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    // Simple redirect for unauthenticated users - no retry logic needed
    if (status === 'unauthenticated') {
      router.replace('/auth/signin');
    }
  }, [status, router]);

  // Show loading only during initial session load
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
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
