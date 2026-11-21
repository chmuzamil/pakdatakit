"""Extracts the public API of the Python port (python/src/pakdatakit) with
griffe, into site/api-data/python.json for the API reference pages.

griffe reads the source statically (nothing is imported), so this runs
without installing the package. The public API is what each module lists in
``__all__`` (or, without one, every public name it defines). Docstrings are plain reStructuredText prose; this script turns
the few constructs they use into Markdown:

- ``code`` -> `code`
- :func:`name`, :class:`name`, :data:`name`, :meth:`name` -> {@link name}
- doctest lines (>>> ...) and their output -> a fenced python block
- ``#:`` comments above an attribute -> the attribute's description

Run with the pinned griffe (site/scripts/api/requirements.txt):

    python site/scripts/api/extract-python.py
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import griffe

ROOT = Path(__file__).resolve().parents[3]
SRC = ROOT / "python" / "src"
OUT = ROOT / "site" / "api-data" / "python.json"


ROLE = re.compile(r":(?:func|class|data|meth|attr|mod|obj):`~?([^`]+)`")


def markdown(text: str) -> str:
    """reStructuredText prose -> Markdown."""
    if not text:
        return ""
    out: list[str] = []
    in_doctest = False
    for line in text.strip("\n").split("\n"):
        if line.lstrip().startswith(">>>"):
            if not in_doctest:
                if out and out[-1] != "":
                    out.append("")
                out.append("```python")
                in_doctest = True
            out.append(line.strip())
            continue
        if in_doctest:
            if line.strip() == "":
                out.append("```")
                out.append("")
                in_doctest = False
                continue
            out.append(line.strip())
            continue
        line = ROLE.sub(lambda m: "{@link " + m.group(1) + "}", line)
        line = re.sub(r"``([^`]+)``", r"`\1`", line)
        out.append(line)
    if in_doctest:
        out.append("```")
    return "\n".join(out).strip()


_lines_cache: dict[Path, list[str]] = {}


def comment_doc(obj: griffe.Object) -> str:
    """The ``#:`` comment lines directly above an attribute."""
    path = Path(obj.filepath)
    lines = _lines_cache.setdefault(path, path.read_text(encoding="utf-8").split("\n"))
    i = obj.lineno - 2
    found: list[str] = []
    while i >= 0 and lines[i].strip().startswith("#:"):
        found.insert(0, lines[i].strip()[2:].strip())
        i -= 1
    return " ".join(found).strip()


def doc_of(obj: griffe.Object) -> str:
    if obj.docstring and obj.docstring.value.strip():
        return markdown(obj.docstring.value)
    if obj.is_attribute:
        return markdown(comment_doc(obj))
    return ""


def expr(value) -> str | None:
    return None if value is None else str(value)


def function(fn: griffe.Function) -> dict:
    params = []
    parts: list[str] = []
    saw_kw_only = False
    saw_pos_only = False
    for p in fn.parameters:
        if p.name in ("self", "cls"):
            continue
        kind = p.kind.value if p.kind else "positional or keyword"
        if kind == "positional-only":
            saw_pos_only = True
        elif saw_pos_only:
            parts.append("/")
            saw_pos_only = False
        if kind == "keyword-only" and not saw_kw_only:
            parts.append("*")
            saw_kw_only = True
        name = p.name
        if kind == "variadic positional":
            name = "*" + name
            saw_kw_only = True
        elif kind == "variadic keyword":
            name = "**" + name
        ann = expr(p.annotation)
        default = expr(p.default)
        piece = name + (f": {ann}" if ann else "")
        if default is not None:
            piece += f" = {default}" if ann else f"={default}"
        parts.append(piece)
        params.append(
            {
                "name": name,
                "type": ann,
                "default": default,
                "keywordOnly": kind == "keyword-only",
            }
        )
    if saw_pos_only:
        parts.append("/")
    ret = expr(fn.returns)
    sig = f"def {fn.name}({', '.join(parts)})" + (f" -> {ret}" if ret else "")
    if len(sig) > 80:
        sig = f"def {fn.name}(\n" + "".join(f"    {p},\n" for p in parts) + ")" + (
            f" -> {ret}" if ret else ""
        )
    return {
        "kind": "method" if fn.parent and fn.parent.is_class else "function",
        "name": fn.name,
        "signature": sig,
        "doc": doc_of(fn),
        "params": params,
        "returns": {"type": ret} if ret else None,
        "line": fn.lineno,
    }


TYPE_VALUE = re.compile(r"^(Literal|Union|Optional|Dict|List|Tuple|Callable|Mapping)\[")


def attribute(attr: griffe.Attribute, in_class: bool) -> dict:
    ann = expr(attr.annotation)
    value = expr(attr.value)
    is_type = (
        not in_class
        and attr.name[:1].isupper()
        and not attr.name.isupper()
        and value is not None
        and TYPE_VALUE.match(value)
    )
    if in_class:
        return {
            "name": attr.name,
            "type": ann,
            "default": value,
            "doc": doc_of(attr),
        }
    if is_type:
        sig = f"{attr.name} = {value}"
    else:
        shown = value if value is not None and len(value) <= 60 else None
        sig = attr.name + (f": {ann}" if ann else "") + (f" = {shown}" if shown else "")
    return {
        "kind": "type" if is_type else "constant",
        "name": attr.name,
        "signature": sig,
        "doc": doc_of(attr),
        "line": attr.lineno,
    }


def klass(cls: griffe.Class) -> dict:
    decorators = [f"@{d.value}" for d in cls.decorators]
    bases = [str(b) for b in cls.bases]
    sig = "\n".join(decorators + [f"class {cls.name}" + (f"({', '.join(bases)})" if bases else "")])
    fields = []
    methods = []
    # Inherited members first (TypedDict bases), then the class's own.
    members = {}
    for base in reversed(cls.resolved_bases):
        for name, m in base.members.items():
            members[name] = m
    members.update(cls.members)
    for name, m in members.items():
        if name.startswith("_"):
            continue
        if m.is_alias:
            continue
        if m.is_attribute:
            if "property" in m.labels:
                f = attribute(m, True)
                f["readonly"] = True
                fields.append(f)
            else:
                fields.append(attribute(m, True))
        elif m.is_function:
            if "property" in m.labels:
                fields.append(
                    {
                        "name": m.name,
                        "type": expr(m.returns),
                        "default": None,
                        "doc": doc_of(m),
                        "readonly": True,
                    }
                )
            else:
                methods.append(function(m))
    return {
        "kind": "class",
        "name": cls.name,
        "signature": sig,
        "doc": doc_of(cls),
        "fields": fields,
        "methods": methods,
        "line": cls.lineno,
    }


def main() -> None:
    pkg = griffe.load(
        "pakdatakit",
        search_paths=[str(SRC)],
        docstring_parser=None,
        resolve_aliases=False,
    )
    modules = []
    for name, mod in sorted(pkg.modules.items()):
        if name.startswith("_"):
            continue
        exports = mod.exports
        if exports is None:
            # No __all__: every public name defined in the module itself.
            names = [n for n, m in mod.members.items() if not n.startswith("_") and not m.is_alias]
        else:
            names = [e if isinstance(e, str) else e.name for e in exports]
        entries = []
        for member_name in names:
            m = mod.members.get(member_name)
            if m is not None and m.is_alias and m.target_path.startswith("pakdatakit."):
                # Re-exported from a private module (e.g. _internal).
                m = m.final_target
            if m is None or m.is_alias:
                raise SystemExit(f"pakdatakit.{name}: {member_name} in __all__ is not defined there")
            if m.is_function:
                entries.append(function(m))
            elif m.is_class:
                entries.append(klass(m))
            elif m.is_attribute:
                entries.append(attribute(m, False))
        entries.sort(key=lambda e: e["line"])
        for e in entries:
            e.pop("line", None)
            for meth in e.get("methods", []):
                meth.pop("line", None)
        modules.append(
            {
                "id": name.replace("_", "-"),
                "name": f"pakdatakit.{name}",
                "import": f"from pakdatakit.{name} import ...",
                "source": f"python/src/pakdatakit/{name}.py",
                "doc": doc_of(mod),
                "entries": entries,
            }
        )
    data = {
        "language": "python",
        "package": "pakdatakit",
        "generator": f"griffe {griffe_version()}",
        "modules": modules,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")
    count = sum(len(m["entries"]) for m in modules)
    print(f"python: {len(modules)} modules, {count} entries -> {OUT.relative_to(ROOT).as_posix()}")


def griffe_version() -> str:
    from importlib.metadata import version as dist_version

    return dist_version("griffelib")


if __name__ == "__main__":
    sys.exit(main())
