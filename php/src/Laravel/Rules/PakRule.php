<?php

declare(strict_types=1);

namespace PakDataKit\Laravel\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Base class of the PakDataKit rule objects. Values that are not strings
 * fail. As with Laravel's own rules, empty values are skipped unless the
 * field is `required`.
 */
abstract class PakRule implements ValidationRule
{
    /** Name of the matching string rule, e.g. `pk_cnic`. */
    abstract protected function rule(): string;

    abstract protected function passes(string $value): bool;

    /**
     * Runs the check: calls `$fail` with this rule's translated message when
     * the value is not a string or does not pass.
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (!is_string($value) || !$this->passes($value)) {
            $fail('pakdatakit::validation.' . $this->rule())->translate();
        }
    }
}
