import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { TrustBadge } from '../TrustBadge';

describe('TrustBadge', () => {
  it('renders a label for each tier', () => {
    const { rerender } = render(<TrustBadge tier="NEW" />);
    expect(screen.getByText('New')).toBeInTheDocument();
    rerender(<TrustBadge tier="HIGHLY_TRUSTED" />);
    expect(screen.getByText('Highly Trusted')).toBeInTheDocument();
  });
  it('renders nothing for a null tier', () => {
    const { container } = render(<TrustBadge tier={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
