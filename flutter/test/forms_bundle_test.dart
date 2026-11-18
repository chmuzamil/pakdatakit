@TestOn('vm')
library;

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

/// A post office name found only in the post office directory.
const String postOfficeMarker = "'Moil'";

/// The Dart SDK that came with Flutter, or `dart` on the PATH.
String findDart() {
  final exe = Platform.isWindows ? 'dart.exe' : 'dart';
  final sep = Platform.pathSeparator;
  var dir = File(Platform.resolvedExecutable).parent;
  while (dir.parent.path != dir.path) {
    final candidate = File('${dir.path}${sep}dart-sdk${sep}bin$sep$exe');
    if (candidate.existsSync()) return candidate.path;
    dir = dir.parent;
  }
  return 'dart';
}

int gzipSize(File file) => gzip.encode(file.readAsBytesSync()).length;

void main() {
  // Static check: only hints.dart may use the quality and postal libraries,
  // and only through deferred imports.
  test('only hints.dart references the quality and postal libraries', () {
    final sources = Directory('lib')
        .listSync(recursive: true)
        .whereType<File>()
        .where((f) => f.path.endsWith('.dart'));
    final import = RegExp(
      r'''import\s+'package:pakdatakit/(quality|postal)\.dart'(.*);''',
    );
    final apis = RegExp(
      r'\b(scoreAddress|phoneRiskSignals|getCityByPostalCode|getPostOffice|'
      r'searchPostOffices|getPostalCode)\b',
    );
    var deferred = 0;
    for (final file in sources) {
      final text = file.readAsStringSync();
      final isHints =
          file.path.replaceAll(r'\', '/').endsWith('forms/hints.dart');
      for (final match in import.allMatches(text)) {
        expect(isHints, isTrue, reason: '${file.path} imports ${match[1]}');
        expect(match[2], contains('deferred as'), reason: file.path);
        deferred++;
      }
      if (!isHints) {
        final code = text
            .split('\n')
            .where((line) => !line.trimLeft().startsWith('//'))
            .join('\n');
        expect(apis.hasMatch(code), isFalse, reason: file.path);
      }
    }
    expect(deferred, 2);
  });

  test(
    'dart2js keeps the post office directory out of the main bundle',
    () async {
      final out = Directory.systemTemp.createTempSync('pakdatakit_bundle_');
      addTearDown(() => out.deleteSync(recursive: true));
      final main = File('${out.path}${Platform.pathSeparator}main.js');

      final result = await Process.run(
        findDart(),
        [
          'compile',
          'js',
          '-O2',
          '--no-source-maps',
          '-o',
          main.path,
          'test/bundle/hints_entry.dart',
        ],
        runInShell: Platform.isWindows,
      );
      expect(result.exitCode, 0, reason: '${result.stdout}\n${result.stderr}');

      final parts = out
          .listSync()
          .whereType<File>()
          .where((f) => f.path.endsWith('.part.js'))
          .toList();
      expect(parts, isNotEmpty, reason: 'no deferred part was emitted');

      final mainJs = main.readAsStringSync();
      // dart2js emits Dart strings with either quote.
      bool hasMarker(String js) =>
          js.contains(postOfficeMarker) || js.contains('"Moil"');
      expect(hasMarker(mainJs), isFalse);
      // The cascade data is in the main bundle.
      expect(mainJs, contains('Khyber Pakhtunkhwa'));

      final lazy = parts.where((f) => hasMarker(f.readAsStringSync())).toList();
      expect(lazy, hasLength(1), reason: 'the post office data is lazy');

      // ignore: avoid_print
      print('main.js: ${main.lengthSync()} bytes, '
          '${gzipSize(main)} gzipped; deferred hints part: '
          '${lazy.single.lengthSync()} bytes, '
          '${gzipSize(lazy.single)} gzipped');
    },
    timeout: const Timeout(Duration(minutes: 5)),
  );
}
