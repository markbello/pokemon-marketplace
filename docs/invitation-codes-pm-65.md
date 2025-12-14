# Invitation Code System (PM-65)

## Overview

The invitation code system enables controlled launch by requiring new users to provide a valid Pokemon-themed invitation code during signup. This allows management of seller volume and quality during the private beta phase.

## Features Implemented

### 1. Database Schema

**Table: `InvitationCode`**
- `id`: Unique identifier (CUID)
- `code`: Unique Pokemon-themed code (e.g., "CHARIZARD-A1B2")
- `createdBy`: Admin who created the code
- `usedBy`: Auth0 user ID who redeemed it
- `usedAt`: Timestamp when redeemed
- `createdAt`: Creation timestamp

### 2. Code Generation

**Script:** `prisma/seed-invitation-codes.ts`

Generates 20 Pokemon-themed invitation codes with the format:
```
POKEMONNAME-XXXX
```

Where:
- `POKEMONNAME` is a popular Pokemon (Charizard, Pikachu, etc.)
- `XXXX` is a random 4-character hex string

**Run the seed script:**
```bash
npm run db:seed:invitations
```

### 3. Signup Flow

#### a. Signup Page (`/signup`)
- User enters invitation code
- Code is validated against the database
- Valid code is stored in sessionStorage
- User is redirected to Auth0 signup

#### b. Onboarding Integration
- After Auth0 callback, user lands on `/onboarding`
- Code from sessionStorage is automatically redeemed
- Code is marked as used with the user's Auth0 ID
- sessionStorage is cleared

### 4. API Routes

**Validate Code**
```
POST /api/invitation-codes/validate
Body: { code: "CHARIZARD-A1B2" }
Response: { valid: true, code: "CHARIZARD-A1B2" }
```

**Redeem Code**
```
POST /api/invitation-codes/redeem
Body: { code: "CHARIZARD-A1B2" }
Response: { success: true, message: "..." }
```

**Check Status**
```
GET /api/invitation-codes/check-status
Response: { hasRedeemed: true, code: "...", redeemedAt: "..." }
```

**Admin - List Codes**
```
GET /api/admin/invitation-codes
Response: {
  codes: [...],
  summary: { total: 20, used: 5, unused: 15 }
}
```

### 5. Admin Dashboard

**Page:** `/admin/invitation-codes`

Features:
- View all invitation codes
- See usage status (Used/Available)
- Track who used each code and when
- Summary statistics (total, used, unused)

Accessible only to admin users.

### 6. User Flow

1. User clicks "Sign Up" button in navbar
2. Redirected to `/signup` page
3. Enters invitation code
4. Code is validated
5. Redirected to Auth0 signup
6. After Auth0 authentication, redirected to `/onboarding`
7. Code is automatically redeemed and marked as used
8. User completes onboarding

### 7. Existing Users

Existing users who log in via "Sign In" button bypass the invitation code requirement. The system only enforces invitation codes for new signups.

## Security & Validation

- Codes are validated before Auth0 signup
- Codes can only be used once
- Codes are case-insensitive (automatically converted to uppercase)
- Auth0 user ID is stored when code is redeemed
- Admin access required to view all codes

## Middleware Updates

- `/signup` route bypasses profile completeness check
- Invitation code API routes bypass profile check
- All other routes follow existing middleware logic

## Future Enhancements

As noted in the Jira ticket, this is a temporary feature for launch control. It can be:
- Removed via feature flag when ready for public registration
- Extended with code generation API for admins
- Enhanced with expiration dates for codes
- Augmented with usage limits per code

## Testing Checklist

- [x] Invalid codes are rejected
- [x] Valid codes allow registration
- [x] Codes can only be used once
- [x] Test registration flow end-to-end with valid code
- [x] Admin can view all codes and usage status
- [x] Existing users can log in without invitation code

## Files Modified/Created

### Database
- `prisma/schema.prisma` - Added `InvitationCode` model
- `prisma/seed-invitation-codes.ts` - Code generation script

### API Routes
- `src/app/api/invitation-codes/validate/route.ts`
- `src/app/api/invitation-codes/redeem/route.ts`
- `src/app/api/invitation-codes/check-status/route.ts`
- `src/app/api/admin/invitation-codes/route.ts`

### Pages
- `src/app/signup/page.tsx` - Signup page
- `src/app/admin/invitation-codes/page.tsx` - Admin view

### Components
- `src/components/auth/SignupForm.tsx` - Signup form component
- `src/components/auth/UserMenu.tsx` - Updated to show Sign Up button
- `src/components/onboarding/OnboardingWizard.tsx` - Added code redemption

### Utilities
- `src/lib/auth-utils.ts` - Added signup route to bypass list

### Configuration
- `package.json` - Added `db:seed:invitations` script

## Sample Invitation Codes

Run `npm run db:seed:invitations` to generate codes. Example codes:
- CHARIZARD-469A
- BLASTOISE-5F29
- PIKACHU-0FA1
- MEWTWO-19AE
- And 16 more...

## Notes

- Codes are Pokemon-themed for brand consistency
- System is designed for temporary use during private beta
- Can be easily disabled or removed when moving to public launch
- No impact on existing users or login flow
