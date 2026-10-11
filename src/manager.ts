import { Application } from 'pixi.js';
import { SS6Project, SS6Player } from '../vendor/ss6player/pixi/ss6player-pixi';
import { BridgePlayer } from './player';
import { boolean, identifier, loops, number, projectURL, type Parameters } from './parameters';

type Asset = { name: string; storage: string; project: SS6Project };
type Surface = { app: Application; layer: string; element: HTMLElement };
type Instance = { asset: Asset; player: SS6Player; surface: Surface; options: any; waiters: Set<() => void>; playbackId: number };
const KEY = 'spritestudio_bridge';

export class Cancelled extends Error {}

export class Manager {
  public generation = 0;
  public navigation = 0;
  private assets = new Map<string, Asset>();
  private projects = new Map<string, Promise<SS6Project>>();
  private surfaces = new Map<string, Promise<Surface>>();
  private instances = new Map<string, Instance>();
  private restoring = false;

  constructor(public kag: any) {
    kag.on('snapsave-start.spritestudio', () => this.snapshot());
    kag.on('load-start.spritestudio', () => { this.navigation++; this.reset(false); });
    // Saved canvases are blank DOM objects. The real renderer is rebuilt by
    // [ss_restore] in make.ks, which keeps scenario advancement asynchronous.
    kag.stat[KEY] ||= { version: 1, assets: [], instances: [] };
  }

  private assertGeneration(generation: number): void {
    if (this.generation !== generation) throw new Cancelled('ロードにより処理を中断しました。');
  }

  async load(pm: Parameters): Promise<void> {
    const name = identifier(pm.name);
    const url = projectURL(pm.storage, document.baseURI);
    const generation = this.generation;
    if (this.instances.has(name)) throw new Error(`${name} の表示を [ss_remove] で削除してから読み込んでください。`);
    let promise = this.projects.get(url);
    if (!promise) {
      promise = new Promise<SS6Project>((resolve, reject) => {
        let settled = false;
        const timeout = setTimeout(() => {
          settled = true;
          reject(new Error(`読み込みがタイムアウトしました: ${pm.storage}`));
        }, 30000);
        new SS6Project(url, (project, error) => {
          clearTimeout(timeout);
          if (settled) { project?.dispose(); return; }
          settled = true;
          if (error) reject(new Error(`${pm.storage} を読み込めません: ${String(error)}`));
          else resolve(project);
        });
      });
      this.projects.set(url, promise);
      promise.catch(() => { if (this.projects.get(url) === promise) this.projects.delete(url); });
    }
    const project = await promise;
    this.assertGeneration(generation);
    this.assets.set(name, { name, storage: pm.storage, project });
    this.snapshot();
  }

  private async surface(layer: string): Promise<Surface> {
    if (!/^\d+$/.test(layer)) throw new Error('layer には前景画像レイヤーの番号（0、1…）を指定してください。');
    let promise = this.surfaces.get(layer);
    if (!promise) {
      const generation = this.generation;
      promise = (async () => {
        const element = this.kag.layer.getLayer(layer, 'fore')?.get(0) as HTMLElement;
        if (!element) throw new Error(`前景レイヤー ${layer} がありません。Config.tjs の numCharacterLayers を確認してください。`);
        const app = new Application();
        await app.init({
          width: Number(this.kag.config.scWidth), height: Number(this.kag.config.scHeight),
          backgroundAlpha: 0, antialias: true, resolution: 1,
          preference: 'webgl', preserveDrawingBuffer: true,
        });
        if (generation !== this.generation) { app.destroy(true, { children: true }); throw new Cancelled(); }
        app.stage.sortableChildren = true;
        const canvas = app.canvas as HTMLCanvasElement;
        canvas.classList.add('spritestudio-canvas', 'temp-element');
        Object.assign(canvas.style, {
          position: 'absolute', left: '0', top: '0', width: '100%', height: '100%',
          pointerEvents: 'none', zIndex: '1',
        });
        canvas.setAttribute('aria-hidden', 'true');
        element.appendChild(canvas);
        element.style.display = 'block';
        return { app, layer, element };
      })();
      this.surfaces.set(layer, promise);
      promise.catch(() => { if (this.surfaces.get(layer) === promise) this.surfaces.delete(layer); });
    }
    return promise;
  }

  private get(name: string): Instance {
    identifier(name);
    const instance = this.instances.get(name);
    if (!instance) throw new Error(`${name} は表示されていません。[ss_load] → [ss_show] の順で指定してください。`);
    return instance;
  }

  private validateAnimation(asset: Asset, pack: string, animation: string): void {
    if (!pack || !animation) throw new Error('pack と animation を指定してください。');
    const data = asset.project.fbObj;
    for (let i = 0; i < data.animePacksLength(); i++) {
      const ap = data.animePacks(i);
      if (ap.name() !== pack) continue;
      for (let j = 0; j < ap.animationsLength(); j++) {
        if (ap.animations(j).name() === animation) return;
      }
    }
    throw new Error(`アニメーションが見つかりません: ${pack}/${animation}（ss_info で一覧を確認できます）`);
  }

  private playback(instance: Instance, pm: Parameters): void {
    const player = instance.player;
    const pack = pm.pack || instance.options.pack;
    const animation = pm.animation || instance.options.animation;
    this.validateAnimation(instance.asset, pack, animation);
    const speed = number(pm.speed, 'speed', 1);
    if (speed === 0) throw new Error('speed に0は指定できません。一時停止には [ss_pause] を使ってください。');
    const loop = loops(pm.loop ?? 'true');
    const start = number(pm.start, 'start', -1, -1);
    const end = number(pm.end, 'end', -1, -1);
    for (const [key, value] of [['start', start], ['end', end]] as const) {
      if (!Number.isInteger(value)) throw new Error(`${key} は整数で指定してください。`);
    }
    if (boolean(pm.wait, 'wait') && loop === -1) throw new Error('wait=true には loop=false または正の再生回数を指定してください。');
    // Validate before changing an already visible player's state.
    const data = instance.asset.project.fbObj;
    let animationData: any;
    for (let i = 0; i < data.animePacksLength(); i++) {
      const ap = data.animePacks(i);
      if (ap.name() === pack) for (let j = 0; j < ap.animationsLength(); j++) {
        if (ap.animations(j).name() === animation) animationData = ap.animations(j);
      }
    }
    const last = animationData.totalFrames() - 1;
    const first = start < 0 ? animationData.startFrames() : start;
    const final = end < 0 ? animationData.endFrames() : end;
    if (first > final || final > last) throw new Error(`start/end は0〜${last}の範囲で start ≤ end にしてください。`);
    this.finishWaiters(instance);
    const playbackId = ++instance.playbackId;
    player.Setup(pack, animation);
    player.SetAnimationSpeed(speed, true);
    player.SetAnimationSection(first, final, loop);
    player.SetPlayEndCallback(() => {
      // Upstream also reports intermediate wraps in a finite loop. Only the
      // final wrap stops playback and should release scenario waiters.
      if (player.isPlaying) return;
      // Upstream rewinds to the first frame. Defer SetFrame until its current
      // update has finished, and leave the terminal pose visible.
      queueMicrotask(() => {
        if (this.instances.get(instance.asset.name) !== instance || instance.playbackId !== playbackId) return;
        player.SetFrame(speed < 0 ? player.startFrame : player.endFrame);
        instance.options.status = 'stopped';
        this.finishWaiters(instance);
        this.snapshot();
      });
    });
    instance.options = { ...instance.options, pack, animation, speed, loop, start: first, end: final, status: 'playing' };
    player.Play();
  }

  async show(pm: Parameters): Promise<void> {
    const name = identifier(pm.name);
    const asset = this.assets.get(name);
    if (!asset) throw new Error(`${name} を先に [ss_load] で読み込んでください。`);
    const generation = this.generation;
    const layer = pm.layer || '0';
    const surface = await this.surface(layer);
    this.assertGeneration(generation);
    const player = new BridgePlayer(asset.project);
    const instance: Instance = { asset, player, surface, options: { name, layer }, waiters: new Set(), playbackId: 0 };
    try {
      this.playback(instance, pm);
      this.applyTransform(instance, pm);
    } catch (error) { player.destroy({ children: true }); throw error; }
    this.remove(name, false);
    this.instances.set(name, instance);
    surface.app.stage.addChild(player);
    this.snapshot();
    if (boolean(pm.wait, 'wait')) await this.wait(name);
  }

  private applyTransform(instance: Instance, pm: Parameters): void {
    const old = instance.options;
    const uniform = pm.scale !== '' && pm.scale !== undefined ? number(pm.scale, 'scale', 1) : undefined;
    const transform = {
      x: number(pm.x, 'x', old.x ?? 0), y: number(pm.y, 'y', old.y ?? 0),
      scale_x: number(pm.scale_x, 'scale_x', uniform ?? old.scale_x ?? 1),
      scale_y: number(pm.scale_y, 'scale_y', uniform ?? old.scale_y ?? 1),
      rotation: number(pm.rotation, 'rotation', old.rotation ?? 0),
      opacity: number(pm.opacity, 'opacity', old.opacity ?? 255, 0, 255),
      zindex: number(pm.zindex, 'zindex', old.zindex ?? 0),
      visible: boolean(pm.visible, 'visible', old.visible ?? true),
    };
    const player = instance.player;
    player.position.set(transform.x, transform.y);
    player.scale.set(transform.scale_x, transform.scale_y);
    player.rotation = transform.rotation * Math.PI / 180;
    player.alpha = transform.opacity / 255;
    player.zIndex = transform.zindex;
    player.visible = transform.visible;
    Object.assign(instance.options, transform);
  }

  async play(pm: Parameters): Promise<void> {
    const instance = this.get(pm.name);
    this.playback(instance, pm);
    this.snapshot();
    if (boolean(pm.wait, 'wait')) await this.wait(pm.name);
  }

  set(pm: Parameters): void { this.applyTransform(this.get(pm.name), pm); this.snapshot(); }

  pause(name: string): void {
    const i = this.get(name);
    if (i.player.isPlaying) { i.player.Pause(); i.options.status = 'paused'; }
    this.snapshot();
  }

  resume(name: string): void {
    const i = this.get(name);
    if (!i.player.isPlaying) throw new Error('停止済みのアニメーションは [ss_play] で再生してください。');
    i.player.Resume(); i.options.status = 'playing'; this.snapshot();
  }

  stop(name: string): void {
    const i = this.get(name);
    i.playbackId++;
    i.player.Stop(); i.options.status = 'stopped'; this.finishWaiters(i); this.snapshot();
  }

  private finishWaiters(instance: Instance): void {
    for (const complete of instance.waiters) complete();
    instance.waiters.clear();
  }

  wait(name: string): Promise<void> {
    const i = this.get(name);
    if (!i.player.isPlaying) return Promise.resolve();
    if (i.options.loop === -1) throw new Error('無限ループは待機できません。loop=false または再生回数を指定してください。');
    const generation = this.generation;
    return new Promise<void>((resolve, reject) => {
      let timer: ReturnType<typeof setInterval>;
      const complete = () => {
        clearInterval(timer);
        i.waiters.delete(complete);
        if (generation !== this.generation) reject(new Cancelled());
        else resolve();
      };
      i.waiters.add(complete);
      timer = setInterval(() => {
        if (generation !== this.generation || !i.player.isPlaying) { complete(); return; }
        if (this.kag.stat.is_skip) {
          i.player.Stop();
          i.player.SetFrame(i.options.speed < 0 ? i.player.startFrame : i.player.endFrame);
          i.options.status = 'stopped';
          this.finishWaiters(i); this.snapshot();
        }
      }, 50);
    });
  }

  remove(name: string, save = true): void {
    identifier(name);
    const i = this.instances.get(name);
    if (i) {
      i.player.Stop();
      i.surface.app.stage.removeChild(i.player);
      i.player.destroy({ children: true, texture: false, textureSource: false });
      this.instances.delete(name);
      this.finishWaiters(i);
    }
    if (save) this.snapshot();
  }

  reset(save = true): void {
    this.generation++;
    for (const name of this.instances.keys()) this.remove(name, false);
    for (const promise of this.surfaces.values()) promise.then(s => {
      s.app.destroy(true, { children: true, texture: false, textureSource: false });
    }).catch(() => {});
    this.surfaces.clear();
    this.assets.clear();
    if (save) this.snapshot();
  }

  snapshot(): any {
    if (this.restoring) return this.kag.stat[KEY];
    const state = {
      version: 1,
      assets: Array.from(this.assets.values(), a => ({ name: a.name, storage: a.storage })),
      instances: Array.from(this.instances.values(), i => ({
        ...i.options, frame: i.player.frameNo, remaining: i.player.loop,
        status: !i.player.isPlaying ? 'stopped' : i.player.isPausing ? 'paused' : 'playing',
      })),
    };
    this.kag.stat[KEY] = state;
    return state;
  }

  async restore(): Promise<void> {
    const saved = JSON.parse(JSON.stringify(this.kag.stat[KEY] || { version: 1, assets: [], instances: [] }));
    if (saved.version !== 1) throw new Error('このセーブデータのSpriteStudioプラグイン形式には対応していません。');
    this.reset(false);
    const generation = this.generation;
    this.restoring = true;
    try {
      for (const asset of saved.assets) { await this.load(asset); this.assertGeneration(generation); }
      for (const savedInstance of saved.instances) {
        const pm = Object.fromEntries(Object.entries(savedInstance).map(([k, v]) => [k, String(v)]));
        pm.wait = 'false';
        pm.loop = savedInstance.remaining > 0 ? String(savedInstance.remaining) : savedInstance.loop === -1 ? 'true' : 'false';
        await this.show(pm);
        this.assertGeneration(generation);
        const i = this.get(savedInstance.name);
        i.player.SetFrame(savedInstance.frame);
        if (savedInstance.status === 'paused') this.pause(savedInstance.name);
        else if (savedInstance.status === 'stopped') this.stop(savedInstance.name);
      }
    } catch (error) {
      if (generation === this.generation) this.reset(false);
      throw error;
    } finally {
      this.restoring = false;
      if (generation === this.generation) this.snapshot();
    }
  }

  info(name: string): any {
    identifier(name);
    const asset = this.assets.get(name);
    if (!asset) throw new Error(`${name} は読み込まれていません。`);
    const data = asset.project.fbObj;
    const packs = [];
    for (let i = 0; i < data.animePacksLength(); i++) {
      const p = data.animePacks(i);
      const animations = [];
      for (let j = 0; j < p.animationsLength(); j++) {
        const a = p.animations(j);
        animations.push({ name: a.name(), fps: a.fps(), start: a.startFrames(), end: a.endFrames() });
      }
      packs.push({ name: p.name(), animations });
    }
    const instance = this.instances.get(name);
    return { name, storage: asset.storage, packs, instance: instance ? {
      ...instance.options, frame: instance.player.frameNo, playing: instance.player.isPlaying,
      paused: instance.player.isPausing,
    } : null };
  }
}
