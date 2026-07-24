import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { GuestPreview } from '../GuestPreview';

const base = {
  libraryName: 'HAASS',
  memberCount: 3,
  onClaim: () => {},
};

describe('GuestPreview — header slot', () => {
  it('names the inviter for a personal invite, emphasizing only the names', () => {
    const { container } = render(
      <GuestPreview
        slot="header"
        {...base}
        invitationContext={{ kind: 'personal', inviterName: 'Marc' }}
      />
    );
    expect(container.textContent).toContain('Marc invited you to HAASS');
    // Only the names are bold, not the connective words.
    expect(screen.getByText('Marc').tagName).toBe('STRONG');
    expect(screen.getByText('HAASS').tagName).toBe('STRONG');
  });

  it('names the host for a join code, emphasizing only the names', () => {
    const { container } = render(
      <GuestPreview
        slot="header"
        {...base}
        invitationContext={{ kind: 'code', inviterName: 'Marc' }}
      />
    );
    expect(container.textContent).toContain('HAASS — hosted by Marc');
    expect(screen.getByText('HAASS').tagName).toBe('STRONG');
    expect(screen.getByText('Marc').tagName).toBe('STRONG');
  });

  it('falls back to a library-only welcome when context is null', () => {
    render(<GuestPreview slot="header" {...base} invitationContext={null} />);
    expect(screen.getByText(/Welcome to/)).toBeInTheDocument();
    expect(screen.queryByText(/invited you/)).not.toBeInTheDocument();
  });

  it('falls back when the inviter name is missing', () => {
    render(
      <GuestPreview
        slot="header"
        {...base}
        invitationContext={{ kind: 'personal', inviterName: null }}
      />
    );
    expect(screen.getByText(/Welcome to/)).toBeInTheDocument();
    expect(screen.queryByText(/invited you/)).not.toBeInTheDocument();
  });

  it('states the count in the plural', () => {
    render(<GuestPreview slot="header" {...base} invitationContext={null} />);
    expect(screen.getByText(/3 members share this shelf/)).toBeInTheDocument();
  });

  it('states the count in the singular', () => {
    render(
      <GuestPreview
        slot="header"
        {...base}
        memberCount={1}
        invitationContext={null}
      />
    );
    expect(screen.getByText(/1 member shares this shelf/)).toBeInTheDocument();
  });

  it('never says "porch" anywhere in the header', () => {
    const { container } = render(
      <GuestPreview
        slot="header"
        {...base}
        invitationContext={{ kind: 'personal', inviterName: 'Marc' }}
      />
    );
    expect(container.textContent?.toLowerCase()).not.toContain('porch');
  });

  it('renders the title as a semantic heading', () => {
    render(
      <GuestPreview
        slot="header"
        {...base}
        invitationContext={{ kind: 'personal', inviterName: 'Marc' }}
      />
    );
    expect(
      screen.getByRole('heading', { name: /Marc invited you to HAASS/i })
    ).toBeInTheDocument();
  });
});

describe('GuestPreview — claim slot', () => {
  it('renders the claim CTA and calls onClaim', () => {
    const onClaim = vi.fn();
    render(
      <GuestPreview
        slot="claim"
        {...base}
        onClaim={onClaim}
        invitationContext={null}
      />
    );
    const button = screen.getByRole('button', {
      name: /Claim your library card/i,
    });
    fireEvent.click(button);
    expect(onClaim).toHaveBeenCalledTimes(1);
  });

  it('renders the card label and honest subline', () => {
    render(<GuestPreview slot="claim" {...base} invitationContext={null} />);
    expect(screen.getByText('LIBRARY CARD · HAASS')).toBeInTheDocument();
    expect(screen.getByText('Free · takes a minute')).toBeInTheDocument();
  });
});
