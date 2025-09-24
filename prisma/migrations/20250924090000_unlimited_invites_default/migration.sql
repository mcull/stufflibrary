-- Set default to unlimited (0) for new libraries
ALTER TABLE "libraries" ALTER COLUMN "inviteRateLimitPerHour" SET DEFAULT 0;

-- Make existing libraries unlimited by default as well
UPDATE "libraries"
SET "inviteRateLimitPerHour" = 0
WHERE "inviteRateLimitPerHour" IS NULL OR "inviteRateLimitPerHour" > 0;

