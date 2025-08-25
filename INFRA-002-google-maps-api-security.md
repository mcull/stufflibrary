# INFRA-002: Secure Google Maps API Key Management

**Priority**: HIGH
**Status**: TODO
**Type**: Security Enhancement

## Problem Statement

Currently no Google Maps API integration exists, but when implemented, proper API key security is critical to prevent:

1. **API Key Abuse**: Unrestricted keys can be stolen and used maliciously
2. **Billing Attacks**: Attackers can generate expensive API usage
3. **Service Disruption**: Quota exhaustion can break the application
4. **Security Exposure**: Single key for all environments increases risk

## Recommended Architecture

### Environment-Specific API Keys

**Development Key:**
- Less restrictive for flexibility
- HTTP referrer restrictions for localhost + preview domains
- Lower quotas to prevent runaway costs

**Production Key:**
- Highly restrictive
- Locked to exact production domain(s)
- Higher quotas for production traffic
- Enhanced monitoring

## Required Implementation

### 1. Create Separate Google Cloud API Keys

**Development Key Configuration:**
```bash
# Application restrictions: HTTP referrers
# Website restrictions:
localhost:3000/*
localhost:3001/*  
localhost:*/*
127.0.0.1:*/*
*.vercel.app/*          # Preview deployments

# API restrictions:
- Places API (New)
- Geocoding API
- Maps JavaScript API (if needed)

# Quotas:
- 1,000 requests/day (development limit)
```

**Production Key Configuration:**
```bash
# Application restrictions: HTTP referrers  
# Website restrictions:
stufflibrary.com/*      # Replace with actual domain
*.stufflibrary.com/*    # Subdomains if needed

# API restrictions:
- Places API (New)
- Geocoding API
# Note: Remove Maps JavaScript API if not needed in production

# Quotas:
- 10,000+ requests/day (based on expected usage)
```

### 2. Environment Variable Configuration

**Development (.env.local):**
```bash
NEXT_PUBLIC_GOOGLE_PLACES_API_KEY=AIza...dev_key_here
GOOGLE_MAPS_ENV=development
```

**Production (Vercel/hosting platform):**
```bash
NEXT_PUBLIC_GOOGLE_PLACES_API_KEY=AIza...prod_key_here
GOOGLE_MAPS_ENV=production
```

### 3. Implementation Files to Create

**Google Configuration Module:**
```typescript
// src/lib/google-config.ts
export const getGoogleMapsConfig = () => {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
  const environment = process.env.GOOGLE_MAPS_ENV || 'development';
  
  if (!apiKey) {
    throw new Error('Google Places API key not configured');
  }
  
  return {
    apiKey,
    environment,
    libraries: ['places'] as const,
    // Security: Validate expected domains
    expectedDomains: environment === 'production' 
      ? ['stufflibrary.com'] 
      : ['localhost', 'vercel.app']
  };
};
```

**Usage Monitoring Hook:**
```typescript
// src/hooks/useGoogleMapsUsage.ts
export const useGoogleMapsUsage = () => {
  // Track API calls for monitoring
  // Log unusual usage patterns
  // Alert on quota approaching
};
```

### 4. Security Monitoring Setup

**Google Cloud Console Monitoring:**
- [ ] Set up billing alerts at $10, $25, $50 thresholds
- [ ] Configure daily quota alerts at 80% usage
- [ ] Enable detailed request logging
- [ ] Set up usage anomaly alerts

**Application-Level Monitoring:**
- [ ] Log all Google API requests with IP tracking
- [ ] Monitor request frequency per user/session
- [ ] Implement rate limiting for address autocomplete
- [ ] Alert on suspicious usage patterns

### 5. Additional Security Measures

**API Key Rotation:**
- [ ] Document key rotation procedure
- [ ] Set calendar reminder for quarterly key rotation
- [ ] Test key rotation in staging first

**Request Validation:**
- [ ] Validate referrer headers match expected domains
- [ ] Implement request rate limiting (max 10/minute per user)
- [ ] Add CAPTCHA protection if abuse detected

**Emergency Procedures:**
- [ ] Document steps to disable compromised keys
- [ ] Create backup keys for emergency use
- [ ] Test key disabling doesn't break critical flows

## Implementation Checklist

### Phase 1: Basic Setup
- [ ] Create development Google Cloud project
- [ ] Create production Google Cloud project  
- [ ] Generate development API key with restrictions
- [ ] Generate production API key with restrictions
- [ ] Add environment variables to hosting platforms

### Phase 2: Code Implementation
- [ ] Create `src/lib/google-config.ts` configuration module
- [ ] Implement API key validation and error handling
- [ ] Add request rate limiting for autocomplete
- [ ] Create usage monitoring hooks

### Phase 3: Monitoring & Security
- [ ] Set up Google Cloud billing alerts
- [ ] Implement application-level usage tracking
- [ ] Create emergency key disabling procedures
- [ ] Document key rotation process

### Phase 4: Testing & Documentation
- [ ] Test both keys work in their respective environments
- [ ] Verify restrictions block unauthorized domains
- [ ] Test emergency procedures
- [ ] Create team documentation for key management

## Cost Management

**Expected Monthly Costs:**
- Address Autocomplete: ~$30-100/month (depending on usage)
- Place Details: ~$50-200/month
- Geocoding: ~$20-50/month

**Cost Controls:**
- Daily quotas prevent runaway costs
- Multiple alert thresholds
- Usage monitoring and optimization

## Security Benefits

✅ **Prevents API key theft abuse**
✅ **Limits blast radius of compromised keys**  
✅ **Enables environment-specific restrictions**
✅ **Provides usage monitoring and alerting**
✅ **Reduces risk of service disruption**

## Acceptance Criteria

- [ ] Separate API keys for development and production
- [ ] Environment-specific domain restrictions active
- [ ] Billing alerts configured at multiple thresholds
- [ ] Usage monitoring implemented in application
- [ ] Emergency key disabling procedures documented
- [ ] Team trained on secure API key practices

## References

- [Google Maps API Security Best Practices](https://developers.google.com/maps/api-security-best-practices)
- [API Key Restrictions Documentation](https://developers.google.com/maps/documentation/embed/get-api-key#restrict_key)