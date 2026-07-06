-- Case-insensitive email uniqueness (issue #403).
-- Auth normalizes emails to lowercase (auth-codes.ts / auth.ts upsert), and the
-- prod dup-check (GROUP BY lower(email) HAVING count(*) > 1) returned zero rows
-- on 2026-07-05, so both statements are safe to run.

-- Lowercase any remaining mixed-case rows first: authorize() upserts on the
-- normalized email, so a mixed-case row would miss the upsert's `where` and the
-- resulting insert would then violate the new index, breaking that user's login.
UPDATE "users" SET "email" = lower("email")
WHERE "email" IS NOT NULL AND "email" <> lower("email");

-- Expression indexes can't be expressed in schema.prisma, hence hand-authored SQL
-- (Prisma's documented pattern for unsupported features). The column keeps its
-- regular @unique index; this adds the case-insensitive guarantee on top.
CREATE UNIQUE INDEX "users_email_lower_key" ON "users" (lower("email"));
