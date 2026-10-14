import { createRef, useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { InputState } from 'pakdatakit/input';
import { CNICInput, IBANInput, PhoneInput } from '../src';

function input(): HTMLInputElement {
  return screen.getByRole('textbox') as HTMLInputElement;
}

describe('CNICInput', () => {
  it('formats as the user types and reports state and info', async () => {
    const onValueChange = vi.fn();
    render(<CNICInput aria-label="CNIC" onValueChange={onValueChange} />);
    await userEvent.type(input(), '3520212345671');

    expect(input().value).toBe('35202-1234567-1');
    expect(onValueChange).toHaveBeenCalledTimes(13);
    expect(onValueChange).toHaveBeenNthCalledWith(1, '3', 'incomplete', null);
    expect(onValueChange).toHaveBeenNthCalledWith(
      6,
      '35202-1',
      'incomplete',
      null,
    );
    expect(onValueChange).toHaveBeenLastCalledWith('35202-1234567-1', 'valid', {
      digits: '3520212345671',
      formatted: '35202-1234567-1',
      province: 'Punjab',
      gender: 'male',
    });
    expect(input().selectionStart).toBe(15);
    expect(input().getAttribute('aria-invalid')).toBeNull();
  });

  it('drops characters that cannot be part of a CNIC', async () => {
    const onValueChange = vi.fn();
    render(<CNICInput onValueChange={onValueChange} />);
    await userEvent.type(input(), '35a2');
    expect(input().value).toBe('352');
    expect(onValueChange).toHaveBeenCalledTimes(3);
  });

  it('sets aria-invalid when the value cannot become valid', async () => {
    render(<CNICInput />);
    await userEvent.type(input(), '0');
    expect(input().value).toBe('0');
    expect(input().getAttribute('aria-invalid')).toBe('true');
  });

  it('passes native props, className and aria-describedby through', () => {
    const ref = createRef<HTMLInputElement>();
    render(
      <>
        <CNICInput
          ref={ref}
          id="cnic"
          name="cnic"
          className="field"
          placeholder="35202-1234567-1"
          aria-describedby="cnic-help"
          required
        />
        <p id="cnic-help">13 digits</p>
      </>,
    );
    const el = input();
    expect(ref.current).toBe(el);
    expect(el.id).toBe('cnic');
    expect(el.name).toBe('cnic');
    expect(el.className).toBe('field');
    expect(el.placeholder).toBe('35202-1234567-1');
    expect(el.required).toBe(true);
    expect(el.getAttribute('aria-describedby')).toBe('cnic-help');
    expect(el.getAttribute('inputmode')).toBe('numeric');
    expect(el.getAttribute('autocomplete')).toBe('off');
    expect(el.getAttribute('style')).toBeNull();
  });

  it('lets props override the default inputMode and autoComplete', () => {
    render(<CNICInput inputMode="text" autoComplete="on" />);
    expect(input().getAttribute('inputmode')).toBe('text');
    expect(input().getAttribute('autocomplete')).toBe('on');
  });

  it('formats defaultValue when uncontrolled', () => {
    render(<CNICInput defaultValue="3520212345671" />);
    expect(input().value).toBe('35202-1234567-1');
  });

  it('works controlled', async () => {
    const states: InputState[] = [];
    function Form() {
      const [value, setValue] = useState('');
      return (
        <>
          <CNICInput
            value={value}
            onValueChange={(next, state) => {
              states.push(state);
              setValue(next);
            }}
          />
          <output>{value}</output>
          <button type="button" onClick={() => setValue('')}>
            Clear
          </button>
        </>
      );
    }
    render(<Form />);
    await userEvent.type(input(), '3520212345672');
    expect(input().value).toBe('35202-1234567-2');
    expect(screen.getByRole('status').textContent).toBe('35202-1234567-2');
    expect(states[states.length - 1]).toBe('valid');

    await userEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(input().value).toBe('');
  });

  it('formats a controlled value given unformatted', () => {
    render(<CNICInput value="3520212345671" onValueChange={() => {}} />);
    expect(input().value).toBe('35202-1234567-1');
  });

  it('keeps the value when a controlled parent ignores changes', async () => {
    render(<CNICInput value="35202" onValueChange={() => {}} />);
    await userEvent.type(input(), '1');
    expect(input().value).toBe('35202');
  });

  it('calls the native onChange too', async () => {
    const onChange = vi.fn();
    render(<CNICInput onChange={onChange} />);
    await userEvent.type(input(), '35');
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('keeps the caret after the typed digit when editing in the middle', async () => {
    render(<CNICInput defaultValue="35202-1234567-1" />);
    const el = input();
    el.focus();
    el.setSelectionRange(3, 3);
    await userEvent.keyboard('9');
    expect(el.value).toBe('35290-2123456-7');
    expect(el.selectionStart).toBe(4);
    await userEvent.keyboard('8');
    expect(el.value).toBe('35298-0212345-6');
    expect(el.selectionStart).toBe(5);
    // The next digit lands after the dash, and the caret follows it.
    await userEvent.keyboard('7');
    expect(el.value).toBe('35298-7021234-5');
    expect(el.selectionStart).toBe(7);
  });

  it('deletes the digit before a dash on Backspace', async () => {
    render(<CNICInput defaultValue="35202-1234" />);
    const el = input();
    el.focus();
    el.setSelectionRange(6, 6);
    await userEvent.keyboard('{Backspace}');
    expect(el.value).toBe('35201-234');
    expect(el.selectionStart).toBe(4);
  });

  it('keeps the caret in place on Backspace in the middle', async () => {
    render(<CNICInput defaultValue="35202-1234567-1" />);
    const el = input();
    el.focus();
    el.setSelectionRange(2, 2);
    await userEvent.keyboard('{Backspace}');
    expect(el.value).toBe('32021-2345671');
    expect(el.selectionStart).toBe(1);
  });

  it('formats pasted text', async () => {
    const onValueChange = vi.fn();
    render(<CNICInput onValueChange={onValueChange} />);
    input().focus();
    await userEvent.paste('35202 1234567 1');
    expect(input().value).toBe('35202-1234567-1');
    expect(input().selectionStart).toBe(15);
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange.mock.calls[0]?.[1]).toBe('valid');
  });

  it('handles change events without an inputType', () => {
    const onValueChange = vi.fn();
    render(<CNICInput onValueChange={onValueChange} />);
    fireEvent.change(input(), { target: { value: '3520212345671' } });
    expect(input().value).toBe('35202-1234567-1');
    expect(onValueChange).toHaveBeenCalledWith(
      '35202-1234567-1',
      'valid',
      expect.objectContaining({ province: 'Punjab' }),
    );
  });
});

describe('PhoneInput', () => {
  it('formats a local number and reports the network when valid', async () => {
    const onValueChange = vi.fn();
    render(<PhoneInput onValueChange={onValueChange} />);
    const el = input();
    expect(el.type).toBe('tel');
    expect(el.getAttribute('inputmode')).toBe('tel');
    expect(el.getAttribute('autocomplete')).toBe('tel');

    await userEvent.type(el, '03001234567');
    expect(el.value).toBe('0300-1234567');
    expect(el.selectionStart).toBe(12);
    expect(onValueChange).toHaveBeenNthCalledWith(
      5,
      '0300-1',
      'incomplete',
      null,
    );
    expect(onValueChange).toHaveBeenLastCalledWith('0300-1234567', 'valid', {
      valid: true,
      formatted: '+923001234567',
      network: 'Jazz',
    });
  });

  it('formats an international number', async () => {
    const onValueChange = vi.fn();
    render(<PhoneInput onValueChange={onValueChange} />);
    await userEvent.type(input(), '+923001234567');
    expect(input().value).toBe('+92 300 1234567');
    expect(onValueChange.mock.lastCall?.[1]).toBe('valid');
  });

  it('flags an unallocated prefix', async () => {
    render(<PhoneInput />);
    await userEvent.type(input(), '0360');
    expect(input().getAttribute('aria-invalid')).toBe('true');
  });
});

describe('IBANInput', () => {
  it('uppercases, groups and reports the bank name', async () => {
    const onValueChange = vi.fn();
    render(<IBANInput onValueChange={onValueChange} />);
    const el = input();
    expect(el.getAttribute('autocapitalize')).toBe('characters');
    expect(el.getAttribute('spellcheck')).toBe('false');

    await userEvent.type(el, 'pk36scbl0000001123456702');
    expect(el.value).toBe('PK36 SCBL 0000 0011 2345 6702');
    expect(el.selectionStart).toBe(29);
    expect(onValueChange).toHaveBeenLastCalledWith(
      'PK36 SCBL 0000 0011 2345 6702',
      'valid',
      'Standard Chartered Bank (Pakistan) Limited',
    );
  });

  it('reports an invalid IBAN', async () => {
    const onValueChange = vi.fn();
    render(<IBANInput onValueChange={onValueChange} />);
    await userEvent.type(input(), 'GB29');
    expect(onValueChange.mock.lastCall?.[1]).toBe('invalid');
    expect(input().getAttribute('aria-invalid')).toBe('true');
  });
});
