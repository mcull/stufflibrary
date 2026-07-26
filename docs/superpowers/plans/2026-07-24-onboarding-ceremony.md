# Onboarding Ceremony Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restage the two coldest onboarding moments as the library-card ceremony — the 6-digit code as a tactile "stamp" (paste-friendly cells, adaptive card framing, resend countdown), and the five profile-create checkboxes as one plain-language promise + a signature.

**Architecture:** Two presentational units. (A) The stamp — a new reusable `CodeCells` component wired into the sign-in code step, with adaptive copy and a resend countdown. (B) Sign-your-card — a new `SignYourCard` component replacing the five-checkbox `CommunityAgreements` with one promise + the name-as-signature, and the four never-persisted guideline booleans removed across the wizard.

**Tech Stack:** Next.js App Router, MUI, react-hook-form, Vitest + @testing-library/react.

**Spec:** `docs/superpowers/specs/2026-07-24-onboarding-ceremony-design.md`. **Branch:** `feat/onboarding-ceremony` (already created off `main`, spec committed). Husky prints a deprecation warning on commit — ignore it. Commit messages get a one-line `Why:` trailer plus the `Co-Authored-By:` line.

**Two scope corrections discovered during planning (both shrink the work):**

1. **The data/legal unit is already implemented.** `User.agreedTermsVersion String?` exists; `TERMS_VERSION = '2026-06-28'` is exported from `src/lib/capabilities.ts`; and both the minimal and full paths of `POST /api/profile` already stamp `agreedTermsVersion: TERMS_VERSION` alongside `agreedToTermsAt`. **No migration, no API change.** The sign-your-card screen just _displays_ the existing `TERMS_VERSION` label.
2. **There is no resend action on the code step today** — the only `send-code` call is on the email step. The resend + countdown is net-new (re-POST `/api/auth/send-code` with the current email).

Also: `maskEmail` lives in `src/lib/invite.ts`, which imports server-only modules — do **not** import it into the client sign-in page. Use a tiny local mask helper.

---

### Task 1: Baseline

**Files:** none modified.

- [ ] **Step 1: Confirm branch**

Run: `git branch --show-current`
Expected: `feat/onboarding-ceremony`

- [ ] **Step 2: Run the touched-area tests green as a baseline**

Run: `npx vitest run src/app/auth/signin/__tests__/page.test.tsx src/components/__tests__/profile-wizard-steps.test.ts src/components/__tests__/profile-submit-block.test.ts src/app/api/profile/__tests__/route.test.ts`
Expected: PASS. Note the counts; later tasks must not regress them.

---

### Task 2: The `CodeCells` component

**Files:**

- Create: `src/components/CodeCells.tsx`
- Test (create): `src/components/__tests__/CodeCells.test.tsx`

A self-contained controlled six-input component. No auth knowledge.

- [ ] **Step 1: Write the failing test**

Create `src/components/__tests__/CodeCells.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { CodeCells } from '../CodeCells';

function Harness({ onComplete }: { onComplete?: (v: string) => void }) {
  // Controlled wrapper mirroring how the sign-in page uses it.
  const React = require('react');
  const [value, setValue] = React.useState('');
  return (
    <CodeCells value={value} onChange={setValue} onComplete={onComplete} />
  );
}

describe('CodeCells', () => {
  it('renders six inputs', () => {
    render(<Harness />);
    expect(screen.getAllByRole('textbox')).toHaveLength(6);
  });

  it('typing a digit advances focus and builds the value', () => {
    const onComplete = vi.fn();
    render(<Harness onComplete={onComplete} />);
    const cells = screen.getAllByRole('textbox') as HTMLInputElement[];
    '508213'.split('').forEach((d, i) => {
      fireEvent.change(cells[i]!, { target: { value: d } });
    });
    expect(onComplete).toHaveBeenCalledWith('508213');
  });

  it('ignores non-digits', () => {
    const onComplete = vi.fn();
    render(<Harness onComplete={onComplete} />);
    const cells = screen.getAllByRole('textbox') as HTMLInputElement[];
    fireEvent.change(cells[0]!, { target: { value: 'a' } });
    expect(cells[0]!.value).toBe('');
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('pasting a 6-digit code fills all cells and completes', () => {
    const onComplete = vi.fn();
    render(<Harness onComplete={onComplete} />);
    const cells = screen.getAllByRole('textbox') as HTMLInputElement[];
    fireEvent.paste(cells[0]!, {
      clipboardData: { getData: () => '508213' },
    });
    expect(cells.map((c) => c.value).join('')).toBe('508213');
    expect(onComplete).toHaveBeenCalledWith('508213');
  });

  it('backspace on an empty cell moves focus to the previous cell', () => {
    render(<Harness />);
    const cells = screen.getAllByRole('textbox') as HTMLInputElement[];
    fireEvent.change(cells[0]!, { target: { value: '5' } });
    cells[1]!.focus();
    fireEvent.keyDown(cells[1]!, { key: 'Backspace' });
    expect(document.activeElement).toBe(cells[0]);
  });

  it('labels each cell for screen readers', () => {
    render(<Harness />);
    expect(screen.getByLabelText('Digit 1 of 6')).toBeInTheDocument();
    expect(screen.getByLabelText('Digit 6 of 6')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/__tests__/CodeCells.test.tsx`
Expected: FAIL — cannot resolve `../CodeCells`.

- [ ] **Step 3: Write the component**

Create `src/components/CodeCells.tsx`:

```tsx
'use client';

import { Box } from '@mui/material';
import { useRef } from 'react';

import { brandColors } from '@/theme/brandTokens';

export interface CodeCellsProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  length?: number;
}

// Six single-digit cells that behave like one field: type to advance, paste to
// fill, backspace to retreat. Emits the assembled string; knows nothing about
// auth. Value is the source of truth; each cell renders value[i].
export function CodeCells({
  value,
  onChange,
  onComplete,
  disabled,
  length = 6,
}: CodeCellsProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  const emit = (next: string) => {
    onChange(next);
    if (next.length === length && /^\d+$/.test(next)) onComplete?.(next);
  };

  const setCharAt = (index: number, char: string) => {
    const chars = value.padEnd(length, ' ').split('');
    chars[index] = char;
    return chars.join('').replace(/ /g, '').slice(0, length);
  };

  const handleChange = (index: number, raw: string) => {
    const digit = raw.replace(/\D/g, '').slice(-1); // last typed digit, or ''
    if (!digit) return; // non-digit ignored, cell stays empty
    const next = setCharAt(index, digit);
    emit(next);
    if (index < length - 1) refs.current[index + 1]?.focus();
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === 'Backspace') {
      if (!value[index] && index > 0) {
        refs.current[index - 1]?.focus();
      } else {
        emit(setCharAt(index, ''));
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const digits = e.clipboardData
      .getData('text')
      .replace(/\D/g, '')
      .slice(0, length);
    if (!digits) return;
    emit(digits);
    const focusAt = Math.min(digits.length, length - 1);
    refs.current[focusAt]?.focus();
  };

  return (
    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', mb: 3 }}>
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          aria-label={`Digit ${i + 1} of ${length}`}
          maxLength={1}
          disabled={disabled}
          value={value[i] ?? ''}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          style={{
            width: 44,
            height: 54,
            textAlign: 'center',
            fontSize: '1.5rem',
            fontFamily: 'monospace',
            color: brandColors.inkBlue,
            border: `2px solid ${brandColors.softGray}`,
            borderRadius: 8,
            background: brandColors.white,
            outline: 'none',
          }}
        />
      ))}
    </Box>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/__tests__/CodeCells.test.tsx`
Expected: PASS (6 tests).

- [ ] **Step 5: Typecheck + commit**

Run: `npx tsc --noEmit` (exit 0), then:

```bash
git add src/components/CodeCells.tsx src/components/__tests__/CodeCells.test.tsx
git commit -m "feat(onboarding): CodeCells — tactile paste-friendly 6-digit input

Six single-digit cells that behave like one field: type advances, paste
fills all six, backspace retreats, digits-only, per-cell aria labels. No
auth knowledge; wired into sign-in next.

Why: the 6-digit code is the flow's steepest step; make it a tactile stamp instead of a plain field

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: The stamp — wire CodeCells, adaptive framing, resend countdown

**Files:**

- Modify: `src/app/auth/signin/page.tsx` (the `step === 'code'` block: heading ~L339-371, the code `TextField` ~L392-436, add resend + countdown; and `handleEmailSubmit` success ~L168 to start the countdown)

`boundEmail` state already exists (set from `/api/invite/context`). `code`/`setCode` and `handleCodeSubmit` already exist.

- [ ] **Step 1: Add a local mask helper + resend/countdown state**

Near the top of the `SignInForm` component (after the existing `useState` declarations, e.g. after `boundEmail`), add:

```ts
const [resendSeconds, setResendSeconds] = useState(0);

// maskEmail lives in server-only invite.ts; this is the client-safe twin.
const maskEmailLocal = (raw: string): string => {
  const [local, domain] = raw.split('@');
  if (!local || !domain) return '•••';
  return `${local[0]}•••@${domain}`;
};
```

Add the countdown ticker effect alongside the other effects:

```ts
useEffect(() => {
  if (resendSeconds <= 0) return;
  const t = setInterval(
    () => setResendSeconds((s) => (s <= 1 ? 0 : s - 1)),
    1000
  );
  return () => clearInterval(t);
}, [resendSeconds]);
```

- [ ] **Step 2: Start the countdown when the code is first sent**

In `handleEmailSubmit`, in the success branch where it currently does `setStep('code');`, add the countdown start just before it:

```ts
      if (response.ok) {
        setResendSeconds(45);
        setStep('code');
```

- [ ] **Step 3: Add the resend handler**

Add near `handleCodeSubmit`:

```ts
const handleResend = async () => {
  if (resendSeconds > 0 || !email) return;
  try {
    await fetch('/api/auth/send-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
  } catch {
    // best-effort; the user can try again when the timer clears
  }
  setResendSeconds(45);
};
```

- [ ] **Step 4: Make the heading adaptive**

In the `step === 'code'` block, replace the heading + subcopy (the `<Typography ... >Enter your code</Typography>` and the following explanatory `<Typography>` that says "We emailed a sign-in button and a 6-digit code to {email}…", ~L339-371) with:

```tsx
<Typography
  variant="h4"
  component="h1"
  sx={{
    textAlign: 'center',
    mb: 2,
    fontWeight: 600,
    color: brandColors.charcoal,
    fontSize: { xs: '1.75rem', sm: '2rem' },
  }}
>
  {boundEmail ? 'We stamped your card' : 'Enter your code'}
</Typography>;

{
  boundEmail ? (
    <>
      <Box
        sx={{
          display: 'inline-flex',
          alignSelf: 'center',
          gap: 1,
          alignItems: 'center',
          mb: 2,
          px: 1.5,
          py: 0.5,
          borderRadius: 999,
          border: `1px solid ${brandColors.softGray}`,
          fontFamily: 'monospace',
          fontSize: '0.9rem',
          color: brandColors.inkBlue,
        }}
      >
        {maskEmailLocal(boundEmail)} 🔒
      </Box>
      <Typography
        variant="body1"
        sx={{
          textAlign: 'center',
          color: brandColors.charcoal,
          opacity: 0.8,
          mb: 4,
          lineHeight: 1.6,
        }}
      >
        The code&rsquo;s in your inbox — it&rsquo;s from a neighbor&rsquo;s
        library, so check Primary, not Promotions. No passwords here — your
        inbox is your key.
      </Typography>
    </>
  ) : (
    <Typography
      variant="body1"
      sx={{
        textAlign: 'center',
        color: brandColors.charcoal,
        opacity: 0.8,
        mb: 4,
        lineHeight: 1.6,
      }}
    >
      We emailed a sign-in button and a 6-digit code to{' '}
      <Box
        component="span"
        sx={{ fontWeight: 500, color: brandColors.inkBlue }}
      >
        {email}
      </Box>
      . Tap the button there, or enter the code here.
    </Typography>
  );
}
```

- [ ] **Step 5: Replace the single code field with CodeCells**

Add the import near the top (with the other `@/components` imports):

```ts
import { CodeCells } from '@/components/CodeCells';
```

In the `<Box component="form" onSubmit={handleCodeSubmit}>`, replace the code `<TextField ... />` (the one with `id="code"`, ~L393-436) with:

```tsx
<CodeCells
  value={code}
  onChange={setCode}
  onComplete={() => {
    if (!isLoading) {
      handleCodeSubmit(new Event('submit') as unknown as React.FormEvent);
    }
  }}
  disabled={isLoading}
/>
```

Note: `handleCodeSubmit` calls `e.preventDefault()`. Passing a synthetic `Event` with a no-op `preventDefault` is safe — but to be certain, in `handleCodeSubmit` guard the call: change `e.preventDefault();` to `e.preventDefault?.();`. Make that one-character-safe edit.

- [ ] **Step 6: Add the resend control with countdown**

Immediately before the existing "Back to email" `<Button>` (~L465), add:

```tsx
<Button
  variant="text"
  fullWidth
  onClick={handleResend}
  disabled={resendSeconds > 0}
  sx={{
    color: brandColors.inkBlue,
    textTransform: 'none',
    '&:hover': { backgroundColor: 'transparent' },
    '&.Mui-disabled': { color: brandColors.charcoal, opacity: 0.5 },
  }}
>
  {resendSeconds > 0
    ? `Re-stamp in ${Math.floor(resendSeconds / 60)}:${String(
        resendSeconds % 60
      ).padStart(2, '0')}`
    : 'Re-stamp — send a new code'}
</Button>
```

- [ ] **Step 7: Extend the sign-in tests**

Add to `src/app/auth/signin/__tests__/page.test.tsx` (match the file's existing mock/render setup — it already mocks `/api/invite/context`; read the top of the file first). Add tests asserting:

```tsx
it('shows the stamp framing and masked address for a bound invite', async () => {
  // Arrange the mock so /api/invite/context returns an email (bound invite),
  // following the file's existing pattern for that endpoint. Then drive the
  // UI to the code step (submit the email step) and assert:
  // - heading "We stamped your card" is shown
  // - the masked address (e.g. "d•••@example.com") is shown
  // - the raw invited local-part is NOT shown in full
});

it('shows neutral copy with no masked chip for a plain sign-in', async () => {
  // With /api/invite/context returning no email, drive to the code step and
  // assert the "Enter your code" heading renders and no masked chip appears.
});

it('disables resend and shows a countdown right after sending', async () => {
  // After submitting the email step, assert a control labelled /Re-stamp in/
  // is present and disabled.
});
```

Implement each using the file's established helpers (mocking `fetch`/`signIn`, `useSearchParams`). Keep assertions behavioral (heading text, masked string present, resend disabled). If driving `onComplete` auto-submit is awkward, assert on the rendered six inputs (`getAllByRole('textbox')` has length 6) instead.

- [ ] **Step 8: Run tests + typecheck**

Run: `npx vitest run src/app/auth/signin/__tests__/page.test.tsx && npx tsc --noEmit`
Expected: PASS / exit 0.

- [ ] **Step 9: Commit**

```bash
git add src/app/auth/signin/page.tsx src/app/auth/signin/__tests__/page.test.tsx
git commit -m "feat(onboarding): stage the code entry as a stamp

CodeCells replaces the single field; a bound invite gets the 'we
stamped your card' framing with a masked locked address and the
inbox-is-your-key line, while a plain sign-in keeps neutral copy. Adds a
resend control with a countdown.

Why: restage the steepest step as the library-card stamp — warm where it was a cold checkpoint

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: The `SignYourCard` component

**Files:**

- Create: `src/components/profile-wizard/SignYourCard.tsx`
- Test (create): `src/components/profile-wizard/__tests__/SignYourCard.test.tsx`

Renders inside the profile form (uses `useFormContext`): the library-card visual with the name field as the signature line, the four guidelines as inline text, and one promise checkbox mapping to `agreedToTerms`. This task only _reads/writes_ `name` and `agreedToTerms` — both survive the collapse in Task 5.

- [ ] **Step 1: Write the failing test**

Create `src/components/profile-wizard/__tests__/SignYourCard.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { FormProvider, useForm } from 'react-hook-form';

import { SignYourCard } from '../SignYourCard';
import { TERMS_VERSION } from '@/lib/capabilities';

function Harness() {
  const methods = useForm({
    defaultValues: { name: '', agreedToTerms: false },
  });
  return (
    <FormProvider {...methods}>
      <SignYourCard />
    </FormProvider>
  );
}

describe('SignYourCard', () => {
  it('offers one promise checkbox, not five', () => {
    render(<Harness />);
    expect(screen.getAllByRole('checkbox')).toHaveLength(1);
  });

  it('uses the two-sided promise copy', () => {
    render(<Harness />);
    expect(
      screen.getByText(/take care of the stuff I borrow/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/won.t lend anything irreplaceable/i)
    ).toBeInTheDocument();
  });

  it('shows the four guidelines as readable text', () => {
    render(<Harness />);
    expect(screen.getByText(/household goods/i)).toBeInTheDocument();
    expect(screen.getByText(/age-restricted/i)).toBeInTheDocument();
  });

  it('links terms and privacy and shows the version label', () => {
    render(<Harness />);
    const terms = screen.getByRole('link', { name: /terms/i });
    expect(terms).toHaveAttribute('href', '/terms');
    expect(screen.getByRole('link', { name: /privacy/i })).toHaveAttribute(
      'href',
      '/privacy'
    );
    expect(screen.getByText(new RegExp(TERMS_VERSION))).toBeInTheDocument();
  });

  it('renders a name/signature field', () => {
    render(<Harness />);
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/profile-wizard/__tests__/SignYourCard.test.tsx`
Expected: FAIL — cannot resolve `../SignYourCard`.

- [ ] **Step 3: Write the component**

Create `src/components/profile-wizard/SignYourCard.tsx`:

```tsx
'use client';

import {
  Box,
  Checkbox,
  FormControlLabel,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Controller, useFormContext } from 'react-hook-form';

import { TERMS_VERSION } from '@/lib/capabilities';
import { brandColors } from '@/theme/brandTokens';

import type { ProfileFormData } from '../ProfileWizard';

const GUIDELINES = [
  'Household goods only — nothing illegal, unsafe, or age-restricted (alcohol, tobacco, firearms, anything requiring ID).',
  'Take care of what you borrow; return it as you found it.',
  "Be kind — we're neighbors first.",
];

export function SignYourCard() {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<ProfileFormData>();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* The card: name entered here is the signature. */}
      <Box
        sx={{
          border: `1.5px solid ${brandColors.inkBlue}`,
          borderRadius: 2,
          p: 3,
          backgroundColor: brandColors.white,
        }}
      >
        <Typography
          sx={{
            fontFamily: 'monospace',
            fontSize: '0.75rem',
            letterSpacing: 2,
            color: brandColors.charcoal,
            opacity: 0.7,
            mb: 1.5,
          }}
        >
          LIBRARY CARD · SIGN TO ACTIVATE
        </Typography>
        <TextField
          {...register('name')}
          label="Your name"
          placeholder="Sign your name"
          error={!!errors.name}
          helperText={errors.name?.message}
          fullWidth
          variant="standard"
          sx={{
            '& .MuiInput-input': {
              fontFamily: 'cursive',
              fontSize: '1.4rem',
              color: brandColors.inkBlue,
            },
          }}
        />
      </Box>

      {/* The house rules, as readable text (not checkboxes). */}
      <Box>
        <Typography
          variant="subtitle2"
          sx={{ fontWeight: 600, color: brandColors.charcoal, mb: 1 }}
        >
          The house rules
        </Typography>
        <Stack component="ul" sx={{ pl: 2.5, m: 0, gap: 0.5 }}>
          {GUIDELINES.map((g) => (
            <Typography
              key={g}
              component="li"
              variant="body2"
              sx={{ color: brandColors.charcoal }}
            >
              {g}
            </Typography>
          ))}
        </Stack>
      </Box>

      {/* One promise. */}
      <Controller
        name="agreedToTerms"
        control={control}
        render={({ field: { onChange, value } }) => (
          <FormControlLabel
            control={
              <Checkbox
                checked={value || false}
                onChange={(e) => onChange(e.target.checked)}
                sx={{
                  color: brandColors.inkBlue,
                  '&.Mui-checked': { color: brandColors.inkBlue },
                }}
              />
            }
            label={
              <Box>
                <Typography
                  variant="body2"
                  sx={{ color: brandColors.charcoal }}
                >
                  I&rsquo;ll take care of the stuff I borrow, and won&rsquo;t
                  lend anything irreplaceable.
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: brandColors.charcoal, opacity: 0.7 }}
                >
                  Covers the house rules &amp; our{' '}
                  <Link href="/terms" target="_blank">
                    Terms
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" target="_blank">
                    Privacy Policy
                  </Link>{' '}
                  (v{TERMS_VERSION}).
                </Typography>
              </Box>
            }
          />
        )}
      />
    </Box>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/profile-wizard/__tests__/SignYourCard.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 5: Typecheck + commit**

Run: `npx tsc --noEmit` (exit 0), then:

```bash
git add src/components/profile-wizard/SignYourCard.tsx src/components/profile-wizard/__tests__/SignYourCard.test.tsx
git commit -m "feat(onboarding): SignYourCard — one promise + a signature

The library-card visual with the name field as the signature line, the
house rules as readable text, and one promise checkbox mapping to
agreedToTerms (terms/privacy linked, version shown). Swapped in for the
five checkboxes next.

Why: 'Your Library Card' promised a ritual and delivered five warnings; make it one signature

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Collapse the agreements — swap in SignYourCard, remove the four booleans

**Files:**

- Modify: `src/components/profile-wizard/wizardPlan.ts` (schema, ~L29-33)
- Modify: `src/components/profile-wizard/minimalEntry.ts`
- Modify: `src/components/ProfileWizard.tsx` (defaults ~L134-138, error map ~L89-93, handleComplete ~L252-256)
- Modify: `src/components/profile-wizard/ProfileStep1.tsx` (canStart ~L44-51, body ~L78-119)
- Delete: `src/components/profile-wizard/CommunityAgreements.tsx`

The four guideline booleans (`agreedToHouseholdGoods`, `agreedToTrustAndCare`, `agreedToCommunityValues`, `agreedToAgeRestrictions`) are removed everywhere; `agreedToTerms` stays. `CommunityAgreements` is imported only by `ProfileStep1`, so deleting it is safe once ProfileStep1 stops using it.

- [ ] **Step 1: Update `minimalEntry.ts`**

Replace the entire file with:

```ts
export interface MinimalEntryFields {
  name: string;
  agreedToTerms: boolean;
}

export function canSubmitMinimal(f: MinimalEntryFields): boolean {
  return Boolean(f.name && f.name.trim() && f.agreedToTerms);
}
```

- [ ] **Step 2: Update the zod schema in `wizardPlan.ts`**

Remove the four guideline lines from `profileFormSchema` (keep `agreedToTerms: z.boolean()`):

```ts
  agreedToHouseholdGoods: z.boolean(),
  agreedToTrustAndCare: z.boolean(),
  agreedToCommunityValues: z.boolean(),
  agreedToAgeRestrictions: z.boolean(),
```

Delete those four lines. Leave `agreedToTerms: z.boolean(),` in place.

- [ ] **Step 3: Update `ProfileWizard.tsx` — defaults, error map, handleComplete**

(a) Defaults (~L134-138): delete the four `agreedTo…: false,` lines, keep `agreedToTerms: false,`.

(b) Error map (`getFieldErrorMessage`, ~L89-93): replace

```ts
  if (
    errors.agreedToHouseholdGoods ||
    errors.agreedToTrustAndCare ||
    errors.agreedToCommunityValues ||
    errors.agreedToAgeRestrictions ||
    errors.agreedToTerms
  ) {
    return 'Please accept the community agreements to continue.';
```

with

```ts
  if (errors.agreedToTerms) {
    return 'Please sign your card to continue.';
```

(c) `handleComplete` (~L252-256): replace

```ts
if (
  !data.agreedToHouseholdGoods ||
  !data.agreedToTrustAndCare ||
  !data.agreedToCommunityValues ||
  !data.agreedToAgeRestrictions ||
  !data.agreedToTerms
) {
  // The agreements live on Step 1; surface the reason rather than
  // silently no-op'ing (which reads as a dead "Complete Profile" button).
  setSubmitError('Please accept the community agreements to continue.');
  return;
}
```

with

```ts
if (!data.agreedToTerms) {
  // The promise lives on Step 1; surface the reason rather than silently
  // no-op'ing (which reads as a dead "Complete Profile" button).
  setSubmitError('Please sign your card to continue.');
  return;
}
```

- [ ] **Step 4: Update `ProfileStep1.tsx` — gating + swap the body**

(a) Replace the `canStart` block (~L44-51):

```ts
const values = watch();
const canStart = canSubmitMinimal({
  name: values.name ?? '',
  agreedToHouseholdGoods: !!values.agreedToHouseholdGoods,
  agreedToTrustAndCare: !!values.agreedToTrustAndCare,
  agreedToCommunityValues: !!values.agreedToCommunityValues,
  agreedToAgeRestrictions: !!values.agreedToAgeRestrictions,
  agreedToTerms: !!values.agreedToTerms,
});
```

with

```ts
const values = watch();
const canStart = canSubmitMinimal({
  name: values.name ?? '',
  agreedToTerms: !!values.agreedToTerms,
});
```

(b) Swap the imports: remove `import { CommunityAgreements } from './CommunityAgreements';` and add `import { SignYourCard } from './SignYourCard';`.

(c) Replace the step content `<Box sx={{ mb: 4 }}>…</Box>` — the block that renders the "Let's start with the basics" heading, the "A photo and your address can come later." subcopy, the name `<TextField>`, and `<CommunityAgreements />` (~L56-120) — with:

```tsx
{
  /* Step Content */
}
<Box sx={{ mb: 4 }}>
  <Typography
    variant="h5"
    sx={{ fontWeight: 600, color: brandColors.charcoal, mb: 2 }}
  >
    Sign your card
  </Typography>
  <Typography
    variant="body1"
    sx={{ color: brandColors.charcoal, opacity: 0.7, mb: 4 }}
  >
    You&rsquo;re in. One signature makes it official — a photo and your address
    can come later.
  </Typography>

  <SignYourCard />
</Box>;
```

Note: `SignYourCard` now owns the name field, so the old standalone name `<TextField {...register('name')}>` is removed here (it moved into the card). The `register`, `watch`, `errors` from `useFormContext` in `ProfileStep1` stay (still used by `canStart` and, if the linter flags an now-unused `register`, remove only what's genuinely unused — `Person`/`TextField`/`ArrowForward` imports that are no longer referenced should be dropped to keep lint clean).

- [ ] **Step 5: Delete `CommunityAgreements.tsx`**

```bash
git rm src/components/profile-wizard/CommunityAgreements.tsx
```

- [ ] **Step 6: Typecheck, lint, and run the wizard tests**

Run: `npx tsc --noEmit && npx eslint src/components/profile-wizard/ProfileStep1.tsx src/components/ProfileWizard.tsx`
Expected: exit 0 / no errors. Fix any now-unused imports in `ProfileStep1.tsx` (e.g. `Person`, `ArrowForward` may still be used by the CTAs — only remove genuinely unused ones; `tsc`/eslint will tell you).

Run: `npx vitest run src/components/__tests__/profile-wizard-steps.test.ts src/components/__tests__/profile-submit-block.test.ts`
Expected: PASS. If a test references the removed four booleans or `CommunityAgreements`, update it to the new single-promise contract (assert one checkbox / `canSubmitMinimal` with `{ name, agreedToTerms }`). Show the change; keep the assertions meaningful.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(onboarding): collapse the five checkboxes into one promise

ProfileStep1 renders SignYourCard; the four never-persisted guideline
booleans are removed from the schema, wizard, and minimal-entry gate,
leaving name + the single agreedToTerms promise. CommunityAgreements is
retired.

Why: same coverage (terms + house rules linked and versioned), one-fifth the dread

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Final verification and PR

**Files:** none modified (unless verification finds regressions).

- [ ] **Step 1: Full unit suite**

Run: `npm run test:unit 2>&1 | tail -8`
Expected: no failures beyond any pre-existing ones. If a test elsewhere referenced the removed four booleans or `CommunityAgreements`, fix it to the single-promise contract and note it.

- [ ] **Step 2: Lint and typecheck**

Run: `npm run lint && npx tsc --noEmit`
Expected: clean (only pre-existing `any` warnings).

- [ ] **Step 3: Push and open the PR**

```bash
git push -u origin feat/onboarding-ceremony
```

Open a PR to `main` titled `feat(invites): the onboarding ceremony — the stamp & sign-your-card`. Body: summarize the CodeCells stamp (adaptive framing, resend countdown), the one-promise SignYourCard (name-as-signature, guidelines inline, terms/privacy linked + versioned), and that the four guideline booleans were removed as never-persisted UI gates. Note the data/legal record was already versioned (`agreedTermsVersion`/`TERMS_VERSION`) so there's no migration, and that scope stayed to the two screens. Link the spec. End the body with:

```
Field-Note-Why:         §6.5/§6.6 — the code was the steepest step and the five checkboxes the coldest wall; both got restaged as the library-card ceremony
Field-Note-Interesting: the legal record was already one versioned affirmation (agreedTermsVersion), so collapsing five checkboxes to one promise touched only the UI gate — the four guideline booleans were never persisted
Field-Note-Deferred:    the arrival screen (welcome-in, unmask people) — sub-project D

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

- [ ] **Step 4: Manual check (human, on preview)**

Click a bound invite through to sign-in: confirm "We stamped your card" + the masked address, that pasting the emailed code fills all six cells, and the resend countdown ticks. Continue to profile: confirm one promise + the signature name field, the house rules as text, the terms/privacy links, and that "Get started" is enabled once you sign your name + check the one box.
