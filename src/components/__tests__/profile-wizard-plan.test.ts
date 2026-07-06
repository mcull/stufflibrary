import { describe, it, expect } from 'vitest';

import {
  wizardStepPlan,
  profileSchemaFor,
  continuationStepIndex,
} from '../profile-wizard/wizardPlan';

const agreements = {
  agreedToHouseholdGoods: true,
  agreedToTrustAndCare: true,
  agreedToCommunityValues: true,
  agreedToAgeRestrictions: true,
  agreedToTerms: true,
};

describe('wizardStepPlan', () => {
  it('runs all three steps when no verified address is on file', () => {
    expect(wizardStepPlan({ hasVerifiedAddress: false })).toEqual([
      'entry',
      'photo',
      'address',
    ]);
  });

  it('skips the address step when a verified address already exists', () => {
    expect(wizardStepPlan({ hasVerifiedAddress: true })).toEqual([
      'entry',
      'photo',
    ]);
  });
});

describe('profileSchemaFor', () => {
  it('requires an address when none is on file', () => {
    const parsed = profileSchemaFor({ hasVerifiedAddress: false }).safeParse({
      name: 'Jo',
      ...agreements,
    });
    expect(parsed.success).toBe(false);
  });

  it('lets a submit omit the address when a verified one exists', () => {
    const parsed = profileSchemaFor({ hasVerifiedAddress: true }).safeParse({
      name: 'Jo',
      ...agreements,
    });
    expect(parsed.success).toBe(true);
  });
});

describe('continuationStepIndex', () => {
  const fullPlan = wizardStepPlan({ hasVerifiedAddress: false });
  const shortPlan = wizardStepPlan({ hasVerifiedAddress: true });

  it('honors an explicit field request', () => {
    expect(
      continuationStepIndex(fullPlan, {
        requestedField: 'address',
        hasPhoto: false,
      })
    ).toBe(2);
    expect(
      continuationStepIndex(fullPlan, {
        requestedField: 'photo',
        hasPhoto: true,
      })
    ).toBe(1);
  });

  it('defaults to the first thing still missing', () => {
    expect(
      continuationStepIndex(fullPlan, { requestedField: null, hasPhoto: false })
    ).toBe(1);
    expect(
      continuationStepIndex(fullPlan, { requestedField: null, hasPhoto: true })
    ).toBe(2);
  });

  it('never points past the plan when the address step is skipped', () => {
    expect(
      continuationStepIndex(shortPlan, {
        requestedField: 'address',
        hasPhoto: false,
      })
    ).toBe(1);
    expect(
      continuationStepIndex(shortPlan, { requestedField: null, hasPhoto: true })
    ).toBe(1);
  });
});
