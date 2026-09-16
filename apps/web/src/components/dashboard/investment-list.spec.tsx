import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InvestmentList from './investment-list';
import type { Investment } from '@/lib/mock-data';

const mockInvestments: Investment[] = [
  {
    id: 'aapl',
    name: 'Apple Inc.',
    ticker: 'AAPL',
    color: '#0071e3',
    currentValue: 18420,
    totalInvested: 14200,
    pnl: 4220,
    pnlPct: 29.72,
    shares: 82,
    avgCost: 173.17,
  },
  {
    id: 'msft',
    name: 'Microsoft Corp.',
    ticker: 'MSFT',
    color: '#7b68ee',
    currentValue: 14850,
    totalInvested: 12600,
    pnl: 2250,
    pnlPct: 17.86,
    shares: 35,
    avgCost: 360.0,
  },
];

describe('InvestmentList Component', () => {
  it('should render "Total Portfolio" option', () => {
    const handleSelect = vi.fn();
    render(
      <InvestmentList
        investments={mockInvestments}
        selectedId={null}
        onSelect={handleSelect}
      />
    );

    expect(screen.getByText('Total Portfolio')).toBeInTheDocument();
  });

  it('should render all investments', () => {
    const handleSelect = vi.fn();
    render(
      <InvestmentList
        investments={mockInvestments}
        selectedId={null}
        onSelect={handleSelect}
      />
    );

    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
    expect(screen.getByText('MSFT')).toBeInTheDocument();
    expect(screen.getByText('Microsoft Corp.')).toBeInTheDocument();
  });

  it('should display investment values correctly', () => {
    const handleSelect = vi.fn();
    const { container } = render(
      <InvestmentList
        investments={mockInvestments}
        selectedId={null}
        onSelect={handleSelect}
      />
    );

    // Check that the values are rendered (with locale formatting)
    expect(container.textContent).toMatch(/18,420|18420/);
    expect(container.textContent).toMatch(/14,850|14850/);
  });

  it('should highlight selected investment', () => {
    const handleSelect = vi.fn();
    render(
      <InvestmentList
        investments={mockInvestments}
        selectedId="aapl"
        onSelect={handleSelect}
      />
    );

    const selectedButton = screen.getByText('AAPL').closest('button');
    expect(selectedButton).toHaveClass('bg-gray-900', 'text-white');
  });

  it('should highlight Total Portfolio when selectedId is null', () => {
    const handleSelect = vi.fn();
    render(
      <InvestmentList
        investments={mockInvestments}
        selectedId={null}
        onSelect={handleSelect}
      />
    );

    const portfolioButton = screen.getByText('Total Portfolio').closest('button');
    expect(portfolioButton).toHaveClass('bg-gray-900', 'text-white');
  });

  it('should call onSelect with null when Total Portfolio is clicked', async () => {
    const user = userEvent.setup();
    const handleSelect = vi.fn();
    render(
      <InvestmentList
        investments={mockInvestments}
        selectedId="aapl"
        onSelect={handleSelect}
      />
    );

    const portfolioButton = screen.getByText('Total Portfolio').closest('button');
    await user.click(portfolioButton!);

    expect(handleSelect).toHaveBeenCalledWith(null);
  });

  it('should call onSelect with investment id when clicked', async () => {
    const user = userEvent.setup();
    const handleSelect = vi.fn();
    render(
      <InvestmentList
        investments={mockInvestments}
        selectedId={null}
        onSelect={handleSelect}
      />
    );

    const aaplButton = screen.getByText('AAPL').closest('button');
    await user.click(aaplButton!);

    expect(handleSelect).toHaveBeenCalledWith('aapl');
  });

  it('should display positive P&L with + prefix', () => {
    const handleSelect = vi.fn();
    render(
      <InvestmentList
        investments={mockInvestments}
        selectedId={null}
        onSelect={handleSelect}
      />
    );

    expect(screen.getByText('+29.72%')).toBeInTheDocument();
    expect(screen.getByText('+17.86%')).toBeInTheDocument();
  });

  it('should display P&L color as positive when pnl >= 0', () => {
    const handleSelect = vi.fn();
    render(
      <InvestmentList
        investments={mockInvestments}
        selectedId={null}
        onSelect={handleSelect}
      />
    );

    const pnlElements = screen.getAllByText(/\+[0-9]+\.[0-9]+%/);
    pnlElements.forEach((element) => {
      expect(element).toHaveClass('text-emerald-600');
    });
  });

  it('should display P&L color as negative when pnl < 0', () => {
    const handleSelect = vi.fn();
    const investmentWithLoss: Investment[] = [
      {
        ...mockInvestments[0],
        pnl: -1000,
        pnlPct: -10.5,
      },
    ];

    render(
      <InvestmentList
        investments={investmentWithLoss}
        selectedId={null}
        onSelect={handleSelect}
      />
    );

    const pnlElements = screen.getAllByText(/-10\.5/);
    expect(pnlElements.length).toBeGreaterThan(0);
    expect(pnlElements[0]).toHaveClass('text-red-500');
  });

  it('should render empty list when no investments provided', () => {
    const handleSelect = vi.fn();
    const { container } = render(
      <InvestmentList
        investments={[]}
        selectedId={null}
        onSelect={handleSelect}
      />
    );

    expect(screen.getByText('Total Portfolio')).toBeInTheDocument();
    const investmentButtons = container.querySelectorAll('button');
    expect(investmentButtons).toHaveLength(1); // Only Total Portfolio
  });
});
