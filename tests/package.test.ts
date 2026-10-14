import { describe, expect, it } from 'vitest';
import pkg from '../package.json';
import { adapters, modules } from '../tsup.config.js';

describe('package exports', () => {
  it('exposes every built module as a subpath', () => {
    const subpaths = Object.keys(pkg.exports)
      .filter((key) => key !== '.' && key !== './package.json')
      .map((key) => key.slice(2))
      .sort();
    expect(subpaths).toEqual([...modules, ...adapters].sort());
  });
});
