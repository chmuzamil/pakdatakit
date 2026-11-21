<?php

/**
 * Extracts the public API of the PHP port (php/src) into
 * site/api-data/php.json for the API reference on pakdatakit.dev.
 *
 * The source is read with PHP's own tokenizer (PhpToken), not loaded, so the
 * Laravel bridge can be read without Laravel installed and nothing needs
 * Composer. Docblocks are Markdown already; this reads their summary and
 * @param / @return / @throws / @var tags, and turns {@see X} into {@link X}.
 *
 * Public API: classes, interfaces and enums under the PakDataKit namespace
 * (not PakDataKit\Internal, not @internal), with their public constants,
 * properties (including promoted constructor parameters) and methods.
 *
 * Run: php site/scripts/api/extract-php.php
 */

declare(strict_types=1);

$root = dirname(__DIR__, 3);
$src = "$root/php/src";
$map = json_decode((string) file_get_contents(__DIR__ . '/modules.json'), true)['php'];

/** Docblock -> [description (Markdown), tags]. */
function docblock(?string $doc): array
{
    if ($doc === null) {
        return ['', []];
    }
    $text = preg_replace('#^/\*\*|\*/$#', '', trim($doc));
    $lines = array_map(
        static fn (string $l): string => preg_replace('/^\s*\* ?/', '', $l),
        explode("\n", str_replace("\r\n", "\n", $text)),
    );
    $desc = [];
    $tags = [];
    $current = null;
    $fenced = false;
    foreach ($lines as $line) {
        if (str_starts_with(ltrim($line), '```')) {
            $fenced = !$fenced;
        }
        if (!$fenced && preg_match('/^@(\w+)\s*(.*)$/', trim($line), $t)) {
            $tags[] = [$t[1], $t[2]];
            $current = count($tags) - 1;
            continue;
        }
        if ($current !== null) {
            $tags[$current][1] .= ($tags[$current][1] === '' ? '' : ' ') . trim($line);
        } else {
            $desc[] = rtrim($line);
        }
    }
    $md = trim(implode("\n", $desc));
    $md = preg_replace('/\{@(?:see|link)\s+([^}\s]+)[^}]*\}/', '{@link $1}', $md);
    $tags = array_map(static fn (array $t): array => [$t[0], trim(preg_replace('/\{@(?:see|link)\s+([^}\s]+)[^}]*\}/', '{@link $1}', $t[1]))], $tags);
    return [$md, $tags];
}

function tag(array $tags, string $name): ?string
{
    foreach ($tags as [$n, $v]) {
        if ($n === $name) {
            return $v;
        }
    }
    return null;
}

/** "@param type $name text" -> [type, text] by name. */
function paramTags(array $tags): array
{
    $out = [];
    foreach ($tags as [$n, $v]) {
        if ($n === 'param' && preg_match('/^(?:(\S+)\s+)?(?:\.\.\.)?\$(\w+)\s*(.*)$/s', $v, $m)) {
            $out[$m[2]] = [$m[1] !== '' ? $m[1] : null, trim($m[3])];
        }
    }
    return $out;
}

/** Splits "type rest" for @return / @var tags (types may contain spaces inside <> or {}). */
function typeAndText(?string $v): array
{
    if ($v === null) {
        return [null, ''];
    }
    $depth = 0;
    for ($i = 0, $n = strlen($v); $i < $n; $i++) {
        $c = $v[$i];
        if ($c === '<' || $c === '{' || $c === '(' || $c === '[') {
            $depth++;
        } elseif ($c === '>' || $c === '}' || $c === ')' || $c === ']') {
            $depth--;
        } elseif ($depth === 0 && ctype_space($c)) {
            return [substr($v, 0, $i), trim(substr($v, $i))];
        }
    }
    return [$v, ''];
}

/** Collapses a token run to source text with single spaces. */
function text(array $tokens): string
{
    $s = '';
    foreach ($tokens as $t) {
        $s .= $t->is([T_WHITESPACE, T_COMMENT, T_DOC_COMMENT]) ? ' ' : $t->text;
    }
    $s = preg_replace('/\s+/', ' ', trim($s));
    return preg_replace(['/\( /', '/ \)/', '/\[ /', '/ \]/', '/ ,/'], ['(', ')', '[', ']', ','], $s);
}

/** Splits tokens on top-level commas. */
function splitParams(array $tokens): array
{
    $parts = [[]];
    $depth = 0;
    foreach ($tokens as $t) {
        if (in_array($t->text, ['(', '[', '{'], true)) {
            $depth++;
        } elseif (in_array($t->text, [')', ']', '}'], true)) {
            $depth--;
        }
        if ($depth === 0 && $t->text === ',') {
            $parts[] = [];
            continue;
        }
        $parts[count($parts) - 1][] = $t;
    }
    return array_values(array_filter($parts, static fn (array $p): bool => text($p) !== ''));
}

const MODIFIERS = [T_PUBLIC, T_PROTECTED, T_PRIVATE, T_STATIC, T_FINAL, T_ABSTRACT, T_READONLY, T_VAR];

/** One parameter's tokens -> ['name', 'type', 'default', 'promoted' => modifiers]. */
function param(array $tokens): array
{
    $mods = [];
    $rest = [];
    $attr = 0;
    $doc = null;
    foreach ($tokens as $t) {
        if ($t->is(T_DOC_COMMENT)) {
            $doc = $t->text;
            continue;
        }
        if ($rest === [] && $t->isIgnorable()) {
            continue;
        }
        if ($t->is(T_ATTRIBUTE)) {
            $attr++;
            continue;
        }
        if ($attr > 0) {
            if ($t->text === '[') {
                $attr++;
            } elseif ($t->text === ']') {
                $attr--;
            }
            continue;
        }
        if (in_array($t->id, MODIFIERS, true) && $rest === []) {
            $mods[] = strtolower($t->text);
            continue;
        }
        $rest[] = $t;
    }
    $src = text($rest);
    if (!preg_match('/^(.*?)\s*(&)?\s*(\.\.\.)?\$(\w+)\s*(?:=\s*(.*))?$/s', $src, $m)) {
        throw new RuntimeException("Cannot read parameter: $src");
    }
    return [
        'name' => $m[4],
        'type' => $m[1] !== '' ? $m[1] : null,
        'default' => isset($m[5]) && $m[5] !== '' ? $m[5] : null,
        'variadic' => $m[3] !== '',
        'byRef' => $m[2] !== '',
        'promoted' => $mods,
        'doc' => docblock($doc)[0],
    ];
}

function moduleOf(string $fqcn, array $map): string
{
    foreach ($map as $module => $patterns) {
        foreach ($patterns as $p) {
            if (str_ends_with($p, '\\*')) {
                if (str_starts_with($fqcn, substr($p, 0, -1))) {
                    return $module;
                }
            } elseif ($fqcn === "PakDataKit\\$p") {
                return $module;
            }
        }
    }
    throw new RuntimeException("$fqcn is not in site/scripts/api/modules.json (php)");
}

function significant(array $tokens, int $i): ?PhpToken
{
    for ($j = $i - 1; $j >= 0; $j--) {
        if (!$tokens[$j]->isIgnorable()) {
            return $tokens[$j];
        }
    }
    return null;
}

/** Reads one file; returns its classes. */
function readSource(string $path, string $rel): array
{
    $tokens = PhpToken::tokenize((string) file_get_contents($path));
    $n = count($tokens);
    $namespace = '';
    $classes = [];
    $doc = null;
    $mods = [];
    $depth = 0;
    $class = null;
    $classDepth = -1;
    for ($i = 0; $i < $n; $i++) {
        $t = $tokens[$i];
        if ($t->is([T_WHITESPACE, T_COMMENT])) {
            continue;
        }
        if ($t->is(T_DOC_COMMENT)) {
            $doc = $t->text;
            continue;
        }
        if ($t->is(T_ATTRIBUTE)) {
            // Skip #[...]
            $d = 1;
            while ($d > 0 && ++$i < $n) {
                if ($tokens[$i]->text === '[') {
                    $d++;
                } elseif ($tokens[$i]->text === ']') {
                    $d--;
                }
            }
            continue;
        }
        if ($t->is(T_NAMESPACE)) {
            $parts = [];
            while (++$i < $n && $tokens[$i]->text !== ';' && $tokens[$i]->text !== '{') {
                $parts[] = $tokens[$i];
            }
            $namespace = text($parts);
            $doc = null;
            continue;
        }
        if (in_array($t->id, MODIFIERS, true)) {
            $mods[] = strtolower($t->text);
            continue;
        }
        if ($t->is([T_CLASS, T_INTERFACE, T_TRAIT, T_ENUM]) && $class === null) {
            $prev = significant($tokens, $i);
            if ($prev !== null && ($prev->is(T_DOUBLE_COLON) || $prev->is(T_NEW))) {
                continue;
            }
            $kind = strtolower($t->text);
            $header = [];
            while (++$i < $n && $tokens[$i]->text !== '{') {
                $header[] = $tokens[$i];
            }
            $head = text($header);
            preg_match('/^(\w+)/', $head, $m);
            [$desc, $tags] = docblock($doc);
            $class = [
                'kind' => $kind,
                'name' => $m[1],
                'fqcn' => ltrim("$namespace\\{$m[1]}", '\\'),
                'signature' => trim(implode(' ', $mods) . " $kind $head"),
                'doc' => $desc,
                'internal' => tag($tags, 'internal') !== null,
                'fields' => [],
                'values' => [],
                'methods' => [],
                'source' => $rel,
            ];
            $depth++;
            $classDepth = $depth;
            $doc = null;
            $mods = [];
            continue;
        }
        if ($class !== null && $depth === $classDepth) {
            if ($t->is(T_FUNCTION)) {
                $name = null;
                while (++$i < $n) {
                    // The next word (it can be a keyword, like match).
                    if (!$tokens[$i]->isIgnorable() && $tokens[$i]->text !== '&') {
                        $name = $tokens[$i]->text;
                        break;
                    }
                }
                while ($tokens[$i]->text !== '(') {
                    $i++;
                }
                $paramTokens = [];
                $d = 1;
                while (++$i < $n) {
                    if ($tokens[$i]->text === '(') {
                        $d++;
                    } elseif ($tokens[$i]->text === ')') {
                        $d--;
                        if ($d === 0) {
                            break;
                        }
                    }
                    $paramTokens[] = $tokens[$i];
                }
                $ret = [];
                while (++$i < $n && $tokens[$i]->text !== '{' && $tokens[$i]->text !== ';') {
                    $ret[] = $tokens[$i];
                }
                $retType = ltrim(text($ret), ': ');
                // Skip the body.
                if ($tokens[$i]->text === '{') {
                    $d = 1;
                    while ($d > 0 && ++$i < $n) {
                        $x = $tokens[$i]->text;
                        if ($x === '{' || $tokens[$i]->is([T_CURLY_OPEN, T_DOLLAR_OPEN_CURLY_BRACES])) {
                            $d++;
                        } elseif ($x === '}') {
                            $d--;
                        }
                    }
                }
                $visibility = in_array('private', $mods, true) ? 'private' : (in_array('protected', $mods, true) ? 'protected' : 'public');
                [$desc, $tags] = docblock($doc);
                $ptags = paramTags($tags);
                $params = array_map('param', splitParams($paramTokens));
                if ($name === '__construct') {
                    foreach ($params as $p) {
                        if ($p['promoted'] !== [] && !in_array('private', $p['promoted'], true) && !in_array('protected', $p['promoted'], true)) {
                            $class['fields'][] = [
                                'name' => $p['name'],
                                'type' => $p['type'],
                                'default' => $p['default'],
                                'doc' => $p['doc'] !== '' ? $p['doc'] : ($ptags[$p['name']][1] ?? ''),
                                'static' => false,
                                'readonly' => in_array('readonly', $p['promoted'], true) || str_contains($class['signature'], 'readonly'),
                            ];
                        }
                    }
                }
                if ($visibility === 'public' && tag($tags, 'internal') === null) {
                    $paramText = array_map(static function (array $p): string {
                        return trim(($p['type'] ?? '') . ' ' . ($p['byRef'] ? '&' : '') . ($p['variadic'] ? '...' : '') . '$' . $p['name'] . ($p['default'] !== null ? ' = ' . $p['default'] : ''));
                    }, $params);
                    $head = implode(' ', array_values(array_filter($mods, static fn ($m) => $m !== 'final'))) . " function $name";
                    $head = trim($head);
                    $flat = "$head(" . implode(', ', $paramText) . ')' . ($retType !== '' ? ": $retType" : '');
                    $sig = strlen($flat) <= 90 || count($paramText) < 2
                        ? $flat
                        : "$head(\n" . implode('', array_map(static fn ($p) => "    $p,\n", $paramText)) . ')' . ($retType !== '' ? ": $retType" : '');
                    [$rtype, $rtext] = typeAndText(tag($tags, 'return'));
                    $throws = [];
                    foreach ($tags as [$tn, $tv]) {
                        if ($tn === 'throws') {
                            [$tt, $tx] = typeAndText($tv);
                            $throws[] = ['type' => $tt, 'doc' => $tx];
                        }
                    }
                    $entry = [
                        'kind' => $name === '__construct' ? 'constructor' : 'method',
                        'name' => $name,
                        'signature' => $sig,
                        'doc' => $desc,
                        'params' => array_map(static fn (array $p): array => [
                            'name' => '$' . $p['name'],
                            'type' => $p['type'] ?? ($ptags[$p['name']][0] ?? null),
                            'default' => $p['default'],
                            'doc' => $ptags[$p['name']][1] ?? '',
                        ], $params),
                        'returns' => $name === '__construct' || $retType === 'void' ? null : [
                            'type' => $rtype ?? ($retType !== '' ? $retType : null),
                            'doc' => $rtext,
                        ],
                    ];
                    if ($throws !== []) {
                        $entry['throws'] = $throws;
                    }
                    // A constructor that only declares properties is shown by its properties.
                    $onlyPromotes = $name === '__construct' && $desc === '' && $params !== []
                        && array_filter($params, static fn (array $p): bool => $p['promoted'] === []) === [];
                    if ((!str_starts_with($name, '__') || $name === '__construct') && !$onlyPromotes) {
                        $class['methods'][] = $entry;
                    }
                }
                $doc = null;
                $mods = [];
                continue;
            }
            if ($t->is(T_CONST)) {
                $rest = [];
                while (++$i < $n && $tokens[$i]->text !== ';') {
                    $rest[] = $tokens[$i];
                }
                $decl = text($rest);
                [$desc, $tags] = docblock($doc);
                $visibility = in_array('private', $mods, true) ? 'private' : (in_array('protected', $mods, true) ? 'protected' : 'public');
                if ($visibility === 'public' && preg_match('/^(?:(\S+)\s+)?(\w+)\s*=\s*(.*)$/s', $decl, $m)) {
                    $class['fields'][] = [
                        'name' => $m[2],
                        'type' => $m[1] !== '' ? $m[1] : null,
                        'default' => strlen($m[3]) <= 60 ? $m[3] : null,
                        'doc' => $desc,
                        'static' => true,
                        'readonly' => true,
                        'const' => true,
                    ];
                }
                $doc = null;
                $mods = [];
                continue;
            }
            if ($t->is(T_CASE)) {
                $rest = [];
                while (++$i < $n && $tokens[$i]->text !== ';') {
                    $rest[] = $tokens[$i];
                }
                [$desc] = docblock($doc);
                $class['values'][] = ['name' => text($rest), 'doc' => $desc];
                $doc = null;
                $mods = [];
                continue;
            }
            if ($t->is(T_USE)) {
                while (++$i < $n && $tokens[$i]->text !== ';') {
                }
                $doc = null;
                $mods = [];
                continue;
            }
            if ($mods !== [] && $t->text !== '}') {
                // A property: [type] $name [= default];
                $rest = [$t];
                while (++$i < $n && $tokens[$i]->text !== ';') {
                    $rest[] = $tokens[$i];
                }
                $decl = text($rest);
                [$desc, $tags] = docblock($doc);
                $visibility = in_array('private', $mods, true) ? 'private' : (in_array('protected', $mods, true) ? 'protected' : 'public');
                if ($visibility === 'public' && preg_match('/^(.*?)\s*\$(\w+)\s*(?:=\s*(.*))?$/s', $decl, $m)) {
                    [$vtype, $vtext] = typeAndText(tag($tags, 'var'));
                    $class['fields'][] = [
                        'name' => $m[2],
                        'type' => $m[1] !== '' ? $m[1] : $vtype,
                        'default' => isset($m[3]) && $m[3] !== '' ? $m[3] : null,
                        'doc' => $desc !== '' ? $desc : $vtext,
                        'static' => in_array('static', $mods, true),
                        'readonly' => in_array('readonly', $mods, true) || str_contains($class['signature'], 'readonly'),
                    ];
                }
                $doc = null;
                $mods = [];
                continue;
            }
        }
        if ($t->text === '{' || $t->is([T_CURLY_OPEN, T_DOLLAR_OPEN_CURLY_BRACES])) {
            $depth++;
        } elseif ($t->text === '}') {
            if ($class !== null && $depth === $classDepth) {
                $classes[] = $class;
                $class = null;
                $classDepth = -1;
            }
            $depth--;
        }
        if ($t->text === ';' || $t->text === '{' || $t->text === '}') {
            $doc = null;
            $mods = [];
        }
    }
    return $classes;
}

$files = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($src, FilesystemIterator::SKIP_DOTS));
$paths = [];
foreach ($files as $file) {
    if ($file->getExtension() === 'php') {
        $paths[] = str_replace('\\', '/', $file->getPathname());
    }
}
sort($paths, SORT_STRING);

$modules = [];
foreach ($paths as $path) {
    $rel = 'php/src/' . substr($path, strlen(str_replace('\\', '/', $src)) + 1);
    foreach (readSource($path, $rel) as $class) {
        if ($class['internal'] || str_starts_with($class['fqcn'], 'PakDataKit\\Internal\\')) {
            continue;
        }
        $module = moduleOf($class['fqcn'], $map);
        unset($class['internal']);
        if ($class['values'] === []) {
            unset($class['values']);
        }
        $modules[$module][] = $class;
    }
}

$order = array_flip(array_keys($map));
uksort($modules, static fn ($a, $b) => $order[$a] <=> $order[$b]);
$out = [];
foreach ($modules as $id => $classes) {
    // The order the module list in modules.json gives, then by namespace and name.
    $listed = array_flip($map[$id]);
    usort($classes, static function (array $a, array $b) use ($listed): int {
        $ka = $listed[$a['name']] ?? PHP_INT_MAX;
        $kb = $listed[$b['name']] ?? PHP_INT_MAX;
        return [$ka, $a['fqcn']] <=> [$kb, $b['fqcn']];
    });
    $namespace = substr($classes[0]['fqcn'], 0, strrpos($classes[0]['fqcn'], '\\'));
    $entries = array_map(static function (array $c): array {
        $c['name'] = str_starts_with($c['fqcn'], 'PakDataKit\\Laravel\\') ? substr($c['fqcn'], strlen('PakDataKit\\Laravel\\')) : $c['name'];
        unset($c['fqcn']);
        return $c;
    }, $classes);
    $out[] = [
        'id' => $id,
        'name' => $namespace,
        'import' => implode("\n", array_map(static fn ($c) => "use {$c['fqcn']};", array_slice($classes, 0, 3))) . (count($classes) > 3 ? "\n// ..." : ''),
        'source' => count(array_unique(array_column($classes, 'source'))) === 1 ? $classes[0]['source'] : 'php/src',
        'doc' => '',
        'entries' => $entries,
    ];
}

$data = [
    'language' => 'php',
    'package' => 'chmuzamil/pakdatakit',
    'generator' => 'PHP tokenizer (PhpToken) and a docblock reader',
    'modules' => $out,
];
$json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
// Two-space indent, like the other files.
$json = preg_replace_callback('/^( +)/m', static fn (array $m): string => str_repeat(' ', intdiv(strlen($m[1]), 2)), $json);
file_put_contents("$root/site/api-data/php.json", $json . "\n");
$count = array_sum(array_map(static fn ($m) => count($m['entries']), $out));
echo 'php: ' . count($out) . " modules, $count entries -> site/api-data/php.json\n";
