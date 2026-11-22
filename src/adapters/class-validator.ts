import { registerDecorator, type ValidationOptions } from 'class-validator';
import { RULES, type RuleName } from './rules.js';

/**
 * Options for the decorators: class-validator's own options (`groups`,
 * `each`, `always`, `context`), plus a custom `message`. `IsPakLandline`
 * also takes `services: true` to accept UAN, toll-free and premium numbers.
 */
export type DecoratorOptions = ValidationOptions & { services?: boolean };

function decorator(name: RuleName) {
  const rule = RULES[name];
  return (options: DecoratorOptions = {}): PropertyDecorator =>
    (target, propertyName) => {
      const { services, ...validationOptions } = options;
      const ruleOptions = { services: services === true };
      registerDecorator({
        name: `pk-${name}`,
        target: target.constructor,
        propertyName: propertyName as string,
        options: {
          ...validationOptions,
          message: options.message ?? rule.message,
        },
        validator: {
          validate: (value: unknown) =>
            typeof value === 'string' && rule.test(value, ruleOptions),
        },
      });
    };
}

/**
 * class-validator decorators for Pakistani identifiers. They work in NestJS
 * DTOs with the built-in `ValidationPipe`; no NestJS package is needed.
 * Combine with `@IsOptional()` for optional fields.
 *
 * @example
 * import { IsOptional } from 'class-validator';
 * import { IsCNIC, IsPakPhone } from 'pakdatakit/class-validator';
 *
 * class CreateCustomerDto {
 *   @IsCNIC()
 *   cnic!: string;
 *
 *   @IsOptional()
 *   @IsPakPhone({ message: 'Enter a Pakistani mobile number' })
 *   phone?: string;
 * }
 */
export const pk = {
  cnic: decorator('cnic'),
  phone: decorator('phone'),
  iban: decorator('iban'),
  ntn: decorator('ntn'),
  strn: decorator('strn'),
  landline: decorator('landline'),
  passport: decorator('passport'),
  vehiclePlate: decorator('vehiclePlate'),
  codPhone: decorator('codPhone'),
  amount: decorator('amount'),
};

/** Validates a CNIC. See {@link pk}. */
export const IsCNIC = pk.cnic;
/** Validates a Pakistani mobile number. See {@link pk}. */
export const IsPakPhone = pk.phone;
/**
 * Validates a Pakistani IBAN. Named `IsPakIBAN` so it does not clash with
 * class-validator's own `IsIBAN`. See {@link pk}.
 */
export const IsPakIBAN = pk.iban;
/** Validates an NTN. See {@link pk}. */
export const IsNTN = pk.ntn;
/** Validates an STRN. See {@link pk}. */
export const IsSTRN = pk.strn;
/** Validates a Pakistani landline number. See {@link pk}. */
export const IsPakLandline = pk.landline;
/** Validates the format of a Pakistani passport number. See {@link pk}. */
export const IsPakPassport = pk.passport;
/** Validates the format of a vehicle registration number. See {@link pk}. */
export const IsVehiclePlate = pk.vehiclePlate;
/**
 * Validates a mobile number a courier can call: valid, and with no
 * `phoneRiskSignals` flag. See {@link pk}.
 */
export const IsCodPhone = pk.codPhone;
/**
 * Validates a rupee amount as people type it (`150,000`, `Rs. 1,50,000/-`,
 * `1.5 lakh`): one that `parseAmount` reads. See {@link pk}.
 */
export const IsPakAmount = pk.amount;
