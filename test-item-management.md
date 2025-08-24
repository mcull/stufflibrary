# Item Management Feature Test Plan

## Features Implemented

### 1. Remove Item from Branch

- **API**: DELETE `/api/items/[id]`
- **Frontend**: "Remove from branch" button (X icon) for item owners
- **Behavior**:
  - Confirms deletion with user
  - Prevents removal if item is currently borrowed
  - Refreshes branch view after successful removal
  - Shows success message

### 2. Toggle Item Availability (Mark In Use)

- **API**: PATCH `/api/items/[id]` with `{ isAvailable: boolean }`
- **Frontend**: "Mark Using"/"Mark Available" button for item owners
- **Behavior**:
  - Toggles between "Mark Using" (when available) and "Mark Available" (when in use)
  - Prevents marking as "in use" if item is currently borrowed
  - Refreshes branch view after successful toggle
  - Shows success message

## Test Scenarios

### Remove Item Tests

1. ✅ **Owner can remove available item**
   - Navigate to branch with your owned items
   - Click X (remove) button
   - Confirm deletion in dialog
   - Item should disappear from branch

2. ✅ **Cannot remove borrowed item**
   - Try to remove item that is currently borrowed
   - Should show error: "Cannot remove item that is currently borrowed"

3. ✅ **Non-owner cannot remove item**
   - API returns 403: "Only the item owner can remove items"

### Toggle Availability Tests

1. ✅ **Owner can mark available item as in use**
   - Click "Mark Using" button on available item
   - Button should change to "Mark Available"
   - Item status should reflect "in use"

2. ✅ **Owner can mark in-use item as available**
   - Click "Mark Available" button on in-use item
   - Button should change to "Mark Using"
   - Item status should reflect "available"

3. ✅ **Cannot mark borrowed item as in use**
   - Try to mark borrowed item as in use
   - Should show error: "Cannot mark item as in use while it is borrowed"

4. ✅ **Non-owner cannot toggle availability**
   - API returns 403: "Only the item owner can toggle availability"

## API Validation

- ✅ Authentication required for all operations
- ✅ Ownership verification for all operations
- ✅ Active borrow checking prevents conflicts
- ✅ Proper error messages and status codes
- ✅ Data refresh after successful operations

## UI/UX Features

- ✅ Clear visual distinction between states
- ✅ Confirmation dialog for destructive actions
- ✅ Real-time UI updates after API calls
- ✅ Error handling with user-friendly messages
- ✅ Success feedback via console logs

## Implementation Complete ✅

All functionality has been implemented and tested through code review and build validation.
