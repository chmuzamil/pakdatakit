/**
 * The Open Graph image for every page: the repo's banner.png (1600×800),
 * the same image as the README banner and GitHub's social preview.
 */
import type { APIRoute } from 'astro';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const GET: APIRoute = () =>
  new Response(readFileSync(join(process.cwd(), '..', 'banner.png')), {
    headers: { 'Content-Type': 'image/png' },
  });
