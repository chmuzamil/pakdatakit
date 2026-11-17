"""FBR Digital Invoicing (DI): types for the invoice JSON that is posted to
PRAL's gateway, a builder that works out the sales tax, and an offline
validator for the rules that can be checked without FBR's reference APIs.

Built from PRAL's "Technical Specification for DI API", version 1.12 (last
updated 24 July 2025), and PRAL's "Error Message Guide (Sales)"; see DATA.md.
Nothing here talks to FBR: there is no HTTP client and no token handling.
Values that only FBR's reference APIs can confirm (provinces, HS codes, units,
rates, sale types, SRO numbers) are checked for presence, not against FBR's
lists.

The invoice is a plain ``dict`` with the camelCase keys FBR expects, so it can
be sent with ``json.dumps`` as is. The ``TypedDict`` classes below describe it.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any, Dict, List, Literal, Optional, TypedDict

from ._internal.js import WS, is_finite, is_number, number_to_string, to_fixed, trim
from ._internal.money import divide_half_up, from_paisa, to_units
from ._internal.normalize import normalize_key
from .salestax import calculate_sales_tax

__all__ = [
    "FBR_DI_SPEC_VERSION",
    "FbrInvoiceType",
    "FbrRegistrationType",
    "FbrInvoiceItem",
    "FbrInvoice",
    "FbrInvoiceItemInput",
    "FbrInvoiceInput",
    "FbrInvoiceTotals",
    "FbrInvoiceBuild",
    "FbrInvoiceError",
    "FbrInvoiceValidation",
    "expected_sales_tax",
    "build_fbr_invoice",
    "validate_fbr_invoice",
]

#: Version of PRAL's technical specification this module follows.
FBR_DI_SPEC_VERSION = "1.12"

#: ``invoiceType`` values in the specification.
FbrInvoiceType = Literal["Sale Invoice", "Debit Note"]

#: ``buyerRegistrationType`` values in the specification.
FbrRegistrationType = Literal["Registered", "Unregistered"]


class _FbrInvoiceItemOptional(TypedDict, total=False):
    extraTax: float
    furtherTax: float
    #: Required when the rate is not 18% (error 0077).
    sroScheduleNo: str
    fedPayable: float
    discount: float
    #: Required when ``sroScheduleNo`` is given (error 0078).
    sroItemSerialNo: str


class FbrInvoiceItemInput(_FbrInvoiceItemOptional, total=False):
    """An item for :func:`build_fbr_invoice`: the tax and defaults may be left out."""

    hsCode: str
    productDescription: str
    rate: str
    uoM: str
    quantity: float
    valueSalesExcludingST: float
    saleType: str
    salesTaxApplicable: float
    salesTaxWithheldAtSource: float
    totalValues: float
    fixedNotifiedValueOrRetailPrice: float


class FbrInvoiceItem(_FbrInvoiceItemOptional):
    """One line of an invoice (spec 4.1, ``items``). Amounts are in rupees."""

    #: HS code, e.g. ``0101.2100``.
    hsCode: str
    productDescription: str
    #: Rate as FBR's SaleTypeToRate API describes it: ``18%``, ``Rs.3``, ``Exempt`` ...
    rate: str
    #: Unit of measure as in FBR's UoM API, e.g. ``Numbers, pieces, units``.
    uoM: str
    #: Up to 4 decimals.
    quantity: float
    #: "Total Sales Value (Including Tax)". FBR's own samples send 0.
    totalValues: float
    valueSalesExcludingST: float
    #: Notified or retail price; required for Third Schedule goods.
    fixedNotifiedValueOrRetailPrice: float
    salesTaxApplicable: float
    salesTaxWithheldAtSource: float
    #: Sale type as in FBR's transaction type API, e.g. ``Goods at standard rate (default)``.
    saleType: str


class _FbrInvoiceOptional(TypedDict, total=False):
    #: Sandbox only: ``SN001`` to ``SN028``.
    scenarioId: str


class FbrInvoice(_FbrInvoiceOptional):
    """The invoice body for ``postinvoicedata`` and ``validateinvoicedata`` (spec 4.1, 4.2)."""

    invoiceType: str
    #: ``YYYY-MM-DD``.
    invoiceDate: str
    #: 7-digit NTN or 13-digit CNIC.
    sellerNTNCNIC: str
    sellerBusinessName: str
    sellerProvince: str
    sellerAddress: str
    #: 7-digit NTN or 13-digit CNIC; may be empty for an unregistered buyer.
    buyerNTNCNIC: str
    buyerBusinessName: str
    buyerProvince: str
    buyerAddress: str
    buyerRegistrationType: str
    #: FBR invoice number of the original invoice; required for a debit note.
    invoiceRefNo: str
    items: List[FbrInvoiceItem]


class FbrInvoiceInput(_FbrInvoiceOptional, total=False):
    """Input for :func:`build_fbr_invoice` (``invoiceRefNo`` and ``buyerNTNCNIC`` may be left out)."""

    invoiceType: str
    invoiceDate: str
    sellerNTNCNIC: str
    sellerBusinessName: str
    sellerProvince: str
    sellerAddress: str
    buyerNTNCNIC: str
    buyerBusinessName: str
    buyerProvince: str
    buyerAddress: str
    buyerRegistrationType: str
    invoiceRefNo: str
    items: List[FbrInvoiceItemInput]


class FbrInvoiceTotals(TypedDict):
    """Column totals of an invoice, in rupees. Not sent to FBR."""

    quantity: float
    valueSalesExcludingST: float
    salesTaxApplicable: float
    salesTaxWithheldAtSource: float
    extraTax: float
    furtherTax: float
    fedPayable: float
    discount: float


@dataclass(frozen=True)
class FbrInvoiceBuild:
    """Result of :func:`build_fbr_invoice`."""

    #: The invoice, a ``dict`` with FBR's camelCase keys.
    invoice: Dict[str, Any]
    #: Column totals (camelCase keys), for your own records.
    totals: Dict[str, float]


@dataclass(frozen=True)
class FbrInvoiceError:
    """One problem found by :func:`validate_fbr_invoice`."""

    #: FBR's error code (spec 7 and the Error Message Guide), or ``None`` for a
    #: required field the specification gives no code for.
    code: Optional[str]
    #: Where: ``invoiceDate``, ``items[0].rate`` ...
    field: str
    message: str


@dataclass(frozen=True)
class FbrInvoiceValidation:
    """Result of :func:`validate_fbr_invoice`."""

    valid: bool
    errors: List[FbrInvoiceError]


_INVOICE_TYPES = ("Sale Invoice", "Debit Note")
_REGISTRATION_TYPES = ("Registered", "Unregistered")
# ASCII digits and end anchors that, like JavaScript's ``$``, refuse a trailing newline.
_NTN_OR_CNIC = re.compile(r"(?:[0-9]{7}|[0-9]{13})\Z")
#: An FBR invoice number: the seller's NTN (7) or CNIC (13), "DI", 13 digits.
_FBR_INVOICE_NUMBER = re.compile(r"(?:[0-9]{7}|[0-9]{13})DI[0-9]{13}\Z")
_SCENARIO = re.compile(r"SN0(?:0[1-9]|1[0-9]|2[0-8])\Z")
_PERCENT_RATE = re.compile(r"([0-9]+(?:\.[0-9]+)?)%\Z")
# ``/^rs\.?\s*(\d+(?:\.\d+)?)$/i``: spelled out so Python's Unicode case
# folding (``ſ`` matches ``s``) does not accept more than JavaScript does.
_PER_UNIT_RATE = re.compile(r"[rR][sS]\.?[" + WS + r"]*([0-9]+(?:\.[0-9]+)?)\Z")
_DATE = re.compile(r"([0-9]{4})-([0-9]{2})-([0-9]{2})\Z")
_DECIMAL_FORM = re.compile(r"-?[0-9]+(?:\.([0-9]+))?(?:e([+-][0-9]+))?\Z")

_THIRD_SCHEDULE = "3rd schedule goods"
_REDUCED_RATE = "goods at reduced rate"

_NUMBER_FIELDS = (
    "quantity",
    "valueSalesExcludingST",
    "salesTaxApplicable",
    "salesTaxWithheldAtSource",
    "extraTax",
    "furtherTax",
    "fedPayable",
    "discount",
)

# Required number fields and FBR's code when one is missing, in check order.
_MISSING_CODES: Dict[str, Optional[str]] = {
    "quantity": "0098",
    "valueSalesExcludingST": "0021",
    "salesTaxApplicable": "0023",
    "salesTaxWithheldAtSource": "0024",
    "totalValues": None,
    "fixedNotifiedValueOrRetailPrice": None,
}
_OPTIONAL_NUMBERS = ("extraTax", "furtherTax", "fedPayable", "discount")


def _is_text(value: Any) -> bool:
    return isinstance(value, str)


def _filled(value: Any) -> bool:
    return isinstance(value, str) and len(trim(value)) > 0


def _is_object(value: Any) -> bool:
    return isinstance(value, dict)


def _is_array(value: Any) -> bool:
    return isinstance(value, (list, tuple))


def _is_empty_text(value: Any) -> bool:
    return isinstance(value, str) and value == ""


def _sale_type_key(value: Any) -> str:
    return normalize_key(value) if isinstance(value, str) else ""


def _js_number(text: str) -> float:
    """``Number()`` of a string the rate patterns matched (digits and one dot)."""
    return float(text)


def _decimal_places(value: Any) -> Optional[int]:
    """Decimal places in a number's shortest decimal form, or ``None`` if not finite."""
    if not is_finite(value):
        return None
    match = _DECIMAL_FORM.match(number_to_string(value))
    if not match:
        return None
    places = len(match.group(1) or "") - int(match.group(2) or "0")
    return places if places > 0 else 0


def expected_sales_tax(item: Any) -> Optional[float]:
    """The sales tax FBR expects on a line, in rupees, or ``None`` when the
    rate is not a plain percentage or per-unit amount (spec 7, errors 0102,
    0104, 0105):

    - ``N%`` on Third Schedule goods: retail price x rate (0102);
    - ``N%`` otherwise: value excluding sales tax x rate (0104);
    - ``Rs.N``: quantity x N (0105).

    Rounded half up to the paisa (the specification allows 2 decimals and
    gives no rounding rule). ``item`` is a ``dict`` with FBR's camelCase keys.
    Never raises.

    >>> expected_sales_tax({"rate": "18%", "valueSalesExcludingST": 1234})
    222.12
    >>> expected_sales_tax({"rate": "Rs.3", "quantity": 12})
    36.0
    """
    if not _is_object(item) or not _is_text(item.get("rate")):
        return None
    rate = trim(item["rate"])
    percent = _PERCENT_RATE.match(rate)
    if percent:
        if _sale_type_key(item.get("saleType")) == _THIRD_SCHEDULE:
            base = item.get("fixedNotifiedValueOrRetailPrice")
        else:
            base = item.get("valueSalesExcludingST")
        if not is_number(base):
            return None
        result = calculate_sales_tax(base, rate=_js_number(percent.group(1)))
        return None if result is None else result.tax
    per_unit = _PER_UNIT_RATE.match(rate)
    if per_unit:
        if not is_number(item.get("quantity")):
            return None
        quantity = to_units(item["quantity"], 4)
        price = to_units(_js_number(per_unit.group(1)), 2)
        if quantity is None or price is None:
            return None
        return from_paisa(divide_half_up(quantity * price, 10000))
    return None


def _column_total(items: List[Dict[str, Any]], key: str) -> float:
    """Adds up a column in paisa (quantity in ten-thousandths) so the sum is exact."""
    scale = 4 if key == "quantity" else 2
    total = 0
    for item in items:
        value = item.get(key)
        if not is_number(value):
            continue
        units = to_units(value, scale)
        if units is not None:
            total += units
    return total / (10000 if scale == 4 else 100)


def build_fbr_invoice(input: Any) -> Optional[FbrInvoiceBuild]:  # noqa: A002
    """Builds an FBR digital invoice from your own fields, working out
    ``salesTaxApplicable`` on each line where you leave it out (see
    :func:`expected_sales_tax`; uses :func:`calculate_sales_tax`). Lines with
    a rate that is neither ``N%`` nor ``Rs.N`` (``Exempt``, combined rates)
    get 0 unless you give the tax.

    ``input`` is a ``dict`` with FBR's camelCase keys (see
    :class:`FbrInvoiceInput`). ``salesTaxWithheldAtSource``, ``totalValues``
    and ``fixedNotifiedValueOrRetailPrice`` default to 0, and
    ``invoiceRefNo`` and ``buyerNTNCNIC`` to ``""``, as in FBR's samples.
    Nothing else is filled in or changed (other keys are kept); check the
    result with :func:`validate_fbr_invoice`.

    Also returns column totals, which are for your own records: the
    specification has no invoice-level totals.

    Returns :class:`FbrInvoiceBuild` (``invoice``, ``totals``), or ``None``
    if ``input`` is not a ``dict`` with an ``items`` list of ``dict`` items.
    Never raises.
    """
    if not _is_object(input) or not _is_array(input.get("items")):
        return None
    items: List[Dict[str, Any]] = []
    for line in input["items"]:
        if not _is_object(line):
            return None
        item: Dict[str, Any] = {
            **line,
            "totalValues": _default(line.get("totalValues"), 0),
            "fixedNotifiedValueOrRetailPrice": _default(line.get("fixedNotifiedValueOrRetailPrice"), 0),
            "salesTaxWithheldAtSource": _default(line.get("salesTaxWithheldAtSource"), 0),
        }
        given = line.get("salesTaxApplicable")
        if given is None:
            given = expected_sales_tax(item)
        item["salesTaxApplicable"] = 0 if given is None else given
        items.append(item)
    invoice: Dict[str, Any] = {
        **input,
        "buyerNTNCNIC": _default(input.get("buyerNTNCNIC"), ""),
        "invoiceRefNo": _default(input.get("invoiceRefNo"), ""),
        "items": items,
    }
    totals = {key: _column_total(items, key) for key in _NUMBER_FIELDS}
    return FbrInvoiceBuild(invoice=invoice, totals=totals)


def _default(value: Any, fallback: Any) -> Any:
    """``value ?? fallback``."""
    return fallback if value is None else value


def _valid_date(text: str) -> bool:
    match = _DATE.match(text)
    if not match:
        return False
    y, m, d = int(match.group(1)), int(match.group(2)), int(match.group(3))
    leap = (y % 4 == 0 and y % 100 != 0) or y % 400 == 0
    days = [31, 29 if leap else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    return 1 <= m <= 12 and 1 <= d <= days[m - 1]


def validate_fbr_invoice(invoice: Any, *, today: Any = None) -> FbrInvoiceValidation:
    """Checks an FBR digital invoice against the rules of PRAL's specification
    (v1.12) and Error Message Guide that need no call to FBR, and returns
    every problem with FBR's error code.

    Checked: invoice type (0003, 0011), date format (0005, 0042, 0113) and,
    with ``today`` (``YYYY-MM-DD``), a future date (0043); seller and buyer
    NTN/CNIC (0401, 0402, 0009), self-invoicing (0058), names, provinces
    (0073, 0074), addresses, buyer registration type (0012), the reference
    number of a debit note (0026), the sandbox scenario, and on each line: HS
    code (0044), rate (0020), unit, sale type (0013), required and valid
    amounts (0021, 0023, 0024, 0098, 0300, 0302), SRO schedule and serial
    (0077, 0078), Third Schedule retail price (0090), extra tax on
    reduced-rate goods (0091) and the sales tax arithmetic (0102, 0104, 0105,
    to within one paisa).

    Not checked, because they need FBR's data: registration status, whether a
    province, HS code, unit, rate, sale type or SRO is in FBR's lists or fits
    the others, and the original invoice of a debit note.

    ``invoice`` is a ``dict`` with FBR's camelCase keys; any value (untrusted
    JSON) is accepted. Returns :class:`FbrInvoiceValidation` (``valid``,
    ``errors``). Never raises.
    """
    errors: List[FbrInvoiceError] = []

    def add(code: Optional[str], field: str, message: str) -> None:
        errors.append(FbrInvoiceError(code=code, field=field, message=message))

    if not _is_object(invoice):
        add(None, "invoice", "The invoice must be an object")
        return FbrInvoiceValidation(valid=False, errors=errors)
    inv: Dict[Any, Any] = invoice

    # Invoice type
    invoice_type = inv.get("invoiceType")
    if not _filled(invoice_type):
        add("0011", "invoiceType", "Invoice type is empty")
    elif invoice_type not in _INVOICE_TYPES:
        add("0003", "invoiceType", 'Invoice type must be "Sale Invoice" or "Debit Note"')

    # Date
    date = inv.get("invoiceDate")
    if not _filled(date):
        add("0042", "invoiceDate", "Invoice date is empty")
    elif not _DATE.match(date):
        add("0005", "invoiceDate", "Invoice date must be in YYYY-MM-DD format")
    elif not _valid_date(date):
        add("0113", "invoiceDate", "Invoice date is not a valid date")
    elif _is_text(today) and _valid_date(today) and date > today:
        add("0043", "invoiceDate", "Invoice date is later than today")

    # Seller
    seller_id = inv.get("sellerNTNCNIC")
    if not _is_text(seller_id) or not _NTN_OR_CNIC.match(seller_id):
        add("0401", "sellerNTNCNIC", "Seller NTN or CNIC must be 7 or 13 digits")
    if not _filled(inv.get("sellerBusinessName")):
        add(None, "sellerBusinessName", "Seller business name is required")
    if not _filled(inv.get("sellerProvince")):
        add("0073", "sellerProvince", "Seller province is empty")
    if not _filled(inv.get("sellerAddress")):
        add(None, "sellerAddress", "Seller address is required")

    # Buyer
    registration = inv.get("buyerRegistrationType")
    if not _is_text(registration) or registration not in _REGISTRATION_TYPES:
        add(
            "0012",
            "buyerRegistrationType",
            'Buyer registration type must be "Registered" or "Unregistered"',
        )
    buyer_id = inv.get("buyerNTNCNIC")
    if not _filled(buyer_id):
        if not (_is_text(registration) and registration == "Unregistered"):
            add("0009", "buyerNTNCNIC", "Buyer NTN or CNIC is empty")
    elif not _NTN_OR_CNIC.match(buyer_id):
        add("0402", "buyerNTNCNIC", "Buyer NTN or CNIC must be 7 or 13 digits")
    elif _is_text(seller_id) and buyer_id == seller_id:
        add(
            "0058",
            "buyerNTNCNIC",
            "Buyer and seller must be different (self-invoicing is not allowed)",
        )
    if not _filled(inv.get("buyerBusinessName")):
        add("0010", "buyerBusinessName", "Buyer business name is empty")
    if not _filled(inv.get("buyerProvince")):
        add("0074", "buyerProvince", "Buyer province is empty")
    if not _filled(inv.get("buyerAddress")):
        add(None, "buyerAddress", "Buyer address is required")

    # Reference number and scenario
    ref_no = inv.get("invoiceRefNo")
    if _filled(ref_no):
        if not _FBR_INVOICE_NUMBER.match(trim(ref_no)):
            add(
                None,
                "invoiceRefNo",
                'Invoice reference number must be an FBR invoice number (NTN or CNIC, "DI", 13 digits)',
            )
    elif _is_text(invoice_type) and invoice_type == "Debit Note":
        add("0026", "invoiceRefNo", "Invoice reference number is required for a debit note")
    scenario = inv.get("scenarioId")
    if scenario is not None and not _is_empty_text(scenario):
        if not _is_text(scenario) or not _SCENARIO.match(scenario):
            add(None, "scenarioId", "Scenario ID must be SN001 to SN028")

    # Items
    raw_items = inv.get("items")
    if not _is_array(raw_items) or len(raw_items) == 0:
        add(None, "items", "The invoice needs at least one item")
        return FbrInvoiceValidation(valid=len(errors) == 0, errors=errors)
    for index, raw in enumerate(raw_items):
        if not _is_object(raw):
            add(None, f"items[{index}]", "Each item must be an object")
            continue
        _validate_item(raw, f"items[{index}].", add)

    return FbrInvoiceValidation(valid=len(errors) == 0, errors=errors)


def _validate_item(item: Dict[Any, Any], prefix: str, add: Any) -> None:
    def at(key: str) -> str:
        return prefix + key

    if not _filled(item.get("hsCode")):
        add("0044", at("hsCode"), "HS code is empty")
    if not _is_text(item.get("productDescription")):
        add(None, at("productDescription"), "Product description is required")
    if not _filled(item.get("rate")):
        add("0020", at("rate"), "Rate is empty")
    if not _filled(item.get("uoM")):
        add(None, at("uoM"), "Unit of measure is required")
    if not _filled(item.get("saleType")):
        add("0013", at("saleType"), "Sale type is empty")

    numbers_ok: Dict[str, bool] = {}
    for key in (*_MISSING_CODES, *_OPTIONAL_NUMBERS):
        value = item.get(key)
        required = key in _MISSING_CODES
        if value is None or (not required and _is_empty_text(value)):
            if required:
                add(_MISSING_CODES[key], at(key), f"{key} is required")
            continue
        if not is_finite(value) or value < 0:
            add("0300", at(key), f"{key} must be a number, not negative")
            continue
        places = _decimal_places(value) or 0
        limit = 4 if key == "quantity" else 2
        if places > limit:
            add("0302", at(key), f"{key} has more than {limit} decimal places")
            continue
        numbers_ok[key] = True

    rate = trim(item["rate"]) if _is_text(item.get("rate")) else ""
    if _filled(item.get("rate")) and rate != "18%" and not _filled(item.get("sroScheduleNo")):
        add(
            "0077",
            at("sroScheduleNo"),
            "SRO/schedule number is required when the rate is not 18%",
        )
    if _filled(item.get("sroScheduleNo")) and not _filled(item.get("sroItemSerialNo")):
        add(
            "0078",
            at("sroItemSerialNo"),
            "Item serial number is required when an SRO/schedule number is given",
        )
    sale_type = _sale_type_key(item.get("saleType"))
    if (
        sale_type == _THIRD_SCHEDULE
        and numbers_ok.get("fixedNotifiedValueOrRetailPrice")
        and item.get("fixedNotifiedValueOrRetailPrice") == 0
    ):
        add(
            "0090",
            at("fixedNotifiedValueOrRetailPrice"),
            "Retail price is required for Third Schedule goods",
        )
    extra_tax = item.get("extraTax")
    if sale_type == _REDUCED_RATE and extra_tax is not None and not _is_empty_text(extra_tax):
        add("0091", at("extraTax"), "Extra tax must be empty for goods at a reduced rate")

    # Sales tax arithmetic
    if not numbers_ok.get("salesTaxApplicable"):
        return
    percent = _PERCENT_RATE.match(rate) is not None
    per_unit = _PER_UNIT_RATE.match(rate) is not None
    if per_unit:
        base_key = "quantity"
    elif sale_type == _THIRD_SCHEDULE:
        base_key = "fixedNotifiedValueOrRetailPrice"
    else:
        base_key = "valueSalesExcludingST"
    if not (percent or per_unit) or not numbers_ok.get(base_key):
        return
    expected = expected_sales_tax(item)
    if expected is None:
        return
    actual = to_units(item["salesTaxApplicable"], 2)
    wanted = to_units(expected, 2)
    if actual is not None and wanted is not None and abs(actual - wanted) > 1:
        if per_unit:
            code = "0105"
        elif sale_type == _THIRD_SCHEDULE:
            code = "0102"
        else:
            code = "0104"
        add(code, at("salesTaxApplicable"), f"Sales tax should be {to_fixed(expected, 2)} for this rate")
