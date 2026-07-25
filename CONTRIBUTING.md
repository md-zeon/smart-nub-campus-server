# Contributing to Smart NUB Campus Server

Thanks for your interest in contributing! This guide covers everything you need to get started.

## Branching Strategy

> **The `development` branch always contains the latest code.**

| Branch | Purpose |
|--------|---------|
| `development` | Active development, all PRs target this branch |
| `main` | Stable releases only, merged from `development` |
| `feature/*` | New features |
| `fix/*` | Bug fixes |
| `chore/*` | Maintenance, refactoring, config changes |

### Creating a branch

Always branch off from `development`:

```bash
git checkout development
git pull origin development
git checkout -b feature/your-feature-name
```

Name your branch descriptively:
- `feature/chat-system`
- `fix/onboarding-validation`
- `chore/update-dependencies`

## Getting Started

1. **Fork** the repository (if you don't have write access)
2. **Clone** your fork:
   ```bash
   git clone https://github.com/<your-username>/smart-nub-campus-server.git
   cd smart-nub-campus-server
   ```
3. **Set up** the project:
   ```bash
   cp .env.example .env
   # Edit .env with your database URL, Cloudinary keys, etc.
   npm install
   npx prisma migrate dev
   npx prisma generate
   npm run seed:admin
   npm run dev
   ```
4. Create your branch from `development`

## Development Workflow

1. Make your changes in your feature branch
2. Run linter before committing:
   ```bash
   npm run lint
   ```
3. Run tests to make sure nothing is broken:
   ```bash
   npm run test
   ```
4. Commit your changes with a clear message
5. Push your branch and open a PR against `development`

## Commit Messages

Use clear, concise commit messages:

```
feat: add real-time chat with Socket.IO
fix: resolve onboarding step skip on refresh
chore: update Prisma to 7.8.0
docs: update API endpoint reference
```

Prefix with: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `style`.

## Pull Requests

- Target the `development` branch (never `main` directly)
- Keep PRs focused — one feature or fix per PR
- Describe what changed and why
- Reference any related issues
- Make sure lint and tests pass before requesting review

## Code Style

- Use TypeScript for all new code
- Follow the existing patterns in the codebase (check neighboring files)
- Use `camelCase` for variables and functions, `PascalCase` for types/interfaces
- Keep functions small and focused
- Add proper TypeScript types — avoid `any`

## Project Structure

```
src/
├── app.ts                          # Express app configuration
├── server.ts                       # Server bootstrap
├── config/
│   └── env.ts                      # Environment variable validation
└── app/
    ├── constants/                  # Auth & department constants
    ├── errorHelpers/               # AppError, Zod error handler
    ├── interfaces/                 # TypeScript interfaces
    ├── shared/                     # catchAsync, sendResponse
    ├── utils/                      # Pagination, student ID parsing
    ├── middleware/                  # Auth, validation, rate limiting, error handling
    ├── lib/                        # Auth config, Prisma client, mail, upload
    ├── routes/                     # Route aggregator
    └── module/                     # Feature modules (auth, account, onboarding, etc.)
```

## Need Help?

- Check the [server docs](docs/) for API details and authentication flow
- Open an issue to discuss large changes before starting work
