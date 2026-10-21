import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:pakdatakit/pakdatakit.dart' show createRaastP2PQr;
import 'package:pakdatakit_flutter/pakdatakit_flutter.dart';
import 'package:qr/qr.dart';

const iban = 'PK36SCBL0000001123456702';

Widget wrap(Widget child) => Directionality(
      textDirection: TextDirection.ltr,
      child: Center(child: child),
    );

/// Paints the [RaastQr] in the tree at [size] pixels and returns, for each
/// module, whether its centre pixel is dark.
Future<List<List<bool>>> paintedModules(
  WidgetTester tester, {
  required int moduleCount,
  required int quietZone,
  required int pixelsPerModule,
}) async {
  final paint = tester.widget<CustomPaint>(
    find.descendant(
      of: find.byType(RaastQr),
      matching: find.byType(CustomPaint),
    ),
  );
  final side = (moduleCount + 2 * quietZone) * pixelsPerModule;
  final recorder = ui.PictureRecorder();
  paint.painter!.paint(
    Canvas(recorder),
    Size.square(side.toDouble()),
  );
  final picture = recorder.endRecording();
  final bytes = (await tester.runAsync(() async {
    final image = await picture.toImage(side, side);
    final data = await image.toByteData();
    image.dispose();
    return data;
  }))!;
  picture.dispose();

  return [
    for (var row = 0; row < moduleCount; row++)
      [
        for (var col = 0; col < moduleCount; col++)
          () {
            final x =
                (quietZone + col) * pixelsPerModule + pixelsPerModule ~/ 2;
            final y =
                (quietZone + row) * pixelsPerModule + pixelsPerModule ~/ 2;
            // RGBA; dark modules are black on white.
            return bytes.getUint8((y * side + x) * 4) < 128;
          }(),
      ],
  ];
}

List<List<bool>> expectedModules(String payload, int level) {
  final image = QrImage(
    QrCode.fromData(data: payload, errorCorrectLevel: level),
  );
  return [
    for (var row = 0; row < image.moduleCount; row++)
      [
        for (var col = 0; col < image.moduleCount; col++)
          image.isDark(row, col),
      ],
  ];
}

void main() {
  testWidgets('reports the createRaastP2PQr payload', (tester) async {
    String? payload;
    await tester.pumpWidget(
      wrap(RaastQr(iban: iban, onPayload: (p) => payload = p)),
    );
    await tester.pump();
    expect(payload, createRaastP2PQr(iban: iban));
  });

  testWidgets('passes amount, expiry and particulars through', (tester) async {
    final now = DateTime(2026, 10, 21, 10, 30);
    final payloads = <String>[];
    await tester.pumpWidget(
      wrap(
        RaastQr(
          iban: 'PK36 SCBL 0000 0011 2345 6702',
          amount: 1500,
          expiresIn: '1d',
          particulars: 'Invoice 42',
          now: now,
          onPayload: payloads.add,
        ),
      ),
    );
    await tester.pump();
    expect(payloads, [
      createRaastP2PQr(
        iban: iban,
        amount: 1500,
        expiresIn: '1d',
        particulars: 'Invoice 42',
        now: now,
      ),
    ]);

    final expiresAt = DateTime(2026, 12, 31, 23, 59);
    await tester.pumpWidget(
      wrap(
        RaastQr(
          iban: iban,
          amount: 250.5,
          expiresAt: expiresAt,
          onPayload: payloads.add,
        ),
      ),
    );
    await tester.pump();
    expect(payloads, hasLength(2));
    expect(
      payloads.last,
      createRaastP2PQr(iban: iban, amount: 250.5, expiresAt: expiresAt),
    );

    // Same parameters: no new payload.
    await tester.pumpWidget(
      wrap(
        RaastQr(
          iban: iban,
          amount: 250.5,
          expiresAt: expiresAt,
          size: 300,
          onPayload: payloads.add,
        ),
      ),
    );
    await tester.pump();
    expect(payloads, hasLength(2));
  });

  for (final level in RaastQrErrorCorrection.values) {
    testWidgets('paints the QR matrix of the payload (${level.name})',
        (tester) async {
      String? payload;
      await tester.pumpWidget(
        wrap(
          RaastQr(
            iban: iban,
            errorCorrectionLevel: level,
            onPayload: (p) => payload = p,
          ),
        ),
      );
      await tester.pump();
      final expected = expectedModules(payload!, level.level);
      final painted = await paintedModules(
        tester,
        moduleCount: expected.length,
        quietZone: 4,
        pixelsPerModule: 4,
      );
      expect(painted, expected);
    });
  }

  testWidgets('has the requested size and semantics label', (tester) async {
    final handle = tester.ensureSemantics();
    await tester.pumpWidget(
      wrap(const RaastQr(iban: iban, size: 180, semanticLabel: 'Pay me')),
    );
    expect(tester.getSize(find.byType(RaastQr)), const Size(180, 180));
    expect(find.bySemanticsLabel('Pay me'), findsOneWidget);
    handle.dispose();
  });

  testWidgets('uses errorBuilder for an invalid IBAN', (tester) async {
    Object? error;
    var called = false;
    await tester.pumpWidget(
      wrap(
        RaastQr(
          iban: 'PK00SCBL0000001123456702',
          onPayload: (_) => called = true,
          errorBuilder: (context, e) {
            error = e;
            return const Text('Invalid IBAN');
          },
        ),
      ),
    );
    await tester.pump();
    expect(find.text('Invalid IBAN'), findsOneWidget);
    expect(error, isA<ArgumentError>());
    expect(called, isFalse);
    expect(
      find.descendant(
        of: find.byType(RaastQr),
        matching: find.byType(CustomPaint),
      ),
      findsNothing,
    );
  });

  testWidgets('shows an empty box by default when the payload fails',
      (tester) async {
    await tester.pumpWidget(
      wrap(const RaastQr(iban: iban, amount: 100, size: 120)),
    );
    // An amount without an expiry is rejected by createRaastP2PQr.
    expect(tester.getSize(find.byType(RaastQr)), const Size(120, 120));
    expect(
      find.descendant(
        of: find.byType(RaastQr),
        matching: find.byType(CustomPaint),
      ),
      findsNothing,
    );
  });
}
