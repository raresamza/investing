import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TimeRangeSelector from './time-range-selector';
import type { TimeRange } from '@/lib/mock-data';

describe('TimeRangeSelector Component', () => {
  it('should render all time range options', () => {
    const handleChange = vi.fn();
    render(<TimeRangeSelector selected="1Y" onChange={handleChange} />);

    expect(screen.getByText('1W')).toBeInTheDocument();
    expect(screen.getByText('1M')).toBeInTheDocument();
    expect(screen.getByText('3M')).toBeInTheDocument();
    expect(screen.getByText('6M')).toBeInTheDocument();
    expect(screen.getByText('1Y')).toBeInTheDocument();
    expect(screen.getByText('Max')).toBeInTheDocument();
  });

  it('should highlight the selected range', () => {
    const handleChange = vi.fn();
    render(<TimeRangeSelector selected="1M" onChange={handleChange} />);

    const selectedButton = screen.getByText('1M').closest('button');
    expect(selectedButton).toHaveClass('bg-white', 'text-gray-900', 'shadow-sm');
  });

  it('should not highlight unselected ranges', () => {
    const handleChange = vi.fn();
    render(<TimeRangeSelector selected="1M" onChange={handleChange} />);

    const unselectedButton = screen.getByText('1Y').closest('button');
    expect(unselectedButton).toHaveClass('text-gray-500');
    expect(unselectedButton).not.toHaveClass('bg-white');
  });

  it('should call onChange when a range is clicked', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<TimeRangeSelector selected="1Y" onChange={handleChange} />);

    const button = screen.getByText('3M').closest('button');
    await user.click(button!);

    expect(handleChange).toHaveBeenCalledWith('3M');
  });

  it('should handle multiple clicks on different ranges', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<TimeRangeSelector selected="1Y" onChange={handleChange} />);

    await user.click(screen.getByText('1W').closest('button')!);
    expect(handleChange).toHaveBeenCalledWith('1W');

    await user.click(screen.getByText('6M').closest('button')!);
    expect(handleChange).toHaveBeenCalledWith('6M');

    await user.click(screen.getByText('Max').closest('button')!);
    expect(handleChange).toHaveBeenCalledWith('MAX');
  });

  it('should have proper styling for active button', () => {
    render(<TimeRangeSelector selected="1W" onChange={() => {}} />);

    const activeButton = screen.getByText('1W').closest('button');
    expect(activeButton).toHaveClass('bg-white', 'ring-1', 'ring-gray-900/5');
  });

  it('should have proper styling for inactive buttons', () => {
    render(<TimeRangeSelector selected="1W" onChange={() => {}} />);

    const inactiveButton = screen.getByText('1M').closest('button');
    expect(inactiveButton).toHaveClass('hover:text-gray-700');
  });
});
