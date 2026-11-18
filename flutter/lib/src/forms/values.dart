/// The fields of the checkout and KYC forms.
///
/// The [name] of each value is also its key in `PakFormValues.toMap()` and,
/// for its label, in the `labels` map of the forms.
enum PakFormField {
  /// Full name (required).
  fullName,

  /// Mobile number (required, mobile only).
  mobile,

  /// Province or territory (required).
  province,

  /// District (required).
  district,

  /// Tehsil (optional, shown only when the form's `showTehsil` is `true`).
  tehsil,

  /// City (required, free text with suggestions).
  city,

  /// Street address (required).
  address,

  /// A nearby place (optional).
  landmark,

  /// Postal code (optional, 5 digits).
  postalCode,

  /// CNIC (required, KYC form only).
  cnic,
}

/// The values of a checkout or KYC form, trimmed. Optional fields left empty
/// are empty strings, and [cnic] is `null` in the checkout form.
class PakFormValues {
  /// Creates form values.
  const PakFormValues({
    this.fullName = '',
    this.mobile = '',
    this.province = '',
    this.district = '',
    this.tehsil = '',
    this.city = '',
    this.address = '',
    this.landmark = '',
    this.postalCode = '',
    this.cnic,
  });

  /// Full name.
  final String fullName;

  /// Mobile number as typed and formatted (`0300-1234567`). Use `formatPhone`
  /// from `package:pakdatakit` for the E.164 form.
  final String mobile;

  /// Province or territory.
  final String province;

  /// District.
  final String district;

  /// Tehsil, or an empty string.
  final String tehsil;

  /// City.
  final String city;

  /// Street address.
  final String address;

  /// Nearby place, or an empty string.
  final String landmark;

  /// Postal code, or an empty string.
  final String postalCode;

  /// CNIC as formatted (`35202-1234567-1`), or `null` in the checkout form.
  final String? cnic;

  /// The value of [field].
  String? operator [](PakFormField field) => switch (field) {
        PakFormField.fullName => fullName,
        PakFormField.mobile => mobile,
        PakFormField.province => province,
        PakFormField.district => district,
        PakFormField.tehsil => tehsil,
        PakFormField.city => city,
        PakFormField.address => address,
        PakFormField.landmark => landmark,
        PakFormField.postalCode => postalCode,
        PakFormField.cnic => cnic,
      };

  /// The values keyed by [PakFormField.name]. `cnic` is left out when `null`.
  Map<String, String> toMap() => {
        for (final field in PakFormField.values)
          if (this[field] != null) field.name: this[field]!,
      };

  @override
  bool operator ==(Object other) =>
      other is PakFormValues &&
      PakFormField.values.every((field) => other[field] == this[field]);

  @override
  int get hashCode => Object.hashAll(PakFormField.values.map((f) => this[f]));

  @override
  String toString() => 'PakFormValues${toMap()}';
}
