import { Assets, Texture } from 'pixi.js';

// The upstream loader puts cell-map names in Pixi's global cache. This loader
// uses URLs as keys and a private map so two projects can both have "body".
export class PixiResourceLoaderImpl {
  private textures = new Map<string, Texture>();

  load(_bundle: string, images: Record<string, string>, complete: (error: unknown) => void): void {
    Promise.all(Object.entries(images).map(async ([name, url]) => {
      this.textures.set(name, await Assets.load<Texture>(url));
    })).then(() => complete(null), complete);
  }

  unload(_bundle: string, _images: Record<string, string>, complete: (error: unknown) => void): void {
    // URL textures may be shared by other projects. Release only the private
    // references; the runtime cache is bounded by the game's loaded assets.
    this.textures.clear();
    complete?.(null);
  }

  texture(name: string): Texture {
    const texture = this.textures.get(name);
    if (!texture) throw new Error(`テクスチャが読み込まれていません: ${name}`);
    return texture;
  }
}
