export interface MinimalEntryFields {
  name: string;
  agreedToHouseholdGoods: boolean;
  agreedToTrustAndCare: boolean;
  agreedToCommunityValues: boolean;
  agreedToAgeRestrictions: boolean;
  agreedToTerms: boolean;
}

export function canSubmitMinimal(f: MinimalEntryFields): boolean {
  return Boolean(
    f.name &&
      f.name.trim() &&
      f.agreedToHouseholdGoods &&
      f.agreedToTrustAndCare &&
      f.agreedToCommunityValues &&
      f.agreedToAgeRestrictions &&
      f.agreedToTerms
  );
}
