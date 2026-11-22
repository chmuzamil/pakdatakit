using System.ComponentModel.DataAnnotations;

namespace PakDataKit.DataAnnotations;

/// <summary>
/// Base class for the PakDataKit validation attributes. As with the built-in
/// attributes, <c>null</c> and empty strings are valid: add
/// <see cref="RequiredAttribute"/> to make a value mandatory. Values that are
/// not strings are invalid.
/// </summary>
[AttributeUsage(AttributeTargets.Property | AttributeTargets.Field | AttributeTargets.Parameter)]
public abstract class PakValidationAttribute : ValidationAttribute
{
    private readonly Func<string, bool> _isValid;

    /// <summary>Creates the attribute.</summary>
    /// <param name="isValid">The check to run on non-empty strings.</param>
    /// <param name="defaultMessage">Default error message; <c>{0}</c> is the field name.</param>
    protected PakValidationAttribute(Func<string, bool> isValid, string defaultMessage)
        : base(defaultMessage)
    {
        _isValid = isValid;
    }

    /// <summary>
    /// Checks a value: <c>null</c> and empty strings are valid, other strings
    /// must pass this attribute's check, and values that are not strings are
    /// invalid.
    /// </summary>
    /// <param name="value">The value to validate.</param>
    /// <returns><c>true</c> if the value is valid.</returns>
    public override bool IsValid(object? value) => value switch
    {
        null => true,
        string text => text.Length == 0 || IsValidText(text),
        _ => false,
    };

    /// <summary>Runs this attribute's check on a non-empty string.</summary>
    /// <param name="text">The string to check.</param>
    /// <returns><c>true</c> if it passes.</returns>
    protected virtual bool IsValidText(string text) => _isValid(text);
}

/// <summary>Validates a CNIC, using <see cref="Cnic.Validate"/>.</summary>
public sealed class CnicAttribute() : PakValidationAttribute(Cnic.Validate, "The {0} field is not a valid CNIC.");

/// <summary>Validates a Pakistani mobile number, using <see cref="Phone.Validate"/>.</summary>
public sealed class PakPhoneAttribute()
    : PakValidationAttribute(Phone.Validate, "The {0} field is not a valid Pakistani mobile number.");

/// <summary>Validates a Pakistani IBAN, using <see cref="Iban.Validate"/>.</summary>
public sealed class PakIbanAttribute()
    : PakValidationAttribute(Iban.Validate, "The {0} field is not a valid Pakistani IBAN.");

/// <summary>Validates the format of a National Tax Number, using <see cref="Tax.ValidateNtn"/>.</summary>
public sealed class NtnAttribute() : PakValidationAttribute(Tax.ValidateNtn, "The {0} field is not a valid NTN.");

/// <summary>Validates the format of a Sales Tax Registration Number, using <see cref="Tax.ValidateStrn"/>.</summary>
public sealed class StrnAttribute() : PakValidationAttribute(Tax.ValidateStrn, "The {0} field is not a valid STRN.");

/// <summary>
/// Validates a Pakistani landline number, using
/// <see cref="Numbers.ValidateLandline(string?, bool)"/>. Set
/// <see cref="Services"/> to also accept UAN, toll-free and premium-rate
/// numbers: <c>[PakLandline(Services = true)]</c>.
/// </summary>
public sealed class PakLandlineAttribute : PakValidationAttribute
{
    /// <summary>Creates the attribute.</summary>
    public PakLandlineAttribute()
        : base(value => Numbers.ValidateLandline(value), "The {0} field is not a valid Pakistani landline number.")
    {
    }

    /// <summary>
    /// Also accept the non-geographic service numbers a business may give as
    /// its landline: UAN, toll-free and premium rate. Default <c>false</c>.
    /// </summary>
    public bool Services { get; set; }

    /// <inheritdoc/>
    protected override bool IsValidText(string text) => Numbers.ValidateLandline(text, Services);
}

/// <summary>
/// Validates the format of a Pakistani passport number, using
/// <see cref="Passport.Validate"/>. Checks the common shape only.
/// </summary>
public sealed class PakPassportAttribute()
    : PakValidationAttribute(Passport.Validate, "The {0} field is not a valid Pakistani passport number.");

/// <summary>
/// Validates the format of a vehicle registration number, using
/// <see cref="PakDataKit.VehiclePlate.Validate"/>. Checks the common shape only.
/// </summary>
public sealed class VehiclePlateAttribute()
    : PakValidationAttribute(PakDataKit.VehiclePlate.Validate, "The {0} field is not a valid vehicle registration number.");

/// <summary>
/// Validates a mobile number a courier can call: a valid Pakistani mobile
/// number for which <see cref="Quality.PhoneRiskSignals"/> returns no flags
/// (not a landline, service, repeated-digit, sequential or placeholder number).
/// </summary>
public sealed class CodPhoneAttribute()
    : PakValidationAttribute(value => Quality.PhoneRiskSignals(value).Count == 0, "Enter a mobile number a courier can call");

/// <summary>
/// Validates a rupee amount typed the way people type it in Pakistan
/// (<c>150,000</c>, <c>1.5 lakh</c>, <c>Rs. 5,000/-</c>), using
/// <see cref="Currency.ParseAmount"/>.
/// </summary>
public sealed class PakAmountAttribute()
    : PakValidationAttribute(value => Currency.ParseAmount(value) is not null, "Enter an amount in rupees, like 150,000 or 1.5 lakh");
