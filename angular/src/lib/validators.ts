import type {
  AbstractControl,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';
import { validateCNIC } from 'pakdatakit/cnic';
import { validateIBAN } from 'pakdatakit/iban';
import { validateLandline } from 'pakdatakit/numbers';
import { validatePassport } from 'pakdatakit/passport';
import { validatePhone } from 'pakdatakit/phone';
import { validateNTN, validateSTRN } from 'pakdatakit/tax';
import { validateVehiclePlate } from 'pakdatakit/vehicle';

function validator(
  key: string,
  isValid: (value: string) => boolean,
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value: unknown = control.value;
    // Like Angular's own validators, leave empty values to Validators.required.
    if (value === null || value === undefined || value === '') return null;
    return typeof value === 'string' && isValid(value) ? null : { [key]: true };
  };
}

/**
 * Reactive-form validators for Pakistani identifiers. Each returns `null`
 * for a valid or empty value, and an error keyed by its name otherwise, e.g.
 * `{ pakCnic: true }`. Values that are not strings are invalid.
 *
 * @example
 * new FormControl('', [Validators.required, PakValidators.cnic]);
 */
export const PakValidators = {
  /** A CNIC (`35202-1234567-1` or 13 digits). Error key: `pakCnic`. */
  cnic: validator('pakCnic', validateCNIC),
  /** A Pakistani mobile number. Error key: `pakPhone`. */
  phone: validator('pakPhone', validatePhone),
  /** A Pakistani IBAN. Error key: `pakIban`. */
  iban: validator('pakIban', validateIBAN),
  /** The format of a National Tax Number. Error key: `pakNtn`. */
  ntn: validator('pakNtn', validateNTN),
  /** The format of a Sales Tax Registration Number. Error key: `pakStrn`. */
  strn: validator('pakStrn', validateSTRN),
  /** A Pakistani landline number. Error key: `pakLandline`. */
  landline: validator('pakLandline', validateLandline),
  /** The common format of a Pakistani passport number. Error key: `pakPassport`. */
  passport: validator('pakPassport', validatePassport),
  /** The common format of a vehicle registration number. Error key: `pakVehiclePlate`. */
  vehiclePlate: validator('pakVehiclePlate', validateVehiclePlate),
} as const;
