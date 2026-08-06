import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Skeleton, CardSkeleton, ResultsSkeleton, ViewSkeleton } from '../Skeleton';

describe('Skeleton', () => {
  it('renders an accessible busy status with default label', () => {
    render(<Skeleton />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-busy', 'true');
    expect(status).toHaveAttribute('aria-label', 'Loading');
    // Animated shimmer class is applied for perceived-performance feedback
    expect(status.className).toContain('animate-pulse');
  });

  it('applies a custom label and className', () => {
    render(<Skeleton className="h-8 w-1/2" label="Fetching results" />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-label', 'Fetching results');
    expect(status.className).toContain('h-8');
    expect(status.className).toContain('w-1/2');
  });

  it('CardSkeleton renders the requested number of lines plus a heading', () => {
    render(<CardSkeleton lines={4} />);
    // 1 heading + 4 lines = 5 status elements
    expect(screen.getAllByRole('status')).toHaveLength(5);
  });

  it('ResultsSkeleton renders the results placeholder', () => {
    render(<ResultsSkeleton />);
    expect(screen.getByTestId('results-skeleton')).toBeInTheDocument();
  });

  it('ViewSkeleton renders the generic view placeholder', () => {
    render(<ViewSkeleton />);
    expect(screen.getByTestId('view-skeleton')).toBeInTheDocument();
  });
});
