/// Unicode Normalization Form C (`String.prototype.normalize('NFC')`).
library;

import '../data/unicode.g.dart';

const int _sBase = 0xac00;
const int _lBase = 0x1100;
const int _vBase = 0x1161;
const int _tBase = 0x11a7;
const int _lCount = 19;
const int _vCount = 21;
const int _tCount = 28;
const int _nCount = _vCount * _tCount;
const int _sCount = _lCount * _nCount;

int _rank(int rune) => combiningClassRanks[rune] ?? 0;

void _decompose(int rune, List<int> out) {
  final s = rune - _sBase;
  if (s >= 0 && s < _sCount) {
    out.add(_lBase + s ~/ _nCount);
    out.add(_vBase + (s % _nCount) ~/ _tCount);
    final t = s % _tCount;
    if (t != 0) out.add(_tBase + t);
    return;
  }
  final mapped = canonicalDecompositions[rune];
  if (mapped == null) {
    out.add(rune);
  } else {
    out.addAll(mapped.runes);
  }
}

int? _compose(int first, int second) {
  final l = first - _lBase;
  if (l >= 0 && l < _lCount) {
    final v = second - _vBase;
    if (v >= 0 && v < _vCount) return _sBase + (l * _vCount + v) * _tCount;
    return null;
  }
  final s = first - _sBase;
  if (s >= 0 && s < _sCount && s % _tCount == 0) {
    final t = second - _tBase;
    if (t > 0 && t < _tCount) return first + t;
    return null;
  }
  return canonicalCompositions[first * 0x200000 + second];
}

/// Text made only of code points below U+0300 is always in NFC: they are
/// either unaffected or already precomposed, and none composes with another.
bool _belowCombiningMarks(String text) {
  for (var i = 0; i < text.length; i++) {
    if (text.codeUnitAt(i) >= 0x300) return false;
  }
  return true;
}

/// Returns [text] in Unicode Normalization Form C.
String toNfc(String text) {
  if (_belowCombiningMarks(text)) return text;

  final decomposed = <int>[];
  for (final rune in text.runes) {
    _decompose(rune, decomposed);
  }

  // Canonical ordering: stable sort of each run of non-starters by class.
  for (var i = 0; i < decomposed.length; i++) {
    if (_rank(decomposed[i]) == 0) continue;
    var end = i;
    while (end < decomposed.length && _rank(decomposed[end]) != 0) {
      end++;
    }
    if (end - i > 1) {
      final run = decomposed.sublist(i, end);
      for (var a = 1; a < run.length; a++) {
        final value = run[a];
        final rank = _rank(value);
        var b = a - 1;
        while (b >= 0 && _rank(run[b]) > rank) {
          run[b + 1] = run[b];
          b--;
        }
        run[b + 1] = value;
      }
      decomposed.setRange(i, end, run);
    }
    i = end;
  }

  // Canonical composition.
  final result = <int>[];
  var starterIndex = -1;
  var lastRank = 0;
  for (final rune in decomposed) {
    final rank = _rank(rune);
    if (starterIndex >= 0) {
      final blocked = result.length - 1 != starterIndex &&
          (lastRank == 0 || lastRank >= rank);
      if (!blocked) {
        final composite = _compose(result[starterIndex], rune);
        if (composite != null) {
          result[starterIndex] = composite;
          continue;
        }
      }
    }
    if (rank == 0) starterIndex = result.length;
    lastRank = rank;
    result.add(rune);
  }
  return String.fromCharCodes(result);
}
