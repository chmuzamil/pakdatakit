import {
  Directive,
  ElementRef,
  EventEmitter,
  HostListener,
  OnInit,
  Output,
  forwardRef,
  inject,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { getCNICInfo, type CNICInfo } from 'pakdatakit/cnic';
import { getBankFromIBAN } from 'pakdatakit/iban';
import {
  checkCNICInput,
  checkIBANInput,
  checkPhoneInput,
  formatCNICInput,
  formatIBANInput,
  formatPhoneInput,
  type InputState,
} from 'pakdatakit/input';
import { analyzePhone, type PhoneAnalysis } from 'pakdatakit/phone';
import { isAlphanumeric, isDigit, reformat } from './caret';

/** Emitted by the input directives whenever the value changes. */
export interface PakInputChange<Info> {
  /** Formatted value shown in the input. */
  value: string;
  /** Whether the value is empty, incomplete, valid or invalid. */
  state: InputState;
  /** Details about the value when it is valid, otherwise `null`. */
  info: Info | null;
}

interface MaskConfig<Info> {
  format: (value: string) => string;
  check: (value: string) => InputState;
  info: (value: string) => Info | null;
  isSignificant: (ch: string) => boolean;
  type: string;
  inputmode: string;
  autocomplete: string;
  autocapitalize: string;
}

/**
 * Shared behaviour of the input directives: formats as the user types, keeps
 * the caret in place, sets `aria-invalid`, and acts as the control's value
 * accessor so `formControl`, `formControlName` and `ngModel` receive the
 * formatted value.
 */
@Directive()
export abstract class PakMaskedInput<Info>
  implements ControlValueAccessor, OnInit
{
  /** Emits the formatted value, its state and details after every change. */
  @Output() readonly pakChange = new EventEmitter<PakInputChange<Info>>();

  protected abstract readonly config: MaskConfig<Info>;

  private readonly input =
    inject<ElementRef<HTMLInputElement>>(ElementRef).nativeElement;
  private previous = '';
  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  /** Whether the value is empty, incomplete, valid or invalid. */
  get state(): InputState {
    return this.config.check(this.input.value);
  }

  /** Details about the value when it is valid, otherwise `null`. */
  get info(): Info | null {
    const value = this.input.value;
    return this.config.check(value) === 'valid'
      ? this.config.info(value)
      : null;
  }

  ngOnInit(): void {
    const defaults: Record<string, string> = {
      inputmode: this.config.inputmode,
      autocomplete: this.config.autocomplete,
      autocorrect: 'off',
      autocapitalize: this.config.autocapitalize,
      spellcheck: 'false',
    };
    for (const [name, value] of Object.entries(defaults)) {
      if (!this.input.hasAttribute(name)) this.input.setAttribute(name, value);
    }
    if (!this.input.hasAttribute('type') && this.config.type !== 'text') {
      this.input.setAttribute('type', this.config.type);
    }
    // Format a value already in the markup (no forms directive).
    if (this.input.value !== '') this.writeValue(this.input.value);
  }

  @HostListener('input', ['$event'])
  handleInput(event: Event): void {
    const raw = this.input.value;
    const inputType = (event as Partial<InputEvent>).inputType;
    const result = reformat(
      raw,
      this.input.selectionStart ?? raw.length,
      this.previous,
      this.config.format,
      this.config.isSignificant,
      typeof inputType === 'string' ? inputType : undefined,
    );
    if (this.input.value !== result.value) this.input.value = result.value;
    if (this.input.ownerDocument.activeElement === this.input) {
      try {
        this.input.setSelectionRange(result.caret, result.caret);
      } catch {
        // Some input types (e.g. email, number) do not support selection.
      }
    }
    if (result.value === this.previous) return;
    this.previous = result.value;
    this.update();
    this.onChange(result.value);
    this.emit();
  }

  @HostListener('blur')
  handleBlur(): void {
    this.onTouched();
  }

  /** Called by Angular forms with the control's value; it is formatted first. */
  writeValue(value: unknown): void {
    const formatted = this.config.format(
      typeof value === 'string' ? value : '',
    );
    this.input.value = formatted;
    this.previous = formatted;
    this.update();
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.input.disabled = isDisabled;
  }

  private update(): void {
    if (this.state === 'invalid') {
      this.input.setAttribute('aria-invalid', 'true');
    } else {
      this.input.removeAttribute('aria-invalid');
    }
  }

  private emit(): void {
    this.pakChange.emit({
      value: this.input.value,
      state: this.state,
      info: this.info,
    });
  }
}

/**
 * Formats a CNIC as the user types: `35202-1234567-1`.
 *
 * @example
 * <input pakCnicInput [formControl]="cnic" />
 */
@Directive({
  selector: 'input[pakCnicInput]',
  standalone: true,
  exportAs: 'pakInput',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PakCnicInputDirective),
      multi: true,
    },
  ],
})
export class PakCnicInputDirective extends PakMaskedInput<CNICInfo> {
  protected readonly config: MaskConfig<CNICInfo> = {
    format: formatCNICInput,
    check: checkCNICInput,
    info: getCNICInfo,
    isSignificant: isDigit,
    type: 'text',
    inputmode: 'numeric',
    autocomplete: 'off',
    autocapitalize: 'off',
  };
}

/**
 * Formats a mobile number as the user types: `0300-1234567`, or
 * `+92 300 1234567` when the user starts with the country code.
 *
 * @example
 * <input pakPhoneInput [(ngModel)]="phone" />
 */
@Directive({
  selector: 'input[pakPhoneInput]',
  standalone: true,
  exportAs: 'pakInput',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PakPhoneInputDirective),
      multi: true,
    },
  ],
})
export class PakPhoneInputDirective extends PakMaskedInput<PhoneAnalysis> {
  protected readonly config: MaskConfig<PhoneAnalysis> = {
    format: formatPhoneInput,
    check: checkPhoneInput,
    info: (value) => {
      const analysis = analyzePhone(value);
      return analysis.valid ? analysis : null;
    },
    isSignificant: isDigit,
    type: 'tel',
    inputmode: 'tel',
    autocomplete: 'tel',
    autocapitalize: 'off',
  };
}

/**
 * Formats an IBAN as the user types: `PK36 SCBL 0000 0011 2345 6702`. `info`
 * is the bank name once the IBAN is valid.
 *
 * @example
 * <input pakIbanInput formControlName="iban" />
 */
@Directive({
  selector: 'input[pakIbanInput]',
  standalone: true,
  exportAs: 'pakInput',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PakIbanInputDirective),
      multi: true,
    },
  ],
})
export class PakIbanInputDirective extends PakMaskedInput<string> {
  protected readonly config: MaskConfig<string> = {
    format: formatIBANInput,
    check: checkIBANInput,
    info: getBankFromIBAN,
    isSignificant: isAlphanumeric,
    type: 'text',
    inputmode: 'text',
    autocomplete: 'off',
    autocapitalize: 'characters',
  };
}
