import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import {
  SMS_CONSENT_DISCLOSURE,
  SMS_CONSENT_HEADLINE,
} from '@/lib/sms-consent';

import SmsNotificationsPage from '../page';

describe('Public SMS consent page (#505)', () => {
  it('renders without authentication', () => {
    render(<SmsNotificationsPage />);

    expect(
      screen.getByRole('heading', { name: /text message notifications/i })
    ).toBeInTheDocument();
  });

  it('gives reviewers the exact URL where users sign up', () => {
    render(<SmsNotificationsPage />);

    expect(
      screen.getByText('https://www.stufflibrary.org/auth/signin')
    ).toBeInTheDocument();
    expect(
      screen.getByText('https://www.stufflibrary.org/profile')
    ).toBeInTheDocument();
  });

  it('reproduces the consent language verbatim from the product', () => {
    render(<SmsNotificationsPage />);

    expect(screen.getByText(SMS_CONSENT_HEADLINE)).toBeInTheDocument();
    expect(screen.getByText(SMS_CONSENT_DISCLOSURE)).toBeInTheDocument();
  });

  it('shows the opt-in checkbox unchecked, as a new member sees it', () => {
    render(<SmsNotificationsPage />);

    const checkbox = screen.getByRole('checkbox', {
      name: /text me borrow requests/i,
    });
    expect(checkbox).not.toBeChecked();
  });

  it('states that consent is optional and not a condition of service', () => {
    render(<SmsNotificationsPage />);

    expect(screen.getByText(/not a condition of using/i)).toBeInTheDocument();
  });

  it('explains how to opt out and how to get help', () => {
    render(<SmsNotificationsPage />);

    expect(screen.getByText(/Reply STOP to any message/i)).toBeInTheDocument();
    expect(screen.getByText(/Reply HELP to any message/i)).toBeInTheDocument();
  });

  it('states that mobile data is never shared for marketing', () => {
    render(<SmsNotificationsPage />);

    expect(
      screen.getByText(
        /No mobile information will be shared with third parties or affiliates for marketing or promotional purposes/i
      )
    ).toBeInTheDocument();
  });

  it('links to the privacy policy and terms', () => {
    render(<SmsNotificationsPage />);

    expect(
      screen.getByRole('link', { name: /privacy policy/i })
    ).toHaveAttribute('href', '/privacy');
    expect(
      screen.getByRole('link', { name: /terms of service/i })
    ).toHaveAttribute('href', '/terms');
  });
});
