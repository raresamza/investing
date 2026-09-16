import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatCard from './stat-card';

describe('StatCard Component', () => {
  it('should render label and value', () => {
    render(<StatCard label="Test Label" value="$1,000" />);

    expect(screen.getByText('Test Label')).toBeInTheDocument();
    expect(screen.getByText('$1,000')).toBeInTheDocument();
  });

  it('should render detail text when provided', () => {
    render(
      <StatCard label="Test Label" value="$1,000" detail="+10.5%" />
    );

    expect(screen.getByText('+10.5%')).toBeInTheDocument();
  });

  it('should apply positive color to detail when detailColor is positive', () => {
    const { container } = render(
      <StatCard
        label="Test Label"
        value="$1,000"
        detail="+10.5%"
        detailColor="positive"
      />
    );

    const detail = screen.getByText('+10.5%');
    expect(detail).toHaveClass('text-emerald-600');
  });

  it('should apply negative color to detail when detailColor is negative', () => {
    render(
      <StatCard
        label="Test Label"
        value="$1,000"
        detail="-5.2%"
        detailColor="negative"
      />
    );

    const detail = screen.getByText('-5.2%');
    expect(detail).toHaveClass('text-red-500');
  });

  it('should apply neutral color to detail by default', () => {
    render(
      <StatCard
        label="Test Label"
        value="$1,000"
        detail="0%"
      />
    );

    const detail = screen.getByText('0%');
    expect(detail).toHaveClass('text-gray-500');
  });

  it('should not render detail when detail is not provided', () => {
    render(<StatCard label="Test Label" value="$1,000" />);

    expect(screen.queryByText(/^[\+\-]?[0-9]+/)).not.toBeInTheDocument();
  });

  it('should have proper CSS classes', () => {
    const { container } = render(
      <StatCard label="Test Label" value="$1,000" />
    );

    const card = container.querySelector('.rounded-2xl');
    expect(card).toBeInTheDocument();
    expect(card).toHaveClass('border', 'border-gray-100', 'bg-white', 'p-5', 'shadow-sm');
  });
});
