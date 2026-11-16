import userEvent from '@testing-library/user-event';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import {
  defineComponent,
  h,
  nextTick,
  ref,
  vModelText,
  withDirectives,
} from 'vue';
import { PakDataKit, vPakInput, type PakInputKind } from '../src';

/** `<input v-model="model" v-pak-input:[kind] />`, written by hand. */
function modelField(kind: PakInputKind, initial = '', byValue = false) {
  const model = ref(initial);
  const component = defineComponent({
    setup() {
      return () =>
        withDirectives(
          h('input', {
            'onUpdate:modelValue': (value: string) => {
              model.value = value;
            },
          }),
          [
            [vModelText, model.value],
            byValue ? [vPakInput, kind] : [vPakInput, undefined, kind],
          ],
        );
    },
  });
  const wrapper = mount(component, { attachTo: document.body });
  return { model, wrapper, el: wrapper.element as HTMLInputElement };
}

describe('v-pak-input', () => {
  it('formats as the user types and updates v-model with the formatted value', async () => {
    const { model, el } = modelField('cnic');
    await userEvent.type(el, '3520212345671');
    expect(el.value).toBe('35202-1234567-1');
    expect(model.value).toBe('35202-1234567-1');
    expect(el.selectionStart).toBe(15);
    expect(el.getAttribute('aria-invalid')).toBeNull();
  });

  it('formats the initial model value', async () => {
    const { model, el } = modelField('cnic', '3520212345671');
    await nextTick();
    expect(el.value).toBe('35202-1234567-1');
    expect(model.value).toBe('35202-1234567-1');
  });

  it('formats a value set from outside', async () => {
    const { model, el } = modelField('phone');
    model.value = '03001234567';
    await nextTick();
    await nextTick();
    expect(el.value).toBe('0300-1234567');
    expect(model.value).toBe('0300-1234567');
  });

  it('accepts the kind as a value', async () => {
    const { model, el } = modelField('iban', '', true);
    await userEvent.type(el, 'pk36scbl0000001123456702');
    expect(el.value).toBe('PK36 SCBL 0000 0011 2345 6702');
    expect(model.value).toBe('PK36 SCBL 0000 0011 2345 6702');
  });

  it('sets input attributes without overriding existing ones', () => {
    const { el } = modelField('phone');
    expect(el.getAttribute('type')).toBe('tel');
    expect(el.getAttribute('inputmode')).toBe('tel');
    expect(el.getAttribute('autocomplete')).toBe('tel');
    expect(el.getAttribute('spellcheck')).toBe('false');

    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          withDirectives(h('input', { inputmode: 'text' }), [
            [vPakInput, undefined, 'cnic'],
          ]),
      }),
    );
    expect(wrapper.element.getAttribute('inputmode')).toBe('text');
  });

  it('sets aria-invalid when the value cannot become valid, and clears it', async () => {
    const { el } = modelField('phone');
    await userEvent.type(el, '0360');
    expect(el.getAttribute('aria-invalid')).toBe('true');
    await userEvent.clear(el);
    expect(el.getAttribute('aria-invalid')).toBeNull();
  });

  it('keeps the caret in place when editing in the middle', async () => {
    const { el } = modelField('cnic', '35202-1234567-1');
    await nextTick();
    el.focus();
    el.setSelectionRange(3, 3);
    await userEvent.keyboard('9');
    expect(el.value).toBe('35290-2123456-7');
    expect(el.selectionStart).toBe(4);
  });

  it('deletes the digit before a dash on Backspace', async () => {
    const { model, el } = modelField('cnic', '35202-1234');
    await nextTick();
    el.focus();
    el.setSelectionRange(6, 6);
    await userEvent.keyboard('{Backspace}');
    expect(el.value).toBe('35201-234');
    expect(el.selectionStart).toBe(4);
    expect(model.value).toBe('35201-234');
  });

  it('works without v-model', async () => {
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          withDirectives(h('input'), [[vPakInput, undefined, 'cnic']]),
      }),
      { attachTo: document.body },
    );
    const el = wrapper.element as HTMLInputElement;
    await userEvent.type(el, '35202123');
    expect(el.value).toBe('35202-123');
  });

  it('rejects an unknown kind', () => {
    expect(() =>
      mount(
        defineComponent({
          setup: () => () =>
            withDirectives(h('input'), [
              [vPakInput, 'passport' as PakInputKind],
            ]),
        }),
        { global: { config: { warnHandler: () => undefined } } },
      ),
    ).toThrow(/cnic/);
  });

  it('is registered globally by the plugin', async () => {
    const wrapper = mount(
      defineComponent({ template: '<input v-pak-input:cnic />' }),
      { global: { plugins: [PakDataKit] }, attachTo: document.body },
    );
    const el = wrapper.element as HTMLInputElement;
    await userEvent.type(el, '352021');
    expect(el.value).toBe('35202-1');
  });
});
