import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { afterEach, describe, expect, it } from 'vitest';
import {
  PakCnicPipe,
  PakIbanPipe,
  PakPhonePipe,
  PakPkrPipe,
  PakValidators,
} from '../src/public-api';

afterEach(() => {
  TestBed.resetTestingModule();
});

describe('pipes', () => {
  it('pakCnic formats valid CNICs and leaves other values alone', () => {
    const pipe = new PakCnicPipe();
    expect(pipe.transform('3520212345671')).toBe('35202-1234567-1');
    expect(pipe.transform('35202 1234567 1')).toBe('35202-1234567-1');
    expect(pipe.transform('12345')).toBe('12345');
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
  });

  it('pakPhone formats in local, international and E.164 styles', () => {
    const pipe = new PakPhonePipe();
    expect(pipe.transform('+923001234567')).toBe('0300-1234567');
    expect(pipe.transform('03001234567', 'international')).toBe(
      '+92 300 1234567',
    );
    expect(pipe.transform('0300 1234567', 'e164')).toBe('+923001234567');
    expect(pipe.transform('03601234567')).toBe('03601234567');
    expect(pipe.transform(null)).toBe('');
  });

  it('pakIban groups valid IBANs and leaves other values alone', () => {
    const pipe = new PakIbanPipe();
    expect(pipe.transform('pk36scbl0000001123456702')).toBe(
      'PK36 SCBL 0000 0011 2345 6702',
    );
    expect(pipe.transform('PK37SCBL0000001123456702')).toBe(
      'PK37SCBL0000001123456702',
    );
    expect(pipe.transform(undefined)).toBe('');
  });

  it('pakPkr formats rupees and lakh/crore amounts', () => {
    const pipe = new PakPkrPipe();
    expect(pipe.transform(150000)).toBe('Rs. 150,000');
    expect(pipe.transform('150000')).toBe('Rs. 150,000');
    expect(pipe.transform(2500000, 'lakh')).toBe('25 Lakh');
    expect(pipe.transform(-1234.5)).toBe('-Rs. 1,235');
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform('')).toBe('');
    expect(pipe.transform('abc')).toBe('');
    expect(pipe.transform(Number.NaN)).toBe('');
    expect(pipe.transform(Number.POSITIVE_INFINITY)).toBe('');
  });

  it('work in a template', () => {
    @Component({
      standalone: true,
      imports: [PakCnicPipe, PakPhonePipe, PakIbanPipe, PakPkrPipe],
      template: `{{ cnic | pakCnic }}|{{ phone | pakPhone: 'international' }}|{{
          iban | pakIban
        }}|{{ price | pakPkr: 'lakh' }}`,
    })
    class Host {
      cnic = '3520212345671';
      phone = '03001234567';
      iban = 'PK36SCBL0000001123456702';
      price = 15000000;
    }
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toBe(
      '35202-1234567-1|+92 300 1234567|PK36 SCBL 0000 0011 2345 6702|1.5 Crore',
    );
  });
});

describe('PakValidators', () => {
  const cases: [keyof typeof PakValidators, string, string, string][] = [
    ['cnic', 'pakCnic', '35202-1234567-1', '00000-0000000-0'],
    ['phone', 'pakPhone', '0300 1234567', '03601234567'],
    ['iban', 'pakIban', 'PK36SCBL0000001123456702', 'PK37SCBL0000001123456702'],
    ['ntn', 'pakNtn', '0622438-9', '123'],
    ['strn', 'pakStrn', '17-00-3761-882-19', '1'],
    ['landline', 'pakLandline', '042-35761234', '03001234567'],
    ['passport', 'pakPassport', 'AB1234567', 'A1234'],
    ['vehiclePlate', 'pakVehiclePlate', 'LEA-1234', 'ABC-12345'],
  ];

  it.each(cases)(
    '%s accepts valid values and reports %s otherwise',
    (name, key, valid, invalid) => {
      const validate = PakValidators[name];
      expect(validate(new FormControl(valid))).toBeNull();
      expect(validate(new FormControl(invalid))).toEqual({ [key]: true });
    },
  );

  it('leave empty values to Validators.required', () => {
    for (const validate of Object.values(PakValidators)) {
      expect(validate(new FormControl(''))).toBeNull();
      expect(validate(new FormControl(null))).toBeNull();
      expect(validate(new FormControl(undefined))).toBeNull();
    }
    const control = new FormControl('', [
      Validators.required,
      PakValidators.cnic,
    ]);
    expect(control.errors).toEqual({ required: true });
  });

  it('reject values that are not strings', () => {
    expect(PakValidators.cnic(new FormControl(3520212345671))).toEqual({
      pakCnic: true,
    });
  });

  it('work in a form group', () => {
    const form = new FormGroup({
      cnic: new FormControl('35202-1234567-1', [PakValidators.cnic]),
      phone: new FormControl('0360', [PakValidators.phone]),
    });
    expect(form.valid).toBe(false);
    expect(form.controls.phone.errors).toEqual({ pakPhone: true });
    form.controls.phone.setValue('0300-1234567');
    expect(form.valid).toBe(true);
  });
});
