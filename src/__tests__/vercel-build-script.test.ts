import { spawnSync } from 'node:child_process';
import {
  mkdtempSync,
  writeFileSync,
  chmodSync,
  rmSync,
  readFileSync,
  existsSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

/**
 * Exercises scripts/vercel-build.sh end-to-end with a mocked PATH so the real
 * Prisma CLI / Next build never run. The goal is P0-8: a failing migration (or a
 * failed critical-table verification) must FAIL the deploy, not be swallowed.
 */

const SCRIPT_PATH = path.resolve(process.cwd(), 'scripts/vercel-build.sh');

let fakeBin: string;

/**
 * Drop fake `npx`, `node`, and `npm` executables on a temp PATH. Each honours an
 * env var so individual tests can make a specific step fail:
 *   FAKE_MIGRATE_EXIT  - exit code for `npx prisma migrate deploy`
 *   FAKE_VERIFY_EXIT   - exit code for the inline `node -e` table verification
 *   FAKE_BUILD_EXIT    - exit code for `npm run build`
 */
function writeFake(name: string, body: string) {
  const file = path.join(fakeBin, name);
  writeFileSync(file, `#!/bin/bash\n${body}\n`);
  chmodSync(file, 0o755);
}

beforeEach(() => {
  fakeBin = mkdtempSync(path.join(tmpdir(), 'vercel-build-fake-'));

  writeFake(
    'npx',
    `
if [[ "$*" == *"migrate deploy"* ]]; then
  [[ -n "\${MIGRATE_RECORD:-}" ]] && printf '%s' "\${DATABASE_URL:-}" > "\$MIGRATE_RECORD"
  exit "\${FAKE_MIGRATE_EXIT:-0}"
fi
exit 0
`
  );
  // The inline table verification runs via \`node -e "..."\`.
  writeFake('node', 'exit "${FAKE_VERIFY_EXIT:-0}"');
  writeFake(
    'npm',
    `
if [[ "$*" == *"run build"* ]]; then exit "\${FAKE_BUILD_EXIT:-0}"; fi
exit 0
`
  );
});

afterEach(() => {
  rmSync(fakeBin, { recursive: true, force: true });
});

function runBuild(env: Record<string, string>) {
  return spawnSync('bash', [SCRIPT_PATH], {
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${fakeBin}:${process.env.PATH}`,
      DATABASE_URL: 'postgres://fake/db',
      MIGRATE_RECORD: path.join(fakeBin, 'migrate-target'),
      ...env,
    },
  });
}

// The DATABASE_URL that `prisma migrate deploy` actually ran against, or null.
function migrateTarget(): string | null {
  const f = path.join(fakeBin, 'migrate-target');
  return existsSync(f) ? readFileSync(f, 'utf8') : null;
}

describe('scripts/vercel-build.sh', () => {
  it('fails the deploy when prisma migrate deploy fails', () => {
    const result = runBuild({
      VERCEL_ENV: 'production',
      FAKE_MIGRATE_EXIT: '1',
    });
    expect(result.status).not.toBe(0);
  });

  it('fails the deploy when critical-table verification fails', () => {
    const result = runBuild({
      VERCEL_ENV: 'production',
      FAKE_VERIFY_EXIT: '1',
    });
    expect(result.status).not.toBe(0);
  });

  it('fails the deploy when DATABASE_URL is missing on a deploy that migrates', () => {
    const result = runBuild({ VERCEL_ENV: 'production', DATABASE_URL: '' });
    expect(result.status).not.toBe(0);
  });

  it('succeeds when migrations and verification pass', () => {
    const result = runBuild({ VERCEL_ENV: 'production' });
    expect(result.status).toBe(0);
  });

  it('still propagates a real build failure', () => {
    const result = runBuild({ VERCEL_ENV: 'production', FAKE_BUILD_EXIT: '1' });
    expect(result.status).not.toBe(0);
  });

  it('a PREVIEW deploy migrates the staging DB, not production', () => {
    const result = runBuild({
      VERCEL_ENV: 'preview',
      STAGING_DATABASE_URL: 'postgres://staging/db',
      PRODUCTION_DATABASE_URL: 'postgres://prod/db',
      DATABASE_URL: 'postgres://prod/db',
    });
    expect(result.status).toBe(0);
    expect(migrateTarget()).toBe('postgres://staging/db');
  });

  it('a PREVIEW deploy refuses to migrate the production DB', () => {
    // No STAGING_DATABASE_URL, and DATABASE_URL is the prod connection string.
    const result = runBuild({
      VERCEL_ENV: 'preview',
      STAGING_DATABASE_URL: '',
      PRODUCTION_DATABASE_URL: 'postgres://prod/db',
      DATABASE_URL: 'postgres://prod/db',
    });
    expect(result.status).not.toBe(0);
    expect(migrateTarget()).toBeNull();
  });

  it('a PRODUCTION deploy migrates the production DB', () => {
    const result = runBuild({
      VERCEL_ENV: 'production',
      PRODUCTION_DATABASE_URL: 'postgres://prod/db',
      DATABASE_URL: 'postgres://ignored/db',
    });
    expect(result.status).toBe(0);
    expect(migrateTarget()).toBe('postgres://prod/db');
  });

  it('skips migrations for non-prod/preview builds and still builds', () => {
    const result = runBuild({
      VERCEL_ENV: 'development',
      FAKE_MIGRATE_EXIT: '1',
    });
    expect(result.status).toBe(0);
  });
});
