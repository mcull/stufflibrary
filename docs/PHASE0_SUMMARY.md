# Phase 0 — Harden the Foundation (Summary)

_Launch-blocker hardening completed June 2026. Goal: make StuffLibrary safe to put real traffic on — secrets, cost/abuse surface, DB safety, observability, and build integrity._

## What shipped

| #     | Item                      | What changed                                                                                                                                                                                              | PR               |
| ----- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| P0-1  | Committed Twilio secret   | Rotated the leaked `TWILIO_AUTH_TOKEN`, removed the debug note, dropped the unused `twilio` dep; audited the tree (no other real secrets).                                                                | #354             |
| P0-2  | Unauth'd paid endpoints   | Added session auth + a **hard daily spend cap** on AI/Maps endpoints (OpenAI/Google).                                                                                                                     | #339             |
| P0-3  | Per-instance rate limits  | Moved rate limiting to **Redis** (Upstash) so limits hold across serverless instances.                                                                                                                    | #341             |
| P0-4  | Exposed Google Maps key   | Split into two keys: browser **Maps JS** key (HTTP-referrer + API restricted) and server **Places** key (API-restricted, server-only); billing alerts.                                                    | console          |
| P0-5  | `/api/admin/migrate`      | Retired the runtime shell-migration route; session-auth'd migration status.                                                                                                                               | #344             |
| P0-6  | No staging DB             | Stood up a Supabase **staging** project; `db-config` now routes preview→staging / prod→prod via `VERCEL_ENV`; build script migrates the right DB; **safety net refuses the prod DB in any non-prod env**. | #356, #357, #358 |
| P0-7  | Unverified backups        | Confirmed daily backups on (PITR deferred — paid add-on); replaced the fake `backup-monitor.ts` with a real, env-gated Supabase Management API check.                                                     | #359             |
| P0-8  | Silent migration failures | `vercel-build.sh` now **fails the deploy** on a failed migration; one authoritative migration path (retired the duplicate GitHub Action).                                                                 | #348             |
| P0-9  | Prod creds on laptop      | Removed `PRODUCTION_*` DB creds from local `.env`; local uses localhost/staging; prod creds fetched on-demand.                                                                                            | local            |
| P0-10 | No error tracking         | Added **Sentry** (env-gated, no-op until DSN set). Caught its first real bug immediately.                                                                                                                 | #345             |
| P0-11 | Dead security logger      | Wired `security-logger` to the DB (real events/blocks/metrics, no more fabricated numbers); instrumented login success/failure.                                                                           | #351             |
| P0-12 | Build errors suppressed   | Turned off `ignoreBuildErrors` / `ignoreDuringBuilds`; made CI lint **blocking**; fixed the surfaced errors (test files excluded from the prod typecheck).                                                | #349             |
| P0-13 | Duplicate member on join  | Root cause was a **display** merge (owner listed twice), not a write bug; deduped the members list and the dashboard.                                                                                     | #353             |

## Discovered & handled mid-effort

- **#350** — a pre-existing failed migration (P3009) in prod; resolved before P0-8 could block deploys.
- **#340** Upstash integration reactivated · **#343** Next.js bumped off a flagged version · **#346** admin email allowlist + error boundary · **#347** admin dashboard white-screen fix.
- **Supabase ↔ Vercel** connection gotchas documented: use the IPv4 **pooler** (not the IPv6 direct host) with the `postgres.<ref>` username.

## Still open

- **Restore drill (P0-7):** do one real restore of a daily backup into a throwaway project; record RTO/RPO. _(Manual console task.)_
- **PITR:** off for launch (~24h worst-case RPO); revisit once there's real user data.
- **Close issues:** #251 (staging), #335 (local creds).
- **Follow-ups filed:** #352 — enforce IP blocks on the request path (the enforcement half of P0-11). #355 — authenticated E2E via an env-gated preview test-login.
- **Tech-debt noted:** ~383 non-blocking ESLint warnings (mostly `no-explicit-any`) — a separate burn-down.

## Net effect

Production no longer ships code against an un-migrated DB, previews can't touch production data, paid endpoints are auth'd and cost-capped, errors are tracked, and secrets are out of the repo and off the laptop. The foundation is ready for feature work.
