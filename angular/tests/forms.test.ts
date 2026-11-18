import { ChangeDetectorRef, Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { getByLabelText, getByRole, queryByRole } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import {
  PakCheckoutFormComponent,
  PakKycFormComponent,
  PakLocationService,
  PakValidators,
  pakRequiredTrimmed,
  emptyPakFormValues,
  type PakFormLocale,
  type PakFormText,
  type PakFormValues,
} from '../src/public-api';

@Component({
  standalone: true,
  imports: [PakCheckoutFormComponent],
  template: `<pak-checkout-form
    [locale]="locale"
    [labels]="labels"
    [tehsil]="tehsil"
    [(value)]="value"
    (submitted)="submits.push($event)"
  />`,
})
class CheckoutHost {
  locale: PakFormLocale = 'en';
  labels: Partial<PakFormText> | undefined = undefined;
  tehsil = false;
  value: Partial<PakFormValues> = {};
  submits: PakFormValues[] = [];
}

@Component({
  standalone: true,
  imports: [PakKycFormComponent],
  template: `<pak-kyc-form
    [locale]="locale"
    (submitted)="submits.push($event)"
  />`,
})
class KycHost {
  locale: PakFormLocale = 'en';
  submits: PakFormValues[] = [];
}

async function render<T>(
  host: new () => T,
  setup: (h: T) => void = () => undefined,
) {
  const fixture: ComponentFixture<T> = TestBed.createComponent(host);
  setup(fixture.componentInstance);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  document.body.appendChild(fixture.nativeElement);
  return { fixture, host: fixture.componentInstance, user: userEvent.setup() };
}

function label(text: string) {
  return getByLabelText(document.body, text, {
    exact: false,
  }) as HTMLInputElement;
}

function select(text: string) {
  return label(text) as unknown as HTMLSelectElement;
}

afterEach(() => {
  TestBed.resetTestingModule();
  document.body.innerHTML = '';
});

async function fillValid(
  user: ReturnType<typeof userEvent.setup>,
  kyc = false,
) {
  await user.type(label('Full name'), '  Ali Khan  ');
  await user.type(label('Mobile number'), '03211234567');
  if (kyc) await user.type(label('CNIC number'), '3520212345671');
  await user.selectOptions(select('Province'), 'Punjab');
  await user.selectOptions(select('District'), 'Lahore');
  await user.type(label('City'), 'Lahore');
  await user.type(label('Address'), 'House 12, Street 4, Gulberg III');
}

describe('PakCheckoutFormComponent', () => {
  it('renders every field with a real label, in English by default', async () => {
    await render(CheckoutHost);
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
    expect(form.classList).toContain('pak-form--checkout');
    expect(select('Province').tagName).toBe('SELECT');
    expect(getByRole(document.body, 'button', { name: 'Submit' })).toBeTruthy();
  });

  it('marks required and optional fields', async () => {
    await render(CheckoutHost);
    for (const text of [
      'Full name',
      'Mobile number',
      'Province',
      'District',
      'City',
      'Address',
    ]) {
      expect(label(text).hasAttribute('required')).toBe(true);
      expect(label(text).getAttribute('aria-required')).toBe('true');
    }
    for (const text of ['Nearby place', 'Postal code']) {
      expect(label(text).hasAttribute('required')).toBe(false);
    }
    expect(document.body.textContent).toContain('(optional)');
  });

  it('switches to Urdu with rtl direction and keeps province values in English', async () => {
    await render(CheckoutHost, (h) => (h.locale = 'ur'));
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
    const option = [...select('صوبہ').options].find(
      (o) => o.value === 'Punjab',
    )!;
    expect(option.textContent!.trim()).toBe('پنجاب');
    expect(
      getByRole(document.body, 'button', { name: 'جمع کریں' }),
    ).toBeTruthy();
  });

  it('lets the app override labels', async () => {
    await render(
      CheckoutHost,
      (h) => (h.labels = { name: 'Your name', submit: 'Place order' }),
    );
    expect(label('Your name')).toBeTruthy();
    expect(
      getByRole(document.body, 'button', { name: 'Place order' }),
    ).toBeTruthy();
  });

  it('cascades province → district → tehsil and clears on change', async () => {
    const { user } = await render(CheckoutHost, (h) => (h.tehsil = true));
    const district = select('District');
    expect(district.disabled).toBe(true);
    await user.selectOptions(select('Province'), 'Punjab');
    expect(district.disabled).toBe(false);
    expect([...district.options].map((o) => o.value)).toContain('Lahore');
    await user.selectOptions(district, 'Lahore');
    const tehsil = select('Tehsil');
    expect([...tehsil.options].map((o) => o.value)).toContain('Model Town');
    await user.selectOptions(tehsil, 'Model Town');
    await user.type(label('City'), 'Lahore');

    await user.selectOptions(district, 'Kasur');
    expect(tehsil.value).toBe('');
    expect(label('City').value).toBe('Lahore');

    await user.selectOptions(select('Province'), 'Sindh');
    expect(district.value).toBe('');
    expect([...district.options].map((o) => o.value)).toContain(
      'Karachi Central',
    );
    expect(label('City').value).toBe('');
  });

  it('suggests cities of the chosen province in a datalist', async () => {
    const { user } = await render(CheckoutHost);
    await user.selectOptions(select('Province'), 'Punjab');
    const city = label('City');
    await user.type(city, 'lah');
    const list = document.getElementById(city.getAttribute('list')!)!;
    expect(list.tagName).toBe('DATALIST');
    const options = [...list.querySelectorAll('option')].map((o) => o.value);
    expect(options).toContain('Lahore');
    expect(options).not.toContain('Dera Allah Yar');
  });

  it('shows errors on submit with an alert summary and linked messages', async () => {
    const { host, user } = await render(CheckoutHost);
    await user.click(getByRole(document.body, 'button', { name: 'Submit' }));
    expect(host.submits).toEqual([]);
    const alert = getByRole(document.body, 'alert');
    expect(alert.textContent).toContain('Enter your full name');
    expect(alert.textContent).toContain('Select a province');
    const name = label('Full name');
    expect(name.getAttribute('aria-invalid')).toBe('true');
    const errorId = name.getAttribute('aria-describedby')!;
    expect(document.getElementById(errorId)!.textContent).toBe(
      'Enter your full name',
    );
    expect(document.activeElement).toBe(name);
    expect(label('Postal code').hasAttribute('aria-invalid')).toBe(false);
  });

  it('shows a field error after leaving it', async () => {
    const { user } = await render(CheckoutHost);
    await user.type(label('Mobile number'), '0300');
    await user.tab();
    const mobile = label('Mobile number');
    expect(
      document.getElementById(mobile.getAttribute('aria-describedby')!)!
        .textContent,
    ).toBe('Enter a valid mobile number, like 0300-1234567');
    await user.type(label('Postal code'), '123');
    await user.tab();
    expect(document.body.textContent).toContain('A postal code has 5 digits');
  });

  it('shows Urdu error messages', async () => {
    const { user } = await render(CheckoutHost, (h) => (h.locale = 'ur'));
    await user.click(getByRole(document.body, 'button', { name: 'جمع کریں' }));
    expect(getByRole(document.body, 'alert').textContent).toContain(
      'اپنا نام لکھیں',
    );
  });

  it('submits trimmed values and formats the mobile number', async () => {
    const { host, user } = await render(CheckoutHost);
    await fillValid(user);
    await user.type(label('Postal code'), '54660');
    await user.click(getByRole(document.body, 'button', { name: 'Submit' }));
    expect(queryByRole(document.body, 'alert')).toBeNull();
    expect(host.submits).toEqual([
      {
        ...emptyPakFormValues(),
        name: 'Ali Khan',
        mobile: '0321-1234567',
        province: 'Punjab',
        district: 'Lahore',
        city: 'Lahore',
        address: 'House 12, Street 4, Gulberg III',
        postalCode: '54660',
      },
    ]);
  });

  it('supports [(value)] two-way binding', async () => {
    const { fixture, host, user } = await render(CheckoutHost, (h) => {
      h.value = {
        name: 'Sara',
        mobile: '03001234567',
        province: 'Punjab',
        district: 'Lahore',
      };
    });
    expect(label('Full name').value).toBe('Sara');
    expect(label('Mobile number').value).toBe('0300-1234567');
    expect(select('District').value).toBe('Lahore');
    await user.type(label('Full name'), ' Ahmed');
    expect(host.value.name).toBe('Sara Ahmed');
    expect(host.value.mobile).toBe('0300-1234567');
    host.value = { ...host.value, city: 'Multan' };
    // Host components are OnPush by default from Angular 22.
    fixture.debugElement.injector.get(ChangeDetectorRef).markForCheck();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(label('City').value).toBe('Multan');
  });

  it('works with the keyboard only', async () => {
    const { user } = await render(CheckoutHost);
    await user.tab();
    expect(document.activeElement).toBe(label('Full name'));
    await user.keyboard('Ali');
    await user.tab();
    expect(document.activeElement).toBe(label('Mobile number'));
    await user.tab();
    expect(document.activeElement).toBe(label('Province'));
  });
});

describe('PakKycFormComponent', () => {
  it('adds a required, masked CNIC field', async () => {
    const { host, user } = await render(KycHost);
    const cnic = label('CNIC number');
    expect(cnic.hasAttribute('required')).toBe(true);
    await fillValid(user, true);
    expect(cnic.value).toBe('35202-1234567-1');
    await user.click(getByRole(document.body, 'button', { name: 'Submit' }));
    expect(host.submits[0]!.cnic).toBe('35202-1234567-1');
  });

  it('rejects an invalid CNIC', async () => {
    const { host, user } = await render(KycHost, (h) => (h.locale = 'ur'));
    await user.type(label('شناختی کارڈ نمبر'), '12345');
    await user.click(getByRole(document.body, 'button', { name: 'جمع کریں' }));
    expect(host.submits).toEqual([]);
    expect(getByRole(document.body, 'alert').textContent).toContain(
      'درست شناختی کارڈ نمبر لکھیں',
    );
  });
});

describe('PakLocationService and validators', () => {
  it('serves the cascade', () => {
    const service = TestBed.inject(PakLocationService);
    expect(service.provinces).toHaveLength(7);
    expect(service.districts('Punjab')).toContain('Lahore');
    expect(service.districts('')).toEqual([]);
    expect(service.tehsils('Lahore')).toContain('Model Town');
    expect(service.cities('lah', 'Punjab')).toEqual(['Lahore']);
    const values = {
      ...emptyPakFormValues(),
      province: 'Punjab',
      district: 'Lahore',
      city: 'Lahore',
    };
    expect(service.withField(values, 'province', 'Sindh')).toMatchObject({
      district: '',
      city: '',
    });
  });

  it('validates postal codes and trimmed required values', () => {
    expect(PakValidators.postalCode(new FormControl('54000'))).toBeNull();
    expect(PakValidators.postalCode(new FormControl(''))).toBeNull();
    expect(PakValidators.postalCode(new FormControl('5400'))).toEqual({
      pakPostalCode: true,
    });
    expect(pakRequiredTrimmed(new FormControl('  '))).toEqual({
      pakRequired: true,
    });
    expect(pakRequiredTrimmed(new FormControl(' a '))).toBeNull();
  });
});
