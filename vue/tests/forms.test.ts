import { getByLabelText, getByRole, queryByRole } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import {
  PakCheckoutForm,
  PakKycForm,
  citySuggestions,
  emptyPakFormValues,
  validatePakForm,
  withField,
  formText,
  type PakFormValues,
} from '../src';

function render(
  component: typeof PakCheckoutForm,
  props: Record<string, unknown> = {},
) {
  const wrapper = mount(component, { props, attachTo: document.body });
  return { wrapper, body: document.body, user: userEvent.setup() };
}

function label(text: string) {
  return getByLabelText(document.body, text, {
    exact: false,
  }) as HTMLInputElement;
}

async function fillValid(
  user: ReturnType<typeof userEvent.setup>,
  kyc = false,
) {
  await user.type(label('Full name'), '  Ali Khan  ');
  await user.type(label('Mobile number'), '03211234567');
  if (kyc) await user.type(label('CNIC number'), '3520212345671');
  await user.selectOptions(label('Province'), 'Punjab');
  await user.selectOptions(label('District'), 'Lahore');
  await user.type(label('City'), 'Lahore');
  await user.type(label('Address'), 'House 12, Street 4, Gulberg III');
}

describe('PakCheckoutForm', () => {
  it('renders every field with a real label, in English by default', () => {
    render(PakCheckoutForm);
    for (const text of [
      'Full name',
      'Mobile number',
      'Province',
      'District',
      'City',
      'Address',
      'Nearby place',
      'Postal code',
    ]) {
      expect(label(text)).toBeTruthy();
    }
    expect(queryByRole(document.body, 'textbox', { name: /CNIC/ })).toBeNull();
    expect(
      queryByRole(document.body, 'combobox', { name: /Tehsil/ }),
    ).toBeNull();
    const form = document.querySelector('form')!;
    expect(form.getAttribute('lang')).toBe('en');
    expect(form.getAttribute('dir')).toBe('ltr');
    expect(label('Province').tagName).toBe('SELECT');
    expect(getByRole(document.body, 'button', { name: 'Submit' })).toBeTruthy();
  });

  it('marks required and optional fields', () => {
    render(PakCheckoutForm);
    for (const text of [
      'Full name',
      'Mobile number',
      'Province',
      'District',
      'City',
      'Address',
    ]) {
      expect(label(text).required).toBe(true);
      expect(label(text).getAttribute('aria-required')).toBe('true');
    }
    for (const text of ['Nearby place', 'Postal code']) {
      expect(label(text).required).toBe(false);
      expect(label(text).hasAttribute('aria-required')).toBe(false);
    }
    expect(document.body.textContent).toContain('(optional)');
  });

  it('switches to Urdu with rtl direction and keeps province values in English', () => {
    render(PakCheckoutForm, { locale: 'ur' });
    const form = document.querySelector('form')!;
    expect(form.getAttribute('lang')).toBe('ur');
    expect(form.getAttribute('dir')).toBe('rtl');
    for (const text of [
      'نام',
      'موبائل نمبر',
      'صوبہ',
      'ضلع',
      'شہر',
      'پتہ',
      'قریبی جگہ',
      'پوسٹل کوڈ',
    ]) {
      expect(label(text)).toBeTruthy();
    }
    const option = [
      ...(label('صوبہ') as unknown as HTMLSelectElement).options,
    ].find((o) => o.value === 'Punjab')!;
    expect(option.textContent).toBe('پنجاب');
    expect(
      getByRole(document.body, 'button', { name: 'جمع کریں' }),
    ).toBeTruthy();
  });

  it('lets the app override labels', () => {
    render(PakCheckoutForm, {
      labels: { name: 'Your name', submit: 'Place order' },
    });
    expect(label('Your name')).toBeTruthy();
    expect(
      getByRole(document.body, 'button', { name: 'Place order' }),
    ).toBeTruthy();
  });

  it('cascades province → district → tehsil and clears on change', async () => {
    const { user } = render(PakCheckoutForm, { tehsil: true });
    const district = label('District') as unknown as HTMLSelectElement;
    expect(district.disabled).toBe(true);
    await user.selectOptions(label('Province'), 'Punjab');
    expect([...district.options].map((o) => o.value)).toContain('Lahore');
    await user.selectOptions(district, 'Lahore');
    const tehsil = label('Tehsil') as unknown as HTMLSelectElement;
    expect([...tehsil.options].map((o) => o.value)).toContain('Model Town');
    await user.selectOptions(tehsil, 'Model Town');
    await user.type(label('City'), 'Lahore');

    await user.selectOptions(district, 'Kasur');
    expect(tehsil.value).toBe('');
    expect(label('City').value).toBe('Lahore');

    await user.selectOptions(label('Province'), 'Sindh');
    expect(district.value).toBe('');
    expect([...district.options].map((o) => o.value)).toContain(
      'Karachi Central',
    );
    expect(label('City').value).toBe('');
  });

  it('suggests cities of the chosen province in a datalist', async () => {
    const { user } = render(PakCheckoutForm);
    await user.selectOptions(label('Province'), 'Punjab');
    const city = label('City');
    await user.type(city, 'lah');
    const list = document.getElementById(city.getAttribute('list')!)!;
    expect(list.tagName).toBe('DATALIST');
    const options = [...list.querySelectorAll('option')].map((o) => o.value);
    expect(options).toContain('Lahore');
    expect(options).not.toContain('Dera Allah Yar');
  });

  it('shows errors on submit with an alert summary and linked messages', async () => {
    const { wrapper, user } = render(PakCheckoutForm);
    await user.click(getByRole(document.body, 'button', { name: 'Submit' }));
    expect(wrapper.emitted('submit')).toBeUndefined();
    const alert = getByRole(document.body, 'alert');
    expect(alert.textContent).toContain('Enter your full name');
    expect(alert.textContent).toContain('Select a province');
    const name = label('Full name');
    expect(name.getAttribute('aria-invalid')).toBe('true');
    const errorId = name.getAttribute('aria-describedby')!;
    expect(document.getElementById(errorId)!.textContent).toBe(
      'Enter your full name',
    );
    await nextTick();
    expect(document.activeElement).toBe(name);
    expect(label('Postal code').hasAttribute('aria-invalid')).toBe(false);
  });

  it('shows a field error after leaving it', async () => {
    const { user } = render(PakCheckoutForm);
    await user.type(label('Mobile number'), '0300');
    await user.tab();
    expect(
      document.getElementById(
        label('Mobile number').getAttribute('aria-describedby')!,
      )!.textContent,
    ).toBe('Enter a valid mobile number, like 0300-1234567');
    await user.type(label('Postal code'), '123');
    await user.tab();
    expect(document.body.textContent).toContain('A postal code has 5 digits');
  });

  it('shows Urdu error messages', async () => {
    const { user } = render(PakCheckoutForm, { locale: 'ur' });
    await user.click(getByRole(document.body, 'button', { name: 'جمع کریں' }));
    expect(getByRole(document.body, 'alert').textContent).toContain(
      'اپنا نام لکھیں',
    );
  });

  it('submits trimmed values and formats the mobile number', async () => {
    const { wrapper, user } = render(PakCheckoutForm);
    await fillValid(user);
    await user.type(label('Postal code'), '54660');
    await user.click(getByRole(document.body, 'button', { name: 'Submit' }));
    expect(queryByRole(document.body, 'alert')).toBeNull();
    const [[values]] = wrapper.emitted('submit') as [[PakFormValues]];
    expect(values).toEqual({
      ...emptyPakFormValues(),
      name: 'Ali Khan',
      mobile: '0321-1234567',
      province: 'Punjab',
      district: 'Lahore',
      city: 'Lahore',
      address: 'House 12, Street 4, Gulberg III',
      postalCode: '54660',
    });
  });

  it('works with v-model', async () => {
    const model = ref<Partial<PakFormValues>>({
      name: 'Sara',
      mobile: '03001234567',
    });
    const Parent = defineComponent({
      setup: () => () =>
        h(PakCheckoutForm, {
          modelValue: model.value,
          'onUpdate:modelValue': (v: PakFormValues) => {
            model.value = v;
          },
        }),
    });
    mount(Parent, { attachTo: document.body });
    expect(label('Full name').value).toBe('Sara');
    expect(label('Mobile number').value).toBe('0300-1234567');
    await userEvent.setup().type(label('Full name'), ' Ahmed');
    expect(model.value.name).toBe('Sara Ahmed');
    model.value = { ...model.value, city: 'Multan' };
    await nextTick();
    expect(label('City').value).toBe('Multan');
  });

  it('works with the keyboard only', async () => {
    const { user } = render(PakCheckoutForm);
    await user.tab();
    expect(document.activeElement).toBe(label('Full name'));
    await user.keyboard('Ali');
    await user.tab();
    expect(document.activeElement).toBe(label('Mobile number'));
    await user.tab();
    expect(document.activeElement).toBe(label('Province'));
  });
});

describe('PakKycForm', () => {
  it('adds a required, masked CNIC field', async () => {
    const { wrapper, user } = render(PakKycForm);
    const cnic = label('CNIC number');
    expect(cnic.required).toBe(true);
    await fillValid(user, true);
    expect(cnic.value).toBe('35202-1234567-1');
    await user.click(getByRole(document.body, 'button', { name: 'Submit' }));
    const [[values]] = wrapper.emitted('submit') as [[PakFormValues]];
    expect(values.cnic).toBe('35202-1234567-1');
  });

  it('rejects an invalid CNIC', async () => {
    const { wrapper, user } = render(PakKycForm, { locale: 'ur' });
    await user.type(label('شناختی کارڈ نمبر'), '12345');
    await user.click(getByRole(document.body, 'button', { name: 'جمع کریں' }));
    expect(wrapper.emitted('submit')).toBeUndefined();
    expect(getByRole(document.body, 'alert').textContent).toContain(
      'درست شناختی کارڈ نمبر لکھیں',
    );
  });
});

describe('form helpers', () => {
  it('validates with core rules', () => {
    const text = formText();
    const values = {
      ...emptyPakFormValues(),
      mobile: '021-1234567',
      cnic: 'x',
    };
    const errors = validatePakForm('kyc', values, text);
    expect(errors.mobile).toBe(text.mobileInvalid);
    expect(errors.cnic).toBe(text.cnicInvalid);
    expect(errors.tehsil).toBeUndefined();
    expect(validatePakForm('checkout', values, text).cnic).toBeUndefined();
  });

  it('applies the cascade', () => {
    const values = {
      ...emptyPakFormValues(),
      province: 'Punjab',
      district: 'Lahore',
      tehsil: 'Model Town',
      city: 'Lahore',
    };
    expect(withField(values, 'district', 'Kasur')).toMatchObject({
      tehsil: '',
      city: 'Lahore',
    });
    expect(withField(values, 'province', 'Sindh')).toMatchObject({
      district: '',
      tehsil: '',
      city: '',
    });
    expect(citySuggestions('', 'Punjab')).toEqual([]);
  });
});
