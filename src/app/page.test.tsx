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

  it('renders the main subheading', () => {
    render(<Home />);
    expect(
      screen.getByText(/A neighborhood platform for safely sharing stuff/)
    ).toBeInTheDocument();
  });
});
