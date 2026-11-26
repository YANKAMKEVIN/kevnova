import { describe, expect, it } from 'vitest';
import { BulletField } from '../src/sim/bullets';
import { BULLET_RADIUS, BulletColor, BulletKind, FIELD_H } from '../src/sim/types';

describe('BulletField', () => {
  it('crée une balle avec son rayon de collision', () => {
    const b = new BulletField(10);
    expect(b.spawn(10, 20, 0, 2, BulletKind.Big, BulletColor.Gold)).toBe(true);
    expect(b.count).toBe(1);
    expect(b.r[0]).toBe(BULLET_RADIUS[BulletKind.Big]);
    expect(b.kind[0]).toBe(BulletKind.Big);
    expect(b.color[0]).toBe(BulletColor.Gold);
  });
  it('refuse sans planter quand le champ est plein', () => {
    const b = new BulletField(3);
    for (let i = 0; i < 3; i++) expect(b.spawn(0, 0, 0, 1, 0, 0)).toBe(true);
    expect(b.spawn(0, 0, 0, 1, 0, 0)).toBe(false);
    expect(b.count).toBe(3);
  });
  it('avance selon angle et vitesse', () => {
    const b = new BulletField(4);
    b.spawn(100, 100, Math.PI / 2, 3, 0, 0);
    b.step();
    expect(b.x[0]).toBeCloseTo(100);
    expect(b.y[0]).toBeCloseTo(103);
    expect(b.age[0]).toBe(1);
  });
  it('accélère jusqu’à la vitesse max', () => {
    const b = new BulletField(4);
    b.spawn(100, 100, 0, 1, 0, 0, 1, 0, 2.5);
    b.step();
    b.step();
    b.step();
    expect(b.spd[0]).toBeCloseTo(2.5);
  });
  it('une décélération ne rend jamais la vitesse négative', () => {
    const b = new BulletField(4);
    b.spawn(100, 100, 0, 1, 0, 0, -2);
    b.step();
    expect(b.spd[0]).toBe(0);
  });
  it('tourne avec la vitesse angulaire', () => {
    const b = new BulletField(4);
    b.spawn(100, 100, 0, 1, 0, 0, 0, 0.1);
    b.step();
    expect(b.ang[0]).toBeCloseTo(0.1);
  });
  it('retire les balles sorties de l’écran et garde les autres', () => {
    const b = new BulletField(8);
    b.spawn(100, FIELD_H + 23, Math.PI / 2, 5, 0, 0);
    b.spawn(50, 50, Math.PI / 2, 1, 0, BulletColor.Violet);
    b.step();
    expect(b.count).toBe(1);
    expect(b.color[0]).toBe(BulletColor.Violet);
  });
  it('remove(i) recopie la dernière balle', () => {
    const b = new BulletField(8);
    b.spawn(1, 1, 0, 0, 0, 0);
    b.spawn(2, 2, 0, 0, 0, 1);
    b.spawn(3, 3, 0, 0, 0, 2);
    b.remove(0);
    expect(b.count).toBe(2);
    expect(b.x[0]).toBe(3);
    b.remove(1);
    expect(b.count).toBe(1);
    b.clear();
    expect(b.count).toBe(0);
  });
});
