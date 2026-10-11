import { build } from 'esbuild';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const result = await build({ entryPoints: ['src/parameters.ts'], bundle: true, platform: 'node', format: 'esm', write: false });
await mkdir('.test-work', { recursive: true });
await writeFile('.test-work/parameters.mjs', result.outputFiles[0].contents);
const p = await import(resolve('.test-work/parameters.mjs'));

test('loop parameters prevent impossible waits and non-integral repeat counts', () => {
  assert.equal(p.loops('true'), -1);
  assert.equal(p.loops('false'), 1);
  assert.equal(p.loops('3'), 3);
  for (const input of ['0', '-1', '1.5', 'Infinity', 'NaN', 'forever']) assert.throws(() => p.loops(input));
});
test('numeric parameters reject invalid values and preserve explicit zero', () => {
  assert.equal(p.number('0', 'opacity', 255, 0, 255), 0);
  assert.equal(p.number('', 'opacity', 255, 0, 255), 255);
  for (const input of ['NaN', 'Infinity', '-1', '256']) assert.throws(() => p.number(input, 'opacity', 255, 0, 255));
});
test('asset URLs preserve subdirectories, spaces, and Japanese names', () => {
  const url = p.projectURL('キャラ A/idle.ssfb', 'https://example.org/game/index.html');
  assert.equal(decodeURI(url), 'https://example.org/game/data/others/spritestudio/キャラ A/idle.ssfb');
  assert.throws(() => p.projectURL('character.sspj', 'https://example.org/'));
});
