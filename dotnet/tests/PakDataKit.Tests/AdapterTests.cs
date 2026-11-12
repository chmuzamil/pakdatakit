using System.ComponentModel.DataAnnotations;
using FluentValidation;
using PakDataKit.DataAnnotations;
using PakDataKit.FluentValidation;
using Xunit;

namespace PakDataKit.Tests;

public sealed class DataAnnotationsTests
{
    private sealed class Customer
    {
        [Required, Cnic]
        public string? Cnic { get; set; }

        [PakPhone]
        public string? Phone { get; set; }

        [PakIban(ErrorMessage = "Bad IBAN")]
        public string? Iban { get; set; }

        [Ntn]
        public string? Ntn { get; set; }

        [Strn]
        public string? Strn { get; set; }

        [PakLandline]
        public string? Landline { get; set; }

        [PakPassport]
        public string? Passport { get; set; }

        [VehiclePlate]
        public string? Plate { get; set; }
    }

    private static List<string> Errors(Customer customer)
    {
        var results = new List<ValidationResult>();
        Validator.TryValidateObject(customer, new ValidationContext(customer), results, validateAllProperties: true);
        return results.Select(r => r.ErrorMessage!).ToList();
    }

    [Fact]
    public void AcceptsValidValues()
    {
        Assert.Empty(Errors(new Customer
        {
            Cnic = "35202-1234567-1",
            Phone = "0300 1234567",
            Iban = "PK36SCBL0000001123456702",
            Ntn = "0622438-9",
            Strn = "17-00-3761-882-19",
            Landline = "042-35761234",
            Passport = "AB1234567",
            Plate = "LEA-1234",
        }));
    }

    [Fact]
    public void LetsOptionalFieldsBeEmpty()
    {
        Assert.Empty(Errors(new Customer { Cnic = "3520212345671", Phone = "", Iban = null }));
    }

    [Fact]
    public void RejectsInvalidValuesWithMessages()
    {
        Assert.Equal(
            [
                "The Cnic field is not a valid CNIC.",
                "The Phone field is not a valid Pakistani mobile number.",
                "Bad IBAN",
                "The Ntn field is not a valid NTN.",
                "The Strn field is not a valid STRN.",
                "The Landline field is not a valid Pakistani landline number.",
                "The Passport field is not a valid Pakistani passport number.",
                "The Plate field is not a valid vehicle registration number.",
            ],
            Errors(new Customer
            {
                Cnic = "00000-0000000-0",
                Phone = "03601234567",
                Iban = "PK37SCBL0000001123456702",
                Ntn = "123",
                Strn = "1",
                Landline = "03001234567",
                Passport = "A1234",
                Plate = "ABC-12345",
            }));
    }

    [Fact]
    public void RejectsValuesThatAreNotStrings()
    {
        Assert.False(new CnicAttribute().IsValid(3520212345671));
        Assert.True(new CnicAttribute().IsValid(null));
    }
}

public sealed class FluentValidationTests
{
    private sealed record Customer(
        string? Cnic, string? Phone = null, string? Iban = null, string? Ntn = null, string? Strn = null,
        string? Landline = null, string? Passport = null, string? Plate = null);

    private sealed class CustomerValidator : AbstractValidator<Customer>
    {
        public CustomerValidator()
        {
            RuleFor(c => c.Cnic).NotEmpty().IsCnic();
            RuleFor(c => c.Phone).IsPakPhone();
            RuleFor(c => c.Iban).IsPakIban().WithMessage("Bad IBAN");
            RuleFor(c => c.Ntn).IsNtn();
            RuleFor(c => c.Strn).IsStrn();
            RuleFor(c => c.Landline).IsPakLandline();
            RuleFor(c => c.Passport).IsPakPassport();
            RuleFor(c => c.Plate).IsVehiclePlate();
        }
    }

    private static List<string> Errors(Customer customer) =>
        new CustomerValidator().Validate(customer).Errors.Select(e => e.ErrorMessage).ToList();

    [Fact]
    public void AcceptsValidValues()
    {
        Assert.Empty(Errors(new Customer(
            "35202-1234567-1", "0300 1234567", "PK36SCBL0000001123456702", "0622438-9", "17-00-3761-882-19",
            "042-35761234", "AB1234567", "LEA-1234")));
    }

    [Fact]
    public void LetsOptionalFieldsBeEmpty()
    {
        Assert.Empty(Errors(new Customer("3520212345671", Phone: "", Iban: null)));
    }

    [Fact]
    public void RejectsInvalidValuesWithMessages()
    {
        Assert.Equal(
            [
                "'Cnic' is not a valid CNIC.",
                "'Phone' is not a valid Pakistani mobile number.",
                "Bad IBAN",
                "'Ntn' is not a valid NTN.",
                "'Strn' is not a valid STRN.",
                "'Landline' is not a valid Pakistani landline number.",
                "'Passport' is not a valid Pakistani passport number.",
                "'Plate' is not a valid vehicle registration number.",
            ],
            Errors(new Customer(
                "00000-0000000-0", "03601234567", "PK37SCBL0000001123456702", "123", "1", "03001234567", "A1234",
                "ABC-12345")));
    }
}
