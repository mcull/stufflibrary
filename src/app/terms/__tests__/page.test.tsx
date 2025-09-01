import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import TermsOfServicePage from '../page';

describe('Terms of Service Page', () => {
  it('renders the terms of service page', () => {
    render(<TermsOfServicePage />);

    // Check for main heading
    expect(
      screen.getByRole('heading', { name: 'Terms of Service' })
    ).toBeInTheDocument();

    // Check for some key sections
    expect(screen.getByText('1. ACCEPTANCE OF TERMS')).toBeInTheDocument();
    expect(
      screen.getByText('2. GOOD FAITH USAGE REQUIREMENT')
    ).toBeInTheDocument();
    expect(
      screen.getByText('3. USER RESPONSIBILITY AND ASSUMPTION OF RISK')
    ).toBeInTheDocument();
    expect(
      screen.getByText('4. CONTENT DISCLAIMER AND LIMITATION OF LIABILITY')
    ).toBeInTheDocument();
    expect(
      screen.getByText('5. CIVIC UTILITY STATUS AND NON-COMMERCIAL NATURE')
    ).toBeInTheDocument();
  });

  it('displays the current date', () => {
    render(<TermsOfServicePage />);

    // Check that effective date is displayed with current year
    const currentYear = new Date().getFullYear();
    const effectiveDate = screen.getByText(/Effective Date:/);
    expect(effectiveDate).toBeInTheDocument();
    expect(effectiveDate.textContent).toContain(currentYear.toString());
  });

  it('includes contact information', () => {
    render(<TermsOfServicePage />);

    // Check for contact email
    expect(screen.getByText('legal@stufflibrary.org')).toBeInTheDocument();
  });

  it('includes important warnings and disclaimers', () => {
    render(<TermsOfServicePage />);

    // Check for key warning text
    expect(screen.getByText(/BY USING THIS SERVICE/)).toBeInTheDocument();
    expect(
      screen.getByText(/STUFFLIBRARY CANNOT AND DOES NOT GUARANTEE/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW/)
    ).toBeInTheDocument();
  });

  it('mentions civic utility nature', () => {
    render(<TermsOfServicePage />);

    // Check that civic utility status is mentioned
    expect(
      screen.getByText(/StuffLibrary operates as a civic utility/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/not as a commercial business entity/)
    ).toBeInTheDocument();
  });
});
