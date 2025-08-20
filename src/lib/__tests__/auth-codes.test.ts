import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateAuthCode, verifyAuthCode, sendAuthCode } from '../auth-codes';
import { db } from '../db';

// Mock the database
vi.mock('../db', () => ({
  db: {
    authCode: {
      create: vi.fn(),
      upsert: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

// Mock the env module
vi.mock('../env', () => ({
  env: {
    RESEND_API_KEY: 'test-key',
  },
}));

// Mock resend
const mockEmailSend = vi.fn();

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: mockEmailSend,
    },
  })),
}));

describe('Auth Codes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the mock to default behavior
    mockEmailSend.mockResolvedValue({ id: 'test-email-id' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateAuthCode', () => {
    it('should generate a 6-digit numeric code', () => {
      const code = generateAuthCode();
      expect(code).toMatch(/^\d{6}$/);
      expect(code.length).toBe(6);
    });

    it('should generate unique codes', () => {
      const codes = new Set();
      // Generate 100 codes to test uniqueness
      for (let i = 0; i < 100; i++) {
        codes.add(generateAuthCode());
      }
      // Should have close to 100 unique codes (allowing for rare collisions)
      expect(codes.size).toBeGreaterThan(95);
    });

    it('should not start with zero (to ensure 6 full digits)', () => {
      // Test multiple times to catch edge cases
      for (let i = 0; i < 50; i++) {
        const code = generateAuthCode();
        expect(parseInt(code)).toBeGreaterThanOrEqual(100000);
        expect(parseInt(code)).toBeLessThan(1000000);
      }
    });
  });

  describe('verifyAuthCode', () => {
    const mockEmail = 'test@example.com';
    const mockCode = '123456';

    it('should return true for valid, non-expired code', async () => {
      const futureDate = new Date();
      futureDate.setMinutes(futureDate.getMinutes() + 5);

      vi.mocked(db.authCode.findUnique).mockResolvedValue({
        email: mockEmail,
        code: mockCode,
        expiresAt: futureDate,
        createdAt: new Date(),
      });

      vi.mocked(db.authCode.delete).mockResolvedValue({
        email: mockEmail,
        code: mockCode,
        expiresAt: futureDate,
        createdAt: new Date(),
      });

      const result = await verifyAuthCode(mockEmail, mockCode);
      
      expect(result).toBe(true);
      expect(db.authCode.findUnique).toHaveBeenCalledWith({
        where: { email: mockEmail },
      });
      expect(db.authCode.delete).toHaveBeenCalledWith({
        where: { email: mockEmail },
      });
    });

    it('should return false if auth code not found', async () => {
      vi.mocked(db.authCode.findUnique).mockResolvedValue(null);

      const result = await verifyAuthCode(mockEmail, mockCode);
      
      expect(result).toBe(false);
      expect(db.authCode.delete).not.toHaveBeenCalled();
    });

    it('should return false for incorrect code', async () => {
      const futureDate = new Date();
      futureDate.setMinutes(futureDate.getMinutes() + 5);

      vi.mocked(db.authCode.findUnique).mockResolvedValue({
        email: mockEmail,
        code: 'different-code',
        expiresAt: futureDate,
        createdAt: new Date(),
      });

      const result = await verifyAuthCode(mockEmail, mockCode);
      
      expect(result).toBe(false);
      expect(db.authCode.delete).not.toHaveBeenCalled();
    });

    it('should return false for expired code', async () => {
      const pastDate = new Date();
      pastDate.setMinutes(pastDate.getMinutes() - 5);

      vi.mocked(db.authCode.findUnique).mockResolvedValue({
        email: mockEmail,
        code: mockCode,
        expiresAt: pastDate,
        createdAt: new Date(),
      });

      const result = await verifyAuthCode(mockEmail, mockCode);
      
      expect(result).toBe(false);
      expect(db.authCode.delete).not.toHaveBeenCalled();
    });
  });

  describe('sendAuthCode', () => {
    const mockEmail = 'test@example.com';

    it.skip('should create and send auth code via email', async () => {
      const mockAuthCode = {
        email: mockEmail,
        code: '123456',
        expiresAt: new Date(),
        createdAt: new Date(),
      };

      vi.mocked(db.authCode.upsert).mockResolvedValue(mockAuthCode);

      await sendAuthCode(mockEmail);

      expect(db.authCode.upsert).toHaveBeenCalledWith({
        where: { email: mockEmail },
        update: expect.objectContaining({
          code: expect.stringMatching(/^\d{6}$/),
          expiresAt: expect.any(Date),
        }),
        create: expect.objectContaining({
          email: mockEmail,
          code: expect.stringMatching(/^\d{6}$/),
          expiresAt: expect.any(Date),
        }),
      });
    });

    it.skip('should set expiration time to 10 minutes from now', async () => {
      const beforeTime = new Date();
      beforeTime.setMinutes(beforeTime.getMinutes() + 9, 59); // 9:59 from now

      const afterTime = new Date();
      afterTime.setMinutes(afterTime.getMinutes() + 10, 1); // 10:01 from now

      vi.mocked(db.authCode.upsert).mockResolvedValue({
        email: mockEmail,
        code: '123456',
        expiresAt: new Date(),
        createdAt: new Date(),
      });

      await sendAuthCode(mockEmail);

      const createCall = vi.mocked(db.authCode.upsert).mock.calls[0]?.[0];
      const expirationTime = createCall?.create?.expiresAt;

      expect(expirationTime).toBeDefined();
      expect((expirationTime as Date).getTime()).toBeGreaterThan(beforeTime.getTime());
      expect((expirationTime as Date).getTime()).toBeLessThan(afterTime.getTime());
    });

    it.skip('should handle email sending errors gracefully', async () => {
      vi.mocked(db.authCode.upsert).mockResolvedValue({
        email: mockEmail,
        code: '123456',
        expiresAt: new Date(),
        createdAt: new Date(),
      });

      // Mock Resend to throw error
      mockEmailSend.mockRejectedValueOnce(new Error('Email service unavailable'));

      await expect(sendAuthCode(mockEmail)).rejects.toThrow('Email service unavailable');
      
      // Reset mock for other tests
      mockEmailSend.mockResolvedValue({ id: 'test-email-id' });
    });
  });
});