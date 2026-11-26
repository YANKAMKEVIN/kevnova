import { describe, expect, it } from 'vitest';
import { stageById, STAGES } from '../src/data/stages';
import { hitsBoss, resolveBullets, resolveShots, touchesEnemy } from '../src/sim/combat';
import { createBoss, BOSS_ENTRY_FRAMES, stepBoss } from '../src/sim/boss';
import { BulletField } from '../src/sim/bullets';
import { createEnemy } from '../src/sim/enemy';
import { ItemField, COLLECT_LINE, MAX_ITEMS } from '../src/sim/items';
import { createPlayer, NOVA_MAX } from '../src/sim/player';
import { ShotKind, ShotPool } from '../src/sim/shots';
import { BulletColor, BulletKind, FPS, NO_INPUT, NO_UPGRADES } from '../src/sim/types';
import { buildSchedule, World } from '../src/sim/world';
import { Rng } from '../src/core/rng';

const newWorld = (seed = 1) => new World({ stage: 'corail', ship: 'etincelle', difficulty: 'normal', upgrades: NO_UPGRADES, seed });

describe('programme des vagues', () => {
  it.each(STAGES.map((s) => s.id))('%s : trié, dans la durée du secteur', (id) => {
    const st = stageById(id);
    const s = buildSchedule(st);
    expect(s.length).toBe(st.waves.reduce((a, w) => a + w.count, 0));
    for (let i = 1; i < s.length; i++) expect(s[i]!.frame).toBeGreaterThanOrEqual(s[i - 1]!.frame);
    expect(s[s.length - 1]!.frame).toBeLessThan(st.duration * FPS);
    for (const e of s) {
      expect(e.x).toBeGreaterThanOrEqual(0.05);
      expect(e.x).toBeLessThanOrEqual(0.95);
    }
  });
});

describe('combat', () => {
  it('le boss est une ellipse', () => {
    const b = createBoss('faucheur');
    b.x = 180;
    b.y = 100;
    expect(hitsBoss(b, 180 + b.def.radius * 1.5, 100)).toBe(true);
    expect(hitsBoss(b, 180, 100 + b.def.radius * 1.2)).toBe(false);
  });
  it('une balle sur le cœur touche, une balle proche frôle', () => {
    const p = createPlayer('etincelle', NO_UPGRADES);
    p.invuln = 0;
    const b = new BulletField(10);
    b.spawn(p.x + 12, p.y, 0, 0, BulletKind.Small, BulletColor.Magenta);
    let grazes = 0;
    expect(resolveBullets(b, p, () => grazes++)).toEqual({ hit: false, grazes: 1 });
    expect(resolveBullets(b, p, () => grazes++).grazes).toBe(0);
    b.spawn(p.x + 1, p.y, 0, 0, BulletKind.Small, BulletColor.Magenta);
    expect(resolveBullets(b, p, () => grazes++).hit).toBe(true);
  });
  it('invulnérable : ni coup ni frôlement', () => {
    const p = createPlayer('etincelle', NO_UPGRADES);
    p.invuln = 10;
    const b = new BulletField(10);
    b.spawn(p.x, p.y, 0, 0, BulletKind.Small, BulletColor.Magenta);
    expect(resolveBullets(b, p, () => undefined)).toEqual({ hit: false, grazes: 0 });
  });
  it('les tirs blessent puis détruisent un ennemi', () => {
    const e = createEnemy('dard', 0.5, { kind: 'dive', speed: 0 });
    e.y = 100;
    const shots = new ShotPool();
    for (let i = 0; i < 5; i++) shots.spawn(e.x, e.y + 5 + i * 0.01, 0, 0, 1, ShotKind.Main);
    let kills = 0;
    let hits = 0;
    resolveShots(shots, [e], null, () => hits++, () => kills++);
    expect(kills).toBe(1);
    expect(hits).toBe(3);
    expect(shots.items).toHaveLength(2);
  });
  it('les tirs blessent le boss et les missiles le visent', () => {
    const b = createBoss('faucheur');
    const c = { bullets: new BulletField(2000), rng: new Rng(1), scale: { speed: 1, density: 1, rate: 1 }, targetX: 0, targetY: 0 };
    for (let i = 0; i < BOSS_ENTRY_FRAMES; i++) stepBoss(b, c);
    const shots = new ShotPool();
    shots.spawn(b.x, b.y + 20, 0, -1, 2, ShotKind.Main);
    const m = shots.spawn(b.x - 80, b.y + 150, -3, -5, 2, ShotKind.Missile);
    expect(resolveShots(shots, [], b, () => undefined, () => undefined)).toBe(2);
    for (let i = 0; i < 40 && m.alive; i++) resolveShots(shots, [], b, () => undefined, () => undefined);
    expect(!m.alive || m.vx > 0).toBe(true);
  });
  it('les tirs sortis de l’écran disparaissent', () => {
    const shots = new ShotPool();
    shots.spawn(10, -25, 0, -10, 1, ShotKind.Main);
    resolveShots(shots, [], null, () => undefined, () => undefined);
    expect(shots.items).toHaveLength(0);
  });
  it('le contact avec un ennemi blesse', () => {
    const p = createPlayer('etincelle', NO_UPGRADES);
    p.invuln = 0;
    const e = createEnemy('cuirasse', 0.5, { kind: 'dive', speed: 0 });
    e.x = p.x;
    e.y = p.y;
    expect(touchesEnemy([e], null, p)).toBe(true);
    p.invuln = 1;
    expect(touchesEnemy([e], null, p)).toBe(false);
  });
});

describe('objets', () => {
  it('au-dessus de la ligne de collecte tout est aspiré', () => {
    const items = new ItemField();
    const p = createPlayer('etincelle', NO_UPGRADES);
    p.y = COLLECT_LINE - 10;
    items.spawn(20, 600, 'shard');
    let got = 0;
    for (let i = 0; i < 200; i++) items.step(p, true, () => got++);
    expect(got).toBe(1);
  });
  it('sans aimant les objets tombent et se perdent', () => {
    const items = new ItemField();
    const p = createPlayer('etincelle', NO_UPGRADES);
    items.spawn(20, 300, 'power');
    let got = 0;
    for (let i = 0; i < 600; i++) items.step(p, true, () => got++);
    expect(got).toBe(0);
    expect(items.items).toHaveLength(0);
  });
  it('plafonne le nombre d’objets', () => {
    const items = new ItemField();
    for (let i = 0; i < MAX_ITEMS + 50; i++) items.spawn(0, 0, 'star');
    expect(items.items).toHaveLength(MAX_ITEMS);
    items.clear();
    expect(items.items).toHaveLength(0);
  });
});

describe('monde', () => {
  it('fait apparaître les premières vagues', () => {
    const w = newWorld();
    for (let i = 0; i < 4 * FPS; i++) w.step(NO_INPUT);
    expect(w.enemies.length).toBeGreaterThan(0);
  });
  it('la Nova efface les balles, rend invulnérable et se consomme', () => {
    const w = newWorld();
    w.step(NO_INPUT);
    for (let i = 0; i < 30; i++) w.bullets.spawn(100, 100 + i, 0, 0, BulletKind.Orb, BulletColor.Violet);
    const bombs = w.player.bombs;
    w.step({ ...NO_INPUT, bomb: true });
    expect(w.bullets.count).toBe(0);
    expect(w.player.bombs).toBe(bombs - 1);
    expect(w.player.invuln).toBeGreaterThan(100);
    expect(w.bombsUsed).toBe(1);
    expect(w.items.items.some((i) => i.kind === 'star')).toBe(true);
    expect(w.useBomb()).toBe(false);
  });
  it('un coup coûte une vie et de la puissance', () => {
    const w = newWorld();
    w.player.invuln = 0;
    w.player.powerPts = 250;
    w.bullets.spawn(w.player.x, w.player.y, 0, 0, BulletKind.Big, BulletColor.Gold);
    w.step(NO_INPUT);
    expect(w.player.lives).toBe(2);
    expect(w.hits).toBe(1);
    expect(w.player.powerPts).toBe(150);
    expect(w.player.invuln).toBeGreaterThan(0);
    expect(w.bullets.count).toBe(0);
  });
  it('le bouclier absorbe un coup', () => {
    const w = new World({ stage: 'corail', ship: 'etincelle', difficulty: 'normal', upgrades: { ...NO_UPGRADES, bouclier: 1 }, seed: 1 });
    w.player.invuln = 0;
    w.bullets.spawn(w.player.x, w.player.y, 0, 0, BulletKind.Big, BulletColor.Gold);
    w.step(NO_INPUT);
    expect(w.player.lives).toBe(3);
    expect(w.player.shield).toBe(0);
    expect(w.hits).toBe(0);
  });
  it('plus de vie : partie terminée', () => {
    const w = newWorld();
    w.player.lives = 1;
    w.player.invuln = 0;
    w.bullets.spawn(w.player.x, w.player.y, 0, 0, BulletKind.Big, BulletColor.Gold);
    w.step(NO_INPUT);
    expect(w.phase).toBe('gameover');
    expect(w.finished).toBe(true);
    expect(w.result().cleared).toBe(false);
    const f = w.frame;
    w.step(NO_INPUT);
    expect(w.frame).toBe(f);
  });
  it('les frôlements remplissent la jauge Nova et offrent une bombe', () => {
    const w = newWorld();
    w.step(NO_INPUT);
    w.player.invuln = 0;
    w.player.nova = NOVA_MAX - 0.5;
    const bombs = w.player.bombs;
    w.bullets.spawn(w.player.x + 14, w.player.y, 0, 0, BulletKind.Small, BulletColor.Magenta);
    w.step(NO_INPUT);
    expect(w.grazes).toBe(1);
    expect(w.player.bombs).toBe(bombs + 1);
    expect(w.player.nova).toBe(0);
  });
  it('détruire un ennemi rapporte score et éclats', () => {
    const w = newWorld();
    w.step(NO_INPUT);
    const e = createEnemy('porteur', 0.5, { kind: 'dive', speed: 0 });
    e.y = 120;
    e.hp = 1;
    w.enemies.push(e);
    w.useBomb();
    expect(w.kills).toBe(1);
    expect(w.score).toBeGreaterThanOrEqual(e.def.score);
    expect(w.items.items.some((i) => i.kind === 'bigShard')).toBe(true);
    expect(w.items.items.some((i) => i.kind === 'bomb')).toBe(true);
  });
  it('ramasser applique les effets', () => {
    const w = newWorld();
    w.step(NO_INPUT);
    const p = w.player;
    for (const k of ['power', 'shard', 'bigShard', 'bomb', 'life'] as const) w.items.spawn(p.x, p.y, k, 0, true);
    const lives = p.lives;
    const bombs = p.bombs;
    w.step(NO_INPUT);
    expect(w.shards).toBe(6);
    expect(p.lives).toBe(lives + 1);
    expect(p.bombs).toBe(bombs + 1);
    expect(p.powerPts).toBe(25);
  });
  it('est déterministe : même graine, mêmes commandes, même partie', () => {
    const run = (seed: number) => {
      const w = newWorld(seed);
      for (let i = 0; i < 40 * FPS; i++) w.step({ dx: Math.sin(i / 50), dy: 0, focus: i % 200 < 50, bomb: i === 900, target: null });
      return [w.score, w.kills, w.player.x, w.bullets.count, w.items.items.length];
    };
    expect(run(5)).toEqual(run(5));
  });
  it('après les vagues : alerte puis boss', () => {
    const w = newWorld();
    w.player.lives = 99;
    while (w.phase === 'waves' && w.frame < 200 * FPS) {
      w.player.invuln = 999;
      w.step(NO_INPUT);
    }
    expect(w.phase).toBe('warning');
    for (let i = 0; i < 200; i++) w.step(NO_INPUT);
    expect(w.phase).toBe('boss');
    expect(w.boss?.def.id).toBe('faucheur');
  });
});
