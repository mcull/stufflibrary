'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Suspense } from 'react';
import { useEffect, useState } from 'react';

import { brandColors } from '@/theme/brandTokens';

function AuthCallbackContent() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const [isRedirecting, setIsRedirecting] = useState(false);

  const invitationToken = searchParams.get('invitation');
  const libraryId = searchParams.get('library');
  // Helper to read invite cookies (set by /invite/[token])
  const getCookie = (name: string) =>
    `; ${document.cookie}`.split(`; ${name}=`).pop()?.split(';')?.[0];

  useEffect(() => {
    if (status === 'loading' || isRedirecting) return;

    if (!session?.user) {
      router.replace('/auth/signin');
      return;
    }

    const handleRedirect = async () => {
      setIsRedirecting(true);

      try {
        // Fetch user profile data
        const response = await fetch('/api/profile');
        if (!response.ok) {
          throw new Error('Failed to fetch profile');
        }

        const data = await response.json();
        const user = data.user;

        // Handle invitation flow from query params (legacy path)
        if (invitationToken && libraryId && user) {
          if (user.profileCompleted) {
            const firstName = user.name?.split(' ')[0] || '';
            const welcomeUrl = new URL(
              `/library/${libraryId}`,
              window.location.origin
            );
            welcomeUrl.searchParams.set('message', 'joined_successfully');
            if (firstName) {
              welcomeUrl.searchParams.set('welcomeName', firstName);
            }
            router.replace(welcomeUrl.pathname + welcomeUrl.search);
            return;
          } else {
            router.replace(
              `/profile/create?invitation=${invitationToken}&library=${libraryId}`
            );
            return;
          }
        }

        // Handle invite cookie flow (guest pass): redirect to collection
        const inviteLibrary = getCookie('invite_library');
        const inviteToken = getCookie('invite_token');
        if (inviteLibrary && inviteToken) {
          // Always prefer dropping into the invited collection over profile flows
          router.replace(`/collection/${inviteLibrary}`);
          return;
        }

        // Normal flow based on profile completion
        if (user?.profileCompleted) {
          router.replace('/stacks');
        } else {
          router.replace('/profile/create');
        }
      } catch (error) {
        console.error('Callback redirect error:', error);
        // Fallback to profile creation
        router.replace('/profile/create');
      }
    };

    handleRedirect();
  }, [session, status, router, invitationToken, libraryId, isRedirecting]);

  // Minimal loading state - no white flash
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: brandColors.warmCream,
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            width: '32px',
            height: '32px',
            border: `3px solid ${brandColors.inkBlue}`,
            borderTop: '3px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px',
          }}
        />
        <p
          style={{
            color: brandColors.charcoal,
            fontSize: '16px',
            margin: 0,
          }}
        >
          Signing you in...
        </p>
      </div>
      <style jsx>{`
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: brandColors.warmCream,
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                border: `3px solid ${brandColors.inkBlue}`,
                borderTop: '3px solid transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 16px',
              }}
            />
            <p
              style={{
                color: brandColors.charcoal,
                fontSize: '16px',
                margin: 0,
              }}
            >
              Loading...
            </p>
          </div>
          <style jsx>{`
            @keyframes spin {
              0% {
                transform: rotate(0deg);
              }
              100% {
                transform: rotate(360deg);
              }
            }
          `}</style>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
