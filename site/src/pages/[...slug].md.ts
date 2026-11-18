/**
 * A Markdown copy of every documentation page, next to it: /docs/cnic/ is
 * also /docs/cnic.md. For people and AI assistants who want the text without
 * the page around it ("View as Markdown" / "Copy page" on each page).
 *
 * MDX is turned into plain Markdown: the language tabs become one code block
 * per language (from site/examples, like the page itself), live widgets are
 * left out, and link cards become links.
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection, type CollectionEntry } from 'astro:content';
import { SITE } from '../../site.config.mjs';
import { LANGS, snippet, type Example } from '../lib/snippets';

const examples = import.meta.glob<{ examples: Example[] }>(
  '../../examples/*.json',
  {
    eager: true,
    import: 'default',
  },
);

/** Pages without a Markdown copy: the home page (a landing page) and 404. */
const SKIP = new Set(['index', '404']);

export const getStaticPaths = (async () => {
  const entries = await getCollection(
    'docs',
    (e) => !SKIP.has(e.id) && !!e.body,
  );
  return entries.map((entry) => ({
    params: { slug: entry.id },
    props: { entry },
  }));
}) satisfies GetStaticPaths;

function langTabs(module: string): string {
  const file = examples[`../../examples/${module}.json`];
  if (!file) throw new Error(`[...slug].md: no site/examples/${module}.json`);
  return LANGS.map(
    (lang) =>
      `**${lang.label}**\n\n\`\`\`${lang.code}\n${snippet(lang.id, file.examples)}\n\`\`\``,
  ).join('\n\n');
}

function toMarkdown(body: string): string {
  return (
    body
      .replace(/\r\n/g, '\n')
      // imports and exports of MDX
      .replace(/^(import|export) .*$/gm, '')
      // language tabs: every language, one code block each
      .replace(/<LangTabs\s+module="([^"]+)"\s*\/>/g, (_, m: string) =>
        langTabs(m),
      )
      // link cards: a plain link with the card's description
      .replace(/<LinkCard\s+([\s\S]*?)\/>/g, (_, attrs: string) => {
        const a = (k: string) =>
          new RegExp(`${k}="([^"]*)"`).exec(attrs)?.[1] ?? '';
        return `- [${a('title')}](${new URL(a('href'), SITE).href})${a('description') ? `: ${a('description')}` : ''}`;
      })
      // live widgets and other self-closing components: left out
      .replace(/^\s*<[A-Z][A-Za-z]*\b[^>]*\/>\s*$/gm, '')
      // wrappers (CardGrid, Card): keep what is inside
      .replace(/^\s*<\/?[A-Z][A-Za-z]*\b[^>]*>\s*$/gm, '')
      // Starlight asides (:::caution[Title] … :::) become blockquotes
      .replace(
        /^:::(\w+)(?:\[([^\]]*)\])?\n([\s\S]*?)\n:::\s*$/gm,
        (_, kind: string, title: string | undefined, text: string) =>
          [
            `**${title || kind.charAt(0).toUpperCase() + kind.slice(1)}**`,
            '',
            ...text.split('\n'),
          ]
            .map((line) => (line ? `> ${line}` : '>'))
            .join('\n'),
      )
      // site-relative links become absolute
      .replace(
        /\]\((\/[^)\s]*)\)/g,
        (_, href: string) => `](${new URL(href, SITE).href})`,
      )
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
}

export const GET: APIRoute<{ entry: CollectionEntry<'docs'> }> = ({
  props,
}) => {
  const { entry } = props;
  const url = new URL(`/${entry.id}/`, SITE).href;
  const text = [
    `# ${entry.data.title}`,
    entry.data.description ? `> ${entry.data.description}` : '',
    `Source: ${url}`,
    toMarkdown(entry.body ?? ''),
  ]
    .filter(Boolean)
    .join('\n\n');
  return new Response(`${text}\n`, {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
};
