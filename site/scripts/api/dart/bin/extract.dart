/// Extracts the public API of the Dart port (dart/lib) with the Dart analyzer
/// (the library dartdoc is built on), into site/api-data/dart.json for the
/// API reference pages on pakdatakit.dev.
///
/// The public API is the export namespace of `package:pakdatakit/pakdatakit.dart`,
/// so names it hides (`hide getPhonePrefix, ...`) are left out, as they are
/// for users. Doc comments are dartdoc Markdown already; `[name]` references
/// are turned into `{@link name}` for the page renderer.
///
/// Run from this folder (site/scripts/api/dart):
///
///     dart pub get && dart run bin/extract.dart
library;

import 'dart:convert';
import 'dart:io';

import 'package:analyzer/dart/analysis/analysis_context_collection.dart';
import 'package:analyzer/dart/analysis/results.dart';
import 'package:analyzer/dart/element/element.dart';
import 'package:analyzer/dart/element/type.dart';
import 'package:path/path.dart' as p;

final _ref = RegExp(r'\[([A-Za-z_][\w.]*)\](?![(\[:])');

String _markdown(String? raw) {
  if (raw == null) return '';
  final lines = raw
      .split('\n')
      .map((l) => l.trimLeft())
      .map((l) => l.startsWith('///') ? l.substring(3) : l)
      .map((l) => l.startsWith(' ') ? l.substring(1) : l)
      .toList();
  final out = <String>[];
  var fenced = false;
  for (final line in lines) {
    if (line.trimLeft().startsWith('```')) fenced = !fenced;
    out.add(fenced || line.trimLeft().startsWith('```')
        ? line
        : line.replaceAllMapped(_ref, (m) => '{@link ${m[1]}}'));
  }
  return out.join('\n').trim();
}

String _type(DartType t) => t.getDisplayString();

Map<String, Object?> _param(FormalParameterElement p) => {
      'name': p.name,
      'type': _type(p.type),
      'default': p.defaultValueCode,
      'named': p.isNamed,
      'required': p.isRequired,
    };

String _signature(ExecutableElement e, String name, {String? prefix}) {
  final params = e.formalParameters;
  final positional = params.where((p) => p.isRequiredPositional).toList();
  final optional = params.where((p) => p.isOptionalPositional).toList();
  final named = params.where((p) => p.isNamed).toList();
  String one(FormalParameterElement p) {
    final req = p.isRequiredNamed ? 'required ' : '';
    final def = p.defaultValueCode != null ? ' = ${p.defaultValueCode}' : '';
    return '$req${_type(p.type)} ${p.name}$def';
  }

  final parts = [
    ...positional.map(one),
    if (optional.isNotEmpty) '[${optional.map(one).join(', ')}]',
    if (named.isNotEmpty) '{${named.map(one).join(', ')}}',
  ];
  final ret = e is ConstructorElement ? '' : '${_type(e.returnType)} ';
  final head = '${prefix ?? ''}$ret$name';
  final flat = '$head(${parts.join(', ')})';
  if (flat.length <= 80) return flat;
  // One parameter per line, like dart format.
  final lines = positional.map((p) => '  ${one(p)},').toList();
  final rest = optional.isNotEmpty ? optional : named;
  final (open, close) = optional.isNotEmpty ? ('[', ']') : ('{', '}');
  if (rest.isEmpty) return '$head(\n${lines.join('\n')}\n)';
  if (lines.isEmpty) {
    return '$head($open\n${rest.map((p) => '  ${one(p)},').join('\n')}\n$close)';
  }
  lines[lines.length - 1] = '${lines.last} $open';
  lines.addAll(rest.map((p) => '  ${one(p)},'));
  return '$head(\n${lines.join('\n')}\n$close)';
}

Map<String, Object?> _executable(ExecutableElement e, String kind,
    {String? displayName}) {
  final name = displayName ?? e.name ?? '';
  return {
    'kind': kind,
    'name': name,
    'signature': _signature(e, name,
        prefix: e.isStatic && kind == 'method' ? 'static ' : null),
    'doc': _markdown(e.documentationComment),
    'params': e.formalParameters.map(_param).toList(),
    'returns': e is ConstructorElement ? null : {'type': _type(e.returnType)},
  };
}

/// Members every object has; their overrides are left out unless documented.
const _objectMembers = {
  '==',
  'hashCode',
  'toString',
  'noSuchMethod',
  'runtimeType'
};

Map<String, Object?> _interface(InterfaceElement c) {
  final kind = c is EnumElement
      ? 'enum'
      : c is MixinElement
          ? 'mixin'
          : 'class';
  final fields = <Map<String, Object?>>[];
  final values = <Map<String, Object?>>[];
  for (final f in c.fields) {
    if (!f.isPublic) continue;
    if (f.isEnumConstant) {
      values.add({'name': f.name, 'doc': _markdown(f.documentationComment)});
      continue;
    }
    if (f.isOriginEnumValues) continue;
    final getter = f.getter;
    final explicitGetter = getter != null && getter.isOriginDeclaration;
    final doc = _markdown(
        explicitGetter ? getter.documentationComment : f.documentationComment);
    if (_objectMembers.contains(f.name) && doc.isEmpty) continue;
    fields.add({
      'name': f.name,
      'type': _type(f.type),
      'default': null,
      'doc': doc,
      'static': f.isStatic,
      'readonly':
          f.isFinal || f.isConst || (explicitGetter && f.setter == null),
    });
  }
  final methods = <Map<String, Object?>>[];
  for (final ctor in c.constructors) {
    if (!ctor.isPublic || kind == 'enum') continue;
    if (!ctor.isOriginDeclaration) continue; // implicit default constructor
    final n = ctor.name;
    final display =
        n == null || n == 'new' || n.isEmpty ? c.name! : '${c.name}.$n';
    final entry = _executable(ctor, 'constructor', displayName: display);
    if (ctor.isConst) entry['signature'] = 'const ${entry['signature']}';
    if (ctor.isFactory) entry['signature'] = 'factory ${entry['signature']}';
    methods.add(entry);
  }
  for (final m in c.methods) {
    if (!m.isPublic) continue;
    final doc = _markdown(m.documentationComment);
    if (_objectMembers.contains(m.name) && doc.isEmpty) continue;
    final name = m.name == '==' ? 'operator ==' : m.name!;
    methods.add(_executable(m, 'method', displayName: name));
  }
  final supertype = c.supertype;
  final ext =
      supertype != null && !supertype.isDartCoreObject && !(c is EnumElement)
          ? ' extends ${supertype.getDisplayString()}'
          : '';
  final impl = c.interfaces.isEmpty
      ? ''
      : ' implements ${c.interfaces.map((i) => i.getDisplayString()).join(', ')}';
  final mods = c is ClassElement
      ? [
          if (c.isSealed) 'sealed',
          if (c.isAbstract && !c.isSealed) 'abstract',
          if (c.isFinal) 'final',
          if (c.isBase) 'base',
          if (c.isInterface) 'interface',
        ]
      : <String>[];
  return {
    'kind': kind,
    'name': c.name,
    'signature': '${[...mods, kind].join(' ')} ${c.name}$ext$impl',
    'doc': _markdown(c.documentationComment),
    'fields': fields,
    if (values.isNotEmpty) 'values': values,
    'methods': methods,
  };
}

Map<String, Object?>? _entry(Element e) {
  if (e is InterfaceElement) return _interface(e);
  if (e is TopLevelFunctionElement) return _executable(e, 'function');
  if (e is TypeAliasElement) {
    return {
      'kind': 'type',
      'name': e.name,
      'signature': 'typedef ${e.name} = ${e.aliasedType.getDisplayString()}',
      'doc': _markdown(e.documentationComment),
    };
  }
  if (e is GetterElement) {
    final v = e.variable;
    final explicit = e.isOriginDeclaration;
    final keyword = v is TopLevelVariableElement && v.isConst
        ? 'const'
        : explicit
            ? '${_type(e.returnType)} get'
            : 'final';
    return {
      'kind': 'constant',
      'name': e.name,
      'signature': explicit
          ? '$keyword ${e.name}'
          : '$keyword ${_type(v.type)} ${e.name}',
      'doc':
          _markdown(explicit ? e.documentationComment : v.documentationComment),
    };
  }
  if (e is ExtensionElement) {
    return {
      'kind': 'extension',
      'name': e.name,
      'signature':
          'extension ${e.name} on ${e.extendedType.getDisplayString()}',
      'doc': _markdown(e.documentationComment),
      'fields': <Object>[],
      'methods': [
        for (final m in e.methods)
          if (m.isPublic) _executable(m, 'method'),
      ],
    };
  }
  return null;
}

Future<void> main() async {
  // This file is site/scripts/api/dart/bin/extract.dart.
  final root = File.fromUri(Platform.script)
      .absolute
      .parent
      .parent
      .parent
      .parent
      .parent
      .parent
      .path;
  if (!File('$root/dart/pubspec.yaml').existsSync()) {
    stderr.writeln('No repository root above ${Platform.script}');
    exit(2);
  }
  final lib = p.normalize(p.absolute(root, 'dart', 'lib'));
  final collection = AnalysisContextCollection(includedPaths: [lib]);
  Future<LibraryElement> resolve(String path) async {
    final file = p.normalize(p.absolute(path));
    final result = await collection
        .contextFor(file)
        .currentSession
        .getResolvedLibrary(file);
    if (result is! ResolvedLibraryResult) {
      throw StateError('Could not resolve $path: $result');
    }
    return result.element;
  }

  final main = await resolve(p.join(lib, 'pakdatakit.dart'));
  // Group the exported names by the src/ file that declares them, or, for a
  // name declared in src/internal/ and re-exported, the src/ file that
  // re-exports it.
  final srcFiles = Directory(p.join(lib, 'src'))
      .listSync()
      .whereType<File>()
      .where((f) => f.path.endsWith('.dart'))
      .map((f) => p.basenameWithoutExtension(f.path))
      .toList()
    ..sort();
  final srcExports = <String, Set<String>>{
    for (final f in srcFiles)
      f: (await resolve(p.join(lib, 'src', '$f.dart')))
          .exportNamespace
          .definedNames2
          .keys
          .toSet(),
  };
  final byFile = <String, List<Element>>{};
  for (final MapEntry(key: name, value: e)
      in main.exportNamespace.definedNames2.entries) {
    if (name.endsWith('=')) continue; // setters
    final uri = e.library!.uri.toString();
    final m = RegExp(r'/src/(\w+)\.dart$').firstMatch(uri);
    final file = m != null
        ? m[1]!
        : srcFiles.firstWhere((f) => srcExports[f]!.contains(name),
            orElse: () => throw StateError('$name comes from $uri'));
    byFile.putIfAbsent(file, () => []).add(e);
  }
  final modules = <Map<String, Object?>>[];
  for (final file in byFile.keys.toList()..sort()) {
    final elements = byFile[file]!
      ..sort(
          (a, b) => a.firstFragment.offset.compareTo(b.firstFragment.offset));
    final entryPoint = File(p.join(lib, '$file.dart'));
    final docLib = entryPoint.existsSync()
        ? await resolve(entryPoint.path)
        : await resolve(p.join(lib, 'src', '$file.dart'));
    final entries = <Map<String, Object?>>[];
    for (final e in elements) {
      final entry = _entry(e);
      if (entry == null)
        throw StateError('Unhandled ${e.runtimeType} ${e.name}');
      entries.add(entry);
    }
    modules.add({
      'id': file.replaceAll('_', '-'),
      'name': entryPoint.existsSync()
          ? 'package:pakdatakit/$file.dart'
          : 'package:pakdatakit/pakdatakit.dart',
      'import': entryPoint.existsSync()
          ? "import 'package:pakdatakit/$file.dart';"
          : "import 'package:pakdatakit/pakdatakit.dart';",
      'source': 'dart/lib/src/$file.dart',
      'doc': _markdown(docLib.documentationComment ??
          docLib.firstFragment.documentationComment),
      'entries': entries,
    });
  }
  final data = {
    'language': 'dart',
    'package': 'pakdatakit',
    'generator': 'analyzer ${_analyzerVersion(root)}',
    'modules': modules,
  };
  final out = File('$root/site/api-data/dart.json');
  out.parent.createSync(recursive: true);
  out.writeAsStringSync(
      '${const JsonEncoder.withIndent('  ').convert(data)}\n');
  final count =
      modules.fold<int>(0, (n, m) => n + (m['entries'] as List).length);
  print(
      'dart: ${modules.length} modules, $count entries -> site/api-data/dart.json');
}

String _analyzerVersion(String root) {
  final lock =
      File('$root/site/scripts/api/dart/pubspec.lock').readAsStringSync();
  return RegExp(r'  analyzer:\n(?:    .*\n)*?    version: "([^"]+)"')
          .firstMatch(lock)?[1] ??
      'unknown';
}
