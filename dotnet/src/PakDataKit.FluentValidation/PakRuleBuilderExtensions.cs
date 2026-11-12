using FluentValidation;

namespace PakDataKit.FluentValidation;

/// <summary>
/// FluentValidation rules for Pakistani identifiers. As with FluentValidation's
/// own format rules, <c>null</c> and empty strings pass: add <c>NotEmpty()</c>
/// to make a value mandatory. Replace a message with <c>WithMessage()</c>.
/// </summary>
public static class PakRuleBuilderExtensions
{
    /// <summary>Requires a valid CNIC, using <see cref="Cnic.Validate"/>.</summary>
    /// <typeparam name="T">Type being validated.</typeparam>
    /// <param name="rule">The rule builder.</param>
    /// <returns>The rule builder, for chaining.</returns>
    public static IRuleBuilderOptions<T, string?> IsCnic<T>(this IRuleBuilder<T, string?> rule) =>
        Rule(rule, Cnic.Validate, "'{PropertyName}' is not a valid CNIC.");

    /// <summary>Requires a valid Pakistani mobile number, using <see cref="Phone.Validate"/>.</summary>
    /// <typeparam name="T">Type being validated.</typeparam>
    /// <param name="rule">The rule builder.</param>
    /// <returns>The rule builder, for chaining.</returns>
    public static IRuleBuilderOptions<T, string?> IsPakPhone<T>(this IRuleBuilder<T, string?> rule) =>
        Rule(rule, Phone.Validate, "'{PropertyName}' is not a valid Pakistani mobile number.");

    /// <summary>Requires a valid Pakistani IBAN, using <see cref="Iban.Validate"/>.</summary>
    /// <typeparam name="T">Type being validated.</typeparam>
    /// <param name="rule">The rule builder.</param>
    /// <returns>The rule builder, for chaining.</returns>
    public static IRuleBuilderOptions<T, string?> IsPakIban<T>(this IRuleBuilder<T, string?> rule) =>
        Rule(rule, Iban.Validate, "'{PropertyName}' is not a valid Pakistani IBAN.");

    /// <summary>Requires a National Tax Number in a valid format, using <see cref="Tax.ValidateNtn"/>.</summary>
    /// <typeparam name="T">Type being validated.</typeparam>
    /// <param name="rule">The rule builder.</param>
    /// <returns>The rule builder, for chaining.</returns>
    public static IRuleBuilderOptions<T, string?> IsNtn<T>(this IRuleBuilder<T, string?> rule) =>
        Rule(rule, Tax.ValidateNtn, "'{PropertyName}' is not a valid NTN.");

    /// <summary>Requires a Sales Tax Registration Number in a valid format, using <see cref="Tax.ValidateStrn"/>.</summary>
    /// <typeparam name="T">Type being validated.</typeparam>
    /// <param name="rule">The rule builder.</param>
    /// <returns>The rule builder, for chaining.</returns>
    public static IRuleBuilderOptions<T, string?> IsStrn<T>(this IRuleBuilder<T, string?> rule) =>
        Rule(rule, Tax.ValidateStrn, "'{PropertyName}' is not a valid STRN.");

    /// <summary>Requires a valid Pakistani landline number, using <see cref="Numbers.ValidateLandline"/>.</summary>
    /// <typeparam name="T">Type being validated.</typeparam>
    /// <param name="rule">The rule builder.</param>
    /// <returns>The rule builder, for chaining.</returns>
    public static IRuleBuilderOptions<T, string?> IsPakLandline<T>(this IRuleBuilder<T, string?> rule) =>
        Rule(rule, Numbers.ValidateLandline, "'{PropertyName}' is not a valid Pakistani landline number.");

    /// <summary>
    /// Requires a Pakistani passport number in the common format, using
    /// <see cref="Passport.Validate"/>.
    /// </summary>
    /// <typeparam name="T">Type being validated.</typeparam>
    /// <param name="rule">The rule builder.</param>
    /// <returns>The rule builder, for chaining.</returns>
    public static IRuleBuilderOptions<T, string?> IsPakPassport<T>(this IRuleBuilder<T, string?> rule) =>
        Rule(rule, Passport.Validate, "'{PropertyName}' is not a valid Pakistani passport number.");

    /// <summary>
    /// Requires a vehicle registration number in the common format, using
    /// <see cref="VehiclePlate.Validate"/>.
    /// </summary>
    /// <typeparam name="T">Type being validated.</typeparam>
    /// <param name="rule">The rule builder.</param>
    /// <returns>The rule builder, for chaining.</returns>
    public static IRuleBuilderOptions<T, string?> IsVehiclePlate<T>(this IRuleBuilder<T, string?> rule) =>
        Rule(rule, VehiclePlate.Validate, "'{PropertyName}' is not a valid vehicle registration number.");

    private static IRuleBuilderOptions<T, string?> Rule<T>(
        IRuleBuilder<T, string?> rule, Func<string, bool> isValid, string message)
    {
        ArgumentNullException.ThrowIfNull(rule);
        return rule.Must(value => string.IsNullOrEmpty(value) || isValid(value)).WithMessage(message);
    }
}
