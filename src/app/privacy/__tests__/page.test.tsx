import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import PrivacyPolicyPage from '../page';

describe('Privacy Policy Page', () => {
  it('renders the privacy policy page', () => {
    render(<PrivacyPolicyPage />);

    // Check for main heading
    expect(
      screen.getByRole('heading', { name: 'Privacy Policy' })
    ).toBeInTheDocument();

    // Check for key sections
    expect(screen.getByText('1. OVERVIEW')).toBeInTheDocument();
    expect(screen.getByText('2. INFORMATION WE COLLECT')).toBeInTheDocument();
    expect(
      screen.getByText('3. PRIVACY LIMITATIONS AND RISKS')
    ).toBeInTheDocument();
    expect(
      screen.getByText('4. REASONABLE MEASURES WE TAKE')
    ).toBeInTheDocument();
    expect(
      screen.getByText('5. WHEN WE SHARE INFORMATION')
    ).toBeInTheDocument();
  });

  it('displays the current date', () => {
    render(<PrivacyPolicyPage />);

    // Check that effective date is displayed with current year
    const currentYear = new Date().getFullYear();
    const effectiveDate = screen.getByText(/Effective Date:/);
    expect(effectiveDate).toBeInTheDocument();
    expect(effectiveDate.textContent).toContain(currentYear.toString());
  });

  it('includes critical privacy warning', () => {
    render(<PrivacyPolicyPage />);

    // Check for the important privacy notice
    expect(screen.getByText('IMPORTANT PRIVACY NOTICE')).toBeInTheDocument();
    expect(
      screen.getByText(
        /Do not contribute any content to StuffLibrary that you consider/
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /the person at this address and this email address has this stuff/
      )
    ).toBeInTheDocument();
  });

  it('mentions specific data types collected', () => {
    render(<PrivacyPolicyPage />);

    // Check for specific data collection mentions
    expect(screen.getByText(/Name and Contact Details/)).toBeInTheDocument();
    expect(screen.getByText(/Physical Address/)).toBeInTheDocument();
    expect(screen.getByText(/Photographs/)).toBeInTheDocument();
    expect(screen.getByText(/Video Requests/)).toBeInTheDocument();
    expect(screen.getByText(/Written Communications/)).toBeInTheDocument();
  });

  it('emphasizes privacy limitations and risks', () => {
    render(<PrivacyPolicyPage />);

    // Check for privacy risk warnings
    expect(
      screen.getByText(/You should assume that any information you share/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/could potentially become public knowledge/)
    ).toBeInTheDocument();
  });

  it('mentions libraries are private by default', () => {
    render(<PrivacyPolicyPage />);

    // Check for private library mention
    expect(
      screen.getByText(/All libraries are private by default/)
    ).toBeInTheDocument();
  });

  it('includes final privacy reminder', () => {
    render(<PrivacyPolicyPage />);

    // Check for final warning
    expect(screen.getByText('FINAL PRIVACY REMINDER')).toBeInTheDocument();
    expect(
      screen.getByText(/never share anything you truly want to keep private/)
    ).toBeInTheDocument();
  });

  it('includes contact information', () => {
    render(<PrivacyPolicyPage />);

    // Check for contact email
    expect(screen.getByText('privacy@stufflibrary.org')).toBeInTheDocument();
  });

  it('addresses data sharing limitations', () => {
    render(<PrivacyPolicyPage />);

    // Check for data sharing commitments
    expect(
      screen.getByText(
        /We do not share your data with third parties for commercial purposes/
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(/We do not sell access to your information/)
    ).toBeInTheDocument();
  });
});
