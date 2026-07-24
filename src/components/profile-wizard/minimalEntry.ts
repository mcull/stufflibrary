export interface MinimalEntryFields {
  name: string;
  agreedToTerms: boolean;
}

export function canSubmitMinimal(f: MinimalEntryFields): boolean {
  return Boolean(f.name && f.name.trim() && f.agreedToTerms);
}
