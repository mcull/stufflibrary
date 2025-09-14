# Test Assets

This directory contains assets used by end-to-end tests.

## Profile Creation Flow Test

The `profile-creation-flow.spec.ts` test creates test images dynamically using HTML5 Canvas, so no actual image files are needed. The test generates a simple synthetic image for testing profile photo upload functionality.

## Running the Tests

To run the complete profile creation flow test:

```bash
# Run all E2E tests
npm run test:e2e

# Run only the profile creation flow test
npx playwright test profile-creation-flow

# Run with UI for debugging
npm run test:e2e:ui
```

## Test Environment Requirements

For the full test experience, set these environment variables:

- `DATABASE_URL` - Required for database operations
- `GOOGLE_PLACES_API_KEY` - Optional, for testing address autocomplete
- `OPENAI_API_KEY` - Optional, for testing AI image verification

The test will skip features that don't have API keys configured and still test the core flow.

## What the Test Covers

The complete profile creation flow test covers:

1. **Authentication Flow**
   - Email input and code verification
   - Redirect to profile creation for new users

2. **Profile Wizard - Step 1 (Basic Info)**
   - Name and address input
   - Google Places address autocomplete (if API key provided)
   - Form validation
   - Step navigation

3. **Profile Wizard - Step 2 (Photo & Bio)**
   - Profile photo upload with synthetic test image
   - OpenAI image verification (if API key provided)
   - Bio text input with example text display
   - Form validation

4. **Profile Wizard - Step 3 (Review & Agreements)**
   - Profile summary display with photo
   - Four community guideline checkboxes
   - Terms of Service checkbox (disabled until guidelines checked)
   - Submit button state management

5. **Profile Creation & Redirect**
   - Profile data submission to API
   - Database record creation verification
   - Redirect to stacks with welcome message
   - Authentication persistence

6. **Additional Test Cases**
   - Form validation at each step
   - Navigation between steps with data persistence
   - Error handling for invalid inputs

This comprehensive test ensures the entire onboarding experience works end-to-end and will catch regressions in the future.
