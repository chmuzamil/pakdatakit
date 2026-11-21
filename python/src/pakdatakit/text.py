"""Text normalization, Roman Urdu spelling, Urdu digits, slugs, Urdu sorting
and bidirectional text."""

from __future__ import annotations

import re
import unicodedata
from typing import Any, List, Literal, Optional, Tuple

from ._internal.normalize import normalize_whitespace, to_ascii_digits

__all__ = [
    "normalize_text",
    "normalize_roman_urdu",
    "roman_urdu_key",
    "to_urdu_digits",
    "to_english_digits",
    "SlugScript",
    "BidiDirection",
    "slugify",
    "compare_urdu",
    "is_rtl",
    "wrap_bidi",
]

_URDU_DIGITS = "۰۱۲۳۴۵۶۷۸۹"

# Common Roman Urdu spelling normalizations (informal -> preferred). Only
# unambiguous variants are listed.
_ROMAN_URDU_REPLACEMENTS = [
    (re.compile(pattern, re.IGNORECASE | re.ASCII), replacement)
    for pattern, replacement in [
        (r"\bkia\b", "kya"),
        (r"\bker\b", "kar"),
        (r"\bkr\b", "kar"),
        (r"\bhy\b", "hai"),
        (r"\bmujhay\b", "mujhe"),
        (r"\bap\b", "aap"),
        (r"\bshukria\b", "shukriya"),
        (r"\bnhi\b", "nahi"),
        (r"\bassalamu alaikum\b", "assalamualaikum"),
        (r"\bassalam o alaikum\b", "assalamualaikum"),
    ]
]


def normalize_text(text: str) -> str:
    """Trims, collapses whitespace and applies Unicode NFC."""
    return normalize_whitespace(unicodedata.normalize("NFC", text))


def _match_case(original: str, replacement: str) -> str:
    if len(original) > 1 and original == original.upper():
        return original
    first = original[0]
    if first != first.lower():
        return replacement[0].upper() + replacement[1:]
    return replacement


def normalize_roman_urdu(text: str) -> str:
    """Normalizes informal Roman Urdu spellings (``kia`` -> ``kya``).

    Also applies :func:`normalize_text` and converts Urdu/Arabic digits to
    English. A capitalized word keeps its capital; all-caps words are left alone.
    """
    result = normalize_text(to_english_digits(text))
    for pattern, replacement in _ROMAN_URDU_REPLACEMENTS:
        result = pattern.sub(lambda m, r=replacement: _match_case(m.group(0), r), result)
    return result


def to_urdu_digits(text: str) -> str:
    """Converts English and Arabic-Indic digits to Urdu digits (۰-۹)."""
    return re.sub(r"[0-9]", lambda m: _URDU_DIGITS[int(m.group(0))], to_ascii_digits(text))


def to_english_digits(text: str) -> str:
    """Converts Urdu and Arabic-Indic digits to English digits (0-9)."""
    return to_ascii_digits(text)


# ---------------------------------------------------------------------------
# Slugs, Urdu sorting and bidirectional text
# ---------------------------------------------------------------------------

#: Which letters :func:`slugify` keeps: ``any`` (Latin and Urdu), ``latin`` or ``urdu``.
SlugScript = Literal["any", "latin", "urdu"]

#: Direction for :func:`wrap_bidi`.
BidiDirection = Literal["auto", "rtl", "ltr"]

# Marks and invisible characters that slugs and sorting skip.
_SKIPPED = frozenset(
    chr(cp)
    for start, end in [
        (0x0300, 0x036F),
        (0x0610, 0x061A),
        (0x064B, 0x065F),
        (0x0670, 0x0670),
        (0x06D6, 0x06ED),
        (0x061C, 0x061C),
        (0x0640, 0x0640),
        (0x200B, 0x200F),
        (0x202A, 0x202E),
        (0x2066, 0x2069),
        (0xFEFF, 0xFEFF),
    ]
    for cp in range(start, end + 1)
)


def _is_arabic_letter(cp: int) -> bool:
    """Arabic-script letters (Urdu letters and their Arabic look-alikes)."""
    return (
        (0x0621 <= cp <= 0x064A and cp != 0x0640)
        or 0x066E <= cp <= 0x06D3
        or cp == 0x06D5
        or 0x06FA <= cp <= 0x06FF
    )


# Arabic look-alikes written for Urdu letters: ك ي ى -> ک ی ی.
_URDU_FOR_ARABIC = {"ك": "ک", "ي": "ی", "ى": "ی"}

# Latin-1 letters with accents (lower case), folded to ASCII for slugs.
_LATIN1_FOLD = {
    "à": "a", "á": "a", "â": "a", "ã": "a", "ä": "a", "å": "a", "æ": "ae", "ç": "c",
    "è": "e", "é": "e", "ê": "e", "ë": "e", "ì": "i", "í": "i", "î": "i", "ï": "i",
    "ð": "d", "ñ": "n", "ò": "o", "ó": "o", "ô": "o", "õ": "o", "ö": "o", "ø": "o",
    "ù": "u", "ú": "u", "û": "u", "ü": "u", "ý": "y", "ÿ": "y", "þ": "th", "ß": "ss",
}  # fmt: skip


def slugify(text: Any, *, script: Any = "any") -> str:
    """Turns text into a URL slug: lower-case words joined by ``-``.

    Urdu letters are kept as they are (no transliteration). Diacritics,
    tatweel and zero-width characters are dropped, the Arabic look-alikes
    ك ي ى become the Urdu ک ی ی, Urdu and Arabic-Indic digits become ``0-9``,
    and accented Latin-1 letters lose their accents (``é`` -> ``e``, ``ß`` ->
    ``ss``). Anything else separates words.

    ``script`` is ``"any"`` (default: Latin and Urdu letters), ``"latin"``
    (only ``a-z``) or ``"urdu"`` (only Urdu letters); any other value is
    ``"any"``. Digits are always kept.

    Returns ``""`` when nothing is left or ``text`` is not a string. Never raises.

    >>> slugify("Lahore Fort, 2024")
    'lahore-fort-2024'
    >>> slugify("کراچی ۲۰۲۴", script="urdu")
    'کراچی-2024'
    """
    if not isinstance(text, str):
        return ""
    if not isinstance(script, str) or script not in ("latin", "urdu"):
        script = "any"
    keep_latin = script != "urdu"
    keep_urdu = script != "latin"
    parts: List[str] = []
    pending = False
    for char in to_ascii_digits(text):
        if char in _SKIPPED:
            continue
        cp = ord(char)
        piece: Optional[str] = None
        if 0x30 <= cp <= 0x39:
            piece = char
        elif keep_latin and 0x61 <= cp <= 0x7A:
            piece = char
        elif keep_latin and 0x41 <= cp <= 0x5A:
            piece = chr(cp + 0x20)
        else:
            if keep_latin:
                # À-Þ (except ×) are the capitals of à-þ.
                lower = chr(cp + 0x20) if 0xC0 <= cp <= 0xDE and cp != 0xD7 else char
                piece = _LATIN1_FOLD.get(lower)
            if piece is None and keep_urdu and _is_arabic_letter(cp):
                piece = _URDU_FOR_ARABIC.get(char, char)
        if piece is None:
            pending = True
            continue
        if pending and parts:
            parts.append("-")
        pending = False
        parts.append(piece)
    return "".join(parts)


# Urdu letters in alphabetical order, from the CLDR ``ur`` collation
# (common/collation/ur.xml, CLDR 49). Each letter followed by ھ (بھ, پھ, ...)
# is a letter of its own, right after it.
_URDU_ORDER = [
    "ا", "آ", "ب", "بھ", "پ", "پھ", "ت", "تھ", "ٹ", "ٹھ", "ث", "ج", "جھ", "چ",
    "چھ", "ح", "خ", "د", "دھ", "ڈ", "ڈھ", "ذ", "ر", "رھ", "ڑ", "ڑھ", "ز", "ژ",
    "س", "ش", "ص", "ض", "ط", "ظ", "ع", "غ", "ف", "ق", "ک", "کھ", "گ", "گھ",
    "ل", "لھ", "م", "مھ", "ن", "نھ", "ں", "ںھ", "و", "وھ", "ہ", "ھ", "ۃ", "ء",
    "ی", "یھ", "ے",
]  # fmt: skip
_URDU_RANK = {letter: index for index, letter in enumerate(_URDU_ORDER)}

# Letters with a hamza that sort as their base letter, secondarily after it.
_HAMZA_VARIANTS = {"أ": "ا", "ؤ": "و", "ۂ": "ہ", "ئ": "ی", "ۓ": "ے"}

# Diacritics in CLDR's secondary order.
_DIACRITICS = "ًٌٍَُِّْٰٖٗٔ٘ٓ"
_HAMZA_ABOVE_WEIGHT = 1 + _DIACRITICS.index("ٔ")

# Primary groups, in sorting order.
_PUNCTUATION = 1
_DIGIT = 2
_URDU = 3
_OTHER_ARABIC = 4
_OTHER = 5


def _is_punctuation(cp: int) -> bool:
    return (
        cp <= 0x2F
        or 0x3A <= cp <= 0x40
        or 0x5B <= cp <= 0x60
        or 0x7B <= cp <= 0xBF
        or 0x2000 <= cp <= 0x206F
        or 0x0600 <= cp <= 0x060F
        or cp == 0x061B
        or 0x061D <= cp <= 0x061F
        or 0x066A <= cp <= 0x066D
        or cp == 0x06D4
    )


def _digit_value(cp: int) -> int:
    if 0x30 <= cp <= 0x39:
        return cp - 0x30
    if 0x0660 <= cp <= 0x0669:
        return cp - 0x0660
    if 0x06F0 <= cp <= 0x06F9:
        return cp - 0x06F0
    return -1


def _is_arabic_script(cp: int) -> bool:
    return (
        0x0600 <= cp <= 0x06FF
        or 0x0750 <= cp <= 0x077F
        or 0x08A0 <= cp <= 0x08FF
        or 0xFB50 <= cp <= 0xFDFF
        or 0xFE70 <= cp <= 0xFEFF
    )


def _weight(group: int, rank: int) -> int:
    """A primary weight: the group times 2^21, plus the rank within the group."""
    return group * 0x200000 + rank


def _collation_key(text: str) -> Tuple[List[int], List[int]]:
    chars = text  # a Python str is a sequence of code points
    n = len(chars)
    primary: List[int] = []
    secondary: List[int] = []
    i = 0
    while i < n:
        char = chars[i]
        diacritic = _DIACRITICS.find(char)
        if diacritic >= 0:
            secondary.append(1 + diacritic)
            i += 1
            continue
        if char in _SKIPPED:
            i += 1
            continue
        base = _HAMZA_VARIANTS.get(char)
        letter = char if base is None else base
        if letter == "ا" and i + 1 < n and chars[i + 1] == "ٓ":
            letter = "آ"
            i += 1
        rank = _URDU_RANK.get(letter)
        if rank is not None:
            following = chars[i + 1] if i + 1 < n else ""
            joined = _URDU_RANK.get(letter + following)
            if following == "ھ" and joined is not None:
                primary.append(_weight(_URDU, joined))
                i += 1
            else:
                primary.append(_weight(_URDU, rank))
            secondary.append(0)
            if base is not None:
                secondary.append(_HAMZA_ABOVE_WEIGHT)
            i += 1
            continue
        cp = ord(char)
        digit = _digit_value(cp)
        if digit >= 0:
            primary.append(_weight(_DIGIT, digit))
        elif _is_punctuation(cp):
            primary.append(_weight(_PUNCTUATION, cp))
        elif _is_arabic_script(cp):
            primary.append(_weight(_OTHER_ARABIC, cp))
        else:
            primary.append(_weight(_OTHER, cp + 0x20 if 0x41 <= cp <= 0x5A else cp))
        secondary.append(0)
        i += 1
    return primary, secondary


def _compare_lists(a: List[int], b: List[int]) -> int:
    # Python compares lists element by element, a shorter prefix first.
    return -1 if a < b else (1 if a > b else 0)


def compare_urdu(a: Any, b: Any) -> int:
    """Compares two strings in Urdu alphabetical order; use with
    ``functools.cmp_to_key``.

    Letters follow the Unicode CLDR collation for Urdu (``ur``, CLDR 49):
    ا آ ب بھ پ پھ ت تھ ٹ ٹھ ث ج جھ چ چھ ح خ د دھ ڈ ڈھ ذ ر رھ ڑ ڑھ ز ژ س ش ص ض
    ط ظ ع غ ف ق ک کھ گ گھ ل لھ م مھ ن نھ ں ںھ و وھ ہ ھ ۃ ء ی یھ ے. A letter
    joined with ھ is a letter of its own. أ ؤ ۂ ئ ۓ sort as ا و ہ ی ے and come
    just after them when words are otherwise equal, and diacritics only break
    ties, in CLDR's order.

    Outside the Urdu letters: spaces and punctuation come first, then digits
    digit by digit (Urdu, Arabic-Indic and ASCII digits are equal; ``10``
    comes before ``2``), then Urdu letters, then other Arabic-script
    characters (the look-alikes ك ي ى ه ة), then everything else by code
    point, ignoring ASCII case. Strings that are still equal are ordered by
    code point, so the result is 0 only for identical strings.

    Returns ``-1``, ``0`` or ``1``. A value that is not a string is treated as
    ``""``. Never raises.

    >>> from functools import cmp_to_key
    >>> sorted(["ے", "بھائی", "آم", "باغ", "اب"], key=cmp_to_key(compare_urdu))
    ['اب', 'آم', 'باغ', 'بھائی', 'ے']
    """
    x = a if isinstance(a, str) else ""
    y = b if isinstance(b, str) else ""
    if x == y:
        return 0
    px, sx = _collation_key(x)
    py, sy = _collation_key(y)
    return (
        _compare_lists(px, py)
        or _compare_lists(sx, sy)
        or _compare_lists([ord(c) for c in x], [ord(c) for c in y])
    )


def _is_rtl_code_point(cp: int) -> bool:
    """Letters of right-to-left scripts (Hebrew, Arabic, Syriac, Thaana, ...)."""
    return (
        0x0590 <= cp <= 0x08FF
        or 0xFB1D <= cp <= 0xFDFF
        or 0xFE70 <= cp <= 0xFEFF
        or 0x10800 <= cp <= 0x10FFF
        or 0x1E800 <= cp <= 0x1EFFF
    )


def is_rtl(text: Any) -> bool:
    """Whether text reads right to left: its first letter is from a
    right-to-left script such as Urdu or Arabic. Digits, punctuation and
    spaces are skipped, as in the Unicode bidirectional algorithm's paragraph
    rule.

    Returns ``False`` when there is no letter or ``text`` is not a string.
    Never raises.

    >>> is_rtl("123 سلام")
    True
    >>> is_rtl("Order نمبر")
    False
    """
    if not isinstance(text, str):
        return False
    for char in text:
        if unicodedata.category(char).startswith("L"):
            return _is_rtl_code_point(ord(char))
    return False


def wrap_bidi(text: Any, direction: Any = "auto") -> str:
    """Wraps text in Unicode directional isolates, so a name or number in one
    direction does not reorder the sentence around it (for example an English
    order number inside an Urdu message).

    Uses FIRST STRONG ISOLATE (U+2068) by default, RIGHT-TO-LEFT ISOLATE
    (U+2067) for ``"rtl"`` and LEFT-TO-RIGHT ISOLATE (U+2066) for ``"ltr"``,
    closed with POP DIRECTIONAL ISOLATE (U+2069). Any other direction is
    ``"auto"``.

    Returns ``""`` when ``text`` is not a string. Never raises.

    >>> wrap_bidi("PDK-1042")
    '\\u2068PDK-1042\\u2069'
    """
    if not isinstance(text, str):
        return ""
    if isinstance(direction, str) and direction == "rtl":
        opener = "⁧"
    elif isinstance(direction, str) and direction == "ltr":
        opener = "⁦"
    else:
        opener = "⁨"
    return f"{opener}{text}⁩"


# Two-letter spellings of one sound, and what each becomes in a key.
_KEY_DIGRAPHS = {
    "kh": "kh",
    "gh": "g",
    "sh": "sh",
    "ch": "ch",
    "ph": "f",
    "th": "t",
    "dh": "d",
    "bh": "b",
    "jh": "j",
    "zh": "z",
    "ck": "k",
}

# Letters written for the same sound as another letter.
_KEY_LETTERS = {"c": "k", "q": "k", "v": "w", "x": "ks"}

_PLAIN_VOWELS = "aeiou"
_DOUBLED = re.compile(r"([^e])\1+")
_ROUND_START = re.compile(r"[ao][uw]")
_E_START = re.compile(r"a[iye]|e[iy]")
_COMBINING_MARKS = re.compile("[" + chr(0x0300) + "-" + chr(0x036F) + "]")
_NOT_LATIN = re.compile("[^a-z]+")


def _vowel_class(letter: str) -> str:
    """The sound class of a vowel letter: a (a, e), i (i, y) or u (o, u, w)."""
    if letter in ("a", "e"):
        return "a"
    if letter in ("i", "y"):
        return "i"
    return "u"


def _first_vowel_class(run: str, word_start: bool) -> str:
    """The sound class of a word's first vowel sound: ee is i (Zeeshan, Heera);
    a word-initial e is i (Ebrahim, Esmail); au, aw, ou and ow are u
    (Chaudhry, Choudhry, Chowdhury); ai, ay, ae, ei and ey are e (Saeed,
    Faisal, Sheikh); otherwise the class of the first letter."""
    if run.startswith("ee"):
        return "i"
    if word_start and run.startswith("e"):
        return "i"
    if _ROUND_START.match(run):
        return "u"
    if _E_START.match(run):
        return "e"
    return _vowel_class(run[0])


def _word_key(word: str) -> str:
    """The phonetic key of one word of lowercase ASCII letters."""
    # 1. One letter per sound.
    parts = []
    i = 0
    while i < len(word):
        pair = _KEY_DIGRAPHS.get(word[i : i + 2])
        if pair is not None:
            parts.append(pair)
            i += 2
        else:
            parts.append(_KEY_LETTERS.get(word[i], word[i]))
            i += 1
    # 2. Doubled letters count once (Muhammad, Rehmaan), except ee, which is
    #    written for a long i (Zeeshan, Heera, Saeed).
    letters = _DOUBLED.sub(r"\1", "".join(parts))
    # 3. Which letters are vowels: a, e, i, o, u; y except at the start; w
    #    after a vowel and not before a plain vowel. (At the end of a word the
    #    next letter is "", which the npm package counts as a plain vowel, so a
    #    final w is a consonant.)
    vowel: List[bool] = []
    for i, letter in enumerate(letters):
        following = letters[i + 1] if i + 1 < len(letters) else ""
        vowel.append(
            letter in _PLAIN_VOWELS
            or (letter == "y" and i > 0)
            or (letter == "w" and i > 0 and vowel[i - 1] and following not in _PLAIN_VOWELS)
        )
    # 4. A final h after a vowel is silent (Fatimah, Sarah).
    last = len(letters) - 1
    if last > 0 and letters[last] == "h" and vowel[last - 1]:
        letters = letters[:last]
        vowel.pop()
    # 5. Consonants, the first vowel sound and a final vowel sound.
    key = []
    first_vowel_done = False
    i = 0
    while i < len(letters):
        if not vowel[i]:
            key.append(letters[i])
            i += 1
            continue
        end = i
        while end < len(letters) and vowel[end]:
            end += 1
        run = letters[i:end]
        if not first_vowel_done:
            key.append(_first_vowel_class(run, i == 0))
            first_vowel_done = True
        elif end == len(letters):
            key.append("i" if run.endswith("ee") else _vowel_class(run[-1]))
        i = end
    return "".join(key)


def roman_urdu_key(text: Any) -> str:
    """A phonetic key for Roman Urdu, so that different spellings of the same
    name or word match: ``Mubeen`` and ``Mobeen``, ``Muhammad``, ``Mohammad``
    and ``Muhammed``, ``Rehman`` and ``Rahman``, ``Chaudhry``, ``Chaudhary``
    and ``Chaudhery``. Compare keys, not the text.

    Each word keeps its consonants, its first vowel sound and a vowel sound at
    its end. Letters for one sound are merged (``kh``, ``sh``, ``ch``; ``ph``
    and ``f``; ``q``, ``c`` and ``k``; ``v`` and ``w``; ``th`` and ``t``,
    ``dh`` and ``d``), doubled letters count once, ``e`` counts as ``a``,
    ``o`` as ``u``, and a final ``h`` after a vowel is dropped. Accents are
    removed and anything other than Latin letters splits words. The key is not
    meant to be shown: it is an opaque string.

    Different names can share a key (``Hamid`` and ``Hamad``), so treat a match
    as "probably the same", not proof. :func:`normalize_roman_urdu` is a
    different tool: it rewrites informal spellings into readable text.

    Returns the key, one part per word separated by spaces; ``""`` for text
    with no Latin letters or a value that is not a string. Never raises.

    >>> roman_urdu_key("Mubeen") == roman_urdu_key("Mobeen")
    True
    >>> roman_urdu_key("Muhammad Rehman")
    'muhmd rahmn'
    >>> roman_urdu_key("Hussain") == roman_urdu_key("Hassan")
    False
    """
    if not isinstance(text, str):
        return ""
    folded = _COMBINING_MARKS.sub("", unicodedata.normalize("NFKD", text.lower()))
    return " ".join(_word_key(word) for word in _NOT_LATIN.split(folded) if word)
