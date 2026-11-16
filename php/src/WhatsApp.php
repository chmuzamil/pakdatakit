<?php

declare(strict_types=1);

namespace PakDataKit;

/**
 * WhatsApp click-to-chat links.
 */
final class WhatsApp
{
    /**
     * Creates a `wa.me` link for a Pakistani mobile number, or null if the
     * number is invalid. Never throws: a message that is not valid UTF-8
     * also gives null (the npm package throws for an unpaired surrogate).
     */
    public static function createLink(?string $phone, ?string $message = null): ?string
    {
        $digits = Phone::normalizeDigits($phone);
        if ($digits === null) {
            return null;
        }
        $baseUrl = 'https://wa.me/' . $digits;
        if ($message === null || $message === '') {
            return $baseUrl;
        }
        if (!mb_check_encoding($message, 'UTF-8')) {
            return null;
        }
        // encodeURIComponent leaves these unescaped; rawurlencode escapes them.
        $encoded = strtr(rawurlencode($message), [
            '%21' => '!', '%2A' => '*', '%27' => "'", '%28' => '(', '%29' => ')',
        ]);
        return $baseUrl . '?text=' . $encoded;
    }
}
