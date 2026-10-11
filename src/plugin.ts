import { Cancelled, Manager } from './manager';

declare global { interface Window { TYRANO: any; TyranoSpriteStudio: any } }

function install(kag: any): Manager {
  if (kag.tmp.spritestudio_bridge) return kag.tmp.spritestudio_bridge;
  const names = ['ss_load', 'ss_show', 'ss_play', 'ss_wait', 'ss_set', 'ss_pause', 'ss_resume', 'ss_stop', 'ss_remove', 'ss_clear', 'ss_restore', 'ss_info'];
  for (const name of names) {
    if (kag.ftag.master_tag[name]) throw new Error(`タグ ${name} がすでに存在します。SpriteStudioプラグインと競合しています。`);
  }
  const manager = new Manager(kag);
  kag.tmp.spritestudio_bridge = manager;
  const tags: Record<string, any> = {
    ss_load: { vital: ['name', 'storage'], pm: { name: '', storage: '' }, run: (pm: any) => manager.load(pm) },
    ss_show: { vital: ['name', 'pack', 'animation'], pm: { name: '', pack: '', animation: '', layer: '0', x: '0', y: '0', scale: '1', opacity: '255', rotation: '0', zindex: '0', loop: 'true', speed: '1', wait: 'false', visible: 'true' }, run: (pm: any) => manager.show(pm) },
    ss_play: { vital: ['name'], pm: { name: '', pack: '', animation: '', loop: 'true', speed: '1', start: '', end: '', wait: 'false' }, run: (pm: any) => manager.play(pm) },
    ss_wait: { vital: ['name'], pm: { name: '' }, run: (pm: any) => manager.wait(pm.name) },
    ss_set: { vital: ['name'], pm: { name: '', x: '', y: '', scale: '', scale_x: '', scale_y: '', rotation: '', opacity: '', visible: '', zindex: '' }, run: (pm: any) => manager.set(pm) },
    ss_pause: { vital: ['name'], pm: { name: '' }, run: (pm: any) => manager.pause(pm.name) },
    ss_resume: { vital: ['name'], pm: { name: '' }, run: (pm: any) => manager.resume(pm.name) },
    ss_stop: { vital: ['name'], pm: { name: '' }, run: (pm: any) => manager.stop(pm.name) },
    ss_remove: { vital: ['name'], pm: { name: '' }, run: (pm: any) => manager.remove(pm.name) },
    ss_clear: { vital: [], pm: {}, run: () => manager.reset() },
    ss_restore: { vital: [], pm: {}, run: () => manager.restore() },
    ss_info: { vital: ['name'], pm: { name: '' }, run: (pm: any) => {
      const info = manager.info(pm.name);
      kag.variable.tf.spritestudio_info = info;
      console.info('[SpriteStudio]', info);
    } },
  };
  for (const [name, definition] of Object.entries(tags)) {
    kag.ftag.master_tag[name] = {
      kag, vital: definition.vital, pm: definition.pm,
      start(pm: any) {
        const navigation = manager.navigation;
        const scenario = kag.stat.current_scenario;
        const order = kag.ftag.current_order_index;
        kag.variable.tf.spritestudio_error = '';
        let result: any;
        try { result = definition.run(pm); }
        catch (error) { result = Promise.reject(error); }
        Promise.resolve(result).then(() => {
          if (navigation === manager.navigation &&
              scenario === kag.stat.current_scenario && order === kag.ftag.current_order_index) kag.ftag.nextOrder();
        }).catch(error => {
          if (error instanceof Cancelled || navigation !== manager.navigation) return;
          const message = `[${name}] ${error?.message || String(error)}`;
          kag.variable.tf.spritestudio_error = message;
          console.error(message, error);
          // Keep the scenario stopped on error so broken assets aren't hidden.
          kag.error(message);
        });
      },
    };
  }
  return manager;
}

if (!window.TyranoSpriteStudio) {
  window.TyranoSpriteStudio = { version: '0.1.0', install };
}
window.TyranoSpriteStudio.install(window.TYRANO.kag);
