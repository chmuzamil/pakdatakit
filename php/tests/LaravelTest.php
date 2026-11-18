<?php

declare(strict_types=1);

namespace PakDataKit\Tests;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Validator;
use Orchestra\Testbench\TestCase;
use PakDataKit\Laravel\Casts\CnicCast;
use PakDataKit\Laravel\Casts\IbanCast;
use PakDataKit\Laravel\Casts\PhoneCast;
use PakDataKit\Laravel\PakDataKitServiceProvider;
use PakDataKit\Laravel\Rules;

final class LaravelTest extends TestCase
{
    private const VALID = [
        'cnic' => '35202-1234567-1',
        'phone' => '0300 1234567',
        'iban' => 'PK36SCBL0000001123456702',
        'ntn' => '0622438-9',
        'strn' => '17-00-3761-882-19',
        'landline' => '042-35761234',
        'passport' => 'AB1234567',
        'plate' => 'LEA-1234',
        'electricity' => '02 12624 0045901 R',
        'cod' => '0300 4829173',
    ];

    private const INVALID = [
        'cnic' => '00000-0000000-0',
        'phone' => '03601234567',
        'iban' => 'PK37SCBL0000001123456702',
        'ntn' => '123',
        'strn' => '1',
        'landline' => '03001234567',
        'passport' => 'A1234',
        'plate' => 'ABC-12345',
        'electricity' => '12345',
        'cod' => '0300 1234567',
    ];

    private const STRING_RULES = [
        'cnic' => 'required|pk_cnic',
        'phone' => 'pk_phone',
        'iban' => 'pk_iban',
        'ntn' => 'pk_ntn',
        'strn' => 'pk_strn',
        'landline' => 'pk_landline',
        'passport' => 'pk_passport',
        'plate' => 'pk_vehicle_plate',
        'electricity' => 'pk_electricity_ref',
        'cod' => 'pk_cod_phone',
    ];

    private const ENGLISH = [
        'The cnic field must be a valid CNIC.',
        'The phone field must be a valid Pakistani mobile number.',
        'The iban field must be a valid Pakistani IBAN.',
        'The ntn field must be a valid NTN.',
        'The strn field must be a valid STRN.',
        'The landline field must be a valid Pakistani landline number.',
        'The passport field must be a valid Pakistani passport number.',
        'The plate field must be a valid vehicle registration number.',
        'The electricity field must be a valid electricity bill reference number.',
        'The cod field must be a mobile number a courier can call.',
    ];

    /** @return list<class-string> */
    protected function getPackageProviders($app): array
    {
        return [PakDataKitServiceProvider::class];
    }

    /** @return array<string, list<object|string>> */
    private static function objectRules(): array
    {
        return [
            'cnic' => ['required', new Rules\Cnic()],
            'phone' => [new Rules\Phone()],
            'iban' => [new Rules\Iban()],
            'ntn' => [new Rules\Ntn()],
            'strn' => [new Rules\Strn()],
            'landline' => [new Rules\Landline()],
            'passport' => [new Rules\Passport()],
            'plate' => [new Rules\VehiclePlate()],
            'electricity' => [new Rules\ElectricityRef()],
            'cod' => [new Rules\CodPhone()],
        ];
    }

    public function testProviderIsListedForAutoDiscovery(): void
    {
        $composer = json_decode((string) file_get_contents(__DIR__ . '/../composer.json'), true);
        self::assertSame([PakDataKitServiceProvider::class], $composer['extra']['laravel']['providers']);
    }

    public function testStringRulesAcceptValidValues(): void
    {
        self::assertTrue(Validator::make(self::VALID, self::STRING_RULES)->passes());
    }

    public function testStringRulesRejectInvalidValuesWithEnglishMessages(): void
    {
        $validator = Validator::make(self::INVALID, self::STRING_RULES);
        self::assertTrue($validator->fails());
        self::assertSame(self::ENGLISH, $validator->errors()->all());
    }

    public function testRuleObjectsBehaveLikeStringRules(): void
    {
        self::assertTrue(Validator::make(self::VALID, self::objectRules())->passes());
        self::assertSame(self::ENGLISH, Validator::make(self::INVALID, self::objectRules())->errors()->all());
    }

    public function testMessagesAreTranslatedToUrdu(): void
    {
        App::setLocale('ur');
        $expected = [
            'cnic درست شناختی کارڈ نمبر (CNIC) ہونا چاہیے۔',
            'phone درست پاکستانی موبائل نمبر ہونا چاہیے۔',
        ];
        $data = ['cnic' => self::INVALID['cnic'], 'phone' => self::INVALID['phone']];
        self::assertSame(
            $expected,
            Validator::make($data, ['cnic' => 'pk_cnic', 'phone' => 'pk_phone'])->errors()->all(),
        );
        self::assertSame(
            $expected,
            Validator::make($data, ['cnic' => new Rules\Cnic(), 'phone' => new Rules\Phone()])->errors()->all(),
        );
    }

    public function testCodPhoneRejectsNumbersACourierCannotUse(): void
    {
        foreach (['03001234567', '0300-0000000', '0312-3456789', '042-35761234', '021-111-825-888', 'garbage'] as $phone) {
            self::assertTrue(Validator::make(['cod' => $phone], ['cod' => 'pk_cod_phone'])->fails(), $phone);
            self::assertTrue(Validator::make(['cod' => $phone], ['cod' => [new Rules\CodPhone()]])->fails(), $phone);
        }
        self::assertTrue(Validator::make(['cod' => '+92 321 4829173'], ['cod' => 'pk_cod_phone'])->passes());

        App::setLocale('ur');
        self::assertSame(
            ['cod ایسا موبائل نمبر ہونا چاہیے جس پر کوریئر کال کر سکے۔'],
            Validator::make(['cod' => '03001234567'], ['cod' => new Rules\CodPhone()])->errors()->all(),
        );
    }

    public function testElectricityRefAcceptsEveryBillIdentifier(): void
    {
        foreach (['01141111234567', '01-14111-1234567u', '1234567890', '12345678901', '0400012345678'] as $ref) {
            self::assertTrue(Validator::make(['ref' => $ref], ['ref' => 'pk_electricity_ref'])->passes(), $ref);
            self::assertTrue(Validator::make(['ref' => $ref], ['ref' => [new Rules\ElectricityRef()]])->passes(), $ref);
        }
        self::assertTrue(Validator::make(['ref' => 1234567890], ['ref' => 'pk_electricity_ref'])->fails());

        App::setLocale('ur');
        self::assertSame(
            ['ref درست بجلی کے بل کا ریفرنس نمبر ہونا چاہیے۔'],
            Validator::make(['ref' => '1234567890R'], ['ref' => new Rules\ElectricityRef()])->errors()->all(),
        );
    }

    public function testCustomAttributeNamesAndMessagesAreUsed(): void
    {
        $validator = Validator::make(
            ['cnic' => 'x', 'iban' => 'x'],
            ['cnic' => 'pk_cnic', 'iban' => 'pk_iban'],
            ['iban.pk_iban' => 'Bad IBAN'],
            ['cnic' => 'ID card number'],
        );
        self::assertSame(['The ID card number field must be a valid CNIC.', 'Bad IBAN'], $validator->errors()->all());
    }

    public function testOptionalFieldsMayBeEmptyAndNonStringsFail(): void
    {
        $rules = ['cnic' => 'nullable|pk_cnic', 'phone' => 'pk_phone', 'iban' => ['nullable', new Rules\Iban()]];
        self::assertTrue(Validator::make(['cnic' => null, 'phone' => '', 'iban' => null], $rules)->passes());
        self::assertTrue(Validator::make([], $rules)->passes());

        self::assertTrue(Validator::make(['cnic' => 3520212345671], ['cnic' => 'pk_cnic'])->fails());
        self::assertTrue(Validator::make(['cnic' => ['35202-1234567-1']], ['cnic' => new Rules\Cnic()])->fails());
    }

    public function testCastsNormalizeValidValuesAndKeepInvalidOnes(): void
    {
        $customer = new class () extends Model {
            protected $guarded = [];
            protected $casts = ['cnic' => CnicCast::class, 'phone' => PhoneCast::class, 'iban' => IbanCast::class];
        };

        $customer->fill([
            'cnic' => '35202 1234567 1',
            'phone' => '0300-1234567',
            'iban' => 'pk36 scbl 0000 0011 2345 6702',
        ]);
        // Stored form.
        self::assertSame(
            ['cnic' => '3520212345671', 'phone' => '+923001234567', 'iban' => 'PK36SCBL0000001123456702'],
            $customer->getAttributes(),
        );
        // Read form.
        self::assertSame('35202-1234567-1', $customer->cnic);
        self::assertSame('+923001234567', $customer->phone);
        self::assertSame('PK36SCBL0000001123456702', $customer->iban);

        $customer->fill(['cnic' => 'not a cnic', 'phone' => null, 'iban' => 'garbage']);
        self::assertSame('not a cnic', $customer->cnic);
        self::assertNull($customer->phone);
        self::assertSame('garbage', $customer->iban);
    }
}
