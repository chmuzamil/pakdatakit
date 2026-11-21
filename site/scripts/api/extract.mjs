/**
 * Re-extracts the public API of the Python, Dart, .NET and PHP ports into
 * site/api-data/*.json (npm run api:extract). Needs each port's toolchain;
 * pass port names to run only some of them:
 *
 *   npm run api:extract              all four
 *   npm run api:extract -- python    just Python
 *
 * - Python: griffe (pinned in requirements.txt), via uv when it is installed
 * - Dart: the analyzer package (pinned in dart/pubspec.yaml and pubspec.lock)
 * - .NET: reflection plus the compiler's XML documentation (dotnet/)
 * - PHP: PHP's tokenizer (extract-php.php)
 *
 * CI (the api-data job in .github/workflows/site.yml) runs the same and fails
 * if the committed files differ.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const root = join(here, '..', '..', '..');
const only = process.argv.slice(2);
// Windows needs a shell for dart.bat and the like; give it one quoted string.
const win = process.platform === 'win32';
const line = (cmd, args) =>
  [cmd, ...args.map((a) => (/[\s"]/.test(a) ? `"${a}"` : a))].join(' ');
const run = (cmd, args, cwd = root) =>
  win
    ? execFileSync(line(cmd, args), { cwd, stdio: 'inherit', shell: true })
    : execFileSync(cmd, args, { cwd, stdio: 'inherit' });
const has = (cmd) =>
  (win
    ? spawnSync(`${cmd} --version`, { stdio: 'ignore', shell: true })
    : spawnSync(cmd, ['--version'], { stdio: 'ignore' })
  ).status === 0;

const steps = {
  python() {
    const script = join(here, 'extract-python.py');
    if (has('uv'))
      run('uv', [
        'run',
        '--no-project',
        '--python',
        '3.13',
        '--with-requirements',
        join(here, 'requirements.txt'),
        'python',
        script,
      ]);
    else run('python', [script]);
  },
  dart() {
    run('dart', ['pub', 'get'], join(root, 'dart'));
    run('dart', ['pub', 'get'], join(here, 'dart'));
    run('dart', ['run', 'bin/extract.dart'], join(here, 'dart'));
  },
  dotnet() {
    run('dotnet', ['run', '-c', 'Release'], join(here, 'dotnet'));
  },
  php() {
    run('php', [join(here, 'extract-php.php')]);
  },
};

for (const [port, step] of Object.entries(steps))
  if (!only.length || only.includes(port)) step();
