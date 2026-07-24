import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { Footer } from '../Footer';

describe('Footer legal links', () => {
  it('links to the SMS notifications page (#505)', () => {
    render(<Footer />);

    // Carriers re-review campaigns; the SMS terms need to stay findable from
    // any page without an account.
    expect(
      screen.getByRole('link', { name: /text messages/i })
    ).toHaveAttribute('href', '/sms');
  });

  it('keeps the existing legal links', () => {
    render(<Footer />);

    expect(
      screen.getByRole('link', { name: /privacy policy/i })
    ).toHaveAttribute('href', '/privacy');
    expect(
      screen.getByRole('link', { name: /terms of service/i })
    ).toHaveAttribute('href', '/terms');
    expect(
      screen.getByRole('link', { name: /cookie policy/i })
    ).toHaveAttribute('href', '/cookies');
  });
});
