import { describe, it, expect } from 'vitest';

import {
  SMS_CONSENT_DISCLOSURE,
  SMS_CONSENT_HEADLINE,
  SMS_MESSAGE_TYPES,
  SMS_OPT_IN_URL,
  SMS_SIGNUP_URL,
} from '../sms-consent';

describe('SMS consent copy (#505)', () => {
  it('names the brand in the consent headline', () => {
    expect(SMS_CONSENT_HEADLINE).toMatch(/StuffLibrary/);
  });

  it('carries every disclosure carriers require at the point of consent', () => {
    expect(SMS_CONSENT_DISCLOSURE).toMatch(/Message and data rates may apply/);
    expect(SMS_CONSENT_DISCLOSURE).toMatch(/Message frequency varies/);
    expect(SMS_CONSENT_DISCLOSURE).toMatch(/HELP/);
    expect(SMS_CONSENT_DISCLOSURE).toMatch(/STOP/);
  });

  it('points at URLs a reviewer can open without an account', () => {
    expect(SMS_SIGNUP_URL).toBe('https://www.stufflibrary.org/auth/signin');
    expect(SMS_OPT_IN_URL).toBe('https://www.stufflibrary.org/profile');
  });

  it('brands every sample message', () => {
    for (const type of SMS_MESSAGE_TYPES) {
      expect(type.example).toMatch(/^StuffLibrary:/);
    }
  });

  it('keeps sample links on our own domain', () => {
    // Public URL shorteners get campaigns rejected and messages filtered.
    for (const type of SMS_MESSAGE_TYPES) {
      const urls = type.example.match(/https?:\/\/\S+/g) ?? [];
      for (const url of urls) {
        expect(url).toMatch(/^https:\/\/www\.stufflibrary\.org\//);
      }
    }
  });

  it('describes both message categories the campaign registers', () => {
    const labels = SMS_MESSAGE_TYPES.map((t) => t.label).join(' ');
    expect(labels).toMatch(/borrow request/i);
    expect(labels).toMatch(/sign-in code/i);
  });
});
