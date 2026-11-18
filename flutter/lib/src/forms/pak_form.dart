// material.dart is deprecated from Flutter 3.47 in favour of the material_ui
// package; it is kept so the package still supports older Flutter versions.
// ignore: deprecated_member_use
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../fields.dart';
import 'hints.dart';
import 'labels.dart';
import 'location.dart';
import 'values.dart';

/// Lets an app restyle a field of a checkout or KYC form: receives the
/// decoration the form built (label and placeholder) and returns the one to
/// use.
typedef PakFieldDecorator = InputDecoration Function(
  PakFormField field,
  InputDecoration decoration,
);

/// Builds the submit control of a checkout or KYC form. Call [submit] to
/// validate and submit; [label] is the localized submit label.
typedef PakSubmitBuilder = Widget Function(
  BuildContext context,
  VoidCallback submit,
  String label,
);

final RegExp _postalCodePattern = RegExp(r'^\d{5}$');

/// Common base of [PakCheckoutForm] and [PakKycForm].
///
/// A [Form] of Material fields with no styling of its own: full name, mobile
/// number, province, district, optional tehsil, city (with suggestions),
/// address, nearby place and postal code, plus a CNIC in [PakKycForm].
///
/// - The mobile number and CNIC use [PhoneField] and [CnicField], so they
///   format as you type and validate with `validatePhone` and `validateCNIC`.
/// - Province, district and tehsil are [DropdownButtonFormField]s and the city
///   is an [Autocomplete] limited to the chosen province, all from
///   [PakLocation]. Changing the province clears the district, tehsil and
///   city; changing the district clears the tehsil.
/// - With [hints] on, address completeness, mobile number risk signals and a
///   postal code from another city are shown in a polite live region. They
///   never block submit. See [PakFormHints] for how they load.
/// - [locale] switches every text to Urdu and the layout to right to left;
///   [labels] overrides any text (see [PakFormLabels] for the keys).
///
/// Each field has a `Key('pakForm.<field>')` (e.g. `pakForm.city`) and the
/// submit button `Key('pakForm.submit')`.
abstract class PakForm extends StatefulWidget {
  /// Creates a form. Use [PakCheckoutForm] or [PakKycForm].
  const PakForm({
    super.key,
    this.onSubmitted,
    this.onChanged,
    this.initialValues = const PakFormValues(),
    this.locale = PakFormLocale.en,
    this.labels,
    this.showTehsil = false,
    this.hints = false,
    this.hintsLoader,
    this.decorate,
    this.submitBuilder,
    this.spacing = 16,
  });

  /// Called with the values when the form is submitted and valid.
  final ValueChanged<PakFormValues>? onSubmitted;

  /// Called with the values after each change.
  final ValueChanged<PakFormValues>? onChanged;

  /// Values to start with.
  final PakFormValues initialValues;

  /// Language of labels, placeholders, errors and hints. Urdu also lays the
  /// form out right to left.
  final PakFormLocale locale;

  /// Replaces any of the default texts in [PakFormLabels].
  final Map<String, String>? labels;

  /// Whether to show the optional tehsil field.
  final bool showTehsil;

  /// Whether to show non-blocking hints. The first time hints are computed,
  /// the quality library and its post office directory are loaded.
  final bool hints;

  /// Computes the hints instead of [PakFormHints.compute].
  final PakHintsLoader? hintsLoader;

  /// Restyles a field. See [PakFieldDecorator].
  final PakFieldDecorator? decorate;

  /// Replaces the default [FilledButton]. See [PakSubmitBuilder].
  final PakSubmitBuilder? submitBuilder;

  /// Vertical space between fields.
  final double spacing;

  /// Whether the form asks for a CNIC.
  @protected
  bool get includeCnic;

  @override
  State<PakForm> createState() => _PakFormState();
}

/// A checkout form: full name, mobile number, province, district, optional
/// tehsil, city, address, nearby place and postal code.
///
/// ```dart
/// PakCheckoutForm(
///   onSubmitted: (values) => placeOrder(values.toMap()),
/// )
/// ```
///
/// See [PakForm] for the options.
class PakCheckoutForm extends PakForm {
  /// Creates a checkout form.
  const PakCheckoutForm({
    super.key,
    super.onSubmitted,
    super.onChanged,
    super.initialValues,
    super.locale,
    super.labels,
    super.showTehsil,
    super.hints,
    super.hintsLoader,
    super.decorate,
    super.submitBuilder,
    super.spacing,
  });

  @override
  bool get includeCnic => false;
}

/// A KYC form: the fields of [PakCheckoutForm] plus a required CNIC.
///
/// ```dart
/// PakKycForm(
///   locale: PakFormLocale.ur,
///   onSubmitted: (values) => verify(values.cnic!),
/// )
/// ```
///
/// See [PakForm] for the options.
class PakKycForm extends PakForm {
  /// Creates a KYC form.
  const PakKycForm({
    super.key,
    super.onSubmitted,
    super.onChanged,
    super.initialValues,
    super.locale,
    super.labels,
    super.showTehsil,
    super.hints,
    super.hintsLoader,
    super.decorate,
    super.submitBuilder,
    super.spacing,
  });

  @override
  bool get includeCnic => true;
}

class _PakFormState extends State<PakForm> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _name;
  late final TextEditingController _mobile;
  late final TextEditingController _address;
  late final TextEditingController _landmark;
  late final TextEditingController _postalCode;
  late final TextEditingController _cnic;
  String? _province;
  String? _district;
  String? _tehsil;
  String _city = '';
  bool _showErrorSummary = false;
  PakFormHints _hints = PakFormHints.none;
  int _hintsRequest = 0;

  @override
  void initState() {
    super.initState();
    final v = widget.initialValues;
    _name = TextEditingController(text: v.fullName);
    _mobile = TextEditingController(text: v.mobile);
    _address = TextEditingController(text: v.address);
    _landmark = TextEditingController(text: v.landmark);
    _postalCode = TextEditingController(text: v.postalCode);
    _cnic = TextEditingController(text: v.cnic ?? '');
    if (PakLocation.provinces.contains(v.province)) {
      _province = v.province;
      if (PakLocation.districts(_province).contains(v.district)) {
        _district = v.district;
        if (PakLocation.tehsils(_district).contains(v.tehsil)) {
          _tehsil = v.tehsil;
        }
      }
    }
    _city = v.city;
    if (widget.hints) _refreshHints();
  }

  @override
  void didUpdateWidget(PakForm oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.hints && !oldWidget.hints) _refreshHints();
  }

  @override
  void dispose() {
    for (final controller in [
      _name,
      _mobile,
      _address,
      _landmark,
      _postalCode,
      _cnic,
    ]) {
      controller.dispose();
    }
    super.dispose();
  }

  PakFormValues get _values => PakFormValues(
        fullName: _name.text.trim(),
        mobile: _mobile.text.trim(),
        province: _province ?? '',
        district: _district ?? '',
        tehsil: widget.showTehsil ? _tehsil ?? '' : '',
        city: _city.trim(),
        address: _address.text.trim(),
        landmark: _landmark.text.trim(),
        postalCode: _postalCode.text.trim(),
        cnic: widget.includeCnic ? _cnic.text.trim() : null,
      );

  void _changed() {
    widget.onChanged?.call(_values);
    if (widget.hints) _refreshHints();
  }

  Future<void> _refreshHints() async {
    final request = ++_hintsRequest;
    final loader = widget.hintsLoader ?? PakFormHints.compute;
    final hints = await loader(_values);
    if (!mounted || request != _hintsRequest) return;
    setState(() => _hints = hints);
  }

  void _submit() {
    final valid = _formKey.currentState!.validate();
    setState(() => _showErrorSummary = !valid);
    if (valid) widget.onSubmitted?.call(_values);
  }

  Map<String, String> get _text =>
      PakFormLabels.resolve(widget.locale, widget.labels);

  InputDecoration _decoration(
    Map<String, String> text,
    PakFormField field, {
    bool optional = false,
  }) {
    final label = text[field.name]!;
    final decoration = InputDecoration(
      labelText: optional ? '$label ${text['optional']}' : label,
      hintText: text['${field.name}Placeholder'],
    );
    return widget.decorate?.call(field, decoration) ?? decoration;
  }

  FormFieldValidator<String> _required(String message) =>
      (value) => (value?.trim() ?? '').isEmpty ? message : null;

  String _fill(String template, Map<String, String> values) =>
      values.entries.fold(
        template,
        (result, e) => result.replaceAll('{${e.key}}', e.value),
      );

  List<String> _hintMessages(Map<String, String> text) {
    final hints = _hints;
    return [
      if (hints.addressScore != null)
        _fill(text['hintAddressScore']!, {'score': '${hints.addressScore}'}),
      if (hints.addressScore != null && hints.missingParts.isNotEmpty)
        _fill(text['hintMissing']!, {
          'parts': hints.missingParts
              .map((part) => text['part.$part'] ?? part)
              .join(widget.locale == PakFormLocale.ur ? '، ' : ', '),
        }),
      for (final flag in hints.phoneFlags) text['phone.$flag'] ?? flag,
      if (hints.postalCodeCity != null)
        _fill(text['hintPostalCode']!, {
          'code': _postalCode.text.trim(),
          'city': hints.postalCodeCity!,
        }),
    ];
  }

  Widget _dropdown({
    required Key key,
    required Map<String, String> text,
    required PakFormField field,
    required String? value,
    required List<String> items,
    required ValueChanged<String?>? onChanged,
    String? requiredMessage,
    bool optional = false,
  }) {
    return DropdownButtonFormField<String>(
      key: key,
      // `initialValue` replaces `value` from Flutter 3.35; `value` is kept so
      // older Flutter versions still work. The field is re-keyed when its
      // parent changes, so it never needs to follow a new value.
      // ignore: deprecated_member_use
      value: value,
      isExpanded: true,
      decoration: _decoration(text, field, optional: optional),
      hint: Text(text['${field.name}Placeholder']!),
      items: [
        for (final item in items)
          DropdownMenuItem(value: item, child: Text(item)),
      ],
      onChanged: items.isEmpty ? null : onChanged,
      validator: requiredMessage == null
          ? null
          : (value) => value == null ? requiredMessage : null,
    );
  }

  @override
  Widget build(BuildContext context) {
    final text = _text;
    final rtl = widget.locale == PakFormLocale.ur;
    final gap = SizedBox(height: widget.spacing);

    final fields = <Widget>[
      TextFormField(
        key: const Key('pakForm.fullName'),
        controller: _name,
        decoration: _decoration(text, PakFormField.fullName),
        textCapitalization: TextCapitalization.words,
        textInputAction: TextInputAction.next,
        autofillHints: const [AutofillHints.name],
        validator: _required(text['fullNameRequired']!),
        onChanged: (_) => _changed(),
      ),
      PhoneField(
        key: const Key('pakForm.mobile'),
        controller: _mobile,
        decoration: _decoration(text, PakFormField.mobile),
        invalidMessage: text['mobileInvalid'],
        requiredMessage: text['required'],
        textInputAction: TextInputAction.next,
        onChanged: (_) => _changed(),
      ),
      if (widget.includeCnic)
        CnicField(
          key: const Key('pakForm.cnic'),
          controller: _cnic,
          decoration: _decoration(text, PakFormField.cnic),
          invalidMessage: text['cnicInvalid'],
          requiredMessage: text['required'],
          textInputAction: TextInputAction.next,
          onChanged: (_) => _changed(),
        ),
      _dropdown(
        key: const Key('pakForm.province'),
        text: text,
        field: PakFormField.province,
        value: _province,
        items: PakLocation.provinces,
        requiredMessage: text['provinceRequired'],
        onChanged: (value) {
          if (value == _province) return;
          setState(() {
            _province = value;
            _district = null;
            _tehsil = null;
            _city = '';
          });
          _changed();
        },
      ),
      KeyedSubtree(
        key: ValueKey('district/$_province'),
        child: _dropdown(
          key: const Key('pakForm.district'),
          text: text,
          field: PakFormField.district,
          value: _district,
          items: PakLocation.districts(_province),
          requiredMessage: text['districtRequired'],
          onChanged: (value) {
            if (value == _district) return;
            setState(() {
              _district = value;
              _tehsil = null;
            });
            _changed();
          },
        ),
      ),
      if (widget.showTehsil)
        KeyedSubtree(
          key: ValueKey('tehsil/$_province/$_district'),
          child: _dropdown(
            key: const Key('pakForm.tehsil'),
            text: text,
            field: PakFormField.tehsil,
            value: _tehsil,
            items: PakLocation.tehsils(_district),
            optional: true,
            onChanged: (value) {
              setState(() => _tehsil = value);
              _changed();
            },
          ),
        ),
      KeyedSubtree(
        key: ValueKey('city/$_province'),
        child: Autocomplete<String>(
          initialValue: TextEditingValue(text: _city),
          optionsBuilder: (value) => PakLocation.cities(_province, value.text),
          onSelected: (city) {
            _city = city;
            _changed();
          },
          fieldViewBuilder: (context, controller, focusNode, onSubmitted) =>
              TextFormField(
            key: const Key('pakForm.city'),
            controller: controller,
            focusNode: focusNode,
            decoration: _decoration(text, PakFormField.city),
            textInputAction: TextInputAction.next,
            autofillHints: const [AutofillHints.addressCity],
            validator: _required(text['cityRequired']!),
            onChanged: (value) {
              _city = value;
              _changed();
            },
            onFieldSubmitted: (_) => onSubmitted(),
          ),
        ),
      ),
      TextFormField(
        key: const Key('pakForm.address'),
        controller: _address,
        decoration: _decoration(text, PakFormField.address),
        keyboardType: TextInputType.streetAddress,
        textInputAction: TextInputAction.next,
        autofillHints: const [AutofillHints.streetAddressLine1],
        validator: _required(text['addressRequired']!),
        onChanged: (_) => _changed(),
      ),
      TextFormField(
        key: const Key('pakForm.landmark'),
        controller: _landmark,
        decoration: _decoration(text, PakFormField.landmark, optional: true),
        textInputAction: TextInputAction.next,
        onChanged: (_) => _changed(),
      ),
      TextFormField(
        key: const Key('pakForm.postalCode'),
        controller: _postalCode,
        decoration: _decoration(text, PakFormField.postalCode, optional: true),
        keyboardType: TextInputType.number,
        textInputAction: TextInputAction.done,
        autofillHints: const [AutofillHints.postalCode],
        inputFormatters: [
          FilteringTextInputFormatter.digitsOnly,
          LengthLimitingTextInputFormatter(5),
        ],
        validator: (value) {
          final code = value?.trim() ?? '';
          return code.isEmpty || _postalCodePattern.hasMatch(code)
              ? null
              : text['postalCodeInvalid'];
        },
        onChanged: (_) => _changed(),
        onFieldSubmitted: (_) => _submit(),
      ),
    ];

    final hintMessages = widget.hints ? _hintMessages(text) : const <String>[];

    return Directionality(
      textDirection: rtl ? TextDirection.rtl : TextDirection.ltr,
      child: Form(
        key: _formKey,
        child: AutofillGroup(
          child: FocusTraversalGroup(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                for (final field in fields) ...[field, gap],
                if (widget.hints)
                  Semantics(
                    key: const Key('pakForm.hints'),
                    container: true,
                    liveRegion: true,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        for (final message in hintMessages) Text(message),
                      ],
                    ),
                  ),
                if (_showErrorSummary)
                  Semantics(
                    key: const Key('pakForm.errorSummary'),
                    container: true,
                    liveRegion: true,
                    child: Text(text['errorSummary']!),
                  ),
                if (widget.hints || _showErrorSummary) gap,
                widget.submitBuilder?.call(context, _submit, text['submit']!) ??
                    FilledButton(
                      key: const Key('pakForm.submit'),
                      onPressed: _submit,
                      child: Text(text['submit']!),
                    ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
