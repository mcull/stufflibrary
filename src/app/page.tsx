import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import { Hero } from '@/components/Hero';
import { HowItWorks } from '@/components/HowItWorks';
import { InBeta } from '@/components/InBeta';
import { authOptions } from '@/lib/auth';

// Server component: signed-in visitors are redirected before anything paints,
// instead of the old client-side check that flashed an empty page (header +
// footer around nothing) for a beat or two on every visit to /.
export default async function Home() {
  const session = await getServerSession(authOptions);

  if (session?.user) {
    redirect('/stacks');
  }

  return (
    <>
      <Hero />
      <HowItWorks />
      <InBeta />
    </>
  );
}
