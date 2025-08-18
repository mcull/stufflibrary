import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { Wordmark } from './Wordmark';

describe('Wordmark Component', () => {
  it('renders the wordmark text', () => {
    render(<Wordmark />);

    expect(screen.getByText('Stuff')).toBeInTheDocument();
    expect(screen.getByText('Library')).toBeInTheDocument();
  });

  it('renders with different sizes', () => {
    const { rerender } = render(<Wordmark size="small" />);
    expect(screen.getByText('Stuff')).toBeInTheDocument();

    rerender(<Wordmark size="large" />);
    expect(screen.getByText('Stuff')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<Wordmark className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
