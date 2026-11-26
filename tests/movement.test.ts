import { describe, expect, it } from 'vitest';
import { createEnemy, stepEnemy } from '../src/sim/enemy';
import { spawnPoint, stepPath, type Mover } from '../src/sim/paths';
import { Rng } from '../src/core/rng';
import { BulletField } from '../src/sim/bullets';
import { addPower, createPlayer, MAX_POWER_PTS, movePlayer, powerLevel } from '../src/sim/player';
import { satelliteOffsets, ShotKind, ShotPool, volley } from '../src/sim/shots';
import { FIELD_H, FIELD_W, NO_UPGRADES, type PathSpec } from '../src/sim/types';

const mover = (x = 100, y = 0): Mover => ({ x, y, x0: x, y0: y, t: 0, arrivedAt: -1 });

describe('trajectoires', () => {
  it('dive descend tout droit', () => {
    const m = mover();
    stepPath(m, { kind: 'dive', speed: 2 });
    expect(m).toMatchObject({ x: 100, y: 2, t: 1 });
  });
  it('sine oscille autour de son origine', () => {
    const m = mover();
    let maxDx = 0;
    for (let i = 0; i < 300; i++) {
      stepPath(m, { kind: 'sine', speed: 1, amp: 40, freq: 0.05 });
      maxDx = Math.max(maxDx, Math.abs(m.x - 100));
    }
    expect(maxDx).toBeLessThanOrEqual(40);
    expect(maxDx).toBeGreaterThan(35);
  });
  it.each([1, -1] as const)('swoop part du côté %d', (dir) => {
    const m = mover(180);
    for (let i = 0; i < 200; i++) stepPath(m, { kind: 'swoop', speed: 2, dir });
    expect(Math.sign(m.x - 180)).toBe(dir);
  });
  it('hover arrive, attend puis repart', () => {
    const m = mover(100, -30);
    const p: PathSpec = { kind: 'hover', speed: 2, stopY: 150, hold: 60 };
    for (let i = 0; i < 400 && m.arrivedAt < 0; i++) stepPath(m, p);
    expect(m.arrivedAt).toBeGreaterThan(0);
    const yStop = m.y;
    for (let i = 0; i < 50; i++) stepPath(m, p);
    expect(Math.abs(m.y - yStop)).toBeLessThan(0.01);
    for (let i = 0; i < 200; i++) stepPath(m, p);
    expect(m.y).toBeGreaterThan(yStop + 50);
  });
  it('cross traverse horizontalement', () => {
    const p: PathSpec = { kind: 'cross', speed: 2, dir: -1, stopY: 200 };
    const s = spawnPoint(p, 0.5);
    expect(s.x).toBeGreaterThan(FIELD_W);
    const m = mover(s.x, s.y);
    for (let i = 0; i < 10; i++) stepPath(m, p);
    expect(m.x).toBeLessThan(s.x);
    expect(Math.abs(m.y - 200)).toBeLessThanOrEqual(10);
    expect(spawnPoint({ ...p, dir: 1 }, 0.5).x).toBeLessThan(0);
  });
  it('orbit tourne en descendant', () => {
    const m = mover(180, 0);
    for (let i = 0; i < 100; i++) stepPath(m, { kind: 'orbit', speed: 1, amp: 30 });
    expect(m.y0).toBe(100);
  });
  it('spawnPoint place les ennemis au-dessus de l’écran', () => {
    expect(spawnPoint({ kind: 'dive', speed: 1 }, 0.25)).toEqual({ x: FIELD_W * 0.25, y: -30 });
  });
});

describe('ennemis', () => {
  it('ne tirent pas tant qu’ils sont hors écran', () => {
    const bullets = new BulletField(100);
    const e = createEnemy('mante', 0.5, { kind: 'dive', speed: 0 });
    const ctx = { bullets, rng: new Rng(1), scale: { speed: 1, density: 1, rate: 1 }, targetX: 180, targetY: 500 };
    for (let i = 0; i < 200; i++) stepEnemy(e, ctx);
    expect(bullets.count).toBe(0);
  });
  it('tirent une fois visibles puis disparaissent en sortant', () => {
    const bullets = new BulletField(500);
    const e = createEnemy('mante', 0.5, { kind: 'dive', speed: 1.5 });
    const ctx = { bullets, rng: new Rng(1), scale: { speed: 1, density: 1, rate: 1 }, targetX: 180, targetY: 500 };
    let fired = 0;
    for (let i = 0; i < 1000 && e.alive; i++) {
      stepEnemy(e, ctx);
      fired = Math.max(fired, bullets.count);
    }
    expect(fired).toBeGreaterThan(0);
    expect(e.alive).toBe(false);
  });
  it('les PV suivent l’échelle de difficulté', () => {
    expect(createEnemy('cuirasse', 0.5, { kind: 'dive', speed: 1 }, 1.5).hp).toBe(90);
  });
  it('les toupies tournent', () => {
    const e = createEnemy('toupie', 0.5, { kind: 'dive', speed: 1 });
    const ctx = { bullets: new BulletField(50), rng: new Rng(1), scale: { speed: 1, density: 1, rate: 1 }, targetX: 0, targetY: 0 };
    stepEnemy(e, ctx);
    expect(e.rot).toBeGreaterThan(0);
  });
});

describe('vaisseau du joueur', () => {
  it('les améliorations définissent le départ', () => {
    const p = createPlayer('etincelle', { ...NO_UPGRADES, canon: 2, coque: 1, nova: 2, bouclier: 1, aimant: 3, satellites: 2, missiles: 1 });
    expect(powerLevel(p)).toBe(3);
    expect(p.lives).toBe(4);
    expect(p.bombs).toBe(4);
    expect(p.shield).toBe(1);
    expect(p.magnet).toBeGreaterThan(createPlayer('etincelle', NO_UPGRADES).magnet);
  });
  it('se déplace à vitesse constante en diagonale', () => {
    const p = createPlayer('etincelle', NO_UPGRADES);
    const x = p.x;
    const y = p.y;
    movePlayer(p, { dx: 1, dy: -1, focus: false, bomb: false });
    expect(Math.hypot(p.x - x, p.y - y)).toBeCloseTo(p.ship.speed);
  });
  it('la concentration ralentit', () => {
    const p = createPlayer('lance', NO_UPGRADES);
    const x = p.x;
    movePlayer(p, { dx: 1, dy: 0, focus: true, bomb: false });
    expect(p.x - x).toBeCloseTo(p.ship.focusSpeed);
    expect(p.focus).toBe(true);
  });
  it('reste dans le terrain', () => {
    const p = createPlayer('gerbe', NO_UPGRADES);
    for (let i = 0; i < 300; i++) movePlayer(p, { dx: -1, dy: 1, focus: false, bomb: false });
    expect(p.x).toBeGreaterThanOrEqual(12);
    expect(p.y).toBeLessThanOrEqual(FIELD_H - 18);
  });
  it('suit une cible tactile sans téléporter', () => {
    const p = createPlayer('etincelle', NO_UPGRADES);
    const x = p.x;
    movePlayer(p, { dx: 0, dy: 0, focus: false, bomb: false, target: { x: x + 200, y: p.y } });
    expect(p.x - x).toBeCloseTo(p.ship.speed * 2.2);
    movePlayer(p, { dx: 0, dy: 0, focus: false, bomb: false, target: { x: p.x + 1, y: p.y } });
    expect(p.vx).toBeCloseTo(1);
  });
  it('la puissance monte par paliers et plafonne', () => {
    const p = createPlayer('etincelle', NO_UPGRADES);
    expect(powerLevel(p)).toBe(1);
    expect(addPower(p, 99)).toBe(false);
    expect(addPower(p, 1)).toBe(true);
    addPower(p, 10000);
    expect(p.powerPts).toBe(MAX_POWER_PTS);
    expect(powerLevel(p)).toBe(5);
  });
});

describe('tirs', () => {
  it.each(['etincelle', 'lance', 'gerbe'] as const)('%s tire plus fort à chaque niveau', (ship) => {
    let prev = 0;
    for (let l = 1; l <= 5; l++) {
      const dmg = volley(ship, l, false).reduce((a, v) => a + v.dmg, 0);
      expect(dmg).toBeGreaterThan(prev);
      prev = dmg;
    }
  });
  it('la concentration resserre l’éventail', () => {
    const spread = (focus: boolean): number => Math.max(...volley('gerbe', 4, focus).map((v) => Math.abs(v.angle)));
    expect(spread(true)).toBeLessThan(spread(false));
  });
  it('le niveau est borné entre 1 et 5', () => {
    expect(volley('etincelle', 0, false)).toEqual(volley('etincelle', 1, false));
    expect(volley('etincelle', 9, false)).toEqual(volley('etincelle', 5, false));
  });
  it('satellites : 0, 2 puis 4', () => {
    expect(satelliteOffsets(0, false)).toHaveLength(0);
    expect(satelliteOffsets(1, false)).toHaveLength(2);
    expect(satelliteOffsets(2, true)).toHaveLength(4);
  });
  it('le réservoir recycle les tirs', () => {
    const pool = new ShotPool();
    const s = pool.spawn(0, 0, 0, -1, 1, ShotKind.Main);
    s.alive = false;
    pool.compact();
    expect(pool.items).toHaveLength(0);
    expect(pool.spawn(1, 1, 0, -1, 1, ShotKind.Needle)).toBe(s);
    pool.clear();
    expect(pool.items).toHaveLength(0);
  });
});
