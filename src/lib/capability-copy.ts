import type { CapabilityReason } from './capabilities';

export interface CapabilityCopy {
  title: string;
  body: string;
  cta: string;
  href?: string;
}

const PROFILE_HREF = '/profile/create?continue=1';

/**
 * `reason` is the first missing piece; `missing` (when provided) is the full
 * gap set from `Capabilities.missingProfileFacts`, so the prompt can name only
 * what's actually left instead of re-asking for things the user already has.
 * Without `missing` the photo copy stays conservative and names the whole ask.
 */
export function capabilityCopy(
  reason: CapabilityReason,
  missing?: CapabilityReason[]
): CapabilityCopy {
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
    case 'NEEDS_PHOTO':
      // Only the photo is left → ask for just that. Otherwise (address also
      // missing, or we weren't told) name the whole ask so the user isn't
      // surprised by a second step.
      if (missing && !missing.includes('NEEDS_ADDRESS')) {
        return {
          title: 'Add a profile photo',
          body: 'Add a profile photo so neighbors know who they are sharing with. It only takes a minute.',
          cta: 'Add photo',
          href: `${PROFILE_HREF}&field=photo`,
        };
      }
      return {
        title: 'Finish your profile first',
        body: 'Add a profile photo and verify your address so neighbors know who they are sharing with. It only takes a minute.',
        cta: 'Finish profile',
        href: PROFILE_HREF,
      };
    // NEEDS_ADDRESS is only ever the reason when everything before it (name,
    // terms, photo) is already in place, so ask for the address alone.
    case 'NEEDS_ADDRESS':
      return {
        title: 'Verify your address',
        body: 'Add your verified address so we can connect you with nearby neighbors.',
        cta: 'Add address',
        href: `${PROFILE_HREF}&field=address`,
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
