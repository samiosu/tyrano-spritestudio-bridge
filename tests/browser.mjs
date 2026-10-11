import { chromium, firefox, webkit, devices } from 'playwright-core';
import assert from 'node:assert/strict';
import http from 'node:http';
import { cp, mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { resolve, extname, join } from 'node:path';

const engine = process.env.TYRANO_TEST_ROOT;
if (!engine) throw new Error('TYRANO_TEST_ROOT に公式ティラノV6のプロジェクトディレクトリを指定してください。');
const browserName = process.env.TYRANO_TEST_BROWSER || 'chromium';
if (!['chromium', 'firefox', 'webkit'].includes(browserName)) throw new Error('TYRANO_TEST_BROWSER は chromium / firefox / webkit で指定してください。');
const device = process.env.TYRANO_TEST_DEVICE || 'desktop';
if (!['desktop', 'mobile'].includes(device)) throw new Error('TYRANO_TEST_DEVICE は desktop / mobile で指定してください。');
if (device === 'mobile' && browserName === 'firefox') throw new Error('Firefoxのモバイル模擬はこのテストの対象外です。');
const profile = `${browserName}-${device}`;
const root = resolve(`.test-work/browser-${profile}`);
const artifactRoot = resolve(`artifacts/${profile}`);
await mkdir(artifactRoot, { recursive: true });
await mkdir(root, { recursive: true });
await cp(engine, root, { recursive: true });
await cp('data/others/plugin/spritestudio', join(root, 'data/others/plugin/spritestudio'), { recursive: true });
await cp('data/others/spritestudio', join(root, 'data/others/spritestudio'), { recursive: true });
if (process.env.SS6_TEST_DATA_ROOT) {
  await cp(join(process.env.SS6_TEST_DATA_ROOT, 'MeshBone'), join(root, 'data/others/spritestudio/native-mesh'), { recursive: true });
}
await mkdir(join(root, 'data/others/spritestudio/broken'), { recursive: true });
await cp('data/others/spritestudio/demo/demo.ssfb', join(root, 'data/others/spritestudio/broken/demo.ssfb'));
await writeFile(join(root, 'data/scenario/first.ks'), '[plugin name="spritestudio"]\n[ss_load name="logo" storage="demo/demo.ssfb"]\n[ss_show name="logo" pack="demo" animation="idle" x="640" y="260"]\n[s]\n');
await cp('examples/make.ks', join(root, 'data/scenario/make.ks'));
const configPath = join(root, 'data/system/Config.tjs');
let config = await readFile(configPath, 'utf8');
config = config.replace(/;projectID\s*=.*?;/, `;projectID = spritestudio_bridge_${profile};`);
await writeFile(configPath, config);
const types = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.ssfb': 'application/octet-stream' };
const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    const path = resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
    if (!path.startsWith(root + '/')) { response.writeHead(403).end(); return; }
    const data = await readFile(path);
    response.writeHead(200, { 'Content-Type': types[extname(path)] || 'text/plain', 'Cache-Control': 'no-store' }).end(data);
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browserType = { chromium, firefox, webkit }[browserName];
const browser = await browserType.launch({
  headless: process.env.TYRANO_TEST_HEADED !== 'true',
  ...(browserName === 'chromium' ? {
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
  } : browserName === 'firefox' ? {
    firefoxUserPrefs: { 'webgl.force-enabled': true, 'webgl.disabled': false,
      ...(process.env.TYRANO_TEST_NO_SANDBOX === 'true' ? {
        'security.sandbox.content.level': 0, 'security.sandbox.socket.process.level': 0,
        'security.sandbox.rdd.level': 0, 'security.sandbox.gpu.level': 0,
      } : {}),
    },
  } : process.env.TYRANO_WEBKIT_PATH ? { executablePath: process.env.TYRANO_WEBKIT_PATH } : {}),
});
const page = await browser.newPage(device === 'mobile'
  ? devices[browserName === 'webkit' ? 'iPhone 13' : 'Pixel 7']
  : { viewport: { width: 1280, height: 720 } });
const exceptions = [];
const messages = [];
page.on('pageerror', error => exceptions.push(error.message));
page.on('console', message => messages.push({ type: message.type(), text: message.text().slice(0, 400) }));
const url = `http://127.0.0.1:${server.address().port}`;
try {
  await page.goto(url);
  await page.waitForFunction(() => {
    try { return window.TYRANO?.kag?.tmp?.spritestudio_bridge?.info('logo').instance?.playing; }
    catch { return false; }
  });
  const info = () => page.evaluate(() => TYRANO.kag.tmp.spritestudio_bridge.info('logo'));
  const first = await info();
  await page.waitForTimeout(150);
  const second = await info();
  assert.notEqual(first.instance.frame, second.instance.frame, 'Animation should advance');
  assert.equal(await page.evaluate(() => typeof window.PIXI), 'undefined', 'PixiJS must not leak into global scope');
  assert.equal(await page.locator('.spritestudio-canvas').count(), 1);
  await page.evaluate(() => TYRANO.kag.tmp.spritestudio_bridge.pause('logo'));
  const paused = (await info()).instance.frame;
  await page.waitForTimeout(120);
  assert.equal((await info()).instance.frame, paused, 'Pause should hold the current frame');
  await page.evaluate(() => TYRANO.kag.tmp.spritestudio_bridge.resume('logo'));
  await page.waitForTimeout(120);
  assert.notEqual((await info()).instance.frame, paused);
  await page.evaluate(async () => {
    const m = TYRANO.kag.tmp.spritestudio_bridge;
    await m.play({ name: 'logo', animation: 'spin', loop: 'false', speed: '6', wait: 'true' });
  });
  assert.equal((await info()).instance.frame, 59, 'One-shot playback should hold its terminal pose');
  assert.equal((await info()).instance.playing, false);
  await page.evaluate(() => {
    const m = TYRANO.kag.tmp.spritestudio_bridge;
    m.pause('logo');
    let rejected = false;
    try { m.resume('logo'); } catch { rejected = true; }
    if (!rejected) throw new Error('A stopped animation must be restarted with ss_play');
  });
  console.log('PASS load, render, pause/resume, one-shot wait, terminal pose, isolated PixiJS');
  await page.evaluate(async () => {
    const m = TYRANO.kag.tmp.spritestudio_bridge;
    await m.load({ name: 'other', storage: 'demo-green/demo.ssfb' });
    await m.show({ name: 'other', pack: 'demo', animation: 'idle', x: '840', y: '260', layer: '1' });
    m.set({ name: 'logo', scale: '1.5', opacity: '180', rotation: '25', visible: 'true' });
    m.set({ name: 'other', visible: 'false' });
    m.pause('other');
  });
  assert.equal(await page.locator('.spritestudio-canvas').count(), 2);
  assert.equal((await info()).instance.opacity, 180);
  await page.evaluate(() => {
    const m = TYRANO.kag.tmp.spritestudio_bridge;
    m.set({ name: 'logo', x: '430', opacity: '255', rotation: '0', scale: '1' });
    m.set({ name: 'other', visible: 'true' });
  });
  // Compare the center pixel of both renderers. Same ssfb basename and same
  // cell-map names must keep the blue and green textures distinct.
  await page.waitForTimeout(150);
  const pixels = await page.evaluate(async () => {
    const result = [];
    for (const layer of ['0', '1']) {
      const canvas = TYRANO.kag.layer.getLayer(layer, 'fore').find('canvas').get(0);
      const temp = document.createElement('canvas'); temp.width = 1280; temp.height = 720;
      const ctx = temp.getContext('2d'); ctx.drawImage(canvas, 0, 0);
      const x = layer === '0' ? 410 : 820;
      result.push(Array.from(ctx.getImageData(x, 260, 1, 1).data));
    }
    return result;
  });
  assert.ok(pixels[0][2] > 200 && pixels[0][1] < 200, `Blue texture: ${pixels[0]}`);
  assert.ok(pixels[1][1] > 200 && pixels[1][2] < 200, `Green texture: ${pixels[1]}`);
  console.log('PASS multiple layers, transforms, visibility, colliding project/texture names');
  // Use the engine's actual snapSave/loadGameData and make.ks lifecycle.
  await page.evaluate(() => new Promise(resolve => {
    TYRANO.kag.menu.snapSave('SpriteStudio test', () => {
      window.ssSaved = JSON.parse(JSON.stringify(TYRANO.kag.menu.snap)); resolve();
    }, 'false');
  }));
  await page.evaluate(() => {
    TYRANO.kag.tmp.spritestudio_bridge.set({ name: 'logo', x: '42' });
    TYRANO.kag.tmp.spritestudio_bridge.remove('other');
    TYRANO.kag.menu.loadGameData(JSON.parse(JSON.stringify(window.ssSaved)));
  });
  await page.waitForFunction(() => {
    const m = TYRANO.kag.tmp.spritestudio_bridge;
    try { return m.info('other').instance?.paused && m.info('logo').instance?.x === 430; } catch { return false; }
  });
  assert.equal(await page.locator('.spritestudio-canvas').count(), 2, 'Reload should not leave duplicate canvases');
  assert.equal((await info()).instance.frame, 59);
  console.log('PASS actual Tyrano save/load, restored stopped/paused state and position');
  // A save from before initialization must clear current sprites.
  await page.evaluate(() => {
    const saved = JSON.parse(JSON.stringify(window.ssSaved));
    delete saved.stat.spritestudio_bridge;
    TYRANO.kag.menu.loadGameData(saved);
  });
  await page.waitForFunction(() => !document.querySelector('.spritestudio-canvas'));
  console.log('PASS loading a save with no SpriteStudio state');
  await page.evaluate(async () => {
    const m = TYRANO.kag.tmp.spritestudio_bridge;
    await m.load({ name: 'logo', storage: 'demo/demo.ssfb' });
    await m.show({ name: 'logo', pack: 'demo', animation: 'idle', x: '640', y: '260' });
    for (const pm of [
      { name: 'logo', loop: 'true', wait: 'true' },
      { name: 'logo', animation: 'missing' },
      { name: 'logo', speed: '0' },
      { name: 'logo', start: '58', end: '1' },
    ]) {
      let rejected = false;
      try { await m.play(pm); } catch { rejected = true; }
      if (!rejected) throw new Error(`Expected invalid playback to fail: ${JSON.stringify(pm)}`);
    }
    TYRANO.kag.stat.is_skip = true;
    await m.play({ name: 'logo', loop: '3', wait: 'true' });
    TYRANO.kag.stat.is_skip = false;
    m.remove('logo');
    await m.show({ name: 'logo', pack: 'demo', animation: 'idle', x: '640', y: '260' });
  });
  assert.equal((await info()).instance.playing, true, 'Remove/show must preserve textures');
  console.log('PASS validation, finite-loop skip, remove/show lifecycle');
  if (process.env.SS6_TEST_DATA_ROOT) {
    await page.evaluate(async () => {
      const m = TYRANO.kag.tmp.spritestudio_bridge;
      await m.load({ name: 'native', storage: 'native-mesh/Knight.ssfb' });
      await m.show({ name: 'native', pack: 'Knight_bomb', animation: 'Balloon', x: '300', y: '360', scale: '0.5' });
    });
    await page.waitForTimeout(150);
    const native = await page.evaluate(() => TYRANO.kag.tmp.spritestudio_bridge.info('native'));
    assert.ok(native.instance.frame > 0, 'Official converted mesh animation should advance');
    await page.evaluate(async () => {
      const m = TYRANO.kag.tmp.spritestudio_bridge;
      const packs = m.info('native').packs;
      for (let i = 0; i < 10; i++) {
        const pack = packs[i % packs.length];
        await m.play({ name: 'native', pack: pack.name, animation: pack.animations[0].name });
      }
      m.remove('native');
      await m.show({ name: 'native', pack: 'Knight_bomb', animation: 'Balloon', x: '300', y: '360', scale: '0.5' });
      m.remove('native');
    });
    console.log('PASS official converted mesh/bone SSFB, repeated animation changes and destruction');
  }
  await page.evaluate(async () => {
    const kag = TYRANO.kag;
    const m = kag.tmp.spritestudio_bridge;
    for (const storage of ['missing.ssfb', 'broken/demo.ssfb']) {
      let rejected = false;
      try { await m.load({ name: 'missing', storage }); } catch { rejected = true; }
      if (!rejected) throw new Error(`Expected missing asset to fail: ${storage}`);
    }
    const original = kag.ftag.nextOrder;
    let advanced = 0;
    kag.ftag.nextOrder = () => { advanced++; };
    try {
      kag.ftag.master_tag.ss_play.start({ name: 'logo', animation: 'spin', loop: 'false', speed: '6', wait: 'true' });
      const deadline = Date.now() + 5000;
      while (!advanced && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 20));
      if (advanced !== 1) throw new Error(`A waiting tag should advance exactly once, got ${advanced}`);
      advanced = 0;
      kag.ftag.master_tag.ss_play.start({ name: 'logo', animation: 'spin', loop: 'false', speed: '0.1', wait: 'true' });
      kag.trigger('load-start');
      await new Promise(resolve => setTimeout(resolve, 100));
      if (advanced !== 0) throw new Error('A canceled wait advanced the newly loaded scenario');
    } finally { kag.ftag.nextOrder = original; }
    await m.load({ name: 'logo', storage: 'demo/demo.ssfb' });
    await m.show({ name: 'logo', pack: 'demo', animation: 'idle', x: '640', y: '260' });
  });
  console.log('PASS missing SSFB/texture errors, exact tag advancement, canceled waits after load');
  await page.screenshot({ path: join(artifactRoot, 'tyrano-v6.png') });
  // Run the actual six-line installation example, including click/touch input.
  const quick = (await readFile('README.md', 'utf8')).match(/```tyranoscript\n([\s\S]*?)\n```/)[1];
  await writeFile(join(root, 'data/scenario/first.ks'), quick + '\n[s]\n');
  await page.reload();
  await page.waitForFunction(() => {
    const kag = window.TYRANO?.kag;
    try { return kag.tmp.spritestudio_bridge.info('sample').instance?.playing &&
      !kag.stat.is_adding_text && kag.ftag.array_tag[kag.ftag.current_order_index]?.name === 'l'; }
    catch { return false; }
  });
  const checkSize = async () => {
    const rect = await page.locator('.spritestudio-canvas').boundingBox();
    assert.ok(rect && rect.width > 0 && rect.height > 0, 'Canvas should be visible');
    assert.ok(Math.abs(rect.width / rect.height - 1280 / 720) < 0.03, 'Game scaling should retain canvas proportions');
  };
  await checkSize();
  if (device === 'mobile') {
    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(200);
    await checkSize();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(200);
    await checkSize();
  }
  await page.screenshot({ path: join(artifactRoot, 'getting-started.png') });
  if (device === 'mobile') await page.locator('.layer_event_click').tap();
  else await page.locator('.layer_event_click').click();
  await page.waitForFunction(() => TYRANO.kag.tmp.spritestudio_bridge.info('sample').instance === null);
  console.log(`PASS installation example, ${device === 'mobile' ? 'portrait/landscape scaling and touch' : 'click'} input`);
  assert.deepEqual(exceptions, [], `Uncaught errors: ${exceptions.join('\n')}`);
  await writeFile(join(artifactRoot, 'browser-results.json'), JSON.stringify({ passed: true, engine, browserName, browser: browser.version(), device, simulatedDevice: device === 'mobile', officialMeshFixture: !!process.env.SS6_TEST_DATA_ROOT, exceptions, messages }, null, 2));
  console.log('All browser integration checks passed.');
} catch (error) {
  console.error('Browser console:', messages);
  await page.screenshot({ path: join(artifactRoot, 'failure.png') }).catch(() => {});
  throw error;
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
