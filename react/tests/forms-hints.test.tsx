import { render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  PakCheckoutForm,
  addressForScoring,
  resolveLabels,
  usePakHints,
} from '../src';

const loads = vi.hoisted(() => ({ quality: 0, postal: 0 }));

vi.mock('pakdatakit/quality', async (importOriginal) => {
  loads.quality += 1;
  return await importOriginal();
});
vi.mock('pakdatakit/postal', async (importOriginal) => {
  loads.postal += 1;
  return await importOriginal();
});

function field(name: RegExp | string): HTMLInputElement {
  return screen.getByLabelText(name) as HTMLInputElement;
}

describe('hints', () => {
  // Runs first: nothing has imported the hint modules yet.
  it('are not loaded until turned on', async () => {
    const { rerender, container } = render(<PakCheckoutForm />);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(loads).toEqual({ quality: 0, postal: 0 });
    expect(container.querySelector('[aria-live]')).toBeNull();

    rerender(<PakCheckoutForm hints />);
    const region = container.querySelector('[aria-live="polite"]')!;
    expect(region).toBeTruthy();
    await waitFor(() =>
      expect(region.getAttribute('data-status')).toBe('ready'),
    );
    expect(loads).toEqual({ quality: 1, postal: 1 });
  });

  it('score the address, flag the phone and check the postal code', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const { container } = render(<PakCheckoutForm hints onSubmit={onSubmit} />);
    const region = container.querySelector('[aria-live="polite"]')!;
    await waitFor(() =>
      expect(region.getAttribute('data-status')).toBe('ready'),
    );

    await user.type(field('Full name'), 'Ali');
    await user.type(field('Mobile number'), '03001234567');
    await user.selectOptions(field('Province'), 'Sindh');
    await user.selectOptions(field('District'), 'Karachi South');
    await user.type(field('City'), 'Karachi');
    await user.type(field('Address'), 'Saddar');
    await user.type(field(/Postal code/), '54660');

    const text = region.textContent ?? '';
    expect(text).toContain('Suggestions');
    expect(text).toMatch(/Address completeness: \d+ out of 100\./);
    expect(text).toContain('house number');
    expect(text).toContain('This looks like a sample number. Please check it.');
    expect(text).toContain('Postal code 54660 is for Lahore.');

    // Hints never block the submit.
    await user.click(screen.getByRole('button'));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(loads).toEqual({ quality: 1, postal: 1 });
  });

  it('are shown in Urdu', async () => {
    const user = userEvent.setup();
    const { container } = render(<PakCheckoutForm hints locale="ur" />);
    const region = container.querySelector('[aria-live="polite"]')!;
    await waitFor(() =>
      expect(region.getAttribute('data-status')).toBe('ready'),
    );
    await user.type(field('پتہ'), 'Gulberg');
    expect(region.textContent).toContain('تجاویز');
    expect(region.textContent).toContain('پتہ کتنا مکمل ہے');
    expect(region.textContent).toContain('مکان نمبر');
  });

  it('usePakHints reports off, then results', async () => {
    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) =>
        usePakHints({
          enabled,
          address: 'House 12, Street 4, Gulberg III',
          landmark: 'Liberty Market',
          city: 'Lahore',
          postalCode: '54660',
          mobile: '0333-5829146',
          labels: resolveLabels('en'),
        }),
      { initialProps: { enabled: false } },
    );
    expect(result.current.status).toBe('off');
    rerender({ enabled: true });
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.address?.score).toBe(100);
    expect(result.current.address?.missing).toEqual([]);
    expect(result.current.phoneFlags).toEqual([]);
    expect(result.current.postalCodeCity).toBeNull();
  });

  it('addressForScoring joins the parts', () => {
    expect(
      addressForScoring({
        address: ' House 1 ',
        landmark: 'Liberty',
        city: 'Lahore',
        postalCode: '54660',
      }),
    ).toBe('House 1, near Liberty, Lahore 54660');
    expect(
      addressForScoring({ address: 'House 1', landmark: 'opp Mosque' }),
    ).toBe('House 1, opp Mosque');
  });
});
