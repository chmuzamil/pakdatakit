import { findByText, getByLabelText } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { PakCheckoutForm } from '../src';

const loaded = vi.hoisted(() => ({ quality: 0 }));

vi.mock('pakdatakit/quality', async (importOriginal) => {
  loaded.quality += 1;
  return importOriginal();
});

function label(text: string) {
  return getByLabelText(document.body, text, {
    exact: false,
  }) as HTMLInputElement;
}

describe('form hints', () => {
  it('does not load pakdatakit/quality while hints are off', async () => {
    mount(PakCheckoutForm, { attachTo: document.body });
    await userEvent.setup().type(label('Address'), 'House 1');
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(loaded.quality).toBe(0);
    expect(document.querySelector('[aria-live]')).toBeNull();
  });

  it('loads hints on demand and announces them politely', async () => {
    const wrapper = mount(PakCheckoutForm, { attachTo: document.body });
    await wrapper.setProps({ hints: true });
    const user = userEvent.setup();
    await user.type(label('Mobile number'), '03001234567');
    await user.selectOptions(label('Province'), 'Punjab');
    await user.type(label('City'), 'Lahore');
    await user.type(label('Address'), 'Gulberg');
    await user.type(label('Postal code'), '44000');

    expect(loaded.quality).toBe(1);
    await findByText(document.body, /Address completeness: \d+\/100/);
    const address = label('Address');
    const hintId = address.getAttribute('aria-describedby')!;
    const region = document.getElementById(hintId)!;
    expect(region.getAttribute('aria-live')).toBe('polite');
    expect(region.textContent).toContain('You could add:');
    expect(region.textContent).toContain('house number');
    expect(document.body.textContent).toContain(
      'This looks like a test number',
    );
    expect(document.body.textContent).toContain(
      'This postal code belongs to Islamabad',
    );
  });

  it('shows hints in Urdu and never blocks submit', async () => {
    const wrapper = mount(PakCheckoutForm, {
      props: { hints: true, locale: 'ur' },
      attachTo: document.body,
    });
    const user = userEvent.setup();
    await user.type(label('نام'), 'Ali');
    await user.type(label('موبائل نمبر'), '03001234567');
    await user.selectOptions(label('صوبہ'), 'Punjab');
    await user.selectOptions(label('ضلع'), 'Lahore');
    await user.type(label('شہر'), 'Lahore');
    await user.type(label('پتہ'), 'Gulberg');
    await findByText(document.body, /پتہ کتنا مکمل ہے/);
    expect(document.body.textContent).toContain('یہ آزمائشی نمبر لگتا ہے');
    await user.click(document.querySelector('button[type="submit"]')!);
    expect(wrapper.emitted('submit')).toHaveLength(1);
  });
});
