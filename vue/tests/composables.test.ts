import userEvent from '@testing-library/user-event';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import type { InputState } from 'pakdatakit/input';
import { useCnic, useIban, usePhone } from '../src';

/** A field built on a composable, like a component a user would write. */
function field<Info>(
  use: (options: {
    defaultValue?: string | undefined;
    value?: () => string | undefined;
    onValueChange?: (
      value: string,
      state: InputState,
      info: Info | null,
    ) => void;
  }) =>
    | ReturnType<typeof useCnic>
    | ReturnType<typeof usePhone>
    | ReturnType<typeof useIban>,
) {
  return defineComponent({
    props: {
      defaultValue: { type: String, default: undefined },
      value: { type: String, default: undefined },
      onValueChange: { type: Function, default: undefined },
    },
    setup(props) {
      const result = use({
        defaultValue: props.defaultValue,
        ...(props.value === undefined ? {} : { value: () => props.value }),
        onValueChange: props.onValueChange as never,
      });
      return () =>
        h('input', {
          ...result.inputProps.value,
          'data-state': result.state.value,
        });
    },
  });
}

const CnicField = field(useCnic);
const PhoneField = field(usePhone);
const IbanField = field(useIban);

function mountField(
  component: ReturnType<typeof field>,
  props: Record<string, unknown> = {},
) {
  const wrapper = mount(component, { props, attachTo: document.body });
  return { wrapper, el: wrapper.element as HTMLInputElement };
}

describe('useCnic', () => {
  it('starts empty', () => {
    const cnic = useCnic();
    expect(cnic.value.value).toBe('');
    expect(cnic.state.value).toBe('empty');
    expect(cnic.info.value).toBeNull();
    expect(cnic.inputProps.value.inputmode).toBe('numeric');
    expect(cnic.inputProps.value['aria-invalid']).toBeUndefined();
  });

  it('formats and validates with setValue', () => {
    const onValueChange = vi.fn();
    const cnic = useCnic({ onValueChange });
    cnic.setValue('3520212345672');
    expect(cnic.value.value).toBe('35202-1234567-2');
    expect(cnic.state.value).toBe('valid');
    expect(cnic.info.value).toMatchObject({
      province: 'Punjab',
      gender: 'female',
    });
    expect(onValueChange).toHaveBeenCalledTimes(1);

    // Setting the same value again does not report a change.
    cnic.setValue('35202-1234567-2');
    expect(onValueChange).toHaveBeenCalledTimes(1);
  });

  it('reports invalid values', () => {
    const cnic = useCnic({ defaultValue: '0' });
    expect(cnic.state.value).toBe('invalid');
    expect(cnic.inputProps.value['aria-invalid']).toBe(true);
  });

  it('follows a controlled value', () => {
    const value = ref('35202');
    const cnic = useCnic({ value });
    expect(cnic.state.value).toBe('incomplete');
    value.value = '3520212345671';
    expect(cnic.value.value).toBe('35202-1234567-1');
    expect(cnic.state.value).toBe('valid');
  });

  it('drives a custom input through inputProps', async () => {
    const { el } = mountField(CnicField);
    await userEvent.type(el, '6110112345671');
    expect(el.value).toBe('61101-1234567-1');
    expect(el.dataset.state).toBe('valid');
  });
});

describe('usePhone', () => {
  it('returns the analysis once valid', () => {
    const phone = usePhone({ defaultValue: '+92 345 1234567' });
    expect(phone.value.value).toBe('+92 345 1234567');
    expect(phone.state.value).toBe('valid');
    expect(phone.info.value).toEqual({
      valid: true,
      formatted: '+923451234567',
      network: 'Telenor',
    });
    expect(phone.inputProps.value.type).toBe('tel');
  });

  it('has no info while incomplete', () => {
    const phone = usePhone({ defaultValue: '0300' });
    expect(phone.state.value).toBe('incomplete');
    expect(phone.info.value).toBeNull();
  });
});

describe('useIban', () => {
  it('returns the bank name once valid', () => {
    const iban = useIban();
    iban.setValue('pk36-scbl-0000-0011-2345-6702');
    expect(iban.value.value).toBe('PK36 SCBL 0000 0011 2345 6702');
    expect(iban.state.value).toBe('valid');
    expect(iban.info.value).toBe('Standard Chartered Bank (Pakistan) Limited');
  });
});

describe('a CNIC field', () => {
  it('formats as the user types and reports state and info', async () => {
    const onValueChange = vi.fn();
    const { el } = mountField(CnicField, { onValueChange });
    await userEvent.type(el, '3520212345671');

    expect(el.value).toBe('35202-1234567-1');
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
    expect(el.selectionStart).toBe(15);
    expect(el.getAttribute('aria-invalid')).toBeNull();
  });

  it('drops characters that cannot be part of a CNIC', async () => {
    const onValueChange = vi.fn();
    const { el } = mountField(CnicField, { onValueChange });
    await userEvent.type(el, '35a2');
    expect(el.value).toBe('352');
    expect(onValueChange).toHaveBeenCalledTimes(3);
  });

  it('sets aria-invalid when the value cannot become valid', async () => {
    const { el } = mountField(CnicField);
    await userEvent.type(el, '0');
    expect(el.value).toBe('0');
    expect(el.getAttribute('aria-invalid')).toBe('true');
  });

  it('formats defaultValue when uncontrolled', () => {
    const { el } = mountField(CnicField, { defaultValue: '3520212345671' });
    expect(el.value).toBe('35202-1234567-1');
  });

  it('works controlled', async () => {
    const onValueChange = vi.fn();
    const { wrapper, el } = mountField(CnicField, {
      value: '',
      onValueChange: (value: string, state: InputState) => {
        onValueChange(value, state);
        void wrapper.setProps({ value });
      },
    });
    await userEvent.type(el, '35202123');
    expect(el.value).toBe('35202-123');
    expect(onValueChange).toHaveBeenLastCalledWith('35202-123', 'incomplete');
  });

  it('formats a controlled value given unformatted', () => {
    const { el } = mountField(CnicField, { value: '3520212345671' });
    expect(el.value).toBe('35202-1234567-1');
  });

  it('keeps the value when a controlled parent ignores changes', async () => {
    const { el } = mountField(CnicField, { value: '35202' });
    await userEvent.type(el, '1');
    await nextTick();
    expect(el.value).toBe('35202');
  });

  it('keeps the caret after the typed digit when editing in the middle', async () => {
    const { el } = mountField(CnicField, { defaultValue: '35202-1234567-1' });
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
    const { el } = mountField(CnicField, { defaultValue: '35202-1234' });
    el.focus();
    el.setSelectionRange(6, 6);
    await userEvent.keyboard('{Backspace}');
    expect(el.value).toBe('35201-234');
    expect(el.selectionStart).toBe(4);
  });

  it('keeps the caret in place on Backspace in the middle', async () => {
    const { el } = mountField(CnicField, { defaultValue: '35202-1234567-1' });
    el.focus();
    el.setSelectionRange(2, 2);
    await userEvent.keyboard('{Backspace}');
    expect(el.value).toBe('32021-2345671');
    expect(el.selectionStart).toBe(1);
  });

  it('formats pasted text', async () => {
    const onValueChange = vi.fn();
    const { el } = mountField(CnicField, { onValueChange });
    el.focus();
    await userEvent.paste('35202 1234567 1');
    expect(el.value).toBe('35202-1234567-1');
    expect(el.selectionStart).toBe(15);
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange.mock.calls[0]?.[1]).toBe('valid');
  });

  it('handles input events without an inputType', () => {
    const onValueChange = vi.fn();
    const { el } = mountField(CnicField, { onValueChange });
    el.value = '3520212345671';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    expect(el.value).toBe('35202-1234567-1');
    expect(onValueChange).toHaveBeenCalledWith(
      '35202-1234567-1',
      'valid',
      expect.objectContaining({ province: 'Punjab' }),
    );
  });
});

describe('a phone field', () => {
  it('formats a local number and reports the network when valid', async () => {
    const onValueChange = vi.fn();
    const { el } = mountField(PhoneField, { onValueChange });
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
    const { el } = mountField(PhoneField, { onValueChange });
    await userEvent.type(el, '+923001234567');
    expect(el.value).toBe('+92 300 1234567');
    expect(onValueChange.mock.lastCall?.[1]).toBe('valid');
  });

  it('flags an unallocated prefix', async () => {
    const { el } = mountField(PhoneField);
    await userEvent.type(el, '0360');
    expect(el.getAttribute('aria-invalid')).toBe('true');
  });
});

describe('an IBAN field', () => {
  it('uppercases, groups and reports the bank name', async () => {
    const onValueChange = vi.fn();
    const { el } = mountField(IbanField, { onValueChange });
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
    const { el } = mountField(IbanField, { onValueChange });
    await userEvent.type(el, 'GB29');
    expect(onValueChange.mock.lastCall?.[1]).toBe('invalid');
    expect(el.getAttribute('aria-invalid')).toBe('true');
  });
});
