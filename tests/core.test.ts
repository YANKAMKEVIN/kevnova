import { describe, expect, it } from 'vitest';
import { Emitter } from '../src/core/emitter';
import { angleTo, approach, clamp, dist2, easeInOutSine, easeOutCubic, formatScore, lerp, TAU, wrapAngle } from '../src/core/math';
import { Rng } from '../src/core/rng';

describe('Rng', () => {
  it('est déterministe pour une même graine', () => {
    const a = new Rng(42);
    const b = new Rng(42);
    for (let i = 0; i < 100; i++) expect(a.next()).toBe(b.next());
  });
  it('diffère selon la graine', () => {
    expect(new Rng(1).next()).not.toBe(new Rng(2).next());
  });
  it('reste dans [0, 1)', () => {
    const r = new Rng(7);
    for (let i = 0; i < 10000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
  it('int couvre les bornes incluses', () => {
    const r = new Rng(3);
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) seen.add(r.int(1, 4));
    expect([...seen].sort()).toEqual([1, 2, 3, 4]);
  });
  it('range, chance et pick', () => {
    const r = new Rng(9);
    for (let i = 0; i < 100; i++) {
      const v = r.range(5, 6);
      expect(v).toBeGreaterThanOrEqual(5);
      expect(v).toBeLessThan(6);
    }
    expect(r.chance(0)).toBe(false);
    expect(r.chance(1)).toBe(true);
    expect(['a', 'b']).toContain(r.pick(['a', 'b']));
    expect(() => r.pick([])).toThrow();
  });
  it('une graine nulle reste utilisable', () => {
    const r = new Rng(0);
    expect(r.state).not.toBe(0);
    expect(r.next()).toBeGreaterThanOrEqual(0);
  });
});

describe('math', () => {
  it.each([
    [5, 0, 10, 5],
    [-1, 0, 10, 0],
    [11, 0, 10, 10],
  ])('clamp(%d) = %d', (v, a, b, r) => expect(clamp(v, a, b)).toBe(r));
  it('lerp, dist2, angleTo', () => {
    expect(lerp(0, 10, 0.25)).toBe(2.5);
    expect(dist2(0, 0, 3, 4)).toBe(25);
    expect(angleTo(0, 0, 0, 1)).toBeCloseTo(Math.PI / 2);
  });
  it('approach ne dépasse jamais la cible', () => {
    expect(approach(0, 10, 3)).toBe(3);
    expect(approach(9, 10, 3)).toBe(10);
    expect(approach(10, 0, 4)).toBe(6);
    expect(approach(1, 0, 4)).toBe(0);
  });
  it('easing borné', () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(2)).toBe(1);
    expect(easeInOutSine(0)).toBeCloseTo(0);
    expect(easeInOutSine(1)).toBeCloseTo(1);
  });
  it('wrapAngle ramène dans ]-PI, PI]', () => {
    for (const a of [-10, -Math.PI, 0, 3, 7, 100]) {
      const w = wrapAngle(a);
      expect(w).toBeGreaterThan(-Math.PI - 1e-9);
      expect(w).toBeLessThanOrEqual(Math.PI + 1e-9);
      expect(Math.cos(w)).toBeCloseTo(Math.cos(a));
    }
    expect(wrapAngle(TAU)).toBeCloseTo(0);
  });
  it('formatScore remplit à 9 chiffres', () => {
    expect(formatScore(1234.9)).toBe('000001234');
  });
});

describe('Emitter', () => {
  it('appelle, se désabonne et se vide', () => {
    const e = new Emitter<{ a: number; b: string }>();
    const got: number[] = [];
    const off = e.on('a', (n) => got.push(n));
    e.emit('a', 1);
    off();
    e.emit('a', 2);
    e.emit('b', 'x');
    expect(got).toEqual([1]);
    e.on('a', (n) => got.push(n));
    e.clear();
    e.emit('a', 3);
    expect(got).toEqual([1]);
  });
});
