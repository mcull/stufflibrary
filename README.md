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
