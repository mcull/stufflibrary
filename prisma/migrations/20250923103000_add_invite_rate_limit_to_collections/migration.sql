-- Add per-library invite rate limit; null means use default
ALTER TABLE "libraries" ADD COLUMN "inviteRateLimitPerHour" INTEGER DEFAULT 5;

