# Social Sign-In vs Email/Password: Limitations & Considerations

This document outlines the key limitations and considerations when users choose social sign-in versus creating an account with email/password in the Pokemon Marketplace.

## Overview

**Social Sign-In Providers:** Google, Apple  
**Email/Password:** Traditional account creation with email verification

---

## 1. Account Recovery & Password Management

### Social Sign-In
**Limitations:**
- ✅ **No password to manage** - User can't change password in your app
- ✅ **Account recovery handled by provider** - Google/Apple manage password resets
- ❌ **No direct account recovery** - Users must go through provider's recovery process
- ❌ **Provider dependency** - If user loses access to social account, they lose access to your marketplace
- ❌ **Provider account deletion** - If user deletes their Google/Apple account, they lose access to your platform

**Considerations:**
- Users may not remember which social provider they used to sign up
- Need to implement "Account Recovery" flow that checks multiple providers
- Consider allowing users to link multiple authentication methods

### Email/Password
**Advantages:**
- ✅ Full control over account recovery flow
- ✅ Custom password reset email with your branding
- ✅ Users can change password directly in your app
- ✅ No dependency on third-party providers

**Considerations:**
- Must implement secure password reset flow
- Need email verification to prevent account hijacking
- Users may forget passwords (requires password reset flow)

---

## 2. Email Verification & Trust

### Social Sign-In
**Advantages:**
- ✅ **Pre-verified emails** - Google/Apple already verified the email
- ✅ **Higher trust** - Provider's verification is typically more robust
- ✅ **Reduced fraud** - Less likely to be fake/disposable emails

**Limitations:**
- ❌ **Less control** - You can't force re-verification if provider's verification lapses
- ❌ **Privacy concerns** - Some users prefer not to share social account info

### Email/Password
**Advantages:**
- ✅ Full control over verification process
- ✅ Can implement re-verification workflows
- ✅ Can enforce stricter email validation rules

**Limitations:**
- ❌ Must implement email verification flow
- ❌ Higher risk of fake/disposable emails
- ❌ Additional friction in sign-up process

---

## 3. User Profile Data Availability

### Social Sign-In
**What You Get:**
- ✅ Email address (verified)
- ✅ Full name (from provider)
- ✅ Profile picture/avatar (from provider)
- ✅ Locale/language preferences
- ✅ Sometimes: phone number (if user grants permission)

**What You DON'T Get:**
- ❌ No custom username option (must use email or generate one)
- ❌ Limited profile customization during sign-up
- ❌ May not get phone number (provider-dependent)

**Considerations:**
- May need to collect additional info via progressive profiling
- Profile picture is tied to social account (changes if they update it there)
- Need fallback if user disconnects social account later

### Email/Password
**What You Can Collect:**
- ✅ Email address (must verify)
- ✅ Full control over profile fields during sign-up
- ✅ Custom username if desired
- ✅ Custom profile picture upload
- ✅ Phone number (if required)

**Advantages:**
- Complete control over what data you collect and when
- Can enforce required fields during registration
- Custom onboarding flow

---

## 4. Seller Onboarding & KYC Implications

### Critical Considerations for Sellers

#### **Social Sign-In Sellers:**
**Advantages:**
- ✅ Pre-verified email reduces fraud risk
- ✅ Provider's identity verification adds trust layer

**Limitations & Requirements:**
- ❌ **MUST still collect full KYC info** - Social sign-in doesn't replace KYC
- ❌ **Name might not match legal name** - Social accounts may use display names
- ❌ **Address verification still required** - Provider doesn't share address
- ❌ **Tax/Business info still required** - Not available from social providers
- ❌ **Bank account details still required** - For Stripe Connect
- ❌ **Identity documents still required** - Driver's license, passport, etc.

**What This Means:**
- Social sign-in users still go through same seller verification process
- May need to ask "Is your display name your legal name?" during onboarding
- Can't skip KYC steps just because they signed in with Google/Apple

#### **Email/Password Sellers:**
**Advantages:**
- ✅ Full control over data collection process
- ✅ Can enforce all required fields upfront
- ✅ Name collected directly (can specify "legal name")

**Limitations:**
- ❌ Email verification adds extra step before seller onboarding can start
- ❌ Higher fraud risk (unverified emails initially)

---

## 5. Account Linking & Duplicate Accounts

### The Problem
**Scenario:** User signs up with email/password using `john@example.com`. Later tries to sign in with Google, which also uses `john@example.com`.

**Without proper handling:**
- Creates duplicate account
- Seller verification tied to wrong account
- Transaction history split across accounts
- Confusing user experience

### Solution: Auth0 Account Linking

**Auth0 automatically handles:**
- Email uniqueness across connections
- Account linking prompts (optional or automatic)
- Merging accounts with same email

**Configuration needed:**
- Enable account linking in Auth0 Dashboard
- Configure linking strategy:
  - **Automatic**: Link accounts with matching verified emails
  - **Manual**: Prompt user to link accounts
  - **Block**: Prevent duplicate emails across connections

**Recommendation for Marketplace:**
- Use **automatic linking** for verified emails
- Show notification when accounts are linked
- Preserve all user data (roles, seller status) when linking

---

## 6. Multi-Provider Sign-In

### The Challenge
**Scenario:** User signs up with Google. Later tries to sign in with Apple (different email).

**What Happens:**
- Creates separate account (different emails)
- User may not realize they have two accounts
- Seller verification tied to one account, buying on another

### Solutions

#### Option 1: Allow Multiple Auth Methods Per Account (Recommended)
- Link multiple providers to same user account
- User can sign in with either Google OR Apple
- Single seller verification applies to account regardless of sign-in method

**Implementation:**
- Use Auth0's account linking API
- Allow users to add additional sign-in methods in profile settings
- Require email verification for each linked provider

#### Option 2: Enforce Single Provider (Not Recommended)
- User must stick with original sign-in method
- Creates friction if user loses access to social account

---

## 7. Seller-Specific Limitations

### Profile Picture/Avatar
- **Social sign-in:** Avatar from provider (Google/Apple)
- **Email/password:** User uploads custom avatar
- **Consideration:** Sellers may want custom branding. Allow avatar override even for social users.

### Display Name vs Legal Name
- **Social sign-in:** May get display name ("Johnny") instead of legal name ("John Smith")
- **Email/password:** Can explicitly ask for "Legal Name" during sign-up
- **Seller requirement:** Need legal name for tax forms (1099-K)
- **Solution:** Always ask for legal name during seller onboarding, regardless of sign-in method

### Email Change Scenarios
- **Social sign-in:** Email tied to provider account. User changes email with provider → your app sees new email automatically
- **Email/password:** User can change email in your app (requires verification)
- **Seller consideration:** Email changes affect tax documents, Stripe Connect accounts
- **Solution:** Require additional verification for email changes on verified seller accounts

---

## 8. Authentication Flow Differences

### Initial Sign-Up Flow

**Social Sign-In:**
1. Click "Sign in with Google/Apple"
2. Redirect to provider
3. User authorizes
4. Redirect back to app
5. **Account created automatically**
6. User immediately signed in

**Email/Password:**
1. Enter email and password
2. Submit form
3. **Email verification required** (user clicks link in email)
4. Then user can sign in

**Impact:**
- Social sign-in is faster (one less step)
- Email/password requires email verification before first login
- For sellers: Both must complete seller onboarding, so initial speed difference is less important

---

## 9. Data Privacy & Compliance

### Social Sign-In
**Considerations:**
- User data shared with third-party provider
- Must comply with provider's data policies
- May need additional consent for data usage
- Provider may revoke access (rare but possible)

### Email/Password
**Advantages:**
- Full control over user data
- No third-party data sharing
- Easier compliance with data regulations (GDPR, CCPA)
- Direct relationship with user

---

## 10. Stripe Connect Integration

### Impact on Seller Onboarding

**No difference in requirements:**
- Stripe Connect requires the same information regardless of sign-in method:
  - Legal name (not display name)
  - SSN/EIN
  - Address
  - Bank account details
  - Identity verification documents

**Consideration:**
- Social sign-in users still must provide all Stripe Connect requirements
- Can't pre-fill any Stripe fields from social provider data
- Both sign-in methods have same Stripe onboarding complexity

---

## 11. Recommended Implementation Strategy

### For Buyers
- ✅ Support both social sign-in and email/password
- ✅ Social sign-in preferred for speed (one-click sign-up)
- ✅ Allow account linking (user can add Google/Apple to email/password account)
- ✅ No functional difference - both can buy immediately

### For Sellers
- ✅ **Same seller onboarding flow regardless of sign-in method**
- ✅ Always collect legal name (don't rely on social display name)
- ✅ Always collect full KYC information
- ✅ Always verify identity documents
- ✅ No shortcuts because of social sign-in

### Auth0 Configuration Recommendations

1. **Enable account linking** - Prevent duplicate accounts
2. **Use verified email requirement** - Even for social providers
3. **Store connection type** - Track which provider user used (for support/debugging)
4. **Allow multiple connections** - Users can link Google + Apple to same account
5. **Preserve metadata on link** - When linking accounts, merge roles, seller status, etc.

### User Profile Storage

**Store in Auth0:**
- Authentication method (connection type)
- Linked providers
- Roles and permissions
- Seller status metadata

**Store in PostgreSQL:**
- Full user profile (name, email, etc.)
- Seller-specific data (business info, Stripe Connect ID)
- Transaction history
- Reputation/ratings

**Sync strategy:**
- Mirror Auth0 user ID to PostgreSQL
- Update PostgreSQL on user creation/login
- Use Auth0 as source of truth for authentication
- Use PostgreSQL as source of truth for business data

---

## 12. Edge Cases to Handle

### Case 1: User Signs Up with Social, Provider Revokes Access
- **Solution:** Allow user to add password as backup auth method
- **Prevention:** Prompt users to link email/password during seller onboarding

### Case 2: User Has Two Accounts (Google + Email with Same Email)
- **Solution:** Auth0 automatic account linking
- **UI:** Show message "We've linked your accounts"

### Case 3: Seller Changes Social Email
- **Solution:** Update user profile automatically, but require additional verification
- **Notify:** Alert seller if email change affects tax documents

### Case 4: User Deletes Social Account
- **Solution:** Grace period to add backup auth method
- **Prevention:** Encourage linking email/password during onboarding

### Case 5: Social Provider Changes Data
- **Solution:** Sync updates on login, but allow manual override in profile

---

## 13. UI/UX Recommendations

### During Sign-Up
- Show both options prominently
- Explain benefits of each:
  - Social: "Faster sign-up with your Google/Apple account"
  - Email: "Full control over your account"
- For sellers: Mention that seller onboarding is the same either way

### During Seller Onboarding
- Don't assume social users have verified info
- Always ask for legal name (even if you got name from provider)
- Explain why you need additional info (KYC, Stripe Connect, taxes)

### In Profile Settings
- Show which auth methods are linked
- Allow adding additional sign-in methods
- For social users: Option to set a password as backup
- Display "Connected Accounts" section

---

## Summary: Key Takeaways

### ✅ Advantages of Social Sign-In
- Faster sign-up (no email verification step)
- Pre-verified emails reduce fraud
- Familiar user experience
- Less password management for users

### ❌ Limitations of Social Sign-In
- **No shortcuts for seller onboarding** - Still need full KYC
- Display name ≠ legal name (must collect separately)
- Provider dependency (access loss if provider account deleted)
- Less profile customization during sign-up
- Need account linking to prevent duplicates

### ⚠️ Critical Requirements (Both Methods)
- Seller onboarding is identical regardless of sign-in method
- Always collect legal name for sellers (not display name)
- Always collect full KYC information
- Always verify identity documents
- Must implement account linking to prevent duplicates
- Store connection type for support/debugging

### 🎯 Recommendation
**Support both methods** but:
- Treat social sign-in as convenience feature (not security feature)
- Don't reduce seller verification requirements for social users
- Implement robust account linking
- Allow users to add backup auth methods
- Keep seller onboarding flow consistent regardless of sign-in method



