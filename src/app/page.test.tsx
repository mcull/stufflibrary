import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import Home from './page';

describe('Home Page', () => {
  it('renders the main heading', () => {
    render(<Home />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      /share more.*buy less/i
    );
  });

  it('renders the main call-to-action button', () => {
    render(<Home />);
    expect(screen.getAllByText('Learn More')[0]).toBeInTheDocument();
  });
});
