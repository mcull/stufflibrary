import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { FaqContent } from '@/app/faq/FaqContent';
import { DirectoryContent } from '@/app/lending-libraries/DirectoryContent';
import { publishedFaq } from '@/data/faq';
import { stateSlug } from '@/lib/lending-libraries';

describe('stateSlug', () => {
  it('makes anchor-safe slugs', () => {
    expect(stateSlug('California')).toBe('california');
    expect(stateSlug('District of Columbia')).toBe('district-of-columbia');
    expect(stateSlug('New Hampshire')).toBe('new-hampshire');
  });
});

describe('FaqContent', () => {
  it('renders every published question and no held-back ones', () => {
    render(<FaqContent categories={publishedFaq()} />);
    expect(screen.getByText('What is StuffLibrary?')).toBeInTheDocument();
    expect(
      screen.getByText('Why would this work? People are flaky.')
    ).toBeInTheDocument();
    expect(screen.queryByText(/gets hurt/)).not.toBeInTheDocument();
  });
});

describe('DirectoryContent', () => {
  const states = [
    {
      name: 'Test State',
      entries: [
        {
          name: 'Verified Tool Library',
          city: 'Springfield',
          type: 'standalone tool library',
          description: 'Lends tools to *neighbors* since 1980.',
          address: '1 Main St, Springfield, TS 00001',
          hours: 'Sat 10–2',
          url: 'https://example.org',
          verified: true,
          verifiedNote: null,
        },
        {
          name: 'Ghost Library',
          city: 'Shelbyville',
          type: 'public-library LoT collection',
          description: 'Signs of life we could not fully confirm this year.',
          address: null,
          hours: null,
          url: null,
          verified: false,
          verifiedNote: 'site live but last update 2019',
        },
      ],
    },
  ];

  it('renders entries with anchors, verified notes, and UNVERIFIED badges', () => {
    const { container } = render(
      <DirectoryContent
        intro="A **snapshot**, not a registry."
        states={states}
      />
    );
    expect(container.querySelector('#test-state')).not.toBeNull();
    const link = screen.getByRole('link', { name: 'Verified Tool Library' });
    expect(link).toHaveAttribute('href', 'https://example.org');
    expect(screen.getByText('verified July 2026')).toBeInTheDocument();
    expect(screen.getByText('UNVERIFIED')).toBeInTheDocument();
    // Unlinked entry still renders as plain text.
    expect(screen.getByText('Ghost Library')).toBeInTheDocument();
  });
});
