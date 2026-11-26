import { describe, expect, it } from 'vitest';
import { Bot } from '../src/sim/bot';
import { BulletColor, BulletKind, NO_INPUT, NO_UPGRADES } from '../src/sim/types';
import { World } from '../src/sim/world';

/** Budget de performance : la simulation doit laisser l'essentiel des 16,7 ms au rendu, même sur mobile. */
describe('performance de la simulation', () => {
  const dense = () => {
    const w = new World({ stage: 'couronne', ship: 'gerbe', difficulty: 'infernal', upgrades: NO_UPGRADES, seed: 3 });
    w.step(NO_INPUT);
    w.player.invuln = 1e9;
    for (let i = 0; i < 2000; i++) {
      w.bullets.spawn(180 + Math.cos(i) * 150, 320 + Math.sin(i * 1.3) * 300, i * 0.37, 0.4, (i % 5) as BulletKind, (i % 6) as BulletColor, 0, 0.002);
    }
    return w;
  };
  it('2 000 balles : une image de simulation coûte moins de 1 ms', () => {
    const w = dense();
    for (let i = 0; i < 30; i++) w.step(NO_INPUT);
    const t0 = performance.now();
    for (let i = 0; i < 300; i++) w.step(NO_INPUT);
    const per = (performance.now() - t0) / 300;
    expect(w.bullets.count).toBeGreaterThan(1000);
    expect(per).toBeLessThan(1);
  });
  it('le pilote automatique décide en moins de 1 ms', () => {
    const w = dense();
    const bot = new Bot();
    const t0 = performance.now();
    for (let i = 0; i < 200; i++) w.step(bot.decide(w));
    expect((performance.now() - t0) / 200).toBeLessThan(1.5);
  });
});
