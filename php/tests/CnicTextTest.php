<?php

declare(strict_types=1);

namespace PakDataKit\Tests;

use PakDataKit\Cnic;
use PakDataKit\CnicMatch;
use PHPUnit\Framework\TestCase;

/** Cnic::findAll() and Cnic::mask(): CNICs in free text. */
final class CnicTextTest extends TestCase
{
    /** ASCII digits written as Urdu (U+06F0-06F9) digits. */
    private static function urdu(string $digits): string
    {
        return implode('', array_map(static fn (string $d): string => mb_chr(0x06F0 + (int) $d), str_split($digits)));
    }

    /** ASCII digits written as Arabic-Indic (U+0660-0669) digits. */
    private static function arabic(string $digits): string
    {
        return implode('', array_map(static fn (string $d): string => mb_chr(0x0660 + (int) $d), str_split($digits)));
    }

    public function testFindsACnicWithItsPosition(): void
    {
        $text = 'CNIC: 35202-1234567-1, phone 0300-1234567';
        $found = Cnic::findAll($text);
        self::assertEquals(
            [new CnicMatch('35202-1234567-1', '3520212345671', '35202-1234567-1', 6, 21)],
            $found,
        );
        self::assertSame('35202-1234567-1', mb_substr($text, $found[0]->start, $found[0]->end - $found[0]->start));
        self::assertSame(
            ['raw' => '35202-1234567-1', 'digits' => '3520212345671', 'formatted' => '35202-1234567-1', 'start' => 6, 'end' => 21],
            $found[0]->toArray(),
        );
    }

    public function testAcceptsNoMatchingOrMixedSeparators(): void
    {
        $dashes = '35202' . mb_chr(0x2013) . '1234567' . mb_chr(0x2014) . '1';
        foreach (['3520212345671', '35202-1234567-1', '35202 1234567-1', '35202.1234567 1', $dashes] as $raw) {
            $found = Cnic::findAll("id {$raw}.");
            self::assertCount(1, $found, $raw);
            self::assertSame('3520212345671', $found[0]->digits);
            self::assertSame($raw, $found[0]->raw);
        }
    }

    public function testReadsUrduAndArabicIndicDigitsWithCodePointOffsets(): void
    {
        $text = 'نمبر ' . self::urdu('35202') . '-1234567-' . self::arabic('1');
        $found = Cnic::findAll($text);
        self::assertCount(1, $found);
        self::assertSame('3520212345671', $found[0]->digits);
        self::assertSame(5, $found[0]->start);
        self::assertSame(20, $found[0]->end);
        self::assertSame($found[0]->raw, mb_substr($text, 5, 15));
        self::assertCount(1, Cnic::findAll(self::arabic('3520212345671')));
    }

    public function testDoesNotCutACnicOutOfALongerDigitRun(): void
    {
        self::assertSame([], Cnic::findAll('1235202-1234567-1'));
        self::assertSame([], Cnic::findAll('35202-1234567-12'));
        self::assertSame([], Cnic::findAll(self::urdu('1') . '35202-1234567-1'));
        self::assertCount(1, Cnic::findAll('x35202-1234567-1y'));
    }

    public function testNeedsAProvinceDigitAndFiveSevenOneGroups(): void
    {
        foreach (['05202-1234567-1', '95202-1234567-1', '35202-123456-1', '35202--1234567-1', '35202_1234567_1'] as $text) {
            self::assertSame([], Cnic::findAll($text), $text);
        }
        self::assertCount(1, Cnic::findAll('Account: 1234567890123'));
    }

    public function testIsLooserThanValidate(): void
    {
        self::assertCount(1, Cnic::findAll('35202 1234567-1'));
        self::assertFalse(Cnic::validate('35202 1234567-1'));
    }

    public function testMasksEveryDigitAndKeepsTheSeparators(): void
    {
        self::assertSame(
            ['text' => 'My CNIC is XXXXX-XXXXXXX-X', 'count' => 1],
            Cnic::mask('My CNIC is 35202-1234567-1')->toArray(),
        );
        self::assertSame('***** ******* *', Cnic::mask('35202 1234567 1', '*')->text);
        self::assertSame('--', Cnic::mask('35202-1234567-1', '')->text);
        self::assertSame('##########-##############-##', Cnic::mask('35202-1234567-1', '##')->text);
        self::assertSame('XXXXX-XXXXXXX-X', Cnic::mask(self::urdu('35202') . '-1234567-1')->text);

        $two = Cnic::mask("ids 3520212345671 and 61101-7654321-2, phone 0300-1234567");
        self::assertSame('ids XXXXXXXXXXXXX and XXXXX-XXXXXXX-X, phone 0300-1234567', $two->text);
        self::assertSame(2, $two->count);
    }

    public function testANonStringMaskIsX(): void
    {
        self::assertSame('XXXXXXXXXXXXX', Cnic::mask('3520212345671', 7)->text);
        self::assertSame('XXXXXXXXXXXXX', Cnic::mask('3520212345671', null)->text);
    }

    public function testNeverThrows(): void
    {
        foreach ([null, 42, 1.5, [], true] as $value) {
            self::assertSame([], Cnic::findAll($value));
            self::assertSame(['text' => '', 'count' => 0], Cnic::mask($value)->toArray());
        }
        self::assertSame([], Cnic::findAll(''));
        self::assertSame(['text' => 'no numbers here', 'count' => 0], Cnic::mask('no numbers here')->toArray());
        // Invalid UTF-8 is scrubbed, so the CNIC is still masked.
        self::assertSame(1, Cnic::mask("\xff 35202-1234567-1")->count);
        self::assertCount(1, Cnic::findAll("\xff 35202-1234567-1"));
    }
}
