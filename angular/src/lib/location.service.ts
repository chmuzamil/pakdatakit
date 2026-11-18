import { Injectable } from '@angular/core';
import {
  citySuggestions,
  districtOptions,
  PAK_PROVINCES,
  provinceLabel,
  tehsilOptions,
  withField,
  type PakFormField,
  type PakFormValues,
} from './form-core';
import type { PakFormText } from './form-text';

/**
 * The province → district → tehsil cascade and city suggestions, for your
 * own form markup. Uses `pakdatakit/geo` only (no postal data).
 *
 * @example
 * districts = inject(PakLocationService).districts('Punjab');
 */
@Injectable({ providedIn: 'root' })
export class PakLocationService {
  /** The seven provinces and territories, as named in the data. */
  readonly provinces: readonly string[] = PAK_PROVINCES;

  /** Districts of a province (empty until a province is chosen). */
  districts(province: string): string[] {
    return districtOptions(province);
  }

  /** Tehsils of a district (empty until a district is chosen). */
  tehsils(district: string): string[] {
    return tehsilOptions(district);
  }

  /** City suggestions for what was typed, limited to the province. */
  cities(query: string, province: string, limit = 20): string[] {
    return citySuggestions(query, province, limit);
  }

  /** A province's label in the form's language (the value stays English). */
  provinceLabel(province: string, text: PakFormText): string {
    return provinceLabel(province, text);
  }

  /**
   * Values after a change, applying the cascade: a new province clears
   * district, tehsil and city; a new district clears the tehsil.
   */
  withField(
    values: PakFormValues,
    field: PakFormField,
    value: string,
  ): PakFormValues {
    return withField(values, field, value);
  }
}
