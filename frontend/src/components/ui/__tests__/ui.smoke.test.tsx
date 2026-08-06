/**
 * Design-system smoke tests (OPT-UI.1).
 *
 * Guards the foundation: cn() conflict merging, Button cva variants,
 * and the Radix Accordion's accessibility contract (aria-expanded +
 * keyboard/click toggling) that the hand-rolled version lacked.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';

describe('cn()', () => {
  it('merges conflicting Tailwind classes with last-wins semantics', () => {
    expect(cn('p-4', 'p-2')).toBe('p-2');
    expect(cn('bg-primary', false && 'bg-destructive')).toBe('bg-primary');
    expect(cn('text-sm', undefined, 'font-bold')).toBe('text-sm font-bold');
  });
});

describe('Button', () => {
  it('renders variants with distinct classes and keeps custom className', () => {
    const { rerender } = render(<Button>Save</Button>);
    const btn = screen.getByRole('button', { name: 'Save' });
    expect(btn.className).toContain('bg-primary');

    rerender(<Button variant="destructive">Delete</Button>);
    expect(screen.getByRole('button', { name: 'Delete' }).className).toContain('bg-destructive');

    rerender(<Button className="w-full">Wide</Button>);
    expect(screen.getByRole('button', { name: 'Wide' }).className).toContain('w-full');
  });

  it('meets the 44px tap-target requirement at default size (Req 19.2)', () => {
    render(<Button>Tap</Button>);
    expect(screen.getByRole('button', { name: 'Tap' }).className).toContain('h-11');
  });

  it('renders as the child element with asChild (link styled as button)', () => {
    render(
      <Button asChild>
        <a href="/export">Export</a>
      </Button>
    );
    const link = screen.getByRole('link', { name: 'Export' });
    expect(link.className).toContain('bg-primary');
  });
});

describe('Accordion', () => {
  function TwoSections() {
    return (
      <Accordion type="multiple" defaultValue={['a']}>
        <AccordionItem value="a">
          <AccordionTrigger>Income</AccordionTrigger>
          <AccordionContent>Income details</AccordionContent>
        </AccordionItem>
        <AccordionItem value="b">
          <AccordionTrigger>Deductions</AccordionTrigger>
          <AccordionContent>Deduction details</AccordionContent>
        </AccordionItem>
      </Accordion>
    );
  }

  it('exposes aria-expanded and honours defaultValue', () => {
    render(<TwoSections />);
    expect(screen.getByRole('button', { name: 'Income' })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
    expect(screen.getByRole('button', { name: 'Deductions' })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
    expect(screen.getByText('Income details')).toBeVisible();
  });

  it('toggles sections on click, allowing multiple open (type="multiple")', async () => {
    const user = userEvent.setup();
    render(<TwoSections />);

    await user.click(screen.getByRole('button', { name: 'Deductions' }));

    // Both sections now open simultaneously — matches TaxBreakdown behaviour
    expect(screen.getByRole('button', { name: 'Income' })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
    expect(screen.getByRole('button', { name: 'Deductions' })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
    expect(screen.getByText('Deduction details')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Income' }));
    expect(screen.getByRole('button', { name: 'Income' })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
  });
});
