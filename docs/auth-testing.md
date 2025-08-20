# Auth Code Flow Testing Strategy

This document outlines the comprehensive testing strategy for the auth code authentication flow to prevent regressions and ensure reliability.

## Overview

The auth code flow replaces magic links with 6-digit numeric codes (like Slack), providing better mobile UX with auto-suggestion capabilities while maintaining security.

## Test Coverage

### 1. Unit Tests (`src/lib/__tests__/`)

#### Auth Codes (`auth-codes.test.ts`)
- **Code Generation**: Ensures 6-digit numeric codes are generated correctly
- **Code Verification**: Tests valid/invalid/expired code scenarios  
- **Email Sending**: Verifies integration with Resend email service
- **Database Operations**: Tests CRUD operations for auth codes

#### Rate Limiting (`rate-limit.test.ts`)  
- **Limit Enforcement**: Verifies requests are blocked after limit reached
- **Token Isolation**: Ensures different users have separate limits
- **Reset Functionality**: Tests clearing limits after successful auth
- **Concurrent Requests**: Handles race conditions properly

#### API Endpoints (`src/app/api/auth/send-code/__tests__/route.test.ts`)
- **Input Validation**: Email format validation and sanitization
- **Rate Limiting Integration**: API-level rate limit enforcement
- **Error Handling**: Network failures, service errors
- **Success Flows**: Proper response formatting

### 2. Integration Tests (`tests/`)

#### End-to-End Auth Flow (`auth-code-flow.spec.ts`)
- **Complete Flow**: Email → Code → Authentication → Redirect
- **Error Scenarios**: Invalid codes, expired codes, network errors
- **UI Interactions**: Form validation, loading states, error messages
- **Database State**: Verifies proper cleanup of auth codes

#### Session Management (`session-management.spec.ts`)  
- **Session Persistence**: Maintains auth across page reloads
- **Session Expiration**: Handles expired sessions gracefully
- **Multiple Sessions**: Supports concurrent user sessions
- **Security**: Proper session cleanup and isolation

### 3. Regression Test Suite (`scripts/test-auth-regression.sh`)

Automated script that runs all auth-related tests to catch regressions:

```bash
npm run test:auth-regression
```

**What it tests:**
- All unit tests pass
- All integration tests pass  
- Performance requirements met (< 10s auth flow)
- Database operations work correctly
- Email service integration functional

## Testing Strategy

### Manual Testing Checklist

When making auth-related changes, verify:

1. **Email Step**:
   - [ ] Valid emails accepted
   - [ ] Invalid emails rejected
   - [ ] Email trimmed and lowercased
   - [ ] Loading state shown during send
   - [ ] Error messages display correctly

2. **Code Step**:
   - [ ] 6-digit code input works
   - [ ] Submit disabled until 6 digits entered
   - [ ] Valid codes authenticate successfully
   - [ ] Invalid codes show error message
   - [ ] Expired codes rejected
   - [ ] "Back to email" button works

3. **Post-Authentication**:
   - [ ] Redirects to profile creation page
   - [ ] Session persists across page reloads
   - [ ] User record created in database
   - [ ] Auth code cleaned up from database
   - [ ] Rate limits cleared on success

4. **Rate Limiting**:
   - [ ] 5 attempts allowed per 10 minutes
   - [ ] 6th attempt blocked with error message
   - [ ] Different emails have separate limits
   - [ ] Limits cleared after successful auth

### Automated Testing

**Local Development:**
```bash
# Run unit tests only
npm run test:unit

# Run E2E tests only  
npm run test:e2e

# Run full regression suite
npm run test:auth-regression
```

**CI/CD Integration:**
The regression test suite should be run:
- On every PR that touches auth-related code
- Before production deployments
- Daily as a smoke test

### Test Data Management

**Unit Tests:** Use mocks and stubs, no real database
**Integration Tests:** Use test database with cleanup between tests
**Regression Suite:** Includes database setup and teardown

### Performance Testing

The regression suite includes performance tests:
- Auth flow must complete within 10 seconds
- Rate limiting must not impact normal usage
- Database queries optimized for auth operations

## Common Issues & Solutions

### Issue: Tests failing due to missing environment variables
**Solution:** The regression script sets sensible defaults, but ensure these are set:
```bash
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="your-secret"
RESEND_API_KEY="your-key" 
```

### Issue: Port 3000 already in use during tests
**Solution:** Stop development server before running regression tests:
```bash
# Kill any process on port 3000
lsof -ti:3000 | xargs kill -9
npm run test:auth-regression
```

### Issue: Database connection errors in tests
**Solution:** Ensure test database exists and is accessible:
```bash
npx prisma db push
npx prisma generate
```

## Adding New Tests

When adding auth-related features:

1. **Add Unit Tests** for new utility functions
2. **Add Integration Tests** for new user flows  
3. **Update Regression Suite** if new failure modes possible
4. **Update Manual Checklist** for new UI elements

### Test File Naming

- Unit tests: `*.test.ts` next to source files
- Integration tests: `*.spec.ts` in `/tests` directory
- Test utilities: `test-utils.ts` or `setup.ts`

## Security Testing

**Covered by tests:**
- Auth codes expire after 10 minutes
- Codes are single-use (deleted after verification)
- Rate limiting prevents brute force attacks
- Sessions have proper expiration
- No sensitive data logged or exposed

**Manual security checklist:**
- [ ] Auth codes not visible in browser network tab
- [ ] Session tokens are httpOnly
- [ ] No auth state persisted in localStorage
- [ ] Error messages don't leak sensitive info

## Monitoring & Alerting

In production, monitor:
- Auth flow completion rates
- Rate limiting trigger frequency  
- Session creation/cleanup
- Email delivery success rates

Set up alerts for:
- Auth flow success rate < 95%
- Unusual rate limiting patterns
- Email service failures
- Database auth table growth (indicates cleanup issues)

---

This testing strategy ensures the auth code flow is reliable, secure, and provides good user experience while preventing regressions during development.