#!/usr/bin/env node
/**
 * Regenerates the shared test vectors and every port's generated data, then
 * runs each port's test suite against them.
 *
 *   npm run test:ports                  # everything
 *   npm run test:ports -- python dart   # only these ports
 *   npm run test:ports -- --strict      # fail if a toolchain is missing
 *
 * Ports: ts, python, dart, dotnet, php. A port whose toolchain is not
 * installed is skipped with a warning (an error with --strict).
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const strict = argv.includes('--strict');
const ALL = ['ts', 'python', 'dart', 'dotnet', 'php'];
const wanted = argv.filter((a) => !a.startsWith('--'));
for (const name of wanted) {
  if (!ALL.includes(name)) {
    console.error(`Unknown port "${name}". Choose from: ${ALL.join(', ')}`);
    process.exit(2);
  }
}
const ports = wanted.length ? wanted : ALL;

/** Runs a command, streaming its output; returns true on exit code 0. */
function run(cmd, args, cwd = root) {
  console.log(
    `\n$ ${[cmd, ...args].join(' ')}${cwd === root ? '' : `   (in ${cwd.slice(root.length + 1)})`}`,
  );
  const result = spawnSync(cmd, args, {
    cwd,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  return result.status === 0;
}

/** True if `cmd` can be started. */
function has(cmd) {
  const result = spawnSync(cmd, ['--version'], {
    stdio: 'ignore',
    shell: process.platform === 'win32',
  });
  return result.status === 0;
}

const results = [];
function record(port, outcome) {
  results.push([port, outcome]);
}
function missing(port, tool) {
  const message = `${tool} not found`;
  console.warn(`\n! ${port}: ${message}; ${strict ? 'failing' : 'skipping'}`);
  record(port, strict ? `FAILED (${message})` : `skipped (${message})`);
}

// 1. Build and regenerate.
console.log('== Build and regenerate');
const prepared =
  run('npm', ['run', 'build']) &&
  run('node', ['scripts/generate-test-vectors.mjs']) &&
  run('node', ['scripts/generate-dart-data.mjs']) &&
  run('node', ['scripts/generate-php-data.mjs']);
if (!prepared) {
  console.error('\nBuild or generation failed; no port was tested.');
  process.exit(1);
}

// 2. Run each port.
for (const port of ports) {
  console.log(`\n== ${port}`);
  switch (port) {
    case 'ts':
      record(port, run('npm', ['test']) ? 'passed' : 'FAILED');
      break;

    case 'python': {
      const cwd = join(root, 'python');
      if (has('uv')) {
        const ok = run(
          'uv',
          ['run', '-q', '--with', 'pytest', 'python', '-m', 'pytest', '-q'],
          cwd,
        );
        record(port, ok ? 'passed' : 'FAILED');
      } else if (has('python')) {
        const ok = run('python', ['-m', 'pytest', '-q'], cwd);
        record(port, ok ? 'passed' : 'FAILED');
      } else {
        missing(port, 'uv or python');
      }
      break;
    }

    case 'dart': {
      const cwd = join(root, 'dart');
      if (!has('dart')) {
        missing(port, 'dart');
        break;
      }
      const ok = run('dart', ['pub', 'get'], cwd) && run('dart', ['test'], cwd);
      record(port, ok ? 'passed' : 'FAILED');
      break;
    }

    case 'dotnet': {
      const cwd = join(root, 'dotnet');
      if (!has('dotnet')) {
        missing(port, 'dotnet');
        break;
      }
      record(port, run('dotnet', ['test'], cwd) ? 'passed' : 'FAILED');
      break;
    }

    case 'php': {
      const cwd = join(root, 'php');
      if (!has('php')) {
        missing(port, 'php');
        break;
      }
      if (!existsSync(join(cwd, 'vendor'))) {
        if (!has('composer')) {
          missing(port, 'composer');
          break;
        }
        if (
          !run(
            'composer',
            ['install', '--no-interaction', '--no-progress'],
            cwd,
          )
        ) {
          record(port, 'FAILED (composer install)');
          break;
        }
      }
      const phpunit = join('vendor', 'bin', 'phpunit');
      record(port, run('php', [phpunit], cwd) ? 'passed' : 'FAILED');
      break;
    }
  }
}

// 3. Summary.
console.log('\n== Summary');
for (const [port, outcome] of results)
  console.log(`${port.padEnd(8)} ${outcome}`);
const changed = spawnSync(
  'git',
  [
    'status',
    '--porcelain',
    '--',
    'test-vectors',
    'python/src/pakdatakit/data',
    'dart/lib/src/data',
    'php/data',
  ],
  { cwd: root, encoding: 'utf8' },
);
if (changed.status === 0 && changed.stdout.trim()) {
  console.log(
    '\nRegenerated files differ from git; commit them with your change:',
  );
  console.log(changed.stdout.trimEnd());
}
process.exit(
  results.some(([, outcome]) => outcome.startsWith('FAILED')) ? 1 : 0,
);
