import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import { Hero } from '@/components/Hero';
import { HowItWorks } from '@/components/HowItWorks';
import { InBeta } from '@/components/InBeta';
import {
  InviteNotice,
  type InviteNoticeStatus,
} from '@/components/InviteNotice';
import { authOptions } from '@/lib/auth';
import { maskedInvitedAddressFromCookies } from '@/lib/invite-notice';

const INVITE_STATUSES: InviteNoticeStatus[] = [
  'wrong_account',
  'invalid',
  'expired',
  'error',
];

// Server component: signed-in visitors are redirected before anything paints,
// instead of the old client-side check that flashed an empty page (header +
// footer around nothing) for a beat or two on every visit to /.
export default async function Home({
  searchParams,
}: {
  // Next's generated PageProps constraint rejects an optional props object, so
  // the param itself must not be defaultable — only the promise's contents are
  // optional. `npm run typecheck` does not catch this; only `npm run build`
  // does, because the constraint lives in generated .next/types.
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = (await searchParams)?.invite;
  const status = INVITE_STATUSES.find((s) => s === raw);

  // Every refused invitation lands here, and a refused invitee is signed in as
  // themselves — so this has to come before the /home redirect, or the
  // explanation never paints. The address comes off the cookie, not the URL.
  if (status) {
    return (
      <InviteNotice
        status={status}
        maskedEmail={await maskedInvitedAddressFromCookies()}
      />
    );
  }

  const session = await getServerSession(authOptions);

  if (session?.user) {
    redirect('/home');
  }

  return (
    <>
      <Hero />
      <HowItWorks />
      <InBeta />
    </>
  );
}
