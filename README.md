# Smart NUB Campus Server

Backend API for Smart NUB Campus — an academic collaboration network for Northern University Bangladesh.

## Tech Stack

- **Runtime:** Node.js + TypeScript
- **Framework:** Express 5
- **ORM:** Prisma 7 with PostgreSQL
- **Auth:** Better Auth with Email OTP plugin
- **Mail:** Resend / Gmail (configurable)
- **Storage:** Cloudinary (file uploads)
- **Validation:** Zod

## Project Structure

```
src/
├── app.ts                          # Express app configuration
├── server.ts                       # Server bootstrap
├── config/
│   └── env.ts                      # Environment variable validation
├── types/
│   └── express.d.ts                # Express type augmentation
└── app/
    ├── constants/                  # Auth & department constants
    ├── errorHelpers/               # AppError, Zod error handler
    ├── interfaces/                 # TypeScript interfaces
    ├── shared/                     # catchAsync, sendResponse
    ├── utils/                      # Pagination, student ID parsing
    ├── middleware/                  # Auth, validation, rate limiting, error handling
    ├── lib/                        # Auth config, Prisma client, mail, upload
    ├── routes/                     # Route aggregator
    └── module/
        ├── auth/                   # Forgot/reset password (Better Auth handles the rest)
        ├── account/                # Account creation (post-onboarding)
        ├── identity/               # GET /me endpoint
        ├── onboarding/             # Onboarding state management
        ├── verification/           # Admin verification review
        └── upload/                 # Cloudinary file upload/delete
```

## API Endpoints

### Authentication (Better Auth)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/auth/sign-in/email` | Public | Login with email + password |
| POST | `/api/v1/auth/sign-up/email` | Public | Register new account |
| POST | `/api/v1/auth/sign-out` | Session | Logout |
| POST | `/api/v1/auth/forgot-password` | Public | Request password reset OTP |
| POST | `/api/v1/auth/reset-password` | Public | Reset password with OTP |
| POST | `/api/v1/auth/email-otp/send-verification-otp` | Public | Send email verification OTP |
| POST | `/api/v1/auth/email-otp/verify-email` | Public | Verify email with OTP |
| POST | `/api/v1/auth/email-otp/request-password-reset` | Public | Request password reset OTP (Better Auth) |
| POST | `/api/v1/auth/email-otp/reset-password` | Public | Reset password with OTP (Better Auth) |

### Identity

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/identity/me` | Session | Get current user + student/admin data |

### Onboarding

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/onboarding/current` | Public* | Get current onboarding step |
| POST | `/api/v1/onboarding/complete` | Public* | Complete onboarding after email verification |

*Uses `onboarding_step` cookie for session tracking

### Verification

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/verification/request` | Public | Submit verification request |
| GET | `/api/v1/verification` | Admin | List verification requests (paginated) |
| GET | `/api/v1/verification/:id` | Admin | Get single verification request |
| PATCH | `/api/v1/verification/:id/approve` | Admin | Approve verification |
| PATCH | `/api/v1/verification/:id/reject` | Admin | Reject verification with note |

### Account

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/account/create` | Onboarding cookie | Create student account |
| GET | `/api/v1/account/email-by-student-id/:id` | Public | Get email by student ID |

### Upload

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/upload` | Session | Upload file to Cloudinary |
| POST | `/api/v1/upload/delete` | Session | Delete file from Cloudinary |

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your database URL, Cloudinary keys, etc.

# Run migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate

# Seed admin user
npm run seed:admin

# Start development server
npm run dev
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | `development` or `production` |
| `PORT` | Yes | Server port (default: 5000) |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Yes | Secret for Better Auth session tokens |
| `BETTER_AUTH_URL` | Yes | Base URL for Better Auth |
| `CORS_ORIGINS` | No | Comma-separated allowed origins |
| `CLOUDINARY_CLOUD_NAME` | Yes | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Yes | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Yes | Cloudinary API secret |
| `MAIL_PROVIDER` | No | `resend` (default) or `gmail` |
| `RESEND_API_KEY` | Conditional | Required if using Resend |
| `MAIL_FROM` | Conditional | Required if using Resend |
| `GMAIL_USER` | Conditional | Required if using Gmail |
| `GMAIL_APP_PASSWORD` | Conditional | Required if using Gmail |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Compile TypeScript |
| `npm start` | Start production server |
| `npm run migrate` | Run Prisma migrations |
| `npm run generate` | Generate Prisma client |
| `npm run studio` | Open Prisma Studio |
| `npm run seed:admin` | Seed admin user |