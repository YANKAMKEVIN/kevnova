import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { BulletField } from '../src/sim/bullets';
import { DIFFICULTY, firePattern, shouldFire, type PatternContext } from '../src/sim/patterns';
import { BulletColor, BulletKind, type FireSpec, type PatternId } from '../src/sim/types';

const ctx = (density = 1): PatternContext => ({
  bullets: new BulletField(500),
  rng: new Rng(1),
  scale: { speed: 1, density, rate: 1 },
  targetX: 180,
  targetY: 500,
});
const spec = (pattern: PatternId, extra: Partial<FireSpec> = {}): FireSpec => ({
  pattern, every: 30, speed: 2, kind: BulletKind.Orb, color: BulletColor.Magenta, ...extra,
});

describe('motifs de tir', () => {
  it.each<[PatternId, Partial<FireSpec>, number]>([
    ['aimed', { n: 5, spread: 1 }, 5],
    ['fan', { n: 3, spread: 0.5 }, 3],
    ['ring', { n: 12 }, 12],
    ['spiral', { n: 4, spin: 0.1 }, 4],
    ['flower', { n: 6 }, 12],
    ['random', { n: 7 }, 7],
    ['wall', { n: 9 }, 8],
    ['stack', { n: 4 }, 4],
  ])('%s crée le bon nombre de balles', (p, extra, n) => {
    const c = ctx();
    expect(firePattern(c, spec(p, extra), 180, 100, 0)).toBe(n);
    expect(c.bullets.count).toBe(n);
  });
  it('une salve visée part vers le joueur', () => {
    const c = ctx();
    firePattern(c, spec('aimed', { n: 1 }), 180, 100, 0);
    expect(c.bullets.ang[0]).toBeCloseTo(Math.PI / 2);
  });
  it('un anneau est régulièrement espacé', () => {
    const c = ctx();
    firePattern(c, spec('ring', { n: 8, spin: 0 }), 180, 100, 0);
    const diffs = [...c.bullets.ang.slice(0, 8)].map((a, i, arr) => (i ? a - arr[i - 1]! : 0)).slice(1);
    for (const d of diffs) expect(d).toBeCloseTo(Math.PI / 4, 4);
  });
  it('la spirale tourne avec le temps', () => {
    const a = ctx();
    const b = ctx();
    firePattern(a, spec('spiral', { n: 1, spin: 0.1 }), 180, 100, 0);
    firePattern(b, spec('spiral', { n: 1, spin: 0.1 }), 180, 100, 10);
    expect(b.bullets.ang[0]! - a.bullets.ang[0]!).toBeCloseTo(1, 4);
  });
  it('la densité de difficulté change le nombre de balles', () => {
    const c = ctx(1.5);
    expect(firePattern(c, spec('ring', { n: 10 }), 180, 100, 0)).toBe(15);
    expect(firePattern(ctx(0.1), spec('ring', { n: 10 }), 180, 100, 0)).toBe(3);
  });
  it('la vitesse de difficulté s’applique', () => {
    const c = ctx();
    c.scale = DIFFICULTY.infernal;
    firePattern(c, spec('aimed', { n: 1, speed: 2 }), 180, 100, 0);
    expect(c.bullets.spd[0]).toBeCloseTo(2 * DIFFICULTY.infernal.speed);
  });
  it('les fleurs tournent dans les deux sens', () => {
    const c = ctx();
    firePattern(c, spec('flower', { n: 3, angVel: 0.02 }), 180, 100, 0);
    expect(c.bullets.angVel[0]).toBeCloseTo(0.02);
    expect(c.bullets.angVel[1]).toBeCloseTo(-0.02);
  });
  it('le mur laisse toujours un trou', () => {
    for (let s = 0; s < 20; s++) {
      const c = ctx();
      c.rng = new Rng(s);
      expect(firePattern(c, spec('wall', { n: 10, spread: 300 }), 180, 100, 0)).toBe(9);
    }
  });
  it('les décalages déplacent l’origine', () => {
    const c = ctx();
    firePattern(c, spec('aimed', { n: 1, offsetX: 20, offsetY: -10 }), 100, 100, 0);
    expect(c.bullets.x[0]).toBe(120);
    expect(c.bullets.y[0]).toBe(90);
  });
});

describe('shouldFire', () => {
  it('respecte délai et période', () => {
    const s = spec('aimed', { every: 10, delay: 5 });
    const fired = [...Array(40).keys()].filter((t) => shouldFire(s, t, 1));
    expect(fired).toEqual([5, 15, 25, 35]);
  });
  it('accélère avec le rythme de difficulté', () => {
    const s = spec('aimed', { every: 20 });
    expect([...Array(41).keys()].filter((t) => shouldFire(s, t, 2))).toHaveLength(5);
  });
  it('garde une période minimale de 2 images', () => {
    const s = spec('aimed', { every: 1 });
    expect([...Array(10).keys()].filter((t) => shouldFire(s, t, 4))).toHaveLength(5);
  });
});
