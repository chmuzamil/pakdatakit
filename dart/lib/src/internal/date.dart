/// Calendar dates shared by the sales tax and income tax modules, the same
/// steps as the npm package's `internal/date.ts`.
library;

import 'js.dart';

String _pad(int n, [int width = 2]) => n.toString().padLeft(width, '0');

final RegExp _isoPattern = RegExp(r'^(\d{4})-(\d{2})-(\d{2})$');

/// `YYYY-MM-DD` for a valid calendar date (a `YYYY-MM-DD` [String] or a
/// [DateTime], read as its local calendar date), otherwise `null`.
String? isoDate(Object? input) {
  if (input is DateTime) {
    if (input.year < 0 || input.year > 9999) return null;
    return '${_pad(input.year, 4)}-${_pad(input.month)}-${_pad(input.day)}';
  }
  if (input is! String) return null;
  final match = _isoPattern.firstMatch(jsTrim(input));
  if (match == null) return null;
  final y = int.parse(match.group(1)!);
  final m = int.parse(match.group(2)!);
  final d = int.parse(match.group(3)!);
  final leap = (y % 4 == 0 && y % 100 != 0) || y % 400 == 0;
  final days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (m < 1 || m > 12 || d < 1 || d > days[m - 1]) return null;
  return '${match.group(1)}-${match.group(2)}-${match.group(3)}';
}
