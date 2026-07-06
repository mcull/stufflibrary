import { z } from 'zod';

// Pure module (zod only — no side-effectful imports) so the wizard's step and
// validation decisions are testable. See the pure-modules house rule.

export const profileFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  address: z.string().min(1, 'Address is required to find your neighbors'),
  bio: z.string().optional(),
  // Optional at the schema level: photo and address are solicited as separate
  // steps, so a focused "add address only" edit can submit without a File
  // (the photo step's button gating + capability checks enforce having one for
  // full-profile actions). When present it must be a valid image.
  profilePicture: z
    .instanceof(File)
    .refine(
      (file) => file.size <= 10 * 1024 * 1024, // 10MB limit
      'Profile picture must be less than 10MB'
    )
    .refine(
      (file) =>
        ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(
          file.type
        ),
      'Profile picture must be a JPEG, PNG, or WebP image'
    )
    .optional(),
  profilePictureUrl: z.string().optional(),
  agreedToHouseholdGoods: z.boolean(),
  agreedToTrustAndCare: z.boolean(),
  agreedToCommunityValues: z.boolean(),
  agreedToAgeRestrictions: z.boolean(),
  agreedToTerms: z.boolean(),
  // Store parsed address data from Google Places
  parsedAddress: z.any().optional(),
});

export type ProfileFormData = z.infer<typeof profileFormSchema>;

export type WizardStepKey = 'entry' | 'photo' | 'address';

/**
 * Which steps the wizard runs. A user with a verified address on file never
 * sees the address step again — the API keeps their current address when a
 * full submit arrives without one.
 */
export function wizardStepPlan(opts: {
  hasVerifiedAddress: boolean;
}): WizardStepKey[] {
  return opts.hasVerifiedAddress
    ? ['entry', 'photo']
    : ['entry', 'photo', 'address'];
}

/** The form schema matching the plan: address optional when already on file. */
export function profileSchemaFor(opts: { hasVerifiedAddress: boolean }) {
  return opts.hasVerifiedAddress
    ? profileFormSchema.extend({ address: z.string().optional() })
    : profileFormSchema;
}

/**
 * Where a just-in-time continuation (?continue=1[&field=…]) should land:
 * the explicitly requested step when it's in the plan, otherwise the first
 * thing still missing. Never an index outside the plan.
 */
export function continuationStepIndex(
  plan: WizardStepKey[],
  opts: { requestedField?: string | null; hasPhoto: boolean }
): number {
  if (opts.requestedField === 'address' && plan.includes('address')) {
    return plan.indexOf('address');
  }
  if (opts.requestedField === 'photo') {
    return plan.indexOf('photo');
  }
  if (opts.hasPhoto && plan.includes('address')) {
    return plan.indexOf('address');
  }
  return plan.indexOf('photo');
}
