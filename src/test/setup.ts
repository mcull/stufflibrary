import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';
import { expect, afterEach, beforeAll } from 'vitest';

expect.extend(matchers);

beforeAll(() => {
  // Set up test environment variables
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
  process.env.NEXTAUTH_SECRET = 'test-secret-key-for-testing-only';
  (process.env as any).NODE_ENV = 'test';
  process.env.NEXTAUTH_URL = 'http://localhost:3000';
  process.env.DATABASE_ENV = 'test';
});

afterEach(() => {
  cleanup();
});
