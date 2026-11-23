import manifestData from '../data/manifest.json';

/**
 * Where a dataset comes from and which period it covers: one entry of
 * `data/manifest.json`. See {@link getDataInfo}.
 */
export interface DataInfo {
  /** The dataset's id, e.g. `income-tax-slabs`. */
  id: string;
  /** Its file in `data/`, e.g. `income-tax-slabs.json`. */
  file: string;
  title: string;
  /** The body that publishes the source, e.g. `Federal Board of Revenue (FBR)`. */
  issuer: string;
  /** The official document or page the data is taken from. */
  sourceUrl: string;
  /** Its number or title: an SRO, circular, notification or table. */
  sourceReference: string;
  /** When the source was issued (YYYY, YYYY-MM or YYYY-MM-DD), or `null` if it is undated. */
  sourceDate: string | null;
  /** When the source was last downloaded (YYYY-MM-DD). */
  retrievedAt: string;
  /** When the data was last checked against the source (YYYY-MM-DD). */
  checkedAt: string;
  /** First date the data applies to (YYYY, YYYY-MM or YYYY-MM-DD). */
  effectiveFrom: string;
  /** Last date it applies to, or `null` while it is current. */
  effectiveTo: string | null;
  /** What it covers, e.g. `Tax years 2020-2027`. */
  coverage: string;
  /** Number of records in the file. */
  recordCount: number;
  /** When the source is next expected to change (YYYY-MM-DD). */
  nextExpectedUpdate: string;
  /** What triggers an update, e.g. `After the Finance Act each July`. */
  updateCadence: string;
  notes: string;
}

/**
 * The source of the dated record a result was calculated from: which
 * dataset, the period that record applies to, and the law or notification
 * behind it.
 */
export interface DataSource {
  /** The dataset's id, as in {@link getDataInfo}. */
  id: string;
  /** First date the record applies to (YYYY-MM-DD). */
  effectiveFrom: string;
  /** Last date it applies to, or `null` while it is current. */
  effectiveTo: string | null;
  /** The law, SRO, circular or notification, as written in the source. */
  sourceReference: string;
  /** The official document. */
  sourceUrl: string;
}

const MANIFEST = manifestData as (DataInfo & { series?: unknown })[];

/** A copy of an entry without `series` (the CI check's configuration). */
function copy(entry: DataInfo & { series?: unknown }): DataInfo {
  const info: DataInfo & { series?: unknown } = { ...entry };
  delete info.series;
  return info;
}

/**
 * Where a bundled dataset comes from: the issuer, the official source and
 * its reference and date, when it was checked, the period it covers, its
 * record count and when it is next expected to change.
 *
 * @param id - A dataset id, such as `banks`, `income-tax-slabs` or
 *   `sales-tax-rates` (see {@link listDataInfo})
 * @returns The manifest entry, or `null` for an unknown id. Never throws.
 *
 * @example
 * getDataInfo('income-tax-slabs')?.coverage; // 'Tax years 2020-2027'
 * getDataInfo('income-tax-slabs')?.nextExpectedUpdate; // '2027-07-15'
 */
export function getDataInfo(id: string): DataInfo | null {
  if (typeof id !== 'string') return null;
  const entry = MANIFEST.find((e) => e.id === id);
  return entry ? copy(entry) : null;
}

/**
 * Every bundled dataset's manifest entry, as {@link getDataInfo} returns
 * them, in id order.
 *
 * @example
 * listDataInfo().map((d) => d.id); // ['area-codes', 'banks', …]
 */
export function listDataInfo(): DataInfo[] {
  return MANIFEST.map(copy).sort((a, b) => (a.id < b.id ? -1 : 1));
}
