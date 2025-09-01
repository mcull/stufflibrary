import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import CookiePolicyPage from '../page';

describe('Cookie Policy Page', () => {
  it('renders the cookie policy page', () => {
    render(<CookiePolicyPage />);

    // Check for main heading
    expect(
      screen.getByRole('heading', { name: 'Cookie Policy' })
    ).toBeInTheDocument();
  });

  it('displays the current date', () => {
    render(<CookiePolicyPage />);

    // Check that effective date is displayed with current year
    const currentYear = new Date().getFullYear();
    const effectiveDate = screen.getByText(/Effective Date:/);
    expect(effectiveDate).toBeInTheDocument();
    expect(effectiveDate.textContent).toContain(currentYear.toString());
  });

  it('includes the required cookie usage statement', () => {
    render(<CookiePolicyPage />);

    // Check for the exact first statement as specified in the issue
    expect(
      screen.getByText(
        /StuffLibrary uses essential cookies for sign-in and security/
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Our analytics are cookieless/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /We do not sell or share personal information for cross-context advertising/
      )
    ).toBeInTheDocument();
  });

  it('includes the required do not track statement', () => {
    render(<CookiePolicyPage />);

    // Check for the exact second statement as specified in the issue
    expect(
      screen.getByText(/We do not respond to browser.*Do Not Track.*signals/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /we will honor Global Privacy Control \(GPC\) opt-out signals/
      )
    ).toBeInTheDocument();
  });

  it('includes contact information', () => {
    render(<CookiePolicyPage />);

    // Check for contact email
    expect(screen.getByText('privacy@stufflibrary.org')).toBeInTheDocument();
  });

  it('has proper heading structure', () => {
    render(<CookiePolicyPage />);

    // Check for proper accessibility structure
    const heading = screen.getByRole('heading', { name: 'Cookie Policy' });
    expect(heading.tagName).toBe('H1');
  });
});
