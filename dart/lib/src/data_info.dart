import 'data/manifest.g.dart';

/// Where a dataset comes from and which period it covers: one entry of
/// `data/manifest.json`. Result of [getDataInfo] and [listDataInfo].
class DataInfo {
  /// Creates a data info value.
  const DataInfo({
    required this.id,
    required this.file,
    required this.title,
    required this.issuer,
    required this.sourceUrl,
    required this.sourceReference,
    required this.sourceDate,
    required this.retrievedAt,
    required this.checkedAt,
    required this.effectiveFrom,
    required this.effectiveTo,
    required this.coverage,
    required this.recordCount,
    required this.nextExpectedUpdate,
    required this.updateCadence,
    required this.notes,
  });

  /// The dataset's id, e.g. `income-tax-slabs`.
  final String id;

  /// Its file in `data/`, e.g. `income-tax-slabs.json`.
  final String file;

  /// What the dataset is, e.g. `Landline area codes`.
  final String title;

  /// The body that publishes the source, e.g.
  /// `Federal Board of Revenue (FBR)`.
  final String issuer;

  /// The official document or page the data is taken from.
  final String sourceUrl;

  /// Its number or title: an SRO, circular, notification or table.
  final String sourceReference;

  /// When the source was issued (`YYYY`, `YYYY-MM` or `YYYY-MM-DD`), or
  /// `null` if it is undated.
  final String? sourceDate;

  /// When the source was last downloaded (`YYYY-MM-DD`).
  final String retrievedAt;

  /// When the data was last checked against the source (`YYYY-MM-DD`).
  final String checkedAt;

  /// First date the data applies to (`YYYY`, `YYYY-MM` or `YYYY-MM-DD`).
  final String effectiveFrom;

  /// Last date it applies to, or `null` while it is current.
  final String? effectiveTo;

  /// What it covers, e.g. `Tax years 2020-2027`.
  final String coverage;

  /// Number of records in the file.
  final int recordCount;

  /// When the source is next expected to change (`YYYY-MM-DD`).
  final String nextExpectedUpdate;

  /// What triggers an update, e.g. `After the Finance Act each July`.
  final String updateCadence;

  /// Anything else worth knowing about the source.
  final String notes;

  /// JSON form, with the same keys as the npm package.
  Map<String, Object?> toJson() => {
        'id': id,
        'file': file,
        'title': title,
        'issuer': issuer,
        'sourceUrl': sourceUrl,
        'sourceReference': sourceReference,
        'sourceDate': sourceDate,
        'retrievedAt': retrievedAt,
        'checkedAt': checkedAt,
        'effectiveFrom': effectiveFrom,
        'effectiveTo': effectiveTo,
        'coverage': coverage,
        'recordCount': recordCount,
        'nextExpectedUpdate': nextExpectedUpdate,
        'updateCadence': updateCadence,
        'notes': notes,
      };

  @override
  bool operator ==(Object other) =>
      other is DataInfo &&
      other.id == id &&
      other.file == file &&
      other.title == title &&
      other.issuer == issuer &&
      other.sourceUrl == sourceUrl &&
      other.sourceReference == sourceReference &&
      other.sourceDate == sourceDate &&
      other.retrievedAt == retrievedAt &&
      other.checkedAt == checkedAt &&
      other.effectiveFrom == effectiveFrom &&
      other.effectiveTo == effectiveTo &&
      other.coverage == coverage &&
      other.recordCount == recordCount &&
      other.nextExpectedUpdate == nextExpectedUpdate &&
      other.updateCadence == updateCadence &&
      other.notes == notes;

  @override
  int get hashCode => Object.hash(
        id,
        file,
        title,
        issuer,
        sourceUrl,
        sourceReference,
        sourceDate,
        retrievedAt,
        checkedAt,
        effectiveFrom,
        effectiveTo,
        coverage,
        recordCount,
        nextExpectedUpdate,
        updateCadence,
        notes,
      );

  @override
  String toString() => 'DataInfo${toJson()}';
}

/// The source of the dated record a result was calculated from: which
/// dataset, the period that record applies to, and the law or notification
/// behind it.
class DataSource {
  /// Creates a data source value.
  const DataSource({
    required this.id,
    required this.effectiveFrom,
    required this.effectiveTo,
    required this.sourceReference,
    required this.sourceUrl,
  });

  /// The dataset's id, as in [getDataInfo].
  final String id;

  /// First date the record applies to (`YYYY-MM-DD`).
  final String effectiveFrom;

  /// Last date it applies to, or `null` while it is current.
  final String? effectiveTo;

  /// The law, SRO, circular or notification, as written in the source.
  final String sourceReference;

  /// The official document.
  final String sourceUrl;

  /// JSON form, with the same keys as the npm package.
  Map<String, Object?> toJson() => {
        'id': id,
        'effectiveFrom': effectiveFrom,
        'effectiveTo': effectiveTo,
        'sourceReference': sourceReference,
        'sourceUrl': sourceUrl,
      };

  @override
  bool operator ==(Object other) =>
      other is DataSource &&
      other.id == id &&
      other.effectiveFrom == effectiveFrom &&
      other.effectiveTo == effectiveTo &&
      other.sourceReference == sourceReference &&
      other.sourceUrl == sourceUrl;

  @override
  int get hashCode =>
      Object.hash(id, effectiveFrom, effectiveTo, sourceReference, sourceUrl);

  @override
  String toString() => 'DataSource${toJson()}';
}

// Only getDataInfo and listDataInfo reference the manifest, so builds that
// do not call them leave it out. The `series` key (the CI check's
// configuration) is not part of an entry.
final List<DataInfo> _manifest = List.unmodifiable([
  for (final e in manifestJson.cast<Map<String, Object?>>())
    DataInfo(
      id: e['id']! as String,
      file: e['file']! as String,
      title: e['title']! as String,
      issuer: e['issuer']! as String,
      sourceUrl: e['sourceUrl']! as String,
      sourceReference: e['sourceReference']! as String,
      sourceDate: e['sourceDate'] as String?,
      retrievedAt: e['retrievedAt']! as String,
      checkedAt: e['checkedAt']! as String,
      effectiveFrom: e['effectiveFrom']! as String,
      effectiveTo: e['effectiveTo'] as String?,
      coverage: e['coverage']! as String,
      recordCount: e['recordCount']! as int,
      nextExpectedUpdate: e['nextExpectedUpdate']! as String,
      updateCadence: e['updateCadence']! as String,
      notes: e['notes']! as String,
    ),
]);

/// Where a bundled dataset comes from: the issuer, the official source and
/// its reference and date, when it was checked, the period it covers, its
/// record count and when it is next expected to change.
///
/// [id] is a dataset id, such as `banks`, `income-tax-slabs` or
/// `sales-tax-rates` (see [listDataInfo]); it is matched exactly.
///
/// Returns the manifest entry, or `null` for an unknown id. Never throws.
///
/// ```dart
/// getDataInfo('income-tax-slabs')?.coverage; // 'Tax years 2020-2027'
/// getDataInfo('income-tax-slabs')?.nextExpectedUpdate; // '2027-07-15'
/// ```
DataInfo? getDataInfo(String id) {
  for (final entry in _manifest) {
    if (entry.id == id) return entry;
  }
  return null;
}

/// Every bundled dataset's manifest entry, as [getDataInfo] returns them,
/// in id order. Never throws.
///
/// ```dart
/// listDataInfo().map((d) => d.id); // (area-codes, banks, ...)
/// ```
List<DataInfo> listDataInfo() =>
    [..._manifest]..sort((a, b) => a.id.compareTo(b.id));
