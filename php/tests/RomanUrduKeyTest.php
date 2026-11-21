<?php

declare(strict_types=1);

namespace PakDataKit\Tests;

use PakDataKit\Text;
use PHPUnit\Framework\TestCase;

/** Text::romanUrduKey(). */
final class RomanUrduKeyTest extends TestCase
{
    private static function same(string ...$spellings): bool
    {
        return count(array_unique(array_map(Text::romanUrduKey(...), $spellings))) === 1;
    }

    public function testMatchesSpellingsOfOneName(): void
    {
        self::assertTrue(self::same('Mubeen', 'Mobeen'));
        self::assertTrue(self::same('Muhammad', 'Mohammad', 'Muhammed'));
        self::assertTrue(self::same('Rehman', 'Rahman'));
        self::assertTrue(self::same('Chaudhry', 'Chaudhary', 'Chaudhery'));
    }

    public function testKeepsSimilarButDifferentNamesApart(): void
    {
        self::assertFalse(self::same('Hussain', 'Hassan'));
        self::assertFalse(self::same('Imran', 'Umran'));
        self::assertFalse(self::same('Saeed', 'Saad'));
        self::assertFalse(self::same('Ehsan', 'Ahsan'));
        self::assertFalse(self::same('Ali', 'Alia'));
    }

    public function testKeysEachWordIgnoringCaseAccentsAndPunctuation(): void
    {
        self::assertSame('muhmd rahmn', Text::romanUrduKey('Muhammad Rehman'));
        self::assertSame('muhmd rahmn', Text::romanUrduKey('MUHAMMAD  rehman!'));
        self::assertSame(Text::romanUrduKey('Jose'), Text::romanUrduKey('José'));
        self::assertSame(Text::romanUrduKey('Zoe Khan'), Text::romanUrduKey('Zoë Khan'));
        self::assertSame('ali raza', Text::romanUrduKey('Ali123Raza'));
    }

    public function testFoldsCompatibilityCharactersLikeNfkd(): void
    {
        // Ligature, fullwidth and superscript letters, as normalize('NFKD').
        self::assertSame(Text::romanUrduKey('fiza'), Text::romanUrduKey('ﬁza'));
        self::assertSame(Text::romanUrduKey('Ali'), Text::romanUrduKey('Ａｌｉ'));
        self::assertSame(Text::romanUrduKey('Shah'), Text::romanUrduKey('Sʰah'));
    }

    public function testReturnsAnEmptyKeyWithoutLatinLetters(): void
    {
        self::assertSame('', Text::romanUrduKey(''));
        self::assertSame('', Text::romanUrduKey('123'));
        self::assertSame('', Text::romanUrduKey('لاہور'));
        self::assertSame('', Text::romanUrduKey(null));
        self::assertSame('', Text::romanUrduKey(42));
        self::assertSame('ali khan', Text::romanUrduKey("Ali \xff Khan"));
    }

    public function testDoesNotChangeNormalizeRomanUrdu(): void
    {
        self::assertSame('aap kaise ho', Text::normalizeRomanUrdu('ap kaise ho'));
    }

    /**
     * The list of common Pakistani names (data/sources/roman-urdu-names.json):
     * the rates measured when romanUrduKey was written (2.7.0).
     */
    public function testMatchesMostSpellingPairsWithFewFalseMatches(): void
    {
        $file = __DIR__ . '/../../data/sources/roman-urdu-names.json';
        if (!is_file($file)) {
            self::markTestSkipped('data/sources/roman-urdu-names.json is not in this checkout');
        }
        $groups = json_decode((string) file_get_contents($file), true, 512, JSON_THROW_ON_ERROR)['groups'];
        $all = [];
        foreach ($groups as $g => $group) {
            foreach ($group as $name) {
                $all[] = [$g, Text::romanUrduKey($name)];
            }
        }
        $variants = $variantsMatched = $others = $othersMatched = 0;
        $count = count($all);
        for ($i = 0; $i < $count; $i++) {
            for ($j = $i + 1; $j < $count; $j++) {
                if ($all[$i][0] === $all[$j][0]) {
                    $variants++;
                    $variantsMatched += $all[$i][1] === $all[$j][1] ? 1 : 0;
                } else {
                    $others++;
                    $othersMatched += $all[$i][1] === $all[$j][1] ? 1 : 0;
                }
            }
        }
        self::assertGreaterThanOrEqual(0.95, $variantsMatched / $variants);
        self::assertLessThan(0.0005, $othersMatched / $others);
    }
}
