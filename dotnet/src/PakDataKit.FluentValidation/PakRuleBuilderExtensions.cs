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

    /// <summary>
    /// Requires a valid Pakistani landline number, using
    /// <see cref="Numbers.ValidateLandline(string?, bool)"/>. With
    /// <c>services: true</c> it also accepts UAN, toll-free and premium-rate
    /// numbers.
    /// </summary>
    /// <typeparam name="T">Type being validated.</typeparam>
    /// <param name="rule">The rule builder.</param>
    /// <param name="services"><c>true</c> to also accept UAN, toll-free and premium-rate numbers.</param>
    /// <returns>The rule builder, for chaining.</returns>
    public static IRuleBuilderOptions<T, string?> IsPakLandline<T>(
        this IRuleBuilder<T, string?> rule, bool services = false) =>
        Rule(
            rule,
            value => Numbers.ValidateLandline(value, services),
            "'{PropertyName}' is not a valid Pakistani landline number.");

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

    /// <summary>
    /// Requires a mobile number a courier can call: a valid Pakistani mobile
    /// number for which <see cref="Quality.PhoneRiskSignals"/> returns no flags
    /// (not a landline, service, repeated-digit, sequential or placeholder number).
    /// </summary>
    /// <typeparam name="T">Type being validated.</typeparam>
    /// <param name="rule">The rule builder.</param>
    /// <returns>The rule builder, for chaining.</returns>
    public static IRuleBuilderOptions<T, string?> IsCodPhone<T>(this IRuleBuilder<T, string?> rule) =>
        Rule(rule, value => Quality.PhoneRiskSignals(value).Count == 0, "Enter a mobile number a courier can call");

    /// <summary>
    /// Requires a rupee amount typed the way people type it in Pakistan
    /// (<c>150,000</c>, <c>1.5 lakh</c>, <c>Rs. 5,000/-</c>), using
    /// <see cref="Currency.ParseAmount"/>.
    /// </summary>
    /// <typeparam name="T">Type being validated.</typeparam>
    /// <param name="rule">The rule builder.</param>
    /// <returns>The rule builder, for chaining.</returns>
    public static IRuleBuilderOptions<T, string?> IsPakAmount<T>(this IRuleBuilder<T, string?> rule) =>
        Rule(rule, value => Currency.ParseAmount(value) is not null, "Enter an amount in rupees, like 150,000 or 1.5 lakh");

    private static IRuleBuilderOptions<T, string?> Rule<T>(
        IRuleBuilder<T, string?> rule, Func<string, bool> isValid, string message)
    {
        ArgumentNullException.ThrowIfNull(rule);
        return rule.Must(value => string.IsNullOrEmpty(value) || isValid(value)).WithMessage(message);
    }
}
