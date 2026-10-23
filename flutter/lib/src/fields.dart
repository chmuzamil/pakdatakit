import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter/services.dart';
import 'package:pakdatakit/pakdatakit.dart';

import 'formatters.dart';
import 'validators.dart';

/// Called when the [InputState] of a field changes, and when a valid value
/// changes. [info] holds details about the value while it is valid (it can
/// still be `null` then, e.g. an IBAN of a bank missing from the dataset).
typedef PakInputStateCallback<Info> = void Function(
  InputState state,
  Info? info,
);

/// Common base of [CnicField], [PhoneField] and [IbanField]: a
/// [TextFormField] that formats as you type and validates with
/// `package:pakdatakit`.
///
/// While the user types, an error is shown only once the value is
/// [InputState.invalid] (it cannot become valid by typing more), not while it
/// is [InputState.incomplete] or empty. After the form is validated (e.g. with
/// `FormState.validate()` on submit), incomplete and missing values are
/// reported too.
abstract class PakTextFormField<Info> extends StatefulWidget {
  /// Creates a field. Use [CnicField], [PhoneField] or [IbanField].
  const PakTextFormField({
    super.key,
    this.controller,
    this.initialValue,
    this.focusNode,
    this.decoration = const InputDecoration(),
    this.onStateChanged,
    this.onChanged,
    this.onFieldSubmitted,
    this.onSaved,
    this.validator,
    this.required = true,
    this.invalidMessage,
    this.requiredMessage,
    this.autovalidateMode = AutovalidateMode.onUserInteraction,
    this.enabled,
    this.readOnly = false,
    this.autofocus = false,
    this.textInputAction,
    this.style,
    this.textAlign = TextAlign.start,
    this.inputFormatters,
    this.restorationId,
  }) : assert(
          controller == null || initialValue == null,
          'Pass either controller or initialValue, not both',
        );

  /// Controls the text. If `null`, the field creates its own.
  final TextEditingController? controller;

  /// Initial text when no [controller] is given. It is formatted first.
  final String? initialValue;

  /// See [TextField.focusNode].
  final FocusNode? focusNode;

  /// Decoration around the field (label, hint, icons …).
  final InputDecoration? decoration;

  /// Called with the new [InputState] (and details once valid) when the
  /// state changes, or when a valid value changes.
  final PakInputStateCallback<Info>? onStateChanged;

  /// Called with the formatted text after each edit by the user.
  final ValueChanged<String>? onChanged;

  /// See [TextFormField.onFieldSubmitted].
  final ValueChanged<String>? onFieldSubmitted;

  /// See [FormField.onSaved].
  final FormFieldSetter<String>? onSaved;

  /// Extra validation, run only when the value is otherwise valid.
  final FormFieldValidator<String>? validator;

  /// Whether an empty value is an error when the form is validated.
  final bool required;

  /// Error shown for an invalid or incomplete value. Defaults to the
  /// matching message in [PakValidators].
  final String? invalidMessage;

  /// Error shown for an empty required field. Defaults to
  /// [PakValidators.defaultRequiredMessage].
  final String? requiredMessage;

  /// When to validate while the user types. Defaults to
  /// [AutovalidateMode.onUserInteraction].
  final AutovalidateMode autovalidateMode;

  /// See [TextFormField.enabled].
  final bool? enabled;

  /// See [TextField.readOnly].
  final bool readOnly;

  /// See [TextField.autofocus].
  final bool autofocus;

  /// See [TextField.textInputAction].
  final TextInputAction? textInputAction;

  /// See [TextField.style].
  final TextStyle? style;

  /// See [TextField.textAlign].
  final TextAlign textAlign;

  /// Extra formatters, applied after the built-in one.
  final List<TextInputFormatter>? inputFormatters;

  /// See [TextFormField.restorationId].
  final String? restorationId;

  /// Formats the value as the user types.
  @protected
  String format(String value);

  /// Checks the value while the user types.
  @protected
  InputState check(String value);

  /// Details about a valid value.
  @protected
  Info? infoFor(String value);

  /// The formatter applied to the text.
  @protected
  TextInputFormatter createFormatter();

  /// Keyboard to show.
  @protected
  TextInputType get keyboardType;

  /// Autofill hints, if any.
  @protected
  Iterable<String>? get autofillHints => null;

  /// Capitalization applied by the keyboard.
  @protected
  TextCapitalization get textCapitalization => TextCapitalization.none;

  /// Message used when [invalidMessage] is not set.
  @protected
  String get defaultInvalidMessage;

  @override
  State<PakTextFormField<Info>> createState() => _PakTextFormFieldState<Info>();
}

class _PakTextFormFieldState<Info> extends State<PakTextFormField<Info>> {
  TextEditingController? _ownController;
  late TextInputFormatter _formatter;
  late InputState _state;
  String _text = '';

  /// Set once the field is validated outside a build, i.e. by
  /// `FormState.validate()` or `FormFieldState.validate()`. From then on,
  /// incomplete and missing values are errors too.
  bool _submitted = false;

  TextEditingController get _controller => widget.controller ?? _ownController!;

  @override
  void initState() {
    super.initState();
    _formatter = widget.createFormatter();
    if (widget.controller == null) {
      _ownController = TextEditingController(
        text: widget.format(widget.initialValue ?? ''),
      );
    }
    _text = _controller.text;
    _state = widget.check(_text);
    _controller.addListener(_handleChange);
  }

  @override
  void didUpdateWidget(PakTextFormField<Info> oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.controller != widget.controller) {
      (oldWidget.controller ?? _ownController)?.removeListener(_handleChange);
      if (widget.controller == null) {
        _ownController ??= TextEditingController(
          text: oldWidget.controller?.text ?? '',
        );
      } else {
        // The TextFormField still listens to it until it rebuilds.
        final own = _ownController;
        if (own != null) {
          WidgetsBinding.instance.addPostFrameCallback((_) => own.dispose());
        }
        _ownController = null;
      }
      _controller.addListener(_handleChange);
      // Called during build, so track the new text without notifying.
      _text = _controller.text;
      _state = widget.check(_text);
    }
  }

  @override
  void dispose() {
    _controller.removeListener(_handleChange);
    _ownController?.dispose();
    super.dispose();
  }

  void _handleChange() {
    final text = _controller.text;
    if (text == _text) return;
    _text = text;
    final state = widget.check(text);
    final changed = state != _state || state == InputState.valid;
    _state = state;
    if (changed) {
      widget.onStateChanged?.call(
        state,
        state == InputState.valid ? widget.infoFor(text) : null,
      );
    }
  }

  bool get _inBuild =>
      SchedulerBinding.instance.schedulerPhase ==
      SchedulerPhase.persistentCallbacks;

  String? _validate(String? value) {
    if (!_inBuild) _submitted = true;
    final text = value ?? '';
    final message = widget.invalidMessage ?? widget.defaultInvalidMessage;
    switch (widget.check(text)) {
      case InputState.empty:
        return widget.required && _submitted
            ? widget.requiredMessage ?? PakValidators.defaultRequiredMessage
            : null;
      case InputState.incomplete:
        return _submitted ? message : null;
      case InputState.invalid:
        return message;
      case InputState.valid:
        return widget.validator?.call(text);
    }
  }

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: _controller,
      focusNode: widget.focusNode,
      decoration: widget.decoration,
      keyboardType: widget.keyboardType,
      textCapitalization: widget.textCapitalization,
      autofillHints: widget.autofillHints,
      autocorrect: false,
      enableSuggestions: false,
      inputFormatters: [_formatter, ...?widget.inputFormatters],
      validator: _validate,
      autovalidateMode: widget.autovalidateMode,
      onChanged: widget.onChanged,
      onFieldSubmitted: widget.onFieldSubmitted,
      onSaved: widget.onSaved,
      enabled: widget.enabled,
      readOnly: widget.readOnly,
      autofocus: widget.autofocus,
      textInputAction: widget.textInputAction,
      style: widget.style,
      textAlign: widget.textAlign,
      restorationId: widget.restorationId,
    );
  }
}

/// A [TextFormField] for a CNIC that formats as you type
/// (`35202-1234567-1`), shows the number keyboard and validates it.
///
/// [onStateChanged] receives the [CNICInfo] (province and gender) once the
/// CNIC is valid.
///
/// ```dart
/// CnicField(
///   decoration: const InputDecoration(labelText: 'CNIC'),
///   onStateChanged: (state, info) => print('$state ${info?.province}'),
/// )
/// ```
class CnicField extends PakTextFormField<CNICInfo> {
  /// Creates a CNIC field.
  const CnicField({
    super.key,
    super.controller,
    super.initialValue,
    super.focusNode,
    super.decoration,
    super.onStateChanged,
    super.onChanged,
    super.onFieldSubmitted,
    super.onSaved,
    super.validator,
    super.required,
    super.invalidMessage,
    super.requiredMessage,
    super.autovalidateMode,
    super.enabled,
    super.readOnly,
    super.autofocus,
    super.textInputAction,
    super.style,
    super.textAlign,
    super.inputFormatters,
    super.restorationId,
  });

  @override
  String format(String value) => formatCNICInput(value);

  @override
  InputState check(String value) => checkCNICInput(value);

  @override
  CNICInfo? infoFor(String value) => getCNICInfo(value);

  @override
  TextInputFormatter createFormatter() => CnicInputFormatter();

  @override
  TextInputType get keyboardType => TextInputType.number;

  @override
  String get defaultInvalidMessage => PakValidators.defaultCnicMessage;
}

/// A [TextFormField] for a Pakistani mobile number that formats as you type
/// (`0300-1234567` or `+92 300 1234567`), shows the phone keyboard, offers
/// phone number autofill and validates it.
///
/// [onStateChanged] receives the [PhoneAnalysis] (E.164 form and network)
/// once the number is valid.
class PhoneField extends PakTextFormField<PhoneAnalysis> {
  /// Creates a mobile number field.
  const PhoneField({
    super.key,
    super.controller,
    super.initialValue,
    super.focusNode,
    super.decoration,
    super.onStateChanged,
    super.onChanged,
    super.onFieldSubmitted,
    super.onSaved,
    super.validator,
    super.required,
    super.invalidMessage,
    super.requiredMessage,
    super.autovalidateMode,
    super.enabled,
    super.readOnly,
    super.autofocus,
    super.textInputAction,
    super.style,
    super.textAlign,
    super.inputFormatters,
    super.restorationId,
  });

  @override
  String format(String value) => formatPhoneInput(value);

  @override
  InputState check(String value) => checkPhoneInput(value);

  @override
  PhoneAnalysis? infoFor(String value) => analyzePhone(value);

  @override
  TextInputFormatter createFormatter() => PhoneInputFormatter();

  @override
  TextInputType get keyboardType => TextInputType.phone;

  @override
  Iterable<String>? get autofillHints => const [AutofillHints.telephoneNumber];

  @override
  String get defaultInvalidMessage => PakValidators.defaultPhoneMessage;
}

/// A [TextFormField] for a Pakistani IBAN that formats as you type
/// (`PK36 SCBL 0000 0011 2345 6702`), uppercases letters and validates it,
/// including the checksum.
///
/// [onStateChanged] receives the [BankInfo] once the IBAN is valid (`null` if
/// the bank code is not in the dataset).
class IbanField extends PakTextFormField<BankInfo> {
  /// Creates an IBAN field.
  const IbanField({
    super.key,
    super.controller,
    super.initialValue,
    super.focusNode,
    super.decoration,
    super.onStateChanged,
    super.onChanged,
    super.onFieldSubmitted,
    super.onSaved,
    super.validator,
    super.required,
    super.invalidMessage,
    super.requiredMessage,
    super.autovalidateMode,
    super.enabled,
    super.readOnly,
    super.autofocus,
    super.textInputAction,
    super.style,
    super.textAlign,
    super.inputFormatters,
    super.restorationId,
  });

  @override
  String format(String value) => formatIBANInput(value);

  @override
  InputState check(String value) => checkIBANInput(value);

  @override
  BankInfo? infoFor(String value) => getBankInfo(value);

  @override
  TextInputFormatter createFormatter() => IbanInputFormatter();

  @override
  TextInputType get keyboardType => TextInputType.text;

  @override
  TextCapitalization get textCapitalization => TextCapitalization.characters;

  @override
  String get defaultInvalidMessage => PakValidators.defaultIbanMessage;
}
