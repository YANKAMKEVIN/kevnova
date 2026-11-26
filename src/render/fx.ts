import { BulletColor, type SimEvent } from '../sim/types';
import { BULLET_TINTS, PALETTE } from './palette';
import { Particles, PKind } from './particles';

/** Transforme les événements de la simulation en effets visuels (particules, tremblement, flash). */
export class Fx {
  readonly particles = new Particles();
  shake = 0;
  flash = 0;
  flashColor = '#ffffff';
  shakeEnabled = true;
  calmFlashes = false;
  /** Texte d'annonce (nom de phase de boss, alerte). */
  banner: { text: string; sub: string; t: number; color: string } | null = null;

  setQuality(low: boolean): void {
    this.particles.budget = low ? 500 : 1200;
  }

  handle(e: SimEvent): void {
    const P = this.particles;
    switch (e.type) {
      case 'explode': {
        const col = BULLET_TINTS[e.color][0];
        const n = Math.round(10 + e.size * 14);
        P.add(PKind.Flash, e.x, e.y, 0, 0, 14 + e.size * 6, 18 + e.size * 22, '#fff4e0');
        P.add(PKind.Ring, e.x, e.y, 0, 0, 24 + e.size * 8, 30 + e.size * 40, col);
        P.burst(e.x, e.y, n, 3 + e.size * 1.5, col, 26 + e.size * 6, 1.6 + e.size * 0.4);
        P.burst(e.x, e.y, Math.round(n / 2), 2, PALETTE.gold, 34, 1.2);
        if (e.size >= 1.2) this.addShake(4 + e.size * 3);
        if (e.size >= 2.5) this.addFlash(0.6, '#ffe7b0');
        break;
      }
      case 'hit':
        P.add(PKind.Dot, e.x, e.y, (Math.random() - 0.5) * 2, -1.5, 8, 2.5, '#fff6d8');
        break;
      case 'graze':
        P.add(PKind.Spark, e.x, e.y, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, 14, 1.4, PALETTE.cyan);
        break;
      case 'playerHit':
        P.add(PKind.Ring, e.x, e.y, 0, 0, 40, 120, e.shieldOnly ? PALETTE.cyan : '#ffffff');
        P.burst(e.x, e.y, 30, 5, e.shieldOnly ? PALETTE.cyan : PALETTE.magenta, 40, 2.2);
        this.addShake(e.shieldOnly ? 6 : 14);
        this.addFlash(e.shieldOnly ? 0.25 : 0.55, e.shieldOnly ? PALETTE.cyan : '#ff5577');
        break;
      case 'bomb':
        P.add(PKind.Ring, e.x, e.y, 0, 0, 60, 520, PALETTE.gold);
        P.add(PKind.Ring, e.x, e.y, 0, 0, 50, 380, PALETTE.cyan);
        P.add(PKind.Flash, e.x, e.y, 0, 0, 30, 200, '#fff8e0');
        P.burst(e.x, e.y, 60, 7, PALETTE.gold, 50, 2.4);
        this.addShake(10);
        this.addFlash(0.7, '#fff4cc');
        break;
      case 'pickup':
        P.add(PKind.Ring, e.x, e.y, 0, 0, 18, 26, e.kind === 'bomb' ? PALETTE.gold : e.kind === 'life' ? PALETTE.magenta : PALETTE.cyan);
        break;
      case 'powerUp':
        this.banner = { text: e.level >= 5 ? 'PUISSANCE MAX' : `PUISSANCE ${e.level}`, sub: '', t: 70, color: PALETTE.cyan };
        break;
      case 'bossWarning':
        this.banner = { text: 'ALERTE', sub: 'Signature massive détectée', t: 150, color: PALETTE.magenta };
        break;
      case 'bossPhase':
        this.banner = { text: e.name, sub: `Phase ${e.index + 1}`, t: 110, color: PALETTE.gold };
        break;
      case 'bossDefeated':
        P.burst(e.x, e.y, 120, 9, BULLET_TINTS[BulletColor.Gold][0], 80, 3);
        P.add(PKind.Ring, e.x, e.y, 0, 0, 90, 700, '#ffffff');
        this.addShake(24);
        this.addFlash(1, '#ffffff');
        break;
      default:
        break;
    }
  }

  addShake(v: number): void {
    if (this.shakeEnabled) this.shake = Math.min(26, this.shake + v);
  }

  addFlash(v: number, color: string): void {
    this.flash = Math.max(this.flash, this.calmFlashes ? v * 0.25 : v);
    this.flashColor = color;
  }

  step(): void {
    this.particles.step();
    this.shake *= 0.86;
    if (this.shake < 0.3) this.shake = 0;
    this.flash *= 0.88;
    if (this.flash < 0.01) this.flash = 0;
    if (this.banner && --this.banner.t <= 0) this.banner = null;
  }

  reset(): void {
    this.particles.clear();
    this.shake = 0;
    this.flash = 0;
    this.banner = null;
  }
}
