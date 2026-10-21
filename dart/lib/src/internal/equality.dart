/// Equality helpers for the immutable result classes.
library;

/// Element-wise list equality.
bool listEquals<T>(List<T>? a, List<T>? b) {
  if (identical(a, b)) return true;
  if (a == null || b == null || a.length != b.length) return false;
  for (var i = 0; i < a.length; i++) {
    if (a[i] != b[i]) return false;
  }
  return true;
}

/// Hash of a list's elements, consistent with [listEquals].
int listHash<T>(List<T>? list) => list == null ? 0 : Object.hashAll(list);
