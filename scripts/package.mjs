import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';

const run = promisify(execFile);
const { version } = JSON.parse(await readFile('package.json', 'utf8'));
await readFile('data/others/plugin/spritestudio/spritestudio.js');
await mkdir('dist', { recursive: true });
const common = ['data', 'examples', 'docs', 'README.md', 'LICENSE', 'CHANGELOG.md'];
const source = [...common, 'src', 'scripts', 'tests', 'vendor', 'package.json', 'package-lock.json', '.gitignore'];
const names = [];
const code = `import sys, json, pathlib, zipfile
dest = sys.argv[1]
selected = json.loads(sys.argv[2])
files = []
for selected_path in selected:
    p = pathlib.Path(selected_path)
    files.extend(p.rglob('*') if p.is_dir() else [p])
with zipfile.ZipFile(dest, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for p in sorted(set(files)):
        if not p.is_file(): continue
        info = zipfile.ZipInfo(p.as_posix(), (2026, 10, 11, 0, 0, 0))
        info.external_attr = 0o100644 << 16
        info.compress_type = zipfile.ZIP_DEFLATED
        z.writestr(info, p.read_bytes(), compresslevel=9)
`;
for (const [suffix, paths] of [['', common], ['-source', source]]) {
  const name = `tyrano-spritestudio-${version}${suffix}.zip`;
  await run('python3', ['-c', code, `dist/${name}`, JSON.stringify(paths)]);
  names.push(name);
}
const sums = [];
for (const name of names) {
  const bytes = await readFile(`dist/${name}`);
  sums.push(`${createHash('sha256').update(bytes).digest('hex')}  ${name}`);
  console.log(`${name}: ${bytes.byteLength} bytes`);
}
await writeFile('dist/SHA256SUMS.txt', sums.join('\n') + '\n');
