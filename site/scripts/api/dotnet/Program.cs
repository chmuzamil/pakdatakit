// Extracts the public API of the .NET port into site/api-data/dotnet.json.
//
// Types and members: reflection over the built PakDataKit,
// PakDataKit.DataAnnotations and PakDataKit.FluentValidation assemblies
// (public types outside *.Internal; members declared on the type, without
// compiler-generated ones). Descriptions: the XML documentation files the C#
// compiler writes next to each assembly (GenerateDocumentationFile), turned
// into Markdown. Page grouping: site/scripts/api/modules.json.

using System.Reflection;
using System.Runtime.CompilerServices;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using System.Xml.Linq;

var root = FindRoot(AppContext.BaseDirectory);
var assemblies = new[]
{
    typeof(PakDataKit.Cnic).Assembly,
    typeof(PakDataKit.DataAnnotations.CnicAttribute).Assembly,
    typeof(PakDataKit.FluentValidation.PakRuleBuilderExtensions).Assembly,
};

var docs = new Dictionary<string, XElement>();
foreach (var asm in assemblies)
{
    var xml = Path.ChangeExtension(asm.Location, ".xml");
    if (!File.Exists(xml)) throw new InvalidOperationException($"No XML documentation next to {asm.Location}");
    foreach (var member in XDocument.Load(xml).Descendants("member"))
        docs[member.Attribute("name")!.Value] = member;
}

var map = JsonNode.Parse(File.ReadAllText(Path.Combine(root, "site", "scripts", "api", "modules.json")))!["dotnet"]!.AsObject();
string ModuleOf(Type t)
{
    foreach (var (module, list) in map)
        foreach (var pattern in list!.AsArray().Select(n => n!.GetValue<string>()))
            if (pattern.EndsWith(".*") ? t.Namespace == pattern[..^2] : t.Namespace == "PakDataKit" && t.Name == pattern)
                return module;
    throw new InvalidOperationException($"{t.FullName} is not in site/scripts/api/modules.json (dotnet)");
}

var nullability = new NullabilityInfoContext();
var modules = new SortedDictionary<string, List<(int Order, JsonObject Entry)>>(StringComparer.Ordinal);
var order = map.Select((kv, i) => (kv.Key, i)).ToDictionary(x => x.Key, x => x.i);

foreach (var asm in assemblies)
{
    foreach (var type in asm.GetExportedTypes())
    {
        if (type.Namespace is null || type.Namespace.Contains(".Internal")) continue;
        if (type.IsNested) continue;
        var module = ModuleOf(type);
        var list = modules.TryGetValue(module, out var l) ? l : modules[module] = new();
        list.Add((MetadataOrder(type), TypeEntry(type)));
    }
}

var outModules = new JsonArray();
foreach (var (id, entries) in modules.OrderBy(kv => order[kv.Key]).ThenBy(kv => kv.Key))
{
    var ns = entries.Select(e => e.Entry["namespace"]!.GetValue<string>()).First();
    var arr = new JsonArray();
    foreach (var (_, entry) in entries.OrderBy(e => e.Order))
    {
        entry.Remove("namespace");
        arr.Add(entry);
    }
    outModules.Add(new JsonObject
    {
        ["id"] = id,
        ["name"] = ns,
        ["import"] = $"using {ns};",
        ["source"] = ns == "PakDataKit" ? "dotnet/src/PakDataKit" : $"dotnet/src/{ns}",
        ["doc"] = "",
        ["entries"] = arr,
    });
}

var data = new JsonObject
{
    ["language"] = "dotnet",
    ["package"] = "PakDataKit",
    ["generator"] = $"C# compiler XML documentation + System.Reflection (.NET {Environment.Version.Major}.{Environment.Version.Minor})",
    ["modules"] = outModules,
};
var outPath = Path.Combine(root, "site", "api-data", "dotnet.json");
var json = data.ToJsonString(new JsonSerializerOptions
{
    WriteIndented = true,
    Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
}).Replace("\r\n", "\n");
File.WriteAllText(outPath, json + "\n", new UTF8Encoding(false));
Console.WriteLine($"dotnet: {outModules.Count} modules, {outModules.Sum(m => m!["entries"]!.AsArray().Count)} entries -> site/api-data/dotnet.json");
return 0;

// ---------------------------------------------------------------- entries --

JsonObject TypeEntry(Type t)
{
    var isRecord = t.GetProperty("EqualityContract", BindingFlags.NonPublic | BindingFlags.Instance) is not null;
    var isStatic = t.IsAbstract && t.IsSealed;
    string kind = t.IsEnum ? "enum" : t.IsInterface ? "interface" : t.IsValueType ? "struct" : isRecord ? "record" : "class";
    var modifiers = new List<string> { "public" };
    if (isStatic) modifiers.Add("static");
    else if (t.IsAbstract && !t.IsInterface) modifiers.Add("abstract");
    else if (t.IsSealed && !t.IsValueType && !t.IsEnum) modifiers.Add("sealed");
    var sig = new StringBuilder($"{string.Join(' ', modifiers)} {kind} {TypeName(t, null, true)}");
    var typeDoc = Doc($"T:{DocId(t)}");

    // A positional record: show its parameters like its declaration does.
    var positional = isRecord ? t.GetMethod("Deconstruct") : null;
    if (positional is not null)
        sig.Append('(').Append(string.Join(", ", positional.GetParameters().Select(p =>
        {
            var prop = t.GetProperty(p.Name!)!;
            return $"{TypeName(prop.PropertyType, nullability.Create(prop))} {p.Name}";
        }))).Append(')');
    if (t.BaseType is { } b && b != typeof(object) && b != typeof(ValueType) && b != typeof(Enum))
        sig.Append(" : ").Append(TypeName(b, null));

    var entry = new JsonObject
    {
        ["kind"] = kind,
        ["name"] = TypeName(t, null, true),
        ["namespace"] = t.Namespace,
        ["signature"] = sig.ToString(),
        ["doc"] = Text(typeDoc, "summary", "remarks", "example"),
    };

    var flags = BindingFlags.Public | BindingFlags.Static | BindingFlags.Instance | BindingFlags.DeclaredOnly;
    if (t.IsEnum)
    {
        entry["values"] = new JsonArray(t.GetFields(BindingFlags.Public | BindingFlags.Static).OrderBy(MetadataOrder).Select(f => (JsonNode)new JsonObject
        {
            ["name"] = f.Name,
            ["doc"] = Text(Doc($"F:{DocId(t)}.{f.Name}"), "summary", "remarks"),
        }).ToArray());
        entry["fields"] = new JsonArray();
        entry["methods"] = new JsonArray();
        return entry;
    }

    var fields = new JsonArray();
    foreach (var f in t.GetFields(flags).Where(f => !f.IsSpecialName).OrderBy(MetadataOrder))
    {
        fields.Add(new JsonObject
        {
            ["name"] = f.Name,
            ["type"] = TypeName(f.FieldType, nullability.Create(f)),
            ["default"] = f.IsLiteral ? Literal(f.GetRawConstantValue(), f.FieldType) : null,
            ["doc"] = Text(Doc($"F:{DocId(t)}.{f.Name}"), "summary", "remarks"),
            ["static"] = f.IsStatic,
            ["readonly"] = f.IsLiteral || f.IsInitOnly,
        });
    }
    foreach (var p in t.GetProperties(flags).OrderBy(MetadataOrder))
    {
        if (p.Name == "EqualityContract" || p.GetMethod is not { IsPublic: true }) continue;
        var pDoc = Doc($"P:{DocId(t)}.{p.Name}");
        var text = Text(pDoc, "summary", "remarks");
        if (text == "" && typeDoc is not null)
            // A positional record's properties are documented as its parameters.
            text = Inline(typeDoc.Elements("param").FirstOrDefault(e => e.Attribute("name")?.Value == p.Name));
        var setter = p.SetMethod is { IsPublic: true } s
            ? s.ReturnParameter.GetRequiredCustomModifiers().Any(m => m.Name == "IsExternalInit") ? "init" : "set"
            : null;
        fields.Add(new JsonObject
        {
            ["name"] = p.Name,
            ["type"] = TypeName(p.PropertyType, nullability.Create(p)),
            ["default"] = null,
            ["doc"] = text,
            ["static"] = p.GetMethod!.IsStatic,
            ["readonly"] = setter is null,
            ["accessors"] = setter is null ? "get" : $"get; {setter}",
        });
    }
    entry["fields"] = fields;

    var methods = new JsonArray();
    foreach (var c in t.GetConstructors(BindingFlags.Public | BindingFlags.Instance).OrderBy(MetadataOrder))
    {
        if (isRecord && positional is not null) continue; // shown in the signature
        var doc = Doc($"M:{DocId(t)}.#ctor{ParamIds(c)}");
        if (doc is null && c.GetParameters().Length == 0) continue; // implicit
        methods.Add(Method(c, "constructor", doc, t));
    }
    foreach (var m in t.GetMethods(flags).OrderBy(MetadataOrder))
    {
        if (m.IsSpecialName || m.GetCustomAttribute<CompilerGeneratedAttribute>() is not null) continue;
        if (!m.IsPublic) continue;
        var doc = Doc($"M:{DocId(t)}.{m.Name}{(m.IsGenericMethod ? $"``{m.GetGenericArguments().Length}" : "")}{ParamIds(m)}");
        // Compiler-written record members (ToString, Equals, GetHashCode, <Clone>$).
        if (doc is null && isRecord && (m.Name is "ToString" or "Equals" or "GetHashCode" or "Deconstruct" || m.Name.StartsWith('<'))) continue;
        methods.Add(Method(m, "method", doc, t));
    }
    entry["methods"] = methods;
    return entry;
}

JsonObject Method(MethodBase m, string kind, XElement? doc, Type owner)
{
    var parameters = m.GetParameters();
    var isExtension = m.IsDefined(typeof(ExtensionAttribute), false);
    var name = m is ConstructorInfo ? TypeName(owner, null, true) : m.Name + (m.IsGenericMethod ? $"<{string.Join(", ", m.GetGenericArguments().Select(a => a.Name))}>" : "");
    var parts = parameters.Select((p, i) =>
    {
        var prefix = i == 0 && isExtension ? "this " : p.IsDefined(typeof(ParamArrayAttribute), false) ? "params " : p.IsOut ? "out " : p.ParameterType.IsByRef ? "ref " : "";
        var text = $"{prefix}{TypeName(p.ParameterType, nullability.Create(p))} {p.Name}";
        if (p.HasDefaultValue) text += $" = {Literal(p.RawDefaultValue, p.ParameterType)}";
        return text;
    }).ToList();
    var mods = new List<string> { "public" };
    if (m.IsStatic) mods.Add("static");
    if (m is MethodInfo mi && mi.GetBaseDefinition() != mi) mods.Add("override");
    else if (m.IsAbstract) mods.Add("abstract");
    else if (m.IsVirtual && !m.IsFinal) mods.Add("virtual");
    var ret = m is MethodInfo info ? TypeName(info.ReturnType, nullability.Create(info.ReturnParameter)) + " " : "";
    var head = $"{string.Join(' ', mods)} {ret}{name}";
    var flat = $"{head}({string.Join(", ", parts)})";
    var sig = flat.Length <= 90 || parts.Count < 2 ? flat : $"{head}(\n{string.Join(",\n", parts.Select(p => "    " + p))})";

    var paramArr = new JsonArray(parameters.Select(p => (JsonNode)new JsonObject
    {
        ["name"] = p.Name,
        ["type"] = TypeName(p.ParameterType, nullability.Create(p)),
        ["default"] = p.HasDefaultValue ? Literal(p.RawDefaultValue, p.ParameterType) : null,
        ["doc"] = Inline(doc?.Elements("param").FirstOrDefault(e => e.Attribute("name")?.Value == p.Name)),
    }).ToArray());
    var throws = doc?.Elements("exception").Select(e => (JsonNode)new JsonObject
    {
        ["type"] = CrefName(e.Attribute("cref")?.Value ?? ""),
        ["doc"] = Inline(e),
    }).ToArray() ?? [];
    var typeParams = doc?.Elements("typeparam").Select(e => (JsonNode)new JsonObject
    {
        ["name"] = e.Attribute("name")?.Value,
        ["doc"] = Inline(e),
    }).ToArray() ?? [];
    var result = new JsonObject
    {
        ["kind"] = kind,
        ["name"] = m is ConstructorInfo ? name : m.Name,
        ["signature"] = sig,
        ["doc"] = Text(doc, "summary", "remarks", "example"),
        ["params"] = paramArr,
        ["returns"] = m is MethodInfo r && r.ReturnType != typeof(void)
            ? new JsonObject
            {
                ["type"] = TypeName(r.ReturnType, nullability.Create(r.ReturnParameter)),
                ["doc"] = Inline(doc?.Element("returns")),
            }
            : null,
    };
    if (typeParams.Length > 0) result["typeParams"] = new JsonArray(typeParams);
    if (throws.Length > 0) result["throws"] = new JsonArray(throws);
    return result;
}

// ------------------------------------------------------------ type names --

static string Keyword(Type t) => t == typeof(string) ? "string"
    : t == typeof(int) ? "int"
    : t == typeof(long) ? "long"
    : t == typeof(bool) ? "bool"
    : t == typeof(double) ? "double"
    : t == typeof(decimal) ? "decimal"
    : t == typeof(float) ? "float"
    : t == typeof(object) ? "object"
    : t == typeof(char) ? "char"
    : t == typeof(byte) ? "byte"
    : t == typeof(void) ? "void"
    : t == typeof(short) ? "short"
    : t == typeof(uint) ? "uint"
    : t == typeof(ulong) ? "ulong"
    : "";

string TypeName(Type t, NullabilityInfo? n, bool declaration = false)
{
    if (t.IsByRef) return TypeName(t.GetElementType()!, n?.ElementType ?? n);
    var nullable = n is { ReadState: NullabilityState.Nullable } && !t.IsValueType ? "?" : "";
    if (Nullable.GetUnderlyingType(t) is { } u) return TypeName(u, null) + "?";
    if (t.IsArray) return TypeName(t.GetElementType()!, n?.ElementType) + "[]" + nullable;
    var kw = Keyword(t);
    if (kw != "") return kw + nullable;
    if (t.IsGenericParameter) return t.Name;
    var name = t.Name;
    var tick = name.IndexOf('`');
    if (tick >= 0) name = name[..tick];
    if (t.IsGenericType)
    {
        var args = t.GetGenericArguments();
        var argNames = args.Select((a, i) => declaration ? a.Name : TypeName(a, n?.GenericTypeArguments.ElementAtOrDefault(i)));
        name += $"<{string.Join(", ", argNames)}>";
    }
    return name + nullable;
}

static string Literal(object? value, Type type)
{
    if (value is null) return type.IsValueType && Nullable.GetUnderlyingType(type) is null ? "default" : "null";
    var target = Nullable.GetUnderlyingType(type) ?? type;
    if (target.IsEnum) return $"{target.Name}.{Enum.GetName(target, value)}";
    return value switch
    {
        string s => JsonSerializer.Serialize(s),
        bool b => b ? "true" : "false",
        char c => $"'{c}'",
        double d => d.ToString(System.Globalization.CultureInfo.InvariantCulture),
        _ => Convert.ToString(value, System.Globalization.CultureInfo.InvariantCulture) ?? "",
    };
}

// ------------------------------------------------------------ XML doc ids --

static string DocId(Type t)
{
    if (t.IsGenericParameter)
        return t.DeclaringMethod is not null ? $"``{t.GenericParameterPosition}" : $"`{t.GenericParameterPosition}";
    if (t.IsByRef) return DocId(t.GetElementType()!) + "@";
    if (t.IsArray) return DocId(t.GetElementType()!) + "[]";
    var full = (t.IsNested ? DocId(t.DeclaringType!) + "." + t.Name : $"{t.Namespace}.{t.Name}");
    if (t.IsGenericType && !t.IsGenericTypeDefinition)
    {
        full = full[..full.IndexOf('`')];
        full += "{" + string.Join(",", t.GetGenericArguments().Select(DocId)) + "}";
    }
    return full;
}

static string ParamIds(MethodBase m)
{
    var ps = m.GetParameters();
    return ps.Length == 0 ? "" : "(" + string.Join(",", ps.Select(p => DocId(p.ParameterType))) + ")";
}

XElement? Doc(string id) => docs.TryGetValue(id, out var e) ? e : null;

// --------------------------------------------------------- XML to Markdown --

static string CrefName(string cref)
{
    // "M:PakDataKit.Cnic.Validate(System.String)" -> "Cnic.Validate"
    var s = cref.Length > 2 && cref[1] == ':' ? cref[2..] : cref;
    var paren = s.IndexOf('(');
    if (paren >= 0) s = s[..paren];
    s = Regex.Replace(s, "`+\\d+", "");
    foreach (var ns in new[] { "PakDataKit.DataAnnotations.", "PakDataKit.FluentValidation.", "PakDataKit." })
        if (s.StartsWith(ns)) return s[ns.Length..];
    var parts = s.Split('.');
    // System.ComponentModel.DataAnnotations.RequiredAttribute -> RequiredAttribute
    return cref.StartsWith("T:") || parts.Length < 2 ? parts[^1] : string.Join('.', parts[^2..]);
}

string Text(XElement? doc, params string[] sections)
{
    if (doc is null) return "";
    var parts = new List<string>();
    foreach (var name in sections)
        foreach (var el in doc.Elements(name))
        {
            var md = Block(el).Trim();
            if (md != "") parts.Add(md);
        }
    return string.Join("\n\n", parts);
}

string Inline(XElement? el) => el is null ? "" : Regex.Replace(Block(el).Trim(), "\\s*\\n\\s*", " ");

string Block(XElement el)
{
    var sb = new StringBuilder();
    foreach (var node in el.Nodes())
    {
        if (node is XText text)
        {
            sb.Append(Regex.Replace(text.Value, "[ \\t]*\\n[ \\t]*", "\n"));
            continue;
        }
        if (node is not XElement e) continue;
        switch (e.Name.LocalName)
        {
            case "c":
                sb.Append('`').Append(e.Value).Append('`');
                break;
            case "code":
                sb.Append("\n\n```csharp\n").Append(Dedent(e.Value)).Append("\n```\n\n");
                break;
            case "para":
                sb.Append("\n\n").Append(Block(e).Trim()).Append("\n\n");
                break;
            case "see":
            case "seealso":
                if (e.Attribute("cref") is { } cref)
                    sb.Append("{@link ").Append(CrefName(cref.Value)).Append('}');
                else if (e.Attribute("langword") is { } word)
                    sb.Append('`').Append(word.Value).Append('`');
                else if (e.Attribute("href") is { } href)
                    sb.Append('[').Append(e.Value.Length > 0 ? e.Value : href.Value).Append("](").Append(href.Value).Append(')');
                break;
            case "paramref":
            case "typeparamref":
                sb.Append('`').Append(e.Attribute("name")?.Value).Append('`');
                break;
            case "list":
                sb.Append("\n\n");
                var numbered = e.Attribute("type")?.Value == "number";
                var i = 1;
                foreach (var item in e.Elements("item"))
                {
                    var term = item.Element("term");
                    var desc = item.Element("description");
                    var body = term is not null
                        ? $"**{Inline(term)}**{(desc is not null ? ": " + Inline(desc) : "")}"
                        : desc is not null ? Inline(desc) : Inline(item);
                    sb.Append(numbered ? $"{i++}. " : "- ").Append(body).Append('\n');
                }
                sb.Append('\n');
                break;
            case "example":
                sb.Append("\n\n").Append(Block(e).Trim()).Append("\n\n");
                break;
            case "b":
            case "strong":
                sb.Append("**").Append(e.Value).Append("**");
                break;
            case "i":
            case "em":
                sb.Append('*').Append(e.Value).Append('*');
                break;
            case "br":
                sb.Append('\n');
                break;
            case "inheritdoc":
                break;
            default:
                sb.Append(Block(e));
                break;
        }
    }
    return Regex.Replace(sb.ToString(), "\\n{3,}", "\n\n");
}

static string Dedent(string code)
{
    var lines = code.Replace("\r\n", "\n").Split('\n').ToList();
    while (lines.Count > 0 && lines[0].Trim() == "") lines.RemoveAt(0);
    while (lines.Count > 0 && lines[^1].Trim() == "") lines.RemoveAt(lines.Count - 1);
    var indent = lines.Where(l => l.Trim() != "").Select(l => l.Length - l.TrimStart().Length).DefaultIfEmpty(0).Min();
    return string.Join("\n", lines.Select(l => l.Length >= indent ? l[indent..] : l.TrimStart()));
}

// ------------------------------------------------------------------ misc --

// Declaration order in the source, as the compiler emitted it.
static int MetadataOrder(MemberInfo m) => m.MetadataToken;

static string FindRoot(string start)
{
    for (var dir = new DirectoryInfo(start); dir is not null; dir = dir.Parent)
        if (File.Exists(Path.Combine(dir.FullName, "dotnet", "Directory.Build.props")) && Directory.Exists(Path.Combine(dir.FullName, "site")))
            return dir.FullName;
    throw new InvalidOperationException($"No repository root above {start}");
}
