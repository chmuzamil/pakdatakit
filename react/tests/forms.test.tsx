import { useState } from 'react';
import { render, renderHook, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { getProvince } from 'pakdatakit/geo';
import {
  EMPTY_CHECKOUT_VALUES,
  PakCheckoutForm,
  PakKycForm,
  applyLocationChange,
  createPakRules,
  pakRules,
  useLocationOptions,
  validatePakForm,
  type PakCheckoutValues,
} from '../src';

function field(name: RegExp | string): HTMLInputElement {
  return screen.getByLabelText(name) as HTMLInputElement;
}

async function fillCheckout(user: ReturnType<typeof userEvent.setup>) {
  await user.type(field('Full name'), '  Ayesha Khan  ');
  await user.type(field('Mobile number'), '03214567890');
  await user.selectOptions(field('Province'), 'Punjab');
  await user.selectOptions(field('District'), 'Lahore');
  await user.type(field('City'), 'Lahore');
  await user.type(field('Address'), 'House 12, Street 4, Gulberg III');
  await user.type(field(/Nearby place/), 'Liberty Market');
  await user.type(field(/Postal code/), '54660');
}

describe('PakCheckoutForm rendering', () => {
  it('renders every field with a real label and no CNIC or tehsil', () => {
    const { container } = render(<PakCheckoutForm />);
    for (const name of [
      'Full name',
      'Mobile number',
      'Province',
      'District',
      'City',
      'Address',
    ]) {
      expect(field(name)).toBeTruthy();
    }
    expect(field(/Nearby place/)).toBeTruthy();
    expect(field(/Postal code/)).toBeTruthy();
    expect(screen.queryByLabelText('CNIC number')).toBeNull();
    expect(screen.queryByLabelText(/Tehsil/)).toBeNull();

    const form = container.querySelector('form')!;
    expect(form.getAttribute('lang')).toBe('en');
    expect(form.getAttribute('dir')).toBe('ltr');
    expect(form.className).toBe('pak-form pak-form--checkout');
    // Headless: no inline styles anywhere.
    expect(container.querySelector('[style]')).toBeNull();
    expect(container.querySelector('style')).toBeNull();
  });

  it('uses native selects and marks required and optional fields', () => {
    render(<PakCheckoutForm />);
    expect(field('Province').tagName).toBe('SELECT');
    expect(field('District').tagName).toBe('SELECT');
    expect(field('District').disabled).toBe(true);
    for (const name of ['Full name', 'Mobile number', 'Province', 'City']) {
      expect(field(name).required).toBe(true);
      expect(field(name).getAttribute('aria-required')).toBe('true');
    }
    const landmark = field(/Nearby place/);
    expect(landmark.required).toBe(false);
    expect(landmark.getAttribute('aria-required')).toBe('false');
    expect(screen.getAllByText('(optional)')).toHaveLength(2);
  });

  it('shows the tehsil select when asked', () => {
    render(<PakCheckoutForm tehsil />);
    expect(field(/Tehsil/).tagName).toBe('SELECT');
    expect(field(/Tehsil/).required).toBe(false);
  });

  it('adds a required CNIC field in PakKycForm', () => {
    const { container } = render(<PakKycForm />);
    const cnic = field('CNIC number');
    expect(cnic.required).toBe(true);
    expect(cnic.inputMode).toBe('numeric');
    expect(container.querySelector('form')!.className).toContain(
      'pak-form--kyc',
    );
  });

  it('adds class names to slots', () => {
    const { container } = render(
      <PakCheckoutForm
        className="checkout"
        classNames={{ field: 'mb-4', input: 'input', submit: 'btn' }}
      />,
    );
    expect(container.querySelector('form')!.className).toContain('checkout');
    expect(container.querySelectorAll('.pak-form__field.mb-4')).toHaveLength(8);
    expect(field('Full name').className).toBe('pak-form__input input');
    expect(screen.getByRole('button').className).toBe('pak-form__submit btn');
  });
});

describe('Urdu', () => {
  it('switches labels, direction and messages', async () => {
    const user = userEvent.setup();
    const { container } = render(<PakKycForm locale="ur" tehsil />);
    const form = container.querySelector('form')!;
    expect(form.getAttribute('dir')).toBe('rtl');
    expect(form.getAttribute('lang')).toBe('ur');
    for (const name of [
      'نام',
      'موبائل نمبر',
      'شناختی کارڈ نمبر',
      'صوبہ',
      'ضلع',
      'شہر',
      'پتہ',
    ]) {
      expect(field(name)).toBeTruthy();
    }
    expect(field(/تحصیل/)).toBeTruthy();
    expect(field(/قریبی جگہ/)).toBeTruthy();
    expect(field(/پوسٹل کوڈ/)).toBeTruthy();
    expect(
      screen.getByRole('option', { name: 'صوبہ منتخب کریں' }),
    ).toBeTruthy();
    // Numbers stay left to right inside the RTL form.
    expect(field('موبائل نمبر').getAttribute('dir')).toBe('ltr');

    await user.click(screen.getByRole('button', { name: 'جمع کریں' }));
    expect(screen.getByRole('alert').textContent).toContain(
      'براہ کرم یہ درست کریں:',
    );
    expect(screen.getAllByText('اپنا نام لکھیں۔').length).toBeGreaterThan(0);
    expect(
      screen.getAllByText('اپنا شناختی کارڈ نمبر لکھیں۔').length,
    ).toBeGreaterThan(0);
  });

  it('keeps typed values as they are', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PakCheckoutForm locale="ur" onChange={onChange} />);
    await user.type(field('نام'), 'Ali');
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ fullName: 'Ali' }),
    );
  });

  it('lets apps override labels', () => {
    render(
      <PakCheckoutForm
        locale="ur"
        labels={{ fullName: 'پورا نام', submit: 'آرڈر کریں' }}
      />,
    );
    expect(field('پورا نام')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'آرڈر کریں' })).toBeTruthy();
    expect(field('موبائل نمبر')).toBeTruthy();
  });
});

describe('cascading location', () => {
  it('fills districts and tehsils and clears dependants', async () => {
    const user = userEvent.setup();
    render(<PakCheckoutForm tehsil />);
    const district = field('District') as unknown as HTMLSelectElement;
    expect(district.options).toHaveLength(1);

    await user.selectOptions(field('Province'), 'Punjab');
    expect(district.disabled).toBe(false);
    expect(
      within(district).getByRole('option', { name: 'Lahore' }),
    ).toBeTruthy();

    await user.selectOptions(district, 'Lahore');
    const tehsil = field(/Tehsil/) as unknown as HTMLSelectElement;
    expect(tehsil.disabled).toBe(false);
    expect(Array.from(tehsil.options).map((option) => option.value)).toContain(
      'Raiwind',
    );
    await user.selectOptions(tehsil, 'Raiwind');
    await user.type(field('City'), 'Lahore');

    // A new district clears the tehsil only.
    await user.selectOptions(district, 'Kasur');
    expect(tehsil.value).toBe('');
    expect(field('City').value).toBe('Lahore');

    // A new province clears district, tehsil and city.
    await user.selectOptions(field('Province'), 'Sindh');
    expect(district.value).toBe('');
    expect(field('City').value).toBe('');
    expect(district.options.length).toBeGreaterThan(1);
    expect(
      within(district).queryByRole('option', { name: 'Lahore' }),
    ).toBeNull();
  });

  it('suggests cities in the chosen province only', async () => {
    const user = userEvent.setup();
    const { container } = render(<PakCheckoutForm />);
    const city = field('City');
    const list = container.querySelector(`#${city.getAttribute('list')}`)!;
    expect(list.tagName).toBe('DATALIST');

    await user.selectOptions(field('Province'), 'Punjab');
    await user.type(city, 'Lah');
    const values = () =>
      Array.from(list.querySelectorAll('option')).map((o) => o.value);
    expect(values()).toContain('Lahore');

    await user.selectOptions(field('Province'), 'Sindh');
    await user.type(city, 'Lah');
    expect(values()).not.toContain('Lahore');
  });

  it('useLocationOptions and applyLocationChange work without the form', () => {
    const { result } = renderHook(() =>
      useLocationOptions({
        province: 'Punjab',
        district: 'Lahore',
        cityQuery: 'lah',
      }),
    );
    expect(result.current.provinces).toHaveLength(7);
    expect(result.current.districts).toContain('Lahore');
    expect(result.current.tehsils).toContain('Model Town');
    expect(result.current.cities).toContain('Lahore');
    for (const city of result.current.cities) {
      expect(getProvince(city)).toBe('Punjab');
    }

    const values: PakCheckoutValues = {
      ...EMPTY_CHECKOUT_VALUES,
      province: 'Punjab',
      district: 'Lahore',
      tehsil: 'Raiwind',
      city: 'Lahore',
    };
    expect(applyLocationChange(values, 'district', 'Kasur')).toMatchObject({
      province: 'Punjab',
      district: 'Kasur',
      tehsil: '',
      city: 'Lahore',
    });
    expect(applyLocationChange(values, 'province', 'Sindh')).toMatchObject({
      province: 'Sindh',
      district: '',
      tehsil: '',
      city: '',
    });
    expect(applyLocationChange(values, 'province', 'Punjab')).toBe(values);
  });
});

describe('validation and submit', () => {
  it('blocks an empty submit, links errors and focuses the first field', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const onInvalid = vi.fn();
    render(<PakCheckoutForm onSubmit={onSubmit} onInvalid={onInvalid} />);
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(onInvalid).toHaveBeenCalledWith(
      expect.objectContaining({ fullName: 'Enter your full name.' }),
    );
    const summary = screen.getByRole('alert');
    expect(within(summary).getAllByRole('link')).toHaveLength(6);

    const name = field('Full name');
    expect(document.activeElement).toBe(name);
    expect(name.getAttribute('aria-invalid')).toBe('true');
    const errorId = name.getAttribute('aria-describedby')!;
    expect(document.getElementById(errorId)!.textContent).toBe(
      'Enter your full name.',
    );
    // Optional fields are fine when empty.
    expect(field(/Postal code/).getAttribute('aria-invalid')).toBe('false');

    // The summary links move focus to the field.
    await user.click(within(summary).getByText('Enter your address.'));
    expect(document.activeElement).toBe(field('Address'));
  });

  it('shows an error after leaving a field', async () => {
    const user = userEvent.setup();
    render(<PakCheckoutForm />);
    const mobile = field('Mobile number');
    await user.type(mobile, '0300');
    expect(mobile.getAttribute('aria-describedby')).toBeNull();
    await user.tab();
    expect(mobile.getAttribute('aria-invalid')).toBe('true');
    expect(
      document.getElementById(mobile.getAttribute('aria-describedby')!)!
        .textContent,
    ).toBe('Enter a valid Pakistani mobile number, like 0300-1234567.');
  });

  it('rejects whitespace-only names and a bad postal code', async () => {
    const user = userEvent.setup();
    render(<PakCheckoutForm />);
    await user.type(field('Full name'), '   ');
    await user.type(field(/Postal code/), '5466');
    await user.click(screen.getByRole('button'));
    const summary = screen.getByRole('alert');
    expect(summary.textContent).toContain('Enter your full name.');
    expect(summary.textContent).toContain('A postal code has 5 digits.');
  });

  it('works with the keyboard only', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<PakCheckoutForm onSubmit={onSubmit} />);
    await user.tab();
    expect(document.activeElement).toBe(field('Full name'));
    await user.keyboard('Ali');
    await user.tab();
    expect(document.activeElement).toBe(field('Mobile number'));
    await user.keyboard('03214567890');
    expect(field('Mobile number').value).toBe('0321-4567890');
    // Enter submits; the first field still missing gets focus.
    await user.keyboard('{Enter}');
    expect(onSubmit).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(field('Province'));
    await user.tab();
    expect(document.activeElement).toBe(field('City'));
  });

  it('submits trimmed checkout values', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<PakCheckoutForm onSubmit={onSubmit} />);
    await fillCheckout(user);
    await user.click(screen.getByRole('button', { name: 'Submit' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({
      fullName: 'Ayesha Khan',
      mobile: '0321-4567890',
      province: 'Punjab',
      district: 'Lahore',
      tehsil: '',
      city: 'Lahore',
      address: 'House 12, Street 4, Gulberg III',
      landmark: 'Liberty Market',
      postalCode: '54660',
    });
    expect(screen.getByRole('alert').textContent).toBe('');
  });

  it('formats and validates the CNIC in PakKycForm', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<PakKycForm onSubmit={onSubmit} tehsil />);
    await fillCheckout(user);
    await user.type(field('CNIC number'), '00000');
    await user.click(screen.getByRole('button'));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toContain(
      'Enter a valid CNIC number, like 35202-1234567-1.',
    );

    await user.clear(field('CNIC number'));
    await user.type(field('CNIC number'), '3520212345671');
    expect(field('CNIC number').value).toBe('35202-1234567-1');
    await user.selectOptions(field(/Tehsil/), 'Model Town');
    await user.click(screen.getByRole('button'));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        cnic: '35202-1234567-1',
        tehsil: 'Model Town',
      }),
    );
  });

  it('works as a controlled component', async () => {
    const user = userEvent.setup();
    const seen: PakCheckoutValues[] = [];
    function App() {
      const [values, setValues] = useState<PakCheckoutValues>({
        ...EMPTY_CHECKOUT_VALUES,
        fullName: 'Bilal',
        province: 'Sindh',
      });
      return (
        <PakCheckoutForm
          values={values}
          onChange={(next) => {
            seen.push(next);
            setValues(next);
          }}
        />
      );
    }
    render(<App />);
    expect(field('Full name').value).toBe('Bilal');
    expect(field('Province').value).toBe('Sindh');
    await user.type(field('City'), 'K');
    expect(seen[seen.length - 1]).toMatchObject({
      fullName: 'Bilal',
      city: 'K',
    });
    expect(seen[seen.length - 1]).not.toHaveProperty('cnic');
  });
});

describe('rules for react-hook-form', () => {
  it('has { required, validate } for every field', () => {
    expect(pakRules.cnic.required).toBe('Enter your CNIC number.');
    expect(pakRules.cnic.validate('35202-1234567-1')).toBe(true);
    expect(pakRules.cnic.validate('123')).toBe(
      'Enter a valid CNIC number, like 35202-1234567-1.',
    );
    expect(pakRules.mobile.validate('0300 1234567')).toBe(true);
    expect(pakRules.mobile.validate('042-1234567')).toBe(
      'Enter a valid Pakistani mobile number, like 0300-1234567.',
    );
    expect(pakRules.fullName.validate('   ')).toBe('Enter your full name.');
    expect(pakRules.postalCode.required).toBe(false);
    expect(pakRules.postalCode.validate('')).toBe(true);
    expect(pakRules.postalCode.validate('5400')).toBe(
      'A postal code has 5 digits.',
    );
    expect(pakRules.landmark.validate(undefined)).toBe(true);
  });

  it('can be made in Urdu with overrides', () => {
    const rules = createPakRules({
      locale: 'ur',
      labels: { cnicRequired: 'CNIC ضروری ہے' },
    });
    expect(rules.cnic.required).toBe('CNIC ضروری ہے');
    expect(rules.city.validate('')).toBe('اپنا شہر لکھیں۔');
  });

  it('validatePakForm checks the fields of each kind', () => {
    expect(Object.keys(validatePakForm({}, 'checkout'))).toEqual([
      'fullName',
      'mobile',
      'province',
      'district',
      'city',
      'address',
    ]);
    expect(validatePakForm({}, 'kyc')).toHaveProperty('cnic');
  });
});

describe('hints off', () => {
  it('renders no hints region by default', () => {
    const { container } = render(<PakCheckoutForm />);
    expect(container.querySelector('[aria-live]')).toBeNull();
  });
});
