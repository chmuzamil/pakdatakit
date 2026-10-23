import 'package:flutter/widgets.dart';
import 'package:pakdatakit/pakdatakit.dart';
import 'package:qr/qr.dart';

/// QR error correction level: how much of the code can be damaged or covered
/// and still scan. Higher levels make denser codes.
enum RaastQrErrorCorrection {
  /// About 7% can be restored.
  low(QrErrorCorrectLevel.L),

  /// About 15% can be restored.
  medium(QrErrorCorrectLevel.M),

  /// About 25% can be restored.
  quartile(QrErrorCorrectLevel.Q),

  /// About 30% can be restored.
  high(QrErrorCorrectLevel.H);

  const RaastQrErrorCorrection(this.level);

  /// The level's value in `package:qr`.
  final int level;
}

/// Builds the widget shown when the QR payload cannot be created, e.g.
/// because the IBAN is invalid. [error] is the `ArgumentError` thrown by
/// `createRaastP2PQr`.
typedef RaastQrErrorBuilder = Widget Function(
  BuildContext context,
  Object error,
);

/// Shows a Raast person-to-person payment QR code for an IBAN, which banking
/// apps such as Easypaisa and JazzCash can scan.
///
/// The payload is exactly what `createRaastP2PQr` from `package:pakdatakit`
/// returns, and the code is painted with a [CustomPaint], so no images or
/// platform code are involved.
///
/// ```dart
/// RaastQr(iban: 'PK36SCBL0000001123456702', size: 220)
/// RaastQr(
///   iban: 'PK36SCBL0000001123456702',
///   amount: 1500,
///   expiresIn: '1d',
///   particulars: 'Invoice 42',
/// )
/// ```
class RaastQr extends StatefulWidget {
  /// Creates a Raast QR code.
  const RaastQr({
    super.key,
    required this.iban,
    this.amount,
    this.expiresIn,
    this.expiresAt,
    this.particulars,
    this.bankName,
    this.now,
    this.size = 200,
    this.color = const Color(0xFF000000),
    this.backgroundColor = const Color(0xFFFFFFFF),
    this.quietZone = 4,
    this.errorCorrectionLevel = RaastQrErrorCorrection.medium,
    this.semanticLabel = 'Raast payment QR code',
    this.errorBuilder,
    this.onPayload,
  }) : assert(quietZone >= 0, 'quietZone must not be negative');

  /// Payee's Pakistani IBAN, with or without spaces.
  final String iban;

  /// Amount in PKR. A QR with an amount needs [expiresIn] or [expiresAt].
  final num? amount;

  /// How long a QR with an amount works: a [Duration], milliseconds, or a
  /// string such as `'30m'`, `'12h'` or `'7d'`. Counted from [now].
  final Object? expiresIn;

  /// When a QR with an amount stops working.
  final DateTime? expiresAt;

  /// Payment description (up to 30 characters).
  final String? particulars;

  /// Payee's bank name (up to 25 characters).
  final String? bankName;

  /// The time [expiresIn] counts from. Defaults to the time the payload is
  /// created. The payload is created again only when a parameter changes.
  final DateTime? now;

  /// Width and height, including the [quietZone].
  final double size;

  /// Colour of the dark modules.
  final Color color;

  /// Background colour, including the quiet zone.
  final Color backgroundColor;

  /// Empty border around the code, in modules. Scanners need 4.
  final int quietZone;

  /// Error correction level. Defaults to [RaastQrErrorCorrection.medium].
  final RaastQrErrorCorrection errorCorrectionLevel;

  /// Label read by screen readers.
  final String semanticLabel;

  /// Shown instead of the code when the payload cannot be created (invalid
  /// IBAN, amount without expiry, text too long …). Defaults to an empty box
  /// of [size].
  final RaastQrErrorBuilder? errorBuilder;

  /// Called with the payload whenever it is created or changes.
  final ValueChanged<String>? onPayload;

  @override
  State<RaastQr> createState() => _RaastQrState();
}

class _RaastQrState extends State<RaastQr> {
  String? _payload;
  Object? _error;
  QrImage? _image;

  @override
  void initState() {
    super.initState();
    _update();
  }

  @override
  void didUpdateWidget(RaastQr oldWidget) {
    super.didUpdateWidget(oldWidget);
    final payloadChanged = oldWidget.iban != widget.iban ||
        oldWidget.amount != widget.amount ||
        oldWidget.expiresIn != widget.expiresIn ||
        oldWidget.expiresAt != widget.expiresAt ||
        oldWidget.particulars != widget.particulars ||
        oldWidget.bankName != widget.bankName ||
        oldWidget.now != widget.now;
    if (payloadChanged ||
        oldWidget.errorCorrectionLevel != widget.errorCorrectionLevel) {
      _update(notify: payloadChanged);
    }
  }

  void _update({bool notify = true}) {
    final previous = _payload;
    try {
      final payload = createRaastP2PQr(
        iban: widget.iban,
        amount: widget.amount,
        expiresIn: widget.expiresIn,
        expiresAt: widget.expiresAt,
        particulars: widget.particulars,
        bankName: widget.bankName,
        now: widget.now,
      );
      _payload = payload;
      _error = null;
      _image = QrImage(
        QrCode.fromData(
          data: payload,
          errorCorrectLevel: widget.errorCorrectionLevel.level,
        ),
      );
    } on ArgumentError catch (error) {
      _payload = null;
      _error = error;
      _image = null;
    }
    final payload = _payload;
    if (notify && payload != null && payload != previous) {
      final callback = widget.onPayload;
      if (callback != null) {
        // Not during build: the callback may call setState.
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted && _payload == payload) callback(payload);
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final image = _image;
    if (image == null) {
      return widget.errorBuilder?.call(context, _error!) ??
          SizedBox.square(dimension: widget.size);
    }
    return Semantics(
      label: widget.semanticLabel,
      image: true,
      child: CustomPaint(
        size: Size.square(widget.size),
        painter: RaastQrPainter(
          image: image,
          color: widget.color,
          backgroundColor: widget.backgroundColor,
          quietZone: widget.quietZone,
        ),
      ),
    );
  }
}

/// Paints a QR code module matrix for [RaastQr].
class RaastQrPainter extends CustomPainter {
  /// Creates a painter for [image].
  RaastQrPainter({
    required this.image,
    required this.color,
    required this.backgroundColor,
    required this.quietZone,
  });

  /// The QR code to paint.
  final QrImage image;

  /// Colour of the dark modules.
  final Color color;

  /// Background colour.
  final Color backgroundColor;

  /// Empty border, in modules.
  final int quietZone;

  @override
  void paint(Canvas canvas, Size size) {
    final count = image.moduleCount;
    final side = size.shortestSide;
    final module = side / (count + 2 * quietZone);
    canvas.drawRect(Offset.zero & size, Paint()..color = backgroundColor);

    // One rectangle per horizontal run of dark modules, so adjacent modules
    // join without anti-aliasing seams.
    final path = Path();
    for (var row = 0; row < count; row++) {
      var col = 0;
      while (col < count) {
        if (!image.isDark(row, col)) {
          col++;
          continue;
        }
        final start = col;
        while (col < count && image.isDark(row, col)) {
          col++;
        }
        path.addRect(
          Rect.fromLTRB(
            (quietZone + start) * module,
            (quietZone + row) * module,
            (quietZone + col) * module,
            (quietZone + row + 1) * module,
          ),
        );
      }
    }
    canvas.drawPath(path, Paint()..color = color);
  }

  @override
  bool shouldRepaint(RaastQrPainter oldDelegate) =>
      oldDelegate.image != image ||
      oldDelegate.color != color ||
      oldDelegate.backgroundColor != backgroundColor ||
      oldDelegate.quietZone != quietZone;
}
