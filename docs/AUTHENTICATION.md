# Authentication in Smart NUB Campus

This document describes the complete authentication system including all flows and their interactions.

## Overview

The authentication system uses **Better Auth** with Email OTP for verification and password reset. It integrates with a custom onboarding workflow for student accounts.

## Architecture

```mermaid
┌─────────────────────────────────────────────────────────────────┐
│                        Authentication Layer                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   Better Auth   │  │  Email OTP      │  │  Custom Routes  │  │
│  │   Core          │  │  Plugin         │  │  (login,        │  │
│  └────────┬────────┘  └──────┬──────────┘  └────────┬────────┘  │
└───────────┼──────────────────┼──────────────────────┼───────────┘
            │                  │                      │
            ▼                  ▼                      ▼
┌───────────────────────────────────────────────────────────────────┐
│                    Database & Mail Infrastructure                 │
│  ┌─────────────┐    ┌─────────────┐    ┌────────────────────────┐ │
│  │    User     │    │   Session   │    │    Mail Service        │ │
│  │   Table     │    │   Table     │    │ (Resend + Templates)   │ │
│  └─────────────┘    └─────────────┘    └────────────────────────┘ │
└───────────────────────────────────────────────────────────────────┘
```

---

## 1. Onboarding Flow

For new students to gain access to the platform:

```mermaid
┌───────────────────────────────────────────────────────────────────────────────┐
│                         Onboarding Stages                                     │
│                                                                               │
│  1. VERIFICATION_FORM → 2. ADMIN_REVIEW → 3. ACCOUNT_CREATION → 4. COMPLETED  |
│         ↓                    ↓                   ↓                            │
│  Submit ID info      Admin approves          Create account                   │
│  (& id card image)   or rejects              (OTP sent)                       │
└───────────────────────────────────────────────────────────────────────────────┘
```

### Steps

1. **User submits verification request** (`POST /api/v1/onboarding`)
   - Provides: name, email, date of birth, student ID, id card image
   - Creates an onboarding session with cookie

2. **Admin reviews request** (`GET/POST /api/v1/verification`)
   - Admin approves or rejects the verification
   - On approval, onboarding step moves to `ACCOUNT_CREATION`

3. **User creates account** (`POST /api/v1/account/create`)
   - User provides password
   - Better Auth user created
   - Verification OTP automatically sent to email
   - Returns success with `userId` and `role`

---

## 2. OTP Flow

Email verification and password reset use OTP (One-Time Password) via Better Auth's Email OTP plugin.

### Available Endpoints

| Endpoint                            | Type | Purpose                                 |
| ----------------------------------- | ---- | --------------------------------------- |
| `/email-otp/send-verification-otp`  | POST | Send verification or password reset OTP |
| `/email-otp/verify-email`           | POST | Verify email with OTP                   |
| `/email-otp/request-password-reset` | POST | Request password reset OTP              |
| `/email-otp/reset-password`         | POST | Reset password with OTP                 |

### OTP Configuration

- **Length**: 6 digits (default)
- **Expiration**: 5 minutes (300 seconds)
- **Max attempts**: 3 (default)

### Email Verification OTP

#### Step 1: Request OTP

```txt
POST /api/v1/auth/email-otp/send-verification-otp
Content-Type: application/json

{
  "email": "user@example.com",
  "type": "email-verification"
}
```

#### Step 2: Verify Email

```txt
POST /api/v1/auth/email-otp/verify-email
Content-Type: application/json

{
  "email": "user@example.com",
  "otp": "123456"
}
```

#### Response

```json
{
  "status": true,
  "user": {
    "id": "...",
    "email": "user@example.com",
    "emailVerified": true
  }
}
```

### Password Reset OTP

#### Step 1: Request Reset OTP

```txt
POST /api/v1/auth/email-otp/request-password-reset
Content-Type: application/json

{
  "email": "user@example.com"
}
```

#### Step 2: Reset Password

```txt
POST /api/v1/auth/email-otp/reset-password
Content-Type: application/json

{
  "email": "user@example.com",
  "otp": "123456",
  "password": "newPassword123"
}
```

---

## 3. Signup Flow

There are two signup methods:

### A. Direct Signup (if enabled)

```txt
POST /api/v1/auth/sign-up/email
```

This uses Better Auth's built-in signup and sends verification OTP automatically.

### B. Onboarding-Based Signup (Current)

See **Onboarding Flow** above. The account is created via `/api/v1/account/create` after admin approval, and verification OTP is sent automatically.

---

## 4. Session Flow

### Login

```txt
POST /api/v1/auth/sign-in/email
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Flow:**

1. Email verified check - unverified users rejected with FORBIDDEN
2. Account status checked - suspended users rejected with FORBIDDEN
3. Password verified via Better Auth
4. Session created and returned in Set-Cookie header

> **Note:** Login currently requires email. Student ID login is not yet implemented.
> For forgot-password flows, student ID is supported as an identifier (resolved to email internally).

### Session Management

- **Get current user**: `GET /api/v1/identity/me` (requires session cookie)
- **Logout**: `POST /api/v1/auth/sign-out`

### Protected Routes

Use the `verifySession` middleware to protect routes:

```typescript
import verifySession from "../../middleware/verifySession";

router.get("/profile", verifySession, controller.profile);
```

---

## 5. Verification Flow

### For Admin-Rejected Cases

Users can request another verification OTP:

```txt
POST /api/v1/auth/email-otp/send-verification-otp
{
  "email": "user@example.com",
  "type": "email-verification"
}
```

### Email Verification Status

The `User` model has an `emailVerified` boolean field:

- `true`: User can log in
- `false`: Must verify email before login

---

## 6. Forgot Password Flow

### Step 1: Request Reset

```txt
POST /api/v1/auth/email-otp/request-password-reset
{
  "email": "user@example.com"
}
```

Returns generic success even if email doesn't exist (security best practice).

### Step 2: Password Reset

```txt
POST /api/v1/auth/email-otp/reset-password
{
  "email": "user@example.com",
  "otp": "123456",
  "password": "newSecurePassword"
}
```

### Security Notes

- Old password no longer works after reset
- OTP expires after 5 minutes
- Maximum 3 attempts per OTP
- Successful reset automatically marks email as verified

---

## 7. Account Creation Flow

### After Admin Approval

1. User navigates to account creation step
2. Submits password to `/api/v1/account/create`
3. System creates Better Auth user
4. Verification OTP is automatically sent
5. User verifies email via OTP
6. User can now log in

### API Details

```txt
POST /api/v1/account/create
Content-Type: application/json

// Requires onboarding_step cookie
{
  "password": "securePassword123"
}
```

**Success Response:**

```json
{
  "success": true,
  "message": "Account created successfully.",
  "data": {
    "userId": "...",
    "role": "STUDENT"
  }
}
```

---

## Error Handling

### Common Error Responses

| Error                       | HTTP Status      | Description                         |
| --------------------------- | ---------------- | ----------------------------------- |
| `EMAIL_NOT_VERIFIED`        | 403 FORBIDDEN    | Email must be verified before login |
| `INVALID_OTP`               | 400 BAD REQUEST  | Incorrect OTP code                  |
| `OTP_EXPIRED`               | 400 BAD REQUEST  | OTP has expired                     |
| `TOO_MANY_ATTEMPTS`         | 403 FORBIDDEN    | Maximum OTP attempts exceeded       |
| `INVALID_EMAIL_OR_PASSWORD` | 401 UNAUTHORIZED | Credentials don't match             |

---

## Mail Templates

All email templates are in `src/app/lib/mail/templates/`:

- `emailVerificationOtp.ts` - Verification OTP emails
- `passwordResetOtp.ts` - Password reset OTP emails
- `verificationApproved.ts` - Admin approval notifications
- `verificationRejected.ts` - Admin rejection notifications

Templates use:

- Smart NUB Campus branding
- Prominent OTP display
- Security warnings
- Responsive HTML design

---

## Configuration

### Environment Variables

```env
BETTER_AUTH_SECRET=<secret>
BETTER_AUTH_URL=<base-url>
RESEND_API_KEY=<api-key>
MAIL_FROM=<from-email>
```

### Constants

- `EMAIL_OTP_EXPIRES_IN = 300` (5 minutes) - Defined in `src/app/constants/auth.ts`

---

## Testing Endpoints

### Verify Email Flow

1. Create account via `/api/v1/account/create`
2. Check email for OTP
3. `POST /api/v1/auth/email-otp/verify-email` with OTP
4. `POST /api/v1/auth/login` - Should succeed

### Password Reset Flow

1. `POST /api/v1/auth/email-otp/request-password-reset`
2. Check email for OTP
3. `POST /api/v1/auth/email-otp/reset-password` with OTP and new password
4. Old password should fail
5. New password should work with `/api/v1/auth/login`
