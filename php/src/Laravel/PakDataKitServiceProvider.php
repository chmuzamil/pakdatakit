<?php

declare(strict_types=1);

namespace PakDataKit\Laravel;

use Illuminate\Contracts\Validation\Factory;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Validator;

/**
 * Registers the `pk_*` validation rules and their messages. Laravel
 * discovers this provider automatically.
 */
final class PakDataKitServiceProvider extends ServiceProvider
{
    /** Rule name to the PakDataKit check behind it. */
    public const RULES = [
        'pk_cnic' => [\PakDataKit\Cnic::class, 'validate'],
        'pk_phone' => [\PakDataKit\Phone::class, 'validate'],
        'pk_iban' => [\PakDataKit\Iban::class, 'validate'],
        'pk_ntn' => [\PakDataKit\Tax::class, 'validateNtn'],
        'pk_strn' => [\PakDataKit\Tax::class, 'validateStrn'],
        'pk_landline' => [\PakDataKit\Numbers::class, 'validateLandline'],
        'pk_passport' => [\PakDataKit\Passport::class, 'validate'],
        'pk_vehicle_plate' => [\PakDataKit\VehiclePlate::class, 'validate'],
        'pk_electricity_ref' => [\PakDataKit\Bills::class, 'validateElectricityRef'],
        'pk_cod_phone' => [self::class, 'isCodPhone'],
        'pk_amount' => [self::class, 'isAmount'],
    ];

    /** Passes when Quality::phoneRiskSignals() finds nothing: a mobile number a courier can call. */
    public static function isCodPhone(string $value): bool
    {
        return \PakDataKit\Quality::phoneRiskSignals($value) === [];
    }

    /** Passes when Currency::parseAmount() reads one rupee amount (`150,000`, `1.5 lakh`). */
    public static function isAmount(string $value): bool
    {
        return \PakDataKit\Currency::parseAmount($value) !== null;
    }

    public function boot(): void
    {
        $lang = dirname(__DIR__, 2) . '/lang';
        $this->loadTranslationsFrom($lang, 'pakdatakit');
        $this->publishes([$lang => $this->app->langPath('vendor/pakdatakit')], 'pakdatakit-lang');

        $this->callAfterResolving('validator', function (Factory $factory): void {
            foreach (self::RULES as $rule => $check) {
                $factory->extend(
                    $rule,
                    static fn (string $attribute, mixed $value): bool => is_string($value) && $check($value),
                );
                // If the application has no `validation.{rule}` line of its
                // own, use this package's message in the current locale.
                $factory->replacer(
                    $rule,
                    static function (string $message, string $attribute, string $name, array $parameters, Validator $validator) use ($rule): string {
                        if ($message !== 'validation.' . $rule) {
                            return $message;
                        }
                        return (string) trans('pakdatakit::validation.' . $rule, [
                            'attribute' => $validator->getDisplayableAttribute($attribute),
                        ]);
                    },
                );
            }
        });
    }
}
