import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { ConsoleCard, KpiCard, StampChip } from '../cards';

describe('ConsoleCard', () => {
  it('renders title and children', () => {
    render(
      <ConsoleCard title="TODAY'S CIRCULATION" action={<button>LIVE</button>}>
        <div>the ledger</div>
      </ConsoleCard>
    );
    expect(screen.getByText("TODAY'S CIRCULATION")).toBeInTheDocument();
    expect(screen.getByText('the ledger')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'LIVE' })).toBeInTheDocument();
  });
});

describe('KpiCard', () => {
  it('renders label, value and delta', () => {
    render(
      <KpiCard
        label="MEMBERS"
        value={1311}
        delta="+12 this week"
        deltaTone="green"
      />
    );
    expect(screen.getByText('MEMBERS')).toBeInTheDocument();
    expect(screen.getByText('1311')).toBeInTheDocument();
    expect(screen.getByText('+12 this week')).toBeInTheDocument();
  });

  it('omits the delta line when no delta is given', () => {
    render(<KpiCard label="ITEMS" value="3,912" />);
    expect(screen.getByText('3,912')).toBeInTheDocument();
    expect(screen.queryByText(/this week/)).toBeNull();
  });
});

describe('StampChip', () => {
  it('inks a green-tone stamp in okGreen', () => {
    render(<StampChip label="RETURNED" tone="green" />);
    const stamp = screen.getByText('RETURNED');
    // sx styles land in an emotion class, not a style attribute, and
    // happy-dom's getComputedStyle can't resolve them — so assert the
    // stamp's emotion rule carries the okGreen ink.
    const cls = stamp.className.split(' ').find((c) => c.startsWith('css-'));
    expect(cls).toBeTruthy();
    const css = Array.from(document.querySelectorAll('style'))
      .map((s) => s.textContent)
      .join('\n');
    const rule = css.split('}').find((chunk) => chunk.includes(`.${cls}`));
    expect(rule).toContain('1.5px solid #1E6E42');
    expect(rule).toContain('color:#1E6E42');
  });
});
