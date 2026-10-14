import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { useCNICInput, useIBANInput, usePhoneInput } from '../src';

describe('useCNICInput', () => {
  it('starts empty', () => {
    const { result } = renderHook(() => useCNICInput());
    expect(result.current.value).toBe('');
    expect(result.current.state).toBe('empty');
    expect(result.current.info).toBeNull();
    expect(result.current.inputProps.inputMode).toBe('numeric');
    expect(result.current.inputProps['aria-invalid']).toBeUndefined();
  });

  it('formats and validates with setValue', () => {
    const onValueChange = vi.fn();
    const { result } = renderHook(() => useCNICInput({ onValueChange }));
    act(() => result.current.setValue('3520212345672'));
    expect(result.current.value).toBe('35202-1234567-2');
    expect(result.current.state).toBe('valid');
    expect(result.current.info).toMatchObject({
      province: 'Punjab',
      gender: 'female',
    });
    expect(onValueChange).toHaveBeenCalledTimes(1);

    // Setting the same value again does not report a change.
    act(() => result.current.setValue('35202-1234567-2'));
    expect(onValueChange).toHaveBeenCalledTimes(1);
  });

  it('reports invalid values', () => {
    const { result } = renderHook(() => useCNICInput({ defaultValue: '0' }));
    expect(result.current.state).toBe('invalid');
    expect(result.current.inputProps['aria-invalid']).toBe(true);
  });

  it('follows a controlled value', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useCNICInput({ value }),
      { initialProps: { value: '35202' } },
    );
    expect(result.current.state).toBe('incomplete');
    rerender({ value: '3520212345671' });
    expect(result.current.value).toBe('35202-1234567-1');
    expect(result.current.state).toBe('valid');
  });

  it('drives a custom input component through inputProps', async () => {
    function Field() {
      const cnic = useCNICInput();
      return (
        <label>
          CNIC
          <input {...cnic.inputProps} data-state={cnic.state} />
          <span data-testid="province">{cnic.info?.province}</span>
        </label>
      );
    }
    render(<Field />);
    const el = screen.getByLabelText('CNIC') as HTMLInputElement;
    await userEvent.type(el, '6110112345671');
    expect(el.value).toBe('61101-1234567-1');
    expect(el.dataset.state).toBe('valid');
    expect(screen.getByTestId('province').textContent).toBe(
      'Islamabad Capital Territory',
    );
  });
});

describe('usePhoneInput', () => {
  it('returns the analysis once valid', () => {
    const { result } = renderHook(() =>
      usePhoneInput({ defaultValue: '+92 345 1234567' }),
    );
    expect(result.current.value).toBe('+92 345 1234567');
    expect(result.current.state).toBe('valid');
    expect(result.current.info).toEqual({
      valid: true,
      formatted: '+923451234567',
      network: 'Telenor',
    });
    expect(result.current.inputProps.type).toBe('tel');
  });

  it('has no info while incomplete', () => {
    const { result } = renderHook(() =>
      usePhoneInput({ defaultValue: '0300' }),
    );
    expect(result.current.state).toBe('incomplete');
    expect(result.current.info).toBeNull();
  });
});

describe('useIBANInput', () => {
  it('returns the bank name once valid', () => {
    const { result } = renderHook(() => useIBANInput());
    act(() => result.current.setValue('pk36-scbl-0000-0011-2345-6702'));
    expect(result.current.value).toBe('PK36 SCBL 0000 0011 2345 6702');
    expect(result.current.state).toBe('valid');
    expect(result.current.info).toBe(
      'Standard Chartered Bank (Pakistan) Limited',
    );
  });
});
