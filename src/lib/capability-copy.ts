import type { CapabilityReason } from './capabilities';

export interface CapabilityCopy {
  title: string;
  body: string;
  cta: string;
  href?: string;
}

const PROFILE_HREF = '/profile/create?continue=1';

export function capabilityCopy(reason: CapabilityReason): CapabilityCopy {
  switch (reason) {
    case 'NEEDS_NAME':
      return {
        title: 'Add your name',
        body: 'Tell us your name to continue.',
        cta: 'Finish profile',
        href: PROFILE_HREF,
      };
    case 'NEEDS_TERMS':
      return {
        title: 'Accept the community terms',
        body: 'Review and accept the terms to continue.',
        cta: 'Review terms',
        href: PROFILE_HREF,
      };
    // Lending, borrowing, and creating a library all require a full profile —
    // both a photo and a verified address. Even though a single reason names
    // the first missing piece, the prompt names the whole ask so the user
    // isn't surprised by a second step.
    case 'NEEDS_PHOTO':
      return {
        title: 'Finish your profile first',
        body: 'Add a profile photo and verify your address so neighbors know who they are sharing with. It only takes a minute.',
        cta: 'Finish profile',
        href: PROFILE_HREF,
      };
    case 'NEEDS_ADDRESS':
      return {
        title: 'Verify your address',
        body: 'Add your verified address (and a photo, if you have not yet) so we can connect you with nearby neighbors.',
        cta: 'Finish profile',
        href: PROFILE_HREF,
      };
    case 'NEEDS_TRUST_TIER':
      return {
        title: 'Not yet available',
        body: 'You can invite others once you reach the Trusted tier by completing a few successful borrows.',
        cta: 'Got it',
      };
    case 'AT_BORROW_LIMIT':
      return {
        title: 'Borrow limit reached',
        body: 'Return one of your current items before borrowing more. Your limit grows as you build trust.',
        cta: 'Got it',
      };
  }
}
