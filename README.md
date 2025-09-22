# StuffLibrary.org

**Share more, buy less.**

StuffLibrary.org is an open-source platform that helps neighbors share under-used items safely and easily. Think: ladders, lawnmowers, camping gear—things we all own but rarely use. By treating neighborhoods as collective libraries, we can save money, reduce waste, and strengthen community ties.

## Mission

To make it natural and safe for neighbors to borrow and lend things, following principles of trust, accountability, and care.

## Core Values

- **Safety first** – people and property are protected by design.
- **Civic utility** – the platform recedes into the background like a public library or Craigslist.
- **Generosity** – small acts of care and reciprocity build long-term trust.

## Roadmap

- MVP: user accounts, neighborhood groups, item listings, borrow/return flow.
- Trust & Safety: verification, reputation, condition tracking.
- Community: acknowledgments, lightweight messaging, neighborhood stats.
- Future: verticalized libraries (e.g. LensLibrary), deposits, insurance pools.

## Development Setup

### Prerequisites

- Node.js 18+ and npm
- Git

### Quick Start

```bash
# Clone the repository
git clone https://github.com/mcull/stufflibrary.git
cd stufflibrary

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your actual values (see Environment Setup below)

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

### Environment Setup

1. Copy the example environment file:

   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` with your actual values:
   - **Database**: Add your Supabase `DATABASE_URL`
   - **Cache**: Add your Redis `REDIS_URL`
   - **AI**: Add your `OPENAI_API_KEY`
   - **Storage**: Configure Wasabi S3 credentials
   - **App**: Set `NEXT_PUBLIC_APP_URL` to your domain

3. **Important**: Never commit `.env.local` or any file containing secrets

### Development Commands

#### Quick Start

```bash
# Option 1: Using npm
npm run dev

# Option 2: Using make
make dev
```

#### All Available Scripts

**Setup:**

- `npm install` / `make install` - Install dependencies
- `make setup` - Full setup (install + db push)
- `make clean` - Clean build artifacts

**Development:**

- `npm run dev` / `make dev` - Start dev server with Turbopack
- `npm run build` / `make build` - Build for production
- `npm start` / `make start` - Start production server

**Code Quality:**

- `npm run lint` / `make lint` - Lint code with ESLint
- `npm run format` / `make format` - Format code with Prettier
- `npm run typecheck` / `make typecheck` - Type check with TypeScript
- `make check` - Run all quality checks

**Testing:**

- `npm test` / `make test` - Run unit tests
- `npm run test:unit` / `make test-unit` - Run unit tests
- `npm run test:e2e` / `make test-e2e` - Run E2E tests (when available)

**Database:**

- `npm run db:push` / `make db-push` - Push schema to database
- `npm run db:studio` / `make db-studio` - Open Prisma Studio
- `npm run seed` / `make seed` - Seed database (when available)

Run `make help` to see all available commands.

### Environment Variables

All environment variables are documented in `.env.example` with examples and descriptions. Key variables include:

- `DATABASE_URL` - Database connection string
- `REDIS_URL` - Cache connection string
- `OPENAI_API_KEY` - AI service authentication
- `WASABI_*` - File storage configuration
- `NEXT_PUBLIC_APP_URL` - Public app URL for client-side usage

### Deployment (Vercel)

1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard:
   - Go to Project Settings → Environment Variables
   - Add all variables from `.env.example` with production values
   - Ensure `NEXT_PUBLIC_APP_URL` matches your domain
3. Deploy automatically triggers on push to main branch

### Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Run ESLint with auto-fix
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run typecheck` - Run TypeScript type checking
- `npm run test` - Run tests in watch mode
- `npm run test:ci` - Run tests with coverage (CI mode)
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema to database
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Prisma Studio

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript (strict mode)
- **Database**: Supabase (PostgreSQL) + Prisma ORM
- **Styling**: Material-UI (MUI) + Tailwind CSS
- **Code Quality**: ESLint, Prettier, Husky git hooks
- **Testing**: Jest + React Testing Library
- **CI/CD**: GitHub Actions
- **Deployment**: Vercel
- **Environment**: Zod validation for type-safe configuration

## Get Involved

This is an open-source project. Contributions, ideas, and forks are welcome.
\n

# Testing CI fix

## Post-Deploy Webhooks (Vercel)

This project supports notifying contributors after code is deployed by parsing closed issues from merged PRs and emailing the original submitter (without exposing their email address).

Endpoints

- `POST /api/webhooks/vercel-deploy`
  - Compares the previous deployed commit to the current one, finds merged PRs with closing keywords (close/fix/resolve #n), fetches the issues, extracts an anonymized SLFB slug from each issue body, and emails the contributor via Resend.
- `POST /api/webhooks/feedback-resolved`
  - Directly emails the contributor for a single issue number (useful for manual tests or ad hoc notifications).

Auth (Vercel-compatible)

- Either of the following is accepted:
  - `Authorization: Bearer $WEBHOOK_SECRET`
  - `x-vercel-signature: <HMAC-SHA1 of raw body using WEBHOOK_SECRET>`

Environment Variables

- `WEBHOOK_SECRET`: shared secret used by Vercel to sign payloads (and for Bearer for manual tests)
- `GITHUB_TOKEN`: repo read access for comparing commits and fetching issue bodies
- `RESEND_API_KEY`: for email delivery
- `FEEDBACK_SLUG_SECRET`: signs/verifies anonymized reporter slugs in issue bodies

Vercel Setup

1. Add an Outgoing Webhook → Event: Deployment Ready (Production). URL: `https://<your-domain>/api/webhooks/vercel-deploy`. Secret: `WEBHOOK_SECRET`.
2. Ensure the environment variables above are set for the Production environment.
3. First deploy per environment seeds the `DeployMarker` and does not send emails. Subsequent deploys send notifications for issues closed by merged PRs in the deployed range.

Curl Examples (after deploying)

Using Vercel signature (recommended)

```
export WEBHOOK_SECRET=... # your Vercel webhook secret

# feedback-resolved (manual single-issue test)
BODY='{"issueNumber":277}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha1 -hmac "$WEBHOOK_SECRET" -binary | xxd -p -c 256)

curl -X POST https://<your-domain>/api/webhooks/feedback-resolved \
  -H "x-vercel-signature: $SIG" \
  -H "Content-Type: application/json" \
  --data-binary "$BODY"

# vercel-deploy (manual test with a real deployed commit SHA)
BODY='{"deployment":{"meta":{"githubCommitSha":"GIT_SHA"},"target":"production"}}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha1 -hmac "$WEBHOOK_SECRET" -binary | xxd -p -c 256)

curl -X POST https://<your-domain>/api/webhooks/vercel-deploy \
  -H "x-vercel-signature: $SIG" \
  -H "Content-Type: application/json" \
  --data-binary "$BODY"
```

Using Bearer (convenient for manual tests)

```
curl -X POST https://<your-domain>/api/webhooks/feedback-resolved \
  -H "Authorization: Bearer $WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"issueNumber":277}'
```

Notes

- The anonymized reporter slug in issue bodies has the form `SLFB:v1:<userId>:<sig8>`. The signature is verified server-side with `FEEDBACK_SLUG_SECRET`.
- If you rotate `FEEDBACK_SLUG_SECRET`, slugs created with the old secret will no longer validate.
