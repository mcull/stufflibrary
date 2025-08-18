import { render, screen } from '@testing-library/react';

import Home from './page';

describe('Home Page', () => {
  it('renders the main heading', () => {
    render(<Home />);
    expect(screen.getByText('Share more, buy less')).toBeInTheDocument();
  });

  it('renders the call-to-action buttons', () => {
    render(<Home />);
    expect(screen.getByText('Get Started')).toBeInTheDocument();
    expect(screen.getByText('Find My Neighborhood')).toBeInTheDocument();
  });
});
