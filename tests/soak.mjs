import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import http from 'node:http';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, extname, join } from 'node:path';

const engine = process.env.TYRANO_TEST_ROOT;
if (!engine) throw new Error('TYRANO_TEST_ROOT に公式ティラノV6のプロジェクトを指定してください。');
const minutes = Number(process.env.TYRANO_TEST_MINUTES || 5);
if (!Number.isFinite(minutes) || minutes < 0.1 || minutes > 60) throw new Error('TYRANO_TEST_MINUTES は0.1〜60で指定してください。');
const nativeMesh = !!process.env.SS6_TEST_DATA_ROOT;
const root = resolve('.test-work/soak');
const output = resolve('artifacts/soak');
await mkdir(root, { recursive: true });
await mkdir(output, { recursive: true });
await cp(engine, root, { recursive: true });
await cp('data/others/plugin/spritestudio', join(root, 'data/others/plugin/spritestudio'), { recursive: true });
await cp('data/others/spritestudio', join(root, 'data/others/spritestudio'), { recursive: true });
if (nativeMesh) await cp(join(process.env.SS6_TEST_DATA_ROOT, 'MeshBone'), join(root, 'data/others/spritestudio/native-mesh'), { recursive: true });
await writeFile(join(root, 'data/scenario/first.ks'), '[plugin name="spritestudio"]\n[s]\n');
await cp('examples/make.ks', join(root, 'data/scenario/make.ks'));
const configPath = join(root, 'data/system/Config.tjs');
await writeFile(configPath, (await readFile(configPath, 'utf8')).replace(/;projectID\s*=.*?;/, ';projectID = spritestudio_bridge_soak;'));
const types = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.ssfb': 'application/octet-stream' };
const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    const path = resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
    if (!path.startsWith(root + '/')) return response.writeHead(403).end();
    const bytes = await readFile(path);
    response.writeHead(200, { 'Content-Type': types[extname(path)] || 'text/plain', 'Cache-Control': 'no-store' }).end(bytes);
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const exceptions = [];
const graphicsErrors = [];
page.on('pageerror', error => exceptions.push(error.message));
page.on('console', message => {
  if (message.type() === 'error' || /too many active WebGL contexts|CONTEXT_LOST_WEBGL|INVALID_OPERATION/.test(message.text())) {
    if (!/favicon|404/.test(message.text())) graphicsErrors.push(message.text().slice(0, 300));
  }
});
const cdp = await page.context().newCDPSession(page);
const samples = [];
let cycles = 0;
let reloads = 0;
let resets = 0;
let motions = [];
const initialize = async () => page.evaluate(async nativeMesh => {
  const m = TYRANO.kag.tmp.spritestudio_bridge;
  await m.load({ name: 'logo', storage: 'demo/demo.ssfb' });
  await m.load({ name: 'actor', storage: nativeMesh ? 'native-mesh/Knight.ssfb' : 'demo-green/demo.ssfb' });
  const pack = m.info('actor').packs[0];
  await m.show({ name: 'logo', pack: 'demo', animation: 'idle', x: '640', y: '260' });
  await m.show({ name: 'actor', pack: pack.name, animation: pack.animations[0].name, x: '300', y: '360', scale: '0.5' });
  // The official Knight fixture contains one-frame Setup poses whose stored
  // end frame is 60. Exercise those poses with an explicit valid 0..0 range,
  // while retaining the exported range for every ordinary animation.
  const data = m.assets.get('actor').project.fbObj;
  const motions = [];
  for (let p = 0; p < data.animePacksLength(); p++) {
    const pack = data.animePacks(p);
    for (let a = 0; a < pack.animationsLength(); a++) {
      const animation = pack.animations(a);
      const total = animation.totalFrames();
      const exportedStart = animation.startFrames();
      const exportedEnd = animation.endFrames();
      const explicitSingleFrame = total === 1 && (exportedStart !== 0 || exportedEnd !== 0);
      if (!explicitSingleFrame && (exportedStart < 0 || exportedStart > exportedEnd || exportedEnd >= total)) {
        throw new Error(`Invalid fixture range: ${pack.name()}/${animation.name()}`);
      }
      motions.push({ pack: pack.name(), animation: animation.name(), totalFrames: total,
        exportedStart, exportedEnd, explicitSingleFrame });
    }
  }
  return motions;
}, nativeMesh);
const cycle = async i => page.evaluate(async ({ i, motion }) => {
  const m = TYRANO.kag.tmp.spritestudio_bridge;
  const playback = { name: 'actor', pack: motion.pack, animation: motion.animation,
    ...(motion.explicitSingleFrame ? { start: '0', end: '0' } : {}) };
  if (i % 5 === 0) {
    m.remove('actor');
    await m.show({ ...playback, x: '300', y: '360', scale: '0.5' });
  } else await m.play(playback);
  m.pause('logo'); m.resume('logo');
  m.set({ name: 'logo', x: String(640 + i % 10), rotation: String(i % 360) });
}, { i, motion: motions[i % motions.length] });
const sample = async elapsed => {
  await cdp.send('HeapProfiler.collectGarbage');
  const heap = await cdp.send('Runtime.getHeapUsage');
  const dom = await cdp.send('Memory.getDOMCounters');
  const state = await page.evaluate(() => {
    const m = TYRANO.kag.tmp.spritestudio_bridge;
    return { canvases: document.querySelectorAll('.spritestudio-canvas').length,
      assets: m.assets.size, instances: m.instances.size, surfaces: m.surfaces.size,
      logoFrame: m.info('logo').instance.frame, actorFrame: m.info('actor').instance.frame };
  });
  assert.equal(state.canvases, 1, 'Only the current layer canvas should remain');
  assert.equal(state.instances, 2, 'Only two active players should remain');
  assert.equal(state.assets, 2);
  assert.equal(state.surfaces, 1);
  const result = { elapsedSeconds: elapsed, cycles, reloads, resets, heapBytes: heap.usedSize, domNodes: dom.nodes, ...state };
  samples.push(result);
  console.log(JSON.stringify(result));
};
try {
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.waitForFunction(() => !!window.TYRANO?.kag?.tmp?.spritestudio_bridge);
  motions = await initialize();
  const warmupCycles = Math.max(20, motions.length);
  for (let i = 0; i < warmupCycles; i++) await cycle(i);
  await page.waitForTimeout(150);
  await sample(0);
  const start = Date.now();
  let lastSample = start;
  while (Date.now() - start < minutes * 60000) {
    cycles++;
    if (cycles % 25 === 0) {
      await page.evaluate(() => TYRANO.kag.tmp.spritestudio_bridge.reset());
      await initialize(); resets++;
    }
    await cycle(cycles);
    if (cycles % 50 === 0) {
      await page.evaluate(() => new Promise(resolve => {
        const kag = TYRANO.kag;
        kag.menu.snapSave('Soak', () => {
          const saved = JSON.parse(JSON.stringify(kag.menu.snap));
          kag.menu.loadGameData(saved); resolve();
        }, 'false');
      }));
      await page.waitForFunction(() => {
        try { return !!TYRANO.kag.tmp.spritestudio_bridge.info('actor').instance?.playing &&
          !!TYRANO.kag.tmp.spritestudio_bridge.info('logo').instance?.playing; }
        catch { return false; }
      });
      reloads++;
    }
    if (Date.now() - lastSample >= 30000) {
      await sample(Math.round((Date.now() - start) / 1000)); lastSample = Date.now();
    }
    await page.waitForTimeout(500);
  }
  await sample(Math.round((Date.now() - start) / 1000));
  const growth = samples.at(-1).heapBytes - samples[0].heapBytes;
  assert.ok(growth <= samples[0].heapBytes * 0.5 + 4 * 1024 * 1024, `Excessive retained JS heap growth: ${growth}`);
  assert.deepEqual(exceptions, []);
  assert.deepEqual(graphicsErrors, []);
  await page.screenshot({ path: join(output, 'final.png') });
  await writeFile(join(output, 'results.json'), JSON.stringify({ passed: true, minutes, browser: browser.version(), nativeMesh,
    warmupCycles, motions, cycles, reloads, resets, retainedHeapGrowthBytes: growth, samples, exceptions, graphicsErrors,
    limits: 'Linux software rendering; JS heap after GC only. GPU memory and hours-long play are not measured.' }, null, 2));
  console.log('Soak test passed.');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
