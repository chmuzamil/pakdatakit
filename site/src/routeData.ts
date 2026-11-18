/**
 * Starlight route middleware: titles and descriptions for the generated
 * TypeScript API reference (starlight-typedoc gives every page the site's
 * default description, and the six adapters each have a page titled "pk").
 *
 * - module pages: "pakdatakit/cnic", described by the functions they export
 * - symbol pages: described by their own doc comment's first sentence
 * - adapter symbols: "pk (Zod adapter)"
 */
import { defineRouteMiddleware } from '@astrojs/starlight/route-data';

const KIND: Record<string, string> = {
  functions: 'function',
  interfaces: 'interface',
  'type-aliases': 'type',
  variables: 'constant',
  classes: 'class',
  enumerations: 'enum',
};
const ADAPTER: Record<string, string> = {
  zod: 'Zod',
  valibot: 'Valibot',
  yup: 'Yup',
  joi: 'Joi',
  superstruct: 'Superstruct',
  'class-validator': 'class-validator',
};

/** Plain text of a Markdown fragment (links, code spans, emphasis removed). */
const plain = (md: string) =>
  md
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/[`*_]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/** The first prose paragraph of a generated page (after the signature and "Defined in"). */
function summary(body: string): string | undefined {
  const paragraphs = body.replace(/```[\s\S]*?```/g, '').split(/\n\s*\n/);
  for (const p of paragraphs) {
    const t = p.trim();
    if (!t || /^(#|\||Defined in|<a |-{3})/.test(t)) continue;
    return plain(t);
  }
  return undefined;
}

/** Cut to at most `max` characters at a word boundary. */
function clip(text: string, max = 155): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:]$/, '')}…`;
}

export const onRequest = defineRouteMiddleware((context) => {
  const route = context.locals.starlightRoute;
  if (!route.id.startsWith('api/typescript/')) return;
  const parts = route.id.split('/').slice(2);
  const adapter = parts[0] === 'adapters' ? parts[1] : undefined;
  const module = adapter ? `adapters/${adapter}` : parts[0];
  const rest = parts.slice(adapter ? 2 : 1);
  const subpath = adapter ?? module;
  const data = route.entry.data;
  const body = route.entry.body ?? '';
  let title = data.title;
  let description: string;

  if (rest.length === 0) {
    // A module's index page.
    title = `pakdatakit/${subpath}`;
    const names = [...body.matchAll(/^\| \[([^\]]+)\]\(/gm)].map((m) => m[1]);
    description = clip(
      `TypeScript API for pakdatakit/${subpath}${adapter ? ` (${ADAPTER[adapter] ?? adapter} adapter)` : ''}: ${names.slice(0, 8).join(', ')}${names.length > 8 ? ' and more' : ''}. Signatures, parameters, return values and examples.`,
    );
  } else {
    const kind = KIND[rest[0]] ?? 'symbol';
    const name = data.title;
    if (adapter) title = `${name} (${ADAPTER[adapter] ?? adapter} adapter)`;
    const what = summary(body);
    const label = kind === 'function' ? `${name}()` : `${name} (${kind})`;
    description = clip(
      `${label} in pakdatakit/${subpath}: ${what ?? `TypeScript ${kind} reference with its signature and types.`}`,
    );
  }

  data.title = title;
  data.description = description;
  for (const tag of route.head) {
    const attrs = tag.attrs ?? {};
    if (tag.tag === 'title') tag.content = `${title} | PakDataKit`;
    else if (
      attrs.name === 'description' ||
      attrs.property === 'og:description'
    )
      attrs.content = description;
    else if (attrs.property === 'og:title') attrs.content = title;
  }
});
