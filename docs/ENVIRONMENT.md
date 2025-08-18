# Environment Configuration

This document explains how to configure environment variables for StuffLibrary in different environments.

## Local Development

1. Copy the example file:

   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` with your development values
3. Start the development server: `npm run dev`

## Environment Variables

### Database

- `DATABASE_URL` - PlanetScale MySQL connection string
  - Format: `mysql://username:password@host:port/database`
  - Required for: Database operations

### Cache

- `REDIS_URL` - Redis connection string
  - Format: `redis://username:password@host:port`
  - Required for: Session storage, caching

### AI Services

- `OPENAI_API_KEY` - OpenAI API key
  - Format: `sk-...`
  - Required for: AI-powered features

### File Storage (Wasabi S3-Compatible)

- `WASABI_ACCESS_KEY_ID` - Access key ID
- `WASABI_SECRET_ACCESS_KEY` - Secret access key
- `WASABI_REGION` - AWS region (e.g. `us-east-1`)
- `WASABI_BUCKET` - Bucket name
- `WASABI_ENDPOINT` - Full endpoint URL
- Required for: File uploads, image storage

### Authentication (Future)

- `NEXTAUTH_SECRET` - Secret for session encryption
- `NEXTAUTH_URL` - Canonical URL of the application

### Application

- `NODE_ENV` - Environment mode (`development`, `production`, `test`)
- `NEXT_PUBLIC_APP_URL` - Public URL (exposed to browser)
- `DEBUG` - Enable debug logging (`true`/`false`)
- `LOG_LEVEL` - Logging level (`error`, `warn`, `info`, `debug`)

## Vercel Deployment

### Setting Environment Variables

1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add each variable from `.env.example`:
   - Set **Variable Name** (e.g. `DATABASE_URL`)
   - Set **Value** (your actual production value)
   - Choose **Environment**: Production, Preview, or both
   - Click "Save"

### Environment-Specific Values

- **Production**: Use production database, cache, and API keys
- **Preview**: Can use staging/development services for PR previews
- **Development**: Use local `.env.local` file

## Security Best Practices

- ✅ Never commit `.env.local` or any file with secrets
- ✅ Use different credentials for development vs production
- ✅ Rotate API keys regularly
- ✅ Use least-privilege access for service accounts
- ✅ Monitor environment variable usage in logs

## Validation

Environment variables are validated at startup using Zod schemas in `src/lib/env.ts`. This ensures:

- Type safety for environment values
- Clear error messages for missing/invalid config
- Runtime validation in all environments
