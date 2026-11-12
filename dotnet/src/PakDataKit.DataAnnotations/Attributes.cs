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

    /// <inheritdoc />
    public override bool IsValid(object? value) => value switch
    {
        null => true,
        string text => text.Length == 0 || _isValid(text),
        _ => false,
    };
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

/// <summary>Validates a Pakistani landline number, using <see cref="Numbers.ValidateLandline"/>.</summary>
public sealed class PakLandlineAttribute()
    : PakValidationAttribute(Numbers.ValidateLandline, "The {0} field is not a valid Pakistani landline number.");

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
