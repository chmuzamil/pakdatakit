import { Component, Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  PakCnicInputDirective,
  PakIbanInputDirective,
  PakPhoneInputDirective,
  PakValidators,
  type PakInputChange,
} from '../src/public-api';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, PakCnicInputDirective],
  template: `<input
    pakCnicInput
    [formControl]="control"
    (pakChange)="changes.push($event)"
  />`,
})
class CnicHost {
  control = new FormControl('', {
    nonNullable: true,
    validators: [PakValidators.cnic],
  });
  changes: PakInputChange<unknown>[] = [];
}

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, PakPhoneInputDirective],
  template: `<input
    pakPhoneInput
    [formControl]="control"
    (pakChange)="changes.push($event)"
  />`,
})
class PhoneHost {
  control = new FormControl('', { nonNullable: true });
  changes: PakInputChange<unknown>[] = [];
}

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, PakIbanInputDirective],
  template: `<input
      pakIbanInput
      [formControl]="control"
      (pakChange)="changes.push($event)"
      #iban="pakInput"
    />
    <output>{{ iban.info }}</output>`,
})
class IbanHost {
  control = new FormControl('', { nonNullable: true });
  changes: PakInputChange<unknown>[] = [];
}

@Component({
  standalone: true,
  imports: [FormsModule, PakCnicInputDirective],
  template: `<input pakCnicInput [(ngModel)]="cnic" />`,
})
class NgModelHost {
  cnic = '';
}

@Component({
  standalone: true,
  imports: [PakCnicInputDirective],
  template: `<input pakCnicInput inputmode="text" value="3520212345671" />`,
})
class PlainHost {}

function render<T>(component: Type<T>): {
  fixture: ComponentFixture<T>;
  host: T;
  el: HTMLInputElement;
} {
  const fixture = TestBed.createComponent(component);
  document.body.appendChild(fixture.nativeElement as HTMLElement);
  fixture.detectChanges();
  return {
    fixture,
    host: fixture.componentInstance,
    el: (fixture.nativeElement as HTMLElement).querySelector(
      'input',
    ) as HTMLInputElement,
  };
}

afterEach(() => {
  TestBed.resetTestingModule();
  document.body.innerHTML = '';
});

describe('pakCnicInput', () => {
  it('formats as the user types and updates the control', async () => {
    const { host, el } = render(CnicHost);
    await userEvent.type(el, '3520212345671');

    expect(el.value).toBe('35202-1234567-1');
    expect(host.control.value).toBe('35202-1234567-1');
    expect(host.control.valid).toBe(true);
    expect(host.changes).toHaveLength(13);
    expect(host.changes[0]).toEqual({
      value: '3',
      state: 'incomplete',
      info: null,
    });
    expect(host.changes[5]).toEqual({
      value: '35202-1',
      state: 'incomplete',
      info: null,
    });
    expect(host.changes[12]).toEqual({
      value: '35202-1234567-1',
      state: 'valid',
      info: {
        digits: '3520212345671',
        formatted: '35202-1234567-1',
        province: 'Punjab',
        gender: 'male',
      },
    });
    expect(el.selectionStart).toBe(15);
    expect(el.getAttribute('aria-invalid')).toBeNull();
  });

  it('drops characters that cannot be part of a CNIC', async () => {
    const { host, el } = render(CnicHost);
    await userEvent.type(el, '35a2');
    expect(el.value).toBe('352');
    expect(host.changes).toHaveLength(3);
  });

  it('sets aria-invalid when the value cannot become valid', async () => {
    const { host, el } = render(CnicHost);
    await userEvent.type(el, '0');
    expect(el.value).toBe('0');
    expect(el.getAttribute('aria-invalid')).toBe('true');
    expect(host.control.errors).toEqual({ pakCnic: true });
  });

  it('formats a value set on the control', () => {
    const { fixture, host, el } = render(CnicHost);
    host.control.setValue('3520212345671');
    fixture.detectChanges();
    expect(el.value).toBe('35202-1234567-1');
  });

  it('sets input attributes without overriding existing ones', () => {
    const { el } = render(CnicHost);
    expect(el.getAttribute('inputmode')).toBe('numeric');
    expect(el.getAttribute('autocomplete')).toBe('off');
    expect(el.getAttribute('spellcheck')).toBe('false');

    const plain = render(PlainHost);
    expect(plain.el.getAttribute('inputmode')).toBe('text');
  });

  it('formats a value in the markup when there is no forms directive', async () => {
    const { el } = render(PlainHost);
    expect(el.value).toBe('35202-1234567-1');
    await userEvent.type(el, '{Backspace}');
    expect(el.value).toBe('35202-1234567');
  });

  it('keeps the caret after the typed digit when editing in the middle', async () => {
    const { fixture, host, el } = render(CnicHost);
    host.control.setValue('35202-1234567-1');
    fixture.detectChanges();
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
    const { fixture, host, el } = render(CnicHost);
    host.control.setValue('35202-1234');
    fixture.detectChanges();
    el.focus();
    el.setSelectionRange(6, 6);
    await userEvent.keyboard('{Backspace}');
    expect(el.value).toBe('35201-234');
    expect(el.selectionStart).toBe(4);
    expect(host.control.value).toBe('35201-234');
  });

  it('keeps the caret in place on Backspace in the middle', async () => {
    const { fixture, host, el } = render(CnicHost);
    host.control.setValue('35202-1234567-1');
    fixture.detectChanges();
    el.focus();
    el.setSelectionRange(2, 2);
    await userEvent.keyboard('{Backspace}');
    expect(el.value).toBe('32021-2345671');
    expect(el.selectionStart).toBe(1);
  });

  it('formats pasted text', async () => {
    const { host, el } = render(CnicHost);
    el.focus();
    await userEvent.paste('35202 1234567 1');
    expect(el.value).toBe('35202-1234567-1');
    expect(el.selectionStart).toBe(15);
    expect(host.changes).toHaveLength(1);
    expect(host.changes[0]?.state).toBe('valid');
  });

  it('handles input events without an inputType', () => {
    const { host, el } = render(CnicHost);
    el.value = '3520212345671';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    expect(el.value).toBe('35202-1234567-1');
    expect(host.control.value).toBe('35202-1234567-1');
  });

  it('marks the control as touched on blur and follows disabled state', () => {
    const { fixture, host, el } = render(CnicHost);
    expect(host.control.touched).toBe(false);
    el.dispatchEvent(new Event('blur'));
    expect(host.control.touched).toBe(true);
    host.control.disable();
    fixture.detectChanges();
    expect(el.disabled).toBe(true);
  });

  it('works with ngModel', async () => {
    const { fixture, host, el } = render(NgModelHost);
    await fixture.whenStable();
    await userEvent.type(el, '352021');
    expect(el.value).toBe('35202-1');
    expect(host.cnic).toBe('35202-1');
  });
});

describe('pakPhoneInput', () => {
  it('formats a local number and reports the network when valid', async () => {
    const { host, el } = render(PhoneHost);
    expect(el.type).toBe('tel');
    expect(el.getAttribute('inputmode')).toBe('tel');
    expect(el.getAttribute('autocomplete')).toBe('tel');

    await userEvent.type(el, '03001234567');
    expect(el.value).toBe('0300-1234567');
    expect(el.selectionStart).toBe(12);
    expect(host.changes[4]).toEqual({
      value: '0300-1',
      state: 'incomplete',
      info: null,
    });
    expect(host.changes.at(-1)).toEqual({
      value: '0300-1234567',
      state: 'valid',
      info: { valid: true, formatted: '+923001234567', network: 'Jazz' },
    });
  });

  it('formats an international number', async () => {
    const { host, el } = render(PhoneHost);
    await userEvent.type(el, '+923001234567');
    expect(el.value).toBe('+92 300 1234567');
    expect(host.changes.at(-1)?.state).toBe('valid');
  });

  it('flags an unallocated prefix', async () => {
    const { el } = render(PhoneHost);
    await userEvent.type(el, '0360');
    expect(el.getAttribute('aria-invalid')).toBe('true');
  });
});

describe('pakIbanInput', () => {
  it('uppercases, groups and reports the bank name', async () => {
    const { fixture, host, el } = render(IbanHost);
    expect(el.getAttribute('autocapitalize')).toBe('characters');

    await userEvent.type(el, 'pk36scbl0000001123456702');
    expect(el.value).toBe('PK36 SCBL 0000 0011 2345 6702');
    expect(el.selectionStart).toBe(29);
    expect(host.changes.at(-1)).toEqual({
      value: 'PK36 SCBL 0000 0011 2345 6702',
      state: 'valid',
      info: 'Standard Chartered Bank (Pakistan) Limited',
    });
    // The exported directive gives templates the state and details.
    fixture.detectChanges();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('output')
        ?.textContent,
    ).toBe('Standard Chartered Bank (Pakistan) Limited');
  });

  it('reports an invalid IBAN', async () => {
    const spy = vi.fn();
    const { host, el } = render(IbanHost);
    host.control.valueChanges.subscribe(spy);
    await userEvent.type(el, 'GB29');
    expect(host.changes.at(-1)?.state).toBe('invalid');
    expect(el.getAttribute('aria-invalid')).toBe('true');
    expect(spy).toHaveBeenLastCalledWith('GB29');
  });
});
