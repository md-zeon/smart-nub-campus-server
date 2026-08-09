# Smart NUB Campus Server

Backend API for Smart NUB Campus — an academic collaboration network for Northern University Bangladesh.

## Tech Stack

- **Runtime:** Node.js + TypeScript 6 (ESM)
- **Framework:** Express 5
- **ORM:** Prisma 7 with PostgreSQL (48 models, 20 schema files)
- **Auth:** Better Auth with Email OTP plugin
- **Real-time:** Socket.IO (messaging, presence, notifications)
- **Mail:** Resend / Gmail (configurable)
- **Storage:** Cloudinary (file uploads)
- **Logging:** Pino + pino-http
- **Validation:** Zod
- **Testing:** Vitest + Supertest

## Project Structure

```
src/
├── app.ts                              # Express app (middleware chain, routes, error handling)
├── server.ts                           # HTTP server bootstrap, Socket.IO init, graceful shutdown
├── config/
│   └── env.ts                          # Typed env loader with validation
├── types/
│   └── express.d.ts                    # Express Request augmentation (user, session, student, admin)
└── app/
    ├── constants/                      # Auth & department constants (17 NUB departments)
    ├── errorHelpers/                   # AppError, Zod error handler
    ├── interfaces/                     # TypeScript interfaces
    ├── shared/                         # catchAsync, sendResponse, softDelete, validateUserStatus
    ├── utils/                          # Pagination, student ID parsing
    ├── middleware/                      # Auth, validation, rate limiting, logging, error handling
    ├── lib/
    │   ├── auth.ts                     # Better Auth config (Prisma adapter, email OTP, hooks)
    │   ├── prisma.ts                   # Prisma client (PrismaPg adapter, connection pool)
    │   ├── mail/                       # Dual mail provider (Resend + Gmail) with HTML templates
    │   ├── socket/                     # Socket.IO server, connection/presence/room managers
    │   └── upload/                     # Cloudinary upload/delete with MIME validation
    ├── routes/
    │   └── index.ts                    # Master router — all modules under /api/v1
    └── module/                         # 18 feature modules (controller/service/validation/routes)
```

## Feature Modules

| Module | Description |
|--------|-------------|
| `auth` | Forgot/reset password (wraps Better Auth OTP) |
| `account` | Account creation post-onboarding |
| `onboarding` | Multi-step onboarding flow with cookie-based state |
| `verification` | Student verification request + admin review |
| `identity` | Current user (`/me`), profile CRUD, public profiles |
| `admin` | Dashboard stats, charts, user/resource/course/category CRUD, audit logs |
| `resources` | Academic resource library with voting, bookmarks, comments, reports |
| `discussions` | Discussion forum with replies, votes, bookmarks, pin/lock/solved |
| `qa` | Question & answer forum with voting, accept answer, bookmarks |
| `teams` | Team formation (LFG) with applications and member management |
| `connections` | Social networking — search, suggestions, requests, blocking, skills |
| `messages` | Direct & group messaging with read receipts |
| `notification` | In-app notifications |
| `ai` | AI chat sessions, messages, study stats, tools (summarize, quiz, flashcards) |
| `event` | Campus events with RSVP |
| `gamification` | Points, badges, leaderboards, reputation history |
| `settings` | Privacy, notifications, security (password/sessions), account (export/archive/delete) |
| `upload` | Cloudinary file upload (authenticated + onboarding) |

## API Endpoints (~195 total)

All routes are mounted under `/api/v1`.

### Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/sign-up/email` | Public | Register (rate-limited: 5/hr) |
| POST | `/auth/sign-in/email` | Public | Login (rate-limited: 5/15min) |
| POST | `/auth/sign-out` | Session | Logout |
| POST | `/auth/email-otp/send-verification-otp` | Public | Send email verification OTP |
| POST | `/auth/email-otp/verify-email` | Public | Verify email with OTP |
| POST | `/auth/email-otp/request-password-reset` | Public | Request password reset OTP |
| POST | `/auth/email-otp/reset-password` | Public | Reset password with OTP |
| POST | `/auth/forgot-password` | Public | Forgot password (custom) |
| POST | `/auth/reset-password` | Public | Reset password (custom) |

### Onboarding

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/onboarding/current` | Public* | Get current onboarding step |
| POST | `/onboarding/complete` | Public* | Complete onboarding step |

*Uses `onboarding_step` cookie for session tracking

### Verification

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/verification/request` | Public | Submit verification request |
| GET | `/verification` | Admin | List verification requests |
| GET | `/verification/:id` | Admin | Get single request |
| PATCH | `/verification/:id/approve` | Admin | Approve verification |
| PATCH | `/verification/:id/reject` | Admin | Reject with note |

### Account

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/account/create` | Onboarding cookie | Create student account |
| GET | `/account/email-by-student-id/:id` | Public | Get email by student ID |

### Identity

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/identity/me` | Session | Get current user + student/admin data |
| GET | `/identity/profile` | Session | Get own profile |
| GET | `/identity/profile/:userId` | Session | Get public profile |
| PATCH | `/identity/profile` | Session | Update profile |

### Upload

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/upload` | Session | Upload file to Cloudinary |
| POST | `/upload/delete` | Session | Delete file from Cloudinary |
| POST | `/upload/onboarding` | Public | Upload ID card (onboarding) |

### Resources (17 endpoints)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/resources` | Session | Create resource |
| GET | `/resources` | Session | List resources (paginated, filterable) |
| GET | `/resources/categories` | Session | List resource categories |
| GET | `/resources/courses` | Session | List courses |
| GET | `/resources/tags` | Session | List resource tags |
| GET | `/resources/admin/reports` | Admin | List resource reports |
| PATCH | `/resources/admin/reports/:id` | Admin | Resolve report |
| DELETE | `/resources/comments/:id` | Session | Delete comment |
| GET | `/resources/:id` | Session | Get resource detail |
| PATCH | `/resources/:id` | Session | Update resource |
| DELETE | `/resources/:id` | Session | Delete resource |
| POST | `/resources/:id/upvote` | Session | Toggle upvote |
| POST | `/resources/:id/bookmark` | Session | Toggle bookmark |
| POST | `/resources/:id/download` | Session | Track download |
| GET | `/resources/:id/comments` | Session | List comments |
| POST | `/resources/:id/comments` | Session | Add comment |
| POST | `/resources/:id/report` | Session | Report resource |

### Discussions (18 endpoints)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/discussions` | Session | Create discussion |
| GET | `/discussions` | Session | List discussions |
| GET | `/discussions/bookmarks` | Session | My bookmarks |
| GET | `/discussions/me` | Session | My discussions |
| GET | `/discussions/replies/mine` | Session | My replies |
| GET | `/discussions/categories` | Session | List categories |
| GET | `/discussions/tags` | Session | List tags |
| GET | `/discussions/trending` | Session | Trending discussions |
| GET | `/discussions/contributors` | Session | Top contributors |
| POST | `/discussions/replies/:replyId/vote` | Session | Vote on reply |
| GET | `/discussions/:id/replies` | Session | List replies |
| GET | `/discussions/:id` | Session | Get discussion |
| PUT | `/discussions/:id` | Session | Update discussion |
| DELETE | `/discussions/:id` | Session | Delete discussion |
| POST | `/discussions/:id/replies` | Session | Add reply |
| DELETE | `/discussions/:id/replies/:replyId` | Session | Delete reply |
| POST | `/discussions/:id/vote` | Session | Vote on discussion |
| POST | `/discussions/:id/bookmark` | Session | Toggle bookmark |
| PUT | `/discussions/:id/pin` | Admin | Pin/unpin discussion |
| PUT | `/discussions/:id/lock` | Admin | Lock/unlock discussion |
| PUT | `/discussions/:id/solved` | Session | Mark as solved |

### Q&A (16 endpoints)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/qa` | Session | Ask question |
| GET | `/qa` | Session | List questions |
| GET | `/qa/categories` | Session | List categories |
| GET | `/qa/tags` | Session | List tags |
| GET | `/qa/contributors` | Session | Top contributors |
| GET | `/qa/trending` | Session | Trending questions |
| GET | `/qa/bookmarks` | Session | My bookmarks |
| POST | `/qa/answers/:answerId/vote` | Session | Vote on answer |
| GET | `/qa/:id/answers` | Session | List answers |
| GET | `/qa/:id` | Session | Get question |
| PUT | `/qa/:id` | Session | Update question |
| DELETE | `/qa/:id` | Session | Delete question |
| POST | `/qa/:id/answers` | Session | Post answer |
| DELETE | `/qa/:id/answers/:answerId` | Session | Delete answer |
| PUT | `/qa/:id/answers/:answerId/accept` | Session | Accept answer |
| POST | `/qa/:id/vote` | Session | Vote on question |
| POST | `/qa/:id/bookmark` | Session | Toggle bookmark |

### Teams (11 endpoints)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/teams` | Session | Create team request |
| GET | `/teams` | Session | List team requests |
| GET | `/teams/:id` | Session | Get team detail |
| PUT | `/teams/:id` | Session | Update team |
| DELETE | `/teams/:id` | Session | Delete team |
| POST | `/teams/:id/apply` | Session | Apply to team |
| PUT | `/teams/:id/applications/:applicationId` | Session | Accept/reject application |
| DELETE | `/teams/:id/applications/withdraw` | Session | Withdraw application |
| GET | `/teams/:id/members` | Session | List members |
| DELETE | `/teams/:id/members/:memberId` | Session | Remove member |
| POST | `/teams/:id/leave` | Session | Leave team |

### Connections (16 endpoints)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/connections/search` | Session | Search people |
| GET | `/connections/suggestions` | Session | Get suggestions |
| GET | `/connections` | Session | List connections |
| GET | `/connections/pending` | Session | Pending received |
| GET | `/connections/sent` | Session | Pending sent |
| GET | `/connections/blocked` | Session | Blocked users |
| POST | `/connections/request` | Session | Send request |
| PUT | `/connections/:id/accept` | Session | Accept request |
| PUT | `/connections/:id/reject` | Session | Reject request |
| PUT | `/connections/:id/favorite` | Session | Toggle favorite |
| DELETE | `/connections/:id` | Session | Remove connection |
| POST | `/connections/block` | Session | Block user |
| DELETE | `/connections/block/:blockedId` | Session | Unblock user |
| GET | `/connections/skills/:userId` | Session | Get user skills |
| POST | `/connections/skills` | Session | Add skill |
| DELETE | `/connections/skills/:skillId` | Session | Remove skill |

### Messages (13 endpoints)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/messages/unread` | Session | Unread count |
| POST | `/messages/conversations` | Session | Create conversation |
| GET | `/messages/conversations` | Session | List conversations |
| GET | `/messages/conversations/:id` | Session | Get conversation |
| POST | `/messages/conversations/:id/messages` | Session | Send message |
| GET | `/messages/conversations/:id/messages` | Session | List messages |
| POST | `/messages/conversations/:id/read` | Session | Mark as read |
| GET | `/messages/conversations/:id/unread` | Session | Unread in conversation |
| POST | `/messages/groups` | Session | Create group |
| PUT | `/messages/groups/:id` | Session | Update group |
| POST | `/messages/groups/:id/members` | Session | Add member |
| DELETE | `/messages/groups/:id/members/:memberId` | Session | Remove member |
| POST | `/messages/groups/:id/leave` | Session | Leave group |

### AI (14 endpoints)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/ai/sessions` | Session | Create chat session |
| GET | `/ai/sessions` | Session | List sessions |
| GET | `/ai/sessions/:sessionId` | Session | Get session |
| DELETE | `/ai/sessions/:sessionId` | Session | Delete session |
| POST | `/ai/sessions/:sessionId/messages` | Session | Send message (rate-limited: 30/hr) |
| GET | `/ai/sessions/:sessionId/messages` | Session | List messages |
| PATCH | `/ai/messages/:messageId/helpful` | Session | Mark helpful |
| GET | `/ai/stats` | Session | Study stats |
| GET | `/ai/stats/history` | Session | Stats history |
| POST | `/ai/tools/summarize-pdf` | Session | Summarize PDF (10/hr) |
| POST | `/ai/tools/generate-quiz` | Session | Generate quiz (10/hr) |
| POST | `/ai/tools/generate-flashcards` | Session | Generate flashcards (10/hr) |
| POST | `/ai/tools/explain-code` | Session | Explain code (10/hr) |

### Events (7 endpoints)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/events` | Session | List events |
| GET | `/events/upcoming` | Session | Upcoming events |
| POST | `/events` | Admin | Create event |
| GET | `/events/:id` | Session | Get event |
| PATCH | `/events/:id` | Admin | Update event |
| DELETE | `/events/:id` | Admin | Delete event |
| POST | `/events/:id/rsvp` | Session | Toggle RSVP |

### Gamification (11 endpoints)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/gamification/leaderboard` | Session | Leaderboard |
| GET | `/gamification/points/me` | Session | My points |
| GET | `/gamification/history/me` | Session | My reputation history |
| GET | `/gamification/badges/me` | Session | My badges |
| GET | `/gamification/points/:userId` | Session | User points |
| GET | `/gamification/history/:userId` | Session | User history |
| POST | `/gamification/vote/up` | Session | Upvote (award points) |
| POST | `/gamification/vote/down` | Session | Downvote (deduct points) |
| POST | `/gamification/vote/reverse` | Session | Reverse vote |
| POST | `/gamification/admin/adjust` | Admin | Manual point adjustment |
| POST | `/gamification/admin/award` | Admin | Award badge |

### Notifications (4 endpoints)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/notifications` | Session | List notifications |
| GET | `/notifications/unread-count` | Session | Unread count |
| PATCH | `/notifications/read-all` | Session | Mark all read |
| PATCH | `/notifications/:id/read` | Session | Mark one read |

### Settings (16 endpoints)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/settings/privacy` | Session | Get privacy settings |
| PATCH | `/settings/privacy` | Session | Update privacy |
| GET | `/settings/notifications` | Session | Get notification settings |
| PATCH | `/settings/notifications` | Session | Update notification prefs |
| POST | `/settings/security/change-password` | Session | Change password |
| GET | `/settings/security/sessions` | Session | Active sessions |
| DELETE | `/settings/security/sessions/:sessionId` | Session | Revoke session |
| POST | `/settings/security/sessions/terminate-others` | Session | Terminate other sessions |
| GET | `/settings/security/login-history` | Session | Login history |
| POST | `/settings/account/export` | Session | Request data export |
| GET | `/settings/account/export/:jobId` | Session | Export status |
| GET | `/settings/account/export/:jobId/download` | Session | Download export |
| POST | `/settings/account/archive` | Session | Archive account |
| POST | `/settings/account/deactivate` | Session | Deactivate account |
| POST | `/settings/account/reactivate` | Session | Reactivate account |
| POST | `/settings/account/delete` | Session | Request account deletion |
| POST | `/settings/account/delete/cancel` | Session | Cancel deletion |

### Admin (26 endpoints)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/admin/stats` | Admin | Dashboard stats |
| GET | `/admin/stats/charts` | Admin | Chart data |
| GET | `/admin/users` | Admin | List users |
| GET | `/admin/users/:id` | Admin | User detail |
| PATCH | `/admin/users/:id/status` | Admin | Update user status |
| DELETE | `/admin/users/:id` | Admin | Delete user |
| GET | `/admin/resources` | Admin | List all resources |
| PATCH | `/admin/resources/:id/verify` | Admin | Verify/unverify resource |
| DELETE | `/admin/resources/:id` | Admin | Delete resource |
| GET | `/admin/courses` | Admin | List courses |
| GET | `/admin/courses/:id` | Admin | Get course |
| POST | `/admin/courses` | Admin | Create course |
| PATCH | `/admin/courses/:id` | Admin | Update course |
| DELETE | `/admin/courses/:id` | Admin | Delete course |
| GET | `/admin/resource-categories` | Admin | List resource categories |
| GET | `/admin/resource-categories/:id` | Admin | Get category |
| POST | `/admin/resource-categories` | Admin | Create category |
| PATCH | `/admin/resource-categories/:id` | Admin | Update category |
| DELETE | `/admin/resource-categories/:id` | Admin | Delete category |
| GET | `/admin/discussion-categories` | Admin | List discussion categories |
| POST | `/admin/discussion-categories` | Admin | Create category |
| PATCH | `/admin/discussion-categories/:id` | Admin | Update category |
| DELETE | `/admin/discussion-categories/:id` | Admin | Delete category |
| GET | `/admin/question-categories` | Admin | List question categories |
| POST | `/admin/question-categories` | Admin | Create category |
| PATCH | `/admin/question-categories/:id` | Admin | Update category |
| DELETE | `/admin/question-categories/:id` | Admin | Delete category |
| GET | `/admin/audit-log` | Admin | Audit logs |
| GET | `/admin/audit-log/:id` | Admin | Audit log detail |

## Middleware

| Middleware | Description |
|------------|-------------|
| `verifySession` | Better Auth session validation, loads user with relations, checks status |
| `verifySessionForOnboarding` | Lighter session check for onboarding (no relations) |
| `requireRole` | Role-based access control (ADMIN, etc.) |
| `validateRequest` | Zod schema validation (body, query, params) |
| `globalErrorHandler` | Catches ZodError, AppError, generic Error |
| `notFound` | 404 handler for unmatched routes |
| `requestLogger` | Pino structured request logging |
| Rate limiters (14) | Login (5/15min), OTP (3/10min), sign-up (5/hr), verification (5/24hr), onboarding, team, AI chat (30/hr), AI tools (10/hr), upload (30/hr), global (100/15min) |

## Socket.IO

Real-time features via Socket.IO:

- **Messaging:** send/receive messages, typing indicators, read receipts
- **Presence:** online/offline status with heartbeat
- **Rooms:** conversation join/leave/broadcast with access validation
- **Notifications:** live notification delivery

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

# Seed database (admin user, courses, tags, resources, categories, badges, events)
npm run seed:admin

# Start development server
npm run dev
```

## Environment Variables

Validated at boot by `src/config/env.ts` — the server throws if any required variable is missing. See `.env.example` for a complete template.

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | `development`, `test`, or `production` |
| `PORT` | Yes | Server port (default: 5000) |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Yes | Secret for Better Auth session tokens (32+ chars in production) |
| `BETTER_AUTH_URL` | Yes | Base URL for Better Auth |
| `CORS_ORIGINS` | No* | Comma-separated allowed origins. **Required in production** — falls back to `[]` (no cross-origin allowed) if unset. |
| `CLOUDINARY_CLOUD_NAME` | Yes | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Yes | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Yes | Cloudinary API secret |
| `CLOUDINARY_FOLDER` | No | Cloudinary folder (default: `smart-nub-campus`) |
| `AI_PROVIDER` | No | `gemini` (default), `groq`, `openai`, or `anthropic` |
| `AI_PROVIDER_API_KEY` | Yes | API key for the selected AI provider |
| `AI_PROVIDER_MODEL` | No | Model name (default: `gemini-1.5-flash`) |
| `MAIL_PROVIDER` | No | `resend` (default) or `gmail` |
| `RESEND_API_KEY` | Conditional | Required if using Resend |
| `MAIL_FROM` | Conditional | Required if using Resend |
| `GMAIL_USER` | Conditional | Required if using Gmail |
| `GMAIL_APP_PASSWORD` | Conditional | Required if using Gmail |
| `DISABLE_RATE_LIMIT` | No | `true` disables rate limiting (dev/test only) |
| `RATE_LIMIT_LOGIN_WINDOW_MS` / `RATE_LIMIT_LOGIN_MAX` | No | Login window/limit (defaults 900000 / 5) |
| `RATE_LIMIT_OTP_WINDOW_MS` / `RATE_LIMIT_OTP_MAX` | No | OTP window/limit (defaults 600000 / 3) |
| `RATE_LIMIT_VERIFICATION_WINDOW_MS` / `RATE_LIMIT_VERIFICATION_MAX` | No | Verification window/limit (defaults 86400000 / 5) |
| `RATE_LIMIT_ONBOARDING_WINDOW_MS` / `RATE_LIMIT_ONBOARDING_MAX` | No | Onboarding window/limit (defaults 900000 / 20) |
| `MAX_UPLOAD_SIZE_MB` | No | Upload size cap (default 5) |
| `SEED_ADMIN_*` | No | Admin credentials used by `npm run seed:admin` only |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Compile TypeScript |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run migrate` | Run Prisma migrations |
| `npm run generate` | Generate Prisma client |
| `npm run push` | Push schema to DB |
| `npm run pull` | Pull schema from DB |
| `npm run studio` | Open Prisma Studio |
| `npm run seed:admin` | Seed database |
| `npm run test` | Run tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage |

## Deployment

Production checklist and best-practice gaps are tracked in [`Review/05-DEPLOYMENT-READINESS.md`](../Review/05-DEPLOYMENT-READINESS.md) at the repository root. Minimum steps:

1. Set `NODE_ENV=production`, `BETTER_AUTH_SECRET` (32+ chars), `CORS_ORIGINS` (explicit allow-list), and production Cloudinary/AI/mail credentials.
2. Run migrations as an explicit pre-deploy step (never in app startup):
   ```bash
   npx prisma migrate deploy
   ```
3. Build and start:
   ```bash
   npm run build && npm start
   ```
4. Run behind exactly one reverse proxy (TLS termination, WebSocket upgrade headers) and add a `/health` check.
5. Configure the Socket.IO Redis adapter in multi-instance deployments.

> **Note:** the final pre-deployment security review (2026-08-10) found Critical/High issues that must be resolved before going live. See [`Review/00-EXECUTIVE-SUMMARY.md`](../Review/00-EXECUTIVE-SUMMARY.md).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

**Important:** The `development` branch always contains the latest code. Always create your feature/fix branches off from `development`.
