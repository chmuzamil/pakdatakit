// Checks the Dart port against vectors generated from the TypeScript library
// (test-vectors/*.json at the repository root). Regenerate them with
// `npm run build && node scripts/generate-test-vectors.mjs`.
@TestOn('vm')
library;

import 'dart:convert';
import 'dart:io';

import 'package:test/test.dart';

import 'src/vector_harness.dart';

void main() {
  final dir = Directory('../test-vectors');
  final files = dir.existsSync()
      ? (dir
          .listSync()
          .whereType<File>()
          .where((f) => f.path.endsWith('.json'))
          .toList()
        ..sort((a, b) => a.path.compareTo(b.path)))
      : <File>[];
  registerVectorTests({
    for (final file in files)
      file.uri.pathSegments.last.replaceAll('.json', ''):
          jsonDecode(file.readAsStringSync()) as List<Object?>,
  });
}
