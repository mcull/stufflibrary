'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Suspense } from 'react';
import { useEffect, useState } from 'react';

import { hasMinimalProfile } from '@/lib/capabilities';
import { brandColors } from '@/theme/brandTokens';

function AuthCallbackContent() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const [isRedirecting, setIsRedirecting] = useState(false);

  const invitationToken = searchParams.get('invitation');
  const libraryId = searchParams.get('library');
  // Client cookie reader no longer used; invite handling is server-side

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

        // A "minimal" profile (name + accepted terms) is enough to enter the app.
        const minimalDone = user
          ? hasMinimalProfile({
              name: user.name ?? null,
              agreedToTermsAt: user.agreedToTermsAt ?? null,
            })
          : false;

        // Handle invitation flow from query params (legacy path)
        if (invitationToken && libraryId && user) {
          // Intentional: the library welcome flow requires a full profile; revisit when the wizard split (Task 11) lands.
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

        // Handle invite cookie flow server-side: create membership and decide destination
        try {
          const consumeRes = await fetch('/api/invite/consume', {
            method: 'POST',
          });
          if (consumeRes.ok) {
            const body = await consumeRes.json().catch(
              () =>
                ({}) as {
                  redirect?: string;
                  error?: string;
                  invitedEmail?: string;
                }
            );
            if (body?.error === 'invite_bound_to_other_email') {
              router.replace(
                `/?invite=wrong_account&invited=${encodeURIComponent(
                  body.invitedEmail ?? ''
                )}`
              );
              return;
            }
            if (
              body?.error === 'invite_expired' ||
              body?.error === 'invite_invalid'
            ) {
              router.replace('/?invite=expired');
              return;
            }
            if (body?.redirect) {
              const dest = body.redirect as string;
              if (minimalDone) {
                router.replace(dest);
              } else {
                const returnTo = encodeURIComponent(dest);
                router.replace(`/profile/create?returnTo=${returnTo}`);
              }
              return;
            }
          }
        } catch {
          // ignore and continue
        }

        // Normal flow based on minimal onboarding completion
        if (minimalDone) {
          router.replace('/home');
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
