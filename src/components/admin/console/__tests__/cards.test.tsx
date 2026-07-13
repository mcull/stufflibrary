import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { ConsoleCard, KpiCard, STAMP_INK, StampChip } from '../cards';
import { console_ } from '../tokens';

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
  it('maps the green tone to okGreen ink', () => {
    expect(STAMP_INK.green).toBe(console_.okGreen);
    expect(STAMP_INK.green).toBe('#1E6E42');
  });

  it('renders the stamp label', () => {
    render(<StampChip label="RETURNED" tone="green" />);
    expect(screen.getByText('RETURNED')).toBeInTheDocument();
  });
});
