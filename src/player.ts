import { Mesh } from 'pixi.js';
import { SS6Player } from '../vendor/ss6player/pixi/SS6Player';

// The pinned upstream player keeps temporarily invisible part objects outside
// the display tree. Release that cache as well as currently visible children
// when changing animation or destroying a player; retain shared textures.
function releaseParts(player: SS6Player, final = false): void {
  const cache = player as any;
  const parts = new Set<any>([...(cache.prevPartObject || []), ...player.children]);
  player.removeChildren();
  cache.prevPartObject = [];
  for (const part of parts) {
    if (!part || part.destroyed) continue;
    const geometry = part instanceof Mesh ? part.geometry : null;
    if (part instanceof SS6Player) releaseParts(part, true);
    part.destroy({ children: true, texture: false, textureSource: false });
    geometry?.destroy();
  }
  for (const filter of new Set<any>(Object.values(cache.colorMatrixFilterCache || {}))) filter?.destroy();
  cache.colorMatrixFilterCache = [];
  if (final) { cache.defaultColorFilter?.destroy(); cache.defaultColorFilter = null; }
}

export class BridgePlayer extends SS6Player {
  public Setup(pack: string, animation: string): void {
    releaseParts(this);
    super.Setup(pack, animation);
  }

  public destroy(options: any = {}): void {
    if (this.destroyed) return;
    releaseParts(this, true);
    super.destroy({ ...options, children: false, texture: false, textureSource: false });
  }
}
