import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Directive,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  type ValidatorFn,
} from '@angular/forms';
import { formatCNICInput, formatPhoneInput } from 'pakdatakit/input';
import { Subscription } from 'rxjs';
import { PakCnicInputDirective, PakPhoneInputDirective } from './directives';
import {
  citySuggestions,
  districtOptions,
  emptyPakFormValues,
  isRequiredField,
  loadPakHintEngine,
  pakFormFields,
  pakFormHints,
  PAK_PROVINCES,
  provinceLabel,
  submittedValues,
  tehsilOptions,
  type PakFormField,
  type PakFormHints,
  type PakFormKind,
  type PakFormValues,
  type PakHintEngine,
} from './form-core';
import { formText, type PakFormLocale, type PakFormText } from './form-text';
import { PakValidators, pakRequiredTrimmed } from './validators';

type Controls = { [K in PakFormField]: FormControl<string> };

const REQUIRED_TEXT: Partial<Record<PakFormField, keyof PakFormText>> = {
  name: 'nameRequired',
  mobile: 'mobileRequired',
  cnic: 'cnicRequired',
  province: 'provinceRequired',
  district: 'districtRequired',
  city: 'cityRequired',
  address: 'addressRequired',
};

const INVALID_TEXT: Partial<Record<PakFormField, keyof PakFormText>> = {
  mobile: 'mobileInvalid',
  cnic: 'cnicInvalid',
  postalCode: 'postalCodeInvalid',
};

const HINTED: readonly PakFormField[] = ['address', 'mobile', 'postalCode'];

let counter = 0;

const TEMPLATE = `
<form
  [formGroup]="form"
  [class]="'pak-form pak-form--' + kind"
  novalidate
  [attr.lang]="locale"
  [attr.dir]="locale === 'ur' ? 'rtl' : 'ltr'"
  (ngSubmit)="onSubmit()"
>
  @if (submitAttempted && summary().length > 0) {
    <div class="pak-form__summary" role="alert" [id]="id('summary')">
      <p>{{ text.errorSummary }}</p>
      <ul>
        @for (item of summary(); track item.field) {
          <li><a [href]="'#' + id(item.field)">{{ item.message }}</a></li>
        }
      </ul>
    </div>
  }
  @for (field of fields; track field) {
    <div [class]="'pak-form__field pak-form__field--' + field">
      <label class="pak-form__label" [for]="id(field)"
        >{{ text[field] }}@if (!isRequired(field)) {<span class="pak-form__optional"> {{ text.optional }}</span>}</label
      >
      @switch (field) {
        @case ('name') {
          <input class="pak-form__input" type="text" formControlName="name" autocomplete="name"
            required aria-required="true" [id]="id(field)" [attr.aria-invalid]="ariaInvalid(field)"
            [attr.aria-describedby]="describedBy(field)" />
        }
        @case ('mobile') {
          <input class="pak-form__input" pakPhoneInput formControlName="mobile"
            required aria-required="true" [id]="id(field)" [placeholder]="text.mobilePlaceholder"
            [attr.aria-invalid]="ariaInvalid(field)" [attr.aria-describedby]="describedBy(field)" />
        }
        @case ('cnic') {
          <input class="pak-form__input" pakCnicInput formControlName="cnic"
            required aria-required="true" [id]="id(field)" [placeholder]="text.cnicPlaceholder"
            [attr.aria-invalid]="ariaInvalid(field)" [attr.aria-describedby]="describedBy(field)" />
        }
        @case ('province') {
          <select class="pak-form__select" formControlName="province" required aria-required="true"
            [id]="id(field)" [attr.aria-invalid]="ariaInvalid(field)" [attr.aria-describedby]="describedBy(field)">
            <option value="">{{ text.selectPlaceholder }}</option>
            @for (option of provinces; track option) {
              <option [value]="option">{{ provinceText(option) }}</option>
            }
          </select>
        }
        @case ('district') {
          <select class="pak-form__select" formControlName="district" required aria-required="true"
            [id]="id(field)" [attr.aria-invalid]="ariaInvalid(field)" [attr.aria-describedby]="describedBy(field)">
            <option value="">{{ text.selectPlaceholder }}</option>
            @for (option of districts; track option) {
              <option [value]="option">{{ option }}</option>
            }
          </select>
        }
        @case ('tehsil') {
          <select class="pak-form__select" formControlName="tehsil"
            [id]="id(field)" [attr.aria-describedby]="describedBy(field)">
            <option value="">{{ text.selectPlaceholder }}</option>
            @for (option of tehsils; track option) {
              <option [value]="option">{{ option }}</option>
            }
          </select>
        }
        @case ('city') {
          <input class="pak-form__input" type="text" formControlName="city" autocomplete="address-level2"
            required aria-required="true" [id]="id(field)" [attr.list]="id('cities')"
            [placeholder]="text.cityPlaceholder" [attr.aria-invalid]="ariaInvalid(field)"
            [attr.aria-describedby]="describedBy(field)" />
          <datalist [id]="id('cities')">
            @for (city of cities; track city) {
              <option [value]="city"></option>
            }
          </datalist>
        }
        @case ('address') {
          <textarea class="pak-form__textarea" formControlName="address" rows="2" autocomplete="street-address"
            required aria-required="true" [id]="id(field)" [placeholder]="text.addressPlaceholder"
            [attr.aria-invalid]="ariaInvalid(field)" [attr.aria-describedby]="describedBy(field)"></textarea>
        }
        @case ('landmark') {
          <input class="pak-form__input" type="text" formControlName="landmark"
            [id]="id(field)" [placeholder]="text.landmarkPlaceholder"
            [attr.aria-describedby]="describedBy(field)" />
        }
        @case ('postalCode') {
          <input class="pak-form__input" type="text" formControlName="postalCode" inputmode="numeric"
            autocomplete="postal-code" maxlength="5" [id]="id(field)" [placeholder]="text.postalCodePlaceholder"
            [attr.aria-invalid]="ariaInvalid(field)" [attr.aria-describedby]="describedBy(field)" />
        }
      }
      @if (error(field); as message) {
        <p class="pak-form__error" [id]="id(field, 'error')">{{ message }}</p>
      }
      @if (hintsShown && isHinted(field)) {
        <div class="pak-form__hint" aria-live="polite" [id]="id(field, 'hint')">
          @for (message of hintMessages(field); track $index) {
            <p>{{ message }}</p>
          }
        </div>
      }
    </div>
  }
  <ng-content></ng-content>
  <button class="pak-form__submit" type="submit">{{ text.submit }}</button>
</form>
`;

/**
 * Shared logic of {@link PakCheckoutFormComponent} and
 * {@link PakKycFormComponent}.
 */
@Directive()
export abstract class PakFormBase implements OnChanges, OnDestroy {
  /** `'en'` (default) or `'ur'`: switches every text and sets `dir="rtl"`. */
  @Input() locale: PakFormLocale = 'en';
  /** Overrides for any label, placeholder, error or hint text. */
  @Input() labels: Partial<PakFormText> | null | undefined = undefined;
  /** Show the optional tehsil select (default `false`). */
  @Input() tehsil = false;
  /**
   * Show address and phone hints (default `false`). Turning this on loads
   * `pakdatakit/quality` and the post office directory on demand.
   */
  @Input() hints = false;
  /** Prefix for element ids (default: a unique `pak-form-N`). */
  @Input() idPrefix = `pak-form-${++counter}`;
  /** Values to show; use with `(valueChange)` or `[(value)]`. */
  @Input() value: Partial<PakFormValues> | null | undefined = undefined;

  /** Emits trimmed values when a valid form is submitted. */
  @Output() readonly submitted = new EventEmitter<PakFormValues>();
  /** Emits the values on every change. */
  @Output() readonly valueChange = new EventEmitter<PakFormValues>();

  /** Which form this is. */
  abstract get kind(): PakFormKind;

  /** The reactive form, for apps that want to read or patch it. */
  readonly form: FormGroup<Controls>;
  /** Text in the current locale, with overrides. */
  text: PakFormText = formText('en');
  /** Whether a submit was tried while the form had errors. */
  submitAttempted = false;
  readonly provinces: readonly string[] = PAK_PROVINCES;
  districts: string[] = [];
  tehsils: string[] = [];
  cities: string[] = [];
  /** Current hints, or `null` while they are off or loading. */
  currentHints: PakFormHints | null = null;

  private engine: PakHintEngine | null = null;
  private patching = false;
  private readonly subscription = new Subscription();
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    const required = pakRequiredTrimmed;
    const control = (validators: ValidatorFn[] = []) =>
      new FormControl('', { nonNullable: true, validators });
    this.form = new FormGroup<Controls>({
      name: control([required]),
      mobile: control([required, PakValidators.phone]),
      // The CNIC is only checked in the KYC form.
      cnic: control([
        (c) =>
          this.kind === 'kyc' ? (required(c) ?? PakValidators.cnic(c)) : null,
      ]),
      province: control([required]),
      district: control([required]),
      tehsil: control(),
      city: control([required]),
      address: control([required]),
      landmark: control(),
      postalCode: control([PakValidators.postalCode]),
    });
    const { province, district, city } = this.form.controls;
    this.subscription.add(
      province.valueChanges.subscribe(() => {
        if (!this.patching) {
          this.form.patchValue(
            { district: '', tehsil: '', city: '' },
            { emitEvent: false },
          );
        }
        this.updateOptions();
      }),
    );
    this.subscription.add(
      district.valueChanges.subscribe(() => {
        if (!this.patching)
          this.form.controls.tehsil.setValue('', { emitEvent: false });
        this.updateOptions();
      }),
    );
    this.subscription.add(
      city.valueChanges.subscribe(() => this.updateOptions()),
    );
    this.subscription.add(
      this.form.valueChanges.subscribe(() => {
        this.updateHints();
        if (!this.patching) this.valueChange.emit(this.values());
      }),
    );
    this.updateOptions();
  }

  /** Fields shown, in order. */
  get fields(): PakFormField[] {
    return pakFormFields(this.kind, this.tehsil);
  }

  /** Whether the hint regions are shown. */
  get hintsShown(): boolean {
    return this.currentHints !== null;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['locale'] || changes['labels']) {
      this.text = formText(
        this.locale === 'ur' ? 'ur' : 'en',
        this.labels ?? {},
      );
      this.updateHints();
    }
    if (changes['value'] && this.value) this.setValues(this.value);
    if (changes['hints']) {
      if (this.hints && !this.engine) {
        loadPakHintEngine().then(
          (engine) => {
            this.engine = engine;
            this.updateHints();
            this.cdr.markForCheck();
          },
          () => {
            // Hints are optional; the form works without them.
          },
        );
      }
      this.updateHints();
    }
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  /** Current values (including disabled controls). */
  values(): PakFormValues {
    return { ...emptyPakFormValues(), ...this.form.getRawValue() };
  }

  /** Sets values without running the cascade (district stays with province). */
  setValues(input: Partial<PakFormValues>): void {
    // Store the mobile number and CNIC as the masked inputs show them.
    const values = { ...input };
    if (typeof values.mobile === 'string')
      values.mobile = formatPhoneInput(values.mobile);
    if (typeof values.cnic === 'string')
      values.cnic = formatCNICInput(values.cnic);
    const current = this.values();
    const changed = Object.entries(values).some(
      ([key, value]) =>
        typeof value === 'string' && current[key as PakFormField] !== value,
    );
    if (!changed) return;
    this.patching = true;
    try {
      this.form.patchValue(values);
    } finally {
      this.patching = false;
    }
    this.updateOptions();
    this.cdr.markForCheck();
  }

  /** Clears the form, its errors and visited state. */
  reset(values: Partial<PakFormValues> = {}): void {
    this.submitAttempted = false;
    this.patching = true;
    try {
      this.form.reset({ ...emptyPakFormValues(), ...values });
    } finally {
      this.patching = false;
    }
    this.updateOptions();
    this.valueChange.emit(this.values());
    this.cdr.markForCheck();
  }

  /** Element id for a field, and for its error and hint. */
  id(
    field: PakFormField | 'summary' | 'cities',
    part?: 'error' | 'hint',
  ): string {
    return part
      ? `${this.idPrefix}-${field}-${part}`
      : `${this.idPrefix}-${field}`;
  }

  isRequired(field: PakFormField): boolean {
    return isRequiredField(field);
  }

  isHinted(field: PakFormField): boolean {
    return HINTED.includes(field);
  }

  provinceText(province: string): string {
    return provinceLabel(province, this.text);
  }

  /** The error message shown for a field, or `null`. */
  error(field: PakFormField): string | null {
    const control = this.form.controls[field];
    const errors = control.errors;
    if (!errors || !(control.touched || this.submitAttempted)) return null;
    const key = errors['pakRequired']
      ? REQUIRED_TEXT[field]
      : INVALID_TEXT[field];
    return key ? this.text[key] : null;
  }

  ariaInvalid(field: PakFormField): 'true' | null {
    return this.error(field) ? 'true' : null;
  }

  describedBy(field: PakFormField): string | null {
    const ids = [
      this.error(field) ? this.id(field, 'error') : '',
      this.hintsShown && this.isHinted(field) ? this.id(field, 'hint') : '',
    ].filter(Boolean);
    return ids.length > 0 ? ids.join(' ') : null;
  }

  hintMessages(field: PakFormField): string[] {
    const hints = this.currentHints;
    if (!hints) return [];
    return field === 'address' || field === 'mobile' || field === 'postalCode'
      ? hints[field]
      : [];
  }

  /** Errors to list in the summary, in field order. */
  summary(): { field: PakFormField; message: string }[] {
    const items: { field: PakFormField; message: string }[] = [];
    for (const field of this.fields) {
      const message = this.error(field);
      if (message) items.push({ field, message });
    }
    return items;
  }

  /** Validates, shows all errors, and emits `submitted` when valid. */
  onSubmit(): void {
    const fields = this.fields;
    const valid = fields.every((field) => !this.form.controls[field].invalid);
    if (valid) {
      this.submitAttempted = false;
      this.submitted.emit(
        submittedValues(this.kind, this.values(), this.tehsil),
      );
      return;
    }
    this.submitAttempted = true;
    this.form.markAllAsTouched();
    this.cdr.detectChanges();
    const first = fields.find((field) => this.form.controls[field].invalid);
    if (first) {
      this.host.nativeElement
        .querySelector<HTMLElement>(`[id="${this.id(first)}"]`)
        ?.focus();
    }
  }

  private updateOptions(): void {
    const { province, district, city } = this.form.getRawValue();
    this.districts = districtOptions(province);
    this.tehsils = tehsilOptions(district);
    this.cities = citySuggestions(city, province);
    const toggle = (name: 'district' | 'tehsil', enabled: boolean) => {
      const control = this.form.controls[name];
      if (enabled && control.disabled) control.enable({ emitEvent: false });
      if (!enabled && control.enabled) control.disable({ emitEvent: false });
    };
    toggle('district', this.districts.length > 0 || district !== '');
    toggle(
      'tehsil',
      this.tehsils.length > 0 || this.form.controls.tehsil.value !== '',
    );
  }

  private updateHints(): void {
    this.currentHints =
      this.hints && this.engine
        ? pakFormHints(this.engine, this.values(), this.text)
        : null;
  }
}

/**
 * Unstyled checkout form: name, mobile, province → district → (tehsil) →
 * city, address, nearby place and postal code.
 *
 * @example
 * <pak-checkout-form locale="ur" [hints]="true" (submitted)="save($event)" />
 */
@Component({
  selector: 'pak-checkout-form',
  standalone: true,
  imports: [ReactiveFormsModule, PakPhoneInputDirective, PakCnicInputDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: TEMPLATE,
})
export class PakCheckoutFormComponent extends PakFormBase {
  get kind(): PakFormKind {
    return 'checkout';
  }
}

/**
 * Unstyled KYC form: the checkout fields plus the CNIC.
 *
 * @example
 * <pak-kyc-form [tehsil]="true" (submitted)="verify($event)" />
 */
@Component({
  selector: 'pak-kyc-form',
  standalone: true,
  imports: [ReactiveFormsModule, PakPhoneInputDirective, PakCnicInputDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: TEMPLATE,
})
export class PakKycFormComponent extends PakFormBase {
  get kind(): PakFormKind {
    return 'kyc';
  }
}
