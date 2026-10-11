import { build } from 'esbuild';
import { mkdir, copyFile, readFile, writeFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

export const aliases = {
  'ss6player-lib': resolve('vendor/ss6player/lib/ss6player-lib.ts'),
  'ssfblib': resolve('vendor/ss6player/ssfblib/ssfblib.ts'),
  '@resourceLoader/PixiResourceLoaderImpl': resolve('src/resource-loader.ts'),
};
const output = 'data/others/plugin/spritestudio';
await mkdir(output, { recursive: true });
await build({
  entryPoints: ['src/plugin.ts'],
  outfile: `${output}/spritestudio.js`,
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['chrome100', 'firefox100', 'safari15.4'],
  alias: aliases,
  minify: true,
  legalComments: 'eof',
  banner: { js: '/*! Tyrano SpriteStudio Bridge 0.1.0 | Copyright (c) 2026 さみおす | MIT | Third-party licenses: ./licenses/ */' },
});
await copyFile('node_modules/pixi.js/LICENSE', `${output}/licenses/PixiJS.txt`);
await copyFile('LICENSE', `${output}/licenses/Bridge-MIT.txt`);
await copyFile('vendor/licenses/colord.txt', `${output}/licenses/pixi-colord.txt`);
const lock = JSON.parse(await readFile('package-lock.json', 'utf8'));
const notices = ['# Bundled runtime dependency licenses', '',
  'SS6PlayerForWeb: commit 934a920553694836a3fd96bef75e84e02c63feb4. See SS6PlayerForWeb.txt.', '',
  '@pixi/colord MIT text: https://github.com/omgovich/colord/blob/master/LICENSE.md', ''];
for (const [path, info] of Object.entries(lock.packages)) {
  if (!path || info.dev || !path.startsWith('node_modules/')) continue;
  const name = path.slice('node_modules/'.length);
  const file = (await readdir(path)).find(name => /^licen[cs]e(?:\.|$)/i.test(name));
  const target = `${name.replaceAll('/', '_').replaceAll('@', '')}.txt`;
  if (file) await copyFile(`${path}/${file}`, `${output}/licenses/${target}`);
  else if (name !== '@pixi/colord') throw new Error(`License file missing for ${name}`);
  notices.push(`- ${name} ${info.version}: ${info.license}; ${file ? target : 'pixi-colord.txt'}`);
}
await writeFile(`${output}/licenses/NOTICE.md`, notices.join('\n') + '\n');
const result = await build({
  entryPoints: ['scripts/demo-data.ts'],
  bundle: true, platform: 'node', format: 'esm', write: false, alias: aliases,
});
await mkdir('.test-work', { recursive: true });
await writeFile('.test-work/demo-builder.mjs', result.outputFiles[0].contents);
await import(resolve('.test-work/demo-builder.mjs') + `?build=${Date.now()}`);
const bytes = (await readFile(`${output}/spritestudio.js`)).byteLength;
console.log(`Built spritestudio.js (${bytes} bytes) and original demo data.`);
