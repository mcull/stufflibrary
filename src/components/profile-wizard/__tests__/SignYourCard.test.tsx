import { render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { describe, it, expect } from 'vitest';

import { TERMS_VERSION } from '@/lib/capabilities';

import { SignYourCard } from '../SignYourCard';

function Harness() {
  const methods = useForm({
    defaultValues: { name: '', agreedToTerms: false },
  });
  return (
    <FormProvider {...methods}>
      <SignYourCard />
    </FormProvider>
  );
}

describe('SignYourCard', () => {
  it('offers one promise checkbox, not five', () => {
    render(<Harness />);
    expect(screen.getAllByRole('checkbox')).toHaveLength(1);
  });

  it('uses the two-sided promise copy', () => {
    render(<Harness />);
    expect(
      screen.getByText(/take care of the stuff I borrow/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/won.t lend anything irreplaceable/i)
    ).toBeInTheDocument();
  });

  it('shows the house rules as readable text, covering every topic', () => {
    render(<Harness />);
    expect(screen.getByText(/household goods/i)).toBeInTheDocument();
    expect(screen.getByText(/age-restricted/i)).toBeInTheDocument();
    expect(
      screen.getByText(/take care of what you borrow/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/neighbors first/i)).toBeInTheDocument();
  });

  it('links terms and privacy and shows the version label', () => {
    render(<Harness />);
    const terms = screen.getByRole('link', { name: /terms/i });
    expect(terms).toHaveAttribute('href', '/terms');
    expect(screen.getByRole('link', { name: /privacy/i })).toHaveAttribute(
      'href',
      '/privacy'
    );
    expect(screen.getByText(new RegExp(TERMS_VERSION))).toBeInTheDocument();
  });

  it('renders a name/signature field', () => {
    render(<Harness />);
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
  });
});
