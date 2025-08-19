import { AnimatedStuffSharing } from '@/components/AnimatedStuffSharing';
import { FAQ } from '@/components/FAQ';
import { FeatureShowcase } from '@/components/FeatureShowcase';
import { FinalCTA } from '@/components/FinalCTA';
import { Hero } from '@/components/Hero';
import { HowItWorks } from '@/components/HowItWorks';
import { SocialProof } from '@/components/SocialProof';

export default function Home() {
  return (
    <>
      <AnimatedStuffSharing />
      <Hero />
      <FeatureShowcase />
      <HowItWorks />
      <SocialProof />
      <FAQ />
      <FinalCTA />
    </>
  );
}
