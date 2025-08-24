# Twilio SMS Configuration Fix

## 🚨 Issue Identified

**Error:** `accountSid must start with AC`

**Root Cause:** Invalid Twilio Account SID format in environment variables

## ❌ Problem Details

The `TWILIO_ACCOUNT_SID` in `.env` was set to:

```
TWILIO_ACCOUNT_SID=OR2cb7a8cdfe21ebc622e25aba8bda664d
```

**Issue:** Twilio Account SIDs must start with `AC`, not `OR`

## ✅ Solution Implemented

### 1. Enhanced Error Validation

Updated `src/lib/twilio.ts` with Account SID format validation:

```typescript
// Validate Account SID format - must start with 'AC'
if (!accountSid.startsWith('AC')) {
  console.error('Invalid Twilio Account SID format:', {
    accountSid: accountSid.substring(0, 5) + '***',
    expectedFormat: 'AC...',
  });
  throw new Error(
    `Invalid TWILIO_ACCOUNT_SID format. Account SID must start with 'AC' but got '${accountSid.substring(0, 2)}***'. Please check your Twilio console for the correct Account SID.`
  );
}
```

### 2. Updated Environment Configuration

Modified `.env` with clear instructions:

```bash
# TWILIO CONFIGURATION - NEEDS VALID ACCOUNT SID
# The current Account SID format is invalid - must start with 'AC'
# Get the correct Account SID from: https://console.twilio.com/
TWILIO_ACCOUNT_SID=AC_REPLACE_WITH_VALID_ACCOUNT_SID_FROM_TWILIO_CONSOLE
TWILIO_AUTH_TOKEN=22cb1d81026f836a9469713f58197a7f
TWILIO_PHONE_NUMBER=+5103797938
```

### 3. Improved Error Handling

Enhanced `src/app/api/borrow-requests/route.ts` with better error reporting:

```typescript
} catch (smsError) {
  console.error('❌ Failed to send SMS notification:', smsError);

  // Provide specific guidance for common Twilio configuration issues
  if (smsError instanceof Error && smsError.message.includes('accountSid must start with AC')) {
    console.error('🔧 TWILIO CONFIG ERROR: Please update TWILIO_ACCOUNT_SID in your .env file with a valid Account SID from https://console.twilio.com/');
  }

  // Don't fail the request if SMS fails, but log it
}
```

## 🔧 How to Fix

### Step 1: Get Valid Twilio Credentials

1. Go to [Twilio Console](https://console.twilio.com/)
2. Copy your **Account SID** (starts with `AC`)
3. Copy your **Auth Token**

### Step 2: Update Environment Variables

Replace the placeholder in `.env`:

```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxx  # Your actual Account SID
TWILIO_AUTH_TOKEN=your_actual_auth_token
TWILIO_PHONE_NUMBER=+1234567890  # Your Twilio phone number
```

### Step 3: Restart Development Server

```bash
npm run dev
```

## 🧪 Testing

After fixing the configuration, test the SMS functionality:

1. Create a borrow request with video
2. Check server logs for SMS success/failure
3. Verify SMS is received on owner's phone

## 📋 Error Prevention

The enhanced validation will now catch invalid Account SID formats at runtime and provide clear error messages pointing to the Twilio console for correct credentials.

## 🚀 Production Deployment

Ensure environment variables are properly configured in your production environment (Vercel, etc.) with valid Twilio credentials.
