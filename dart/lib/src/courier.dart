import 'internal/data.dart';
import 'internal/js.dart';
import 'internal/normalize.dart';

/// Couriers that [mapCourierStatus] knows about.
enum Courier {
  /// TCS.
  tcs('TCS'),

  /// Leopards Courier (LCS).
  leopards('Leopards'),

  /// PostEx.
  postEx('PostEx'),

  /// M&P (Muller & Phipps).
  mAndP('M&P'),

  /// Trax.
  trax('Trax'),

  /// BlueEx.
  blueEx('BlueEx');

  const Courier(this.value);

  /// The value used by the npm package, e.g. `"PostEx"`.
  final String value;

  /// Returns [value].
  String toJson() => value;
}

/// A courier's status in one vocabulary, from order to delivery or return.
///
/// Experimental: the values may change in a minor release while more
/// couriers' status lists are added.
enum CourierStatus {
  /// Ordered, not yet booked with the courier.
  pending('pending'),

  /// Booked with the courier.
  booked('booked'),

  /// Collected by the courier.
  pickedUp('picked-up'),

  /// On its way.
  inTransit('in-transit'),

  /// Out for delivery.
  outForDelivery('out-for-delivery'),

  /// A delivery attempt failed.
  attempted('attempted'),

  /// Delivery is under review.
  underReview('under-review'),

  /// Delivered.
  delivered('delivered'),

  /// On its way back to the sender.
  returning('returning'),

  /// Returned to the sender.
  returned('returned'),

  /// Cancelled.
  cancelled('cancelled');

  const CourierStatus(this.value);

  /// The value used by the npm package, e.g. `"out-for-delivery"`.
  final String value;

  /// Returns [value].
  String toJson() => value;
}

/// Status values each courier documents publicly, by normalised key (lower
/// case, single spaces, straight apostrophes). Only documented values are
/// listed (see DATA.md); anything else maps to `null`.
///
/// - PostEx: "Merchant API Integration Guide" M- v4.1.9, order status IDs
///   (§3.15) and tracking history codes (§3.8).
/// - Leopards: "Returned to Shipper", from its e-commerce FAQ.
/// - TCS, M&P, Trax and BlueEx publish no status list outside their merchant
///   portals, so nothing is mapped for them.
const Map<Courier, Map<String, CourierStatus>> _statuses = {
  Courier.postEx: {
    // Order status IDs and names (§3.15).
    '1': CourierStatus.pending,
    'unbooked': CourierStatus.pending,
    '2': CourierStatus.booked,
    'booked': CourierStatus.booked,
    '3': CourierStatus.inTransit,
    'postex warehouse': CourierStatus.inTransit,
    '4': CourierStatus.outForDelivery,
    'out for delivery': CourierStatus.outForDelivery,
    '5': CourierStatus.delivered,
    'delivered': CourierStatus.delivered,
    '6': CourierStatus.returned,
    'returned': CourierStatus.returned,
    '7': CourierStatus.cancelled,
    'un-assigned by me': CourierStatus.cancelled,
    '8': CourierStatus.cancelled,
    'expired': CourierStatus.cancelled,
    '9': CourierStatus.underReview,
    'delivery under review': CourierStatus.underReview,
    '15': CourierStatus.pickedUp,
    'picked by postex': CourierStatus.pickedUp,
    '16': CourierStatus.returning,
    'out for return': CourierStatus.returning,
    '17': CourierStatus.attempted,
    'attempted': CourierStatus.attempted,
    '18': CourierStatus.inTransit,
    'en-route to postex warehouse': CourierStatus.inTransit,
    // Tracking history codes and messages (§3.8).
    '0001': CourierStatus.booked,
    "at merchant's warehouse": CourierStatus.booked,
    '0002': CourierStatus.returned,
    '0003': CourierStatus.inTransit,
    'at postex warehouse': CourierStatus.inTransit,
    '0004': CourierStatus.inTransit,
    'package on root': CourierStatus.inTransit,
    'package on route': CourierStatus.inTransit,
    '0005': CourierStatus.delivered,
    '0006': CourierStatus.returned,
    '0007': CourierStatus.returned,
    '0008': CourierStatus.underReview,
    '0013': CourierStatus.attempted,
  },
  Courier.leopards: {
    'returned to shipper': CourierStatus.returned,
  },
  Courier.tcs: {},
  Courier.mAndP: {},
  Courier.trax: {},
  Courier.blueEx: {},
};

/// Accepted spellings of each courier's name.
const Map<String, Courier> _courierNames = {
  'tcs': Courier.tcs,
  'leopards': Courier.leopards,
  'leopards courier': Courier.leopards,
  'lcs': Courier.leopards,
  'postex': Courier.postEx,
  'm&p': Courier.mAndP,
  'mnp': Courier.mAndP,
  'm and p': Courier.mAndP,
  'muller & phipps': Courier.mAndP,
  'muller and phipps': Courier.mAndP,
  'trax': Courier.trax,
  'blueex': Courier.blueEx,
  'blue ex': Courier.blueEx,
  'blue-ex': Courier.blueEx,
};

final RegExp _curlyApostrophe = RegExp('[‘’`]');
final RegExp _attemptMade = RegExp(r'^attempt made\b');

String _statusKey(String text) =>
    normalizeKey(text.replaceAll(_curlyApostrophe, "'"));

/// Maps a courier's own status (its name, numeric ID or code, as the courier
/// documents it) to a [CourierStatus].
///
/// [courier] is `TCS`, `Leopards`, `PostEx`, `M&P`, `Trax` or `BlueEx`
/// (case-insensitive; `LCS`, `MnP` and `Blue Ex` are accepted), e.g.
/// [Courier.postEx]`.value`. [raw] is the status as the courier returned it:
/// a `String`, or a non-negative whole number (`int`, or a `double` such as
/// `5.0`), which matches the same status as its decimal string (`5` and
/// `'5'`, but not `'0005'`). Anything else gives `null`.
///
/// Matching ignores case and extra spaces. PostEx's `Attempt Made: <reason>`
/// history messages map to [CourierStatus.attempted].
///
/// Only statuses the courier documents publicly are mapped: PostEx's API
/// guide and one Leopards status. TCS, M&P, Trax and BlueEx publish no list,
/// so they always return `null`, as does any status not in the list. No API
/// is called. Never throws.
///
/// Experimental: only PostEx and one Leopards status are mapped so far. The
/// mapping and the [CourierStatus] values may change in a minor release as
/// other couriers' lists are added.
CourierStatus? mapCourierStatus(String courier, Object? raw) {
  final name = _courierNames[_statusKey(courier)];
  if (name == null) return null;
  final String key;
  if (raw is num) {
    if (!isInteger(raw) || raw < 0) return null;
    key = jsNumberToString(raw);
  } else if (raw is String) {
    key = _statusKey(raw);
  } else {
    return null;
  }
  final status = _statuses[name]![key];
  if (status != null) return status;
  if (name == Courier.postEx && _attemptMade.hasMatch(key)) {
    return CourierStatus.attempted;
  }
  return null;
}

/// Short forms and old names of cities, as people and courier forms write
/// them: airport and dialling-style codes, Roman Urdu spellings, the former
/// name Lyallpur, and Urdu script.
const Map<String, String> _cityAliases = {
  'lhr': 'Lahore',
  'lhe': 'Lahore',
  'lahor': 'Lahore',
  'لاہور': 'Lahore',
  'khi': 'Karachi',
  'krachi': 'Karachi',
  'کراچی': 'Karachi',
  'pindi': 'Rawalpindi',
  'rwp': 'Rawalpindi',
  'rawal pindi': 'Rawalpindi',
  'راولپنڈی': 'Rawalpindi',
  'isb': 'Islamabad',
  'isl': 'Islamabad',
  'اسلام آباد': 'Islamabad',
  'lyallpur': 'Faisalabad',
  'lyp': 'Faisalabad',
  'fsd': 'Faisalabad',
  'faisal abad': 'Faisalabad',
  'فیصل آباد': 'Faisalabad',
  'mux': 'Multan',
  'mtn': 'Multan',
  'ملتان': 'Multan',
  'pew': 'Peshawar',
  'psh': 'Peshawar',
  'پشاور': 'Peshawar',
  'uet': 'Quetta',
  'qta': 'Quetta',
  'کوئٹہ': 'Quetta',
  'hyd': 'Hyderabad',
  'حیدرآباد': 'Hyderabad',
  'حیدر آباد': 'Hyderabad',
  'skt': 'Sialkot',
  'سیالکوٹ': 'Sialkot',
  'grw': 'Gujranwala',
  'گوجرانوالہ': 'Gujranwala',
  'dgk': 'Dera Ghazi Khan',
  'dg khan': 'Dera Ghazi Khan',
  'd g khan': 'Dera Ghazi Khan',
  'dik': 'Dera Ismail Khan',
  'di khan': 'Dera Ismail Khan',
  'd i khan': 'Dera Ismail Khan',
  'ryk': 'Rahim Yar Khan',
  'bwp': 'Bahawalpur',
  'sgd': 'Sargodha',
  'mzd': 'Muzaffarabad',
};

final Map<String, String> _cityByKey = {
  for (final e in cities) normalizeKey(e.city): e.city,
};

final RegExp _dotOrComma = RegExp('[.,]');

/// Lower case, with dots and commas removed and spaces collapsed.
String _cityKey(String text) => normalizeKey(text.replaceAll(_dotOrComma, ' '));

/// Maps the way a customer or a courier writes a city to the city's name in
/// pakdatakit's city list, so orders can be matched against a courier's
/// service list.
///
/// Accepts the exact name in any case, short forms (`LHR`, `Khi`, `Pindi`,
/// `Isb`, `FSD`), the old name Lyallpur, a trailing "city", and the main
/// cities in Urdu script.
///
/// ```dart
/// normalizeCityForCourier('LHR');          // 'Lahore'
/// normalizeCityForCourier('lyallpur');     // 'Faisalabad'
/// normalizeCityForCourier('Karachi City'); // 'Karachi'
/// normalizeCityForCourier('Atlantis');     // null
/// ```
///
/// Returns a city from the city list, or `null`. Never throws.
String? normalizeCityForCourier(String input) {
  var key = _cityKey(input);
  if (key.isEmpty) return null;
  for (var pass = 0; pass < 2; pass++) {
    final city = _cityByKey[key] ?? _cityAliases[key];
    if (city != null) return city;
    if (!key.endsWith(' city')) break;
    key = jsTrim(key.substring(0, key.length - ' city'.length));
  }
  return null;
}
