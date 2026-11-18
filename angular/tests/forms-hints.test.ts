import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { findByText, getByLabelText } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  PakCheckoutFormComponent,
  type PakFormLocale,
  type PakFormValues,
} from '../src/public-api';

const loaded = vi.hoisted(() => ({ quality: 0 }));

vi.mock('pakdatakit/quality', async (importOriginal) => {
  loaded.quality += 1;
  return importOriginal();
});

@Component({
  standalone: true,
  imports: [PakCheckoutFormComponent],
  template: `<pak-checkout-form
    [hints]="hints"
    [locale]="locale"
    (submitted)="submits.push($event)"
  />`,
})
class Host {
  hints = false;
  locale: PakFormLocale = 'en';
  submits: PakFormValues[] = [];
}

async function render(setup: (host: Host) => void = () => undefined) {
  const fixture = TestBed.createComponent(Host);
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

afterEach(() => {
  TestBed.resetTestingModule();
  document.body.innerHTML = '';
});

describe('form hints', () => {
  it('does not load pakdatakit/quality while hints are off', async () => {
    const { user } = await render();
    await user.type(label('Address'), 'House 1');
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(loaded.quality).toBe(0);
    expect(document.querySelector('[aria-live]')).toBeNull();
  });

  it('loads hints on demand and announces them politely', async () => {
    const { fixture, user } = await render();
    fixture.componentInstance.hints = true;
    fixture.detectChanges();
    await user.type(label('Mobile number'), '03001234567');
    await user.selectOptions(label('Province'), 'Punjab');
    await user.type(label('City'), 'Lahore');
    await user.type(label('Address'), 'Gulberg');
    await user.type(label('Postal code'), '44000');

    expect(loaded.quality).toBe(1);
    await findByText(document.body, /Address completeness: \d+\/100/);
    const address = label('Address');
    const region = document.getElementById(
      address.getAttribute('aria-describedby')!,
    )!;
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
    const { host, user } = await render((h) => {
      h.hints = true;
      h.locale = 'ur';
    });
    await user.type(label('نام'), 'Ali');
    await user.type(label('موبائل نمبر'), '03001234567');
    await user.selectOptions(label('صوبہ'), 'Punjab');
    await user.selectOptions(label('ضلع'), 'Lahore');
    await user.type(label('شہر'), 'Lahore');
    await user.type(label('پتہ'), 'Gulberg');
    await findByText(document.body, /پتہ کتنا مکمل ہے/);
    expect(document.body.textContent).toContain('یہ آزمائشی نمبر لگتا ہے');
    await user.click(document.querySelector('button[type="submit"]')!);
    expect(host.submits).toHaveLength(1);
  });
});
