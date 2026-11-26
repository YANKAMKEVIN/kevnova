import { clamp } from '../core/math';
import { shipById, type ShipDef } from '../data/ships';
import { FIELD_H, FIELD_W, type InputFrame, type ShipId, type Upgrades } from './types';

export const HITBOX_RADIUS = 2.5;
export const GRAZE_RADIUS = 18;
export const POWER_PER_LEVEL = 100;
export const MAX_POWER_PTS = POWER_PER_LEVEL * 4;
export const MAX_BOMBS = 5;
export const MAX_LIVES = 7;
export const NOVA_MAX = 100;
export const RESPAWN_INVULN = 180;

export interface PlayerState {
  ship: ShipDef;
  x: number;
  y: number;
  /** Points de puissance : 0 à 400 → niveaux 1 à 5. */
  powerPts: number;
  lives: number;
  bombs: number;
  startBombs: number;
  shield: number;
  invuln: number;
  focus: boolean;
  /** Jauge Nova (frôlements) : pleine → bombe offerte. */
  nova: number;
  fireTimer: number;
  missileTimer: number;
  satellites: number;
  missiles: number;
  magnet: number;
  /** Vitesse effective de la dernière image (pour l'inclinaison du sprite). */
  vx: number;
}

export function createPlayer(shipId: ShipId, up: Upgrades): PlayerState {
  const startBombs = 2 + up.nova;
  return {
    ship: shipById(shipId),
    x: FIELD_W / 2,
    y: FIELD_H - 90,
    powerPts: up.canon * POWER_PER_LEVEL,
    lives: 3 + up.coque,
    bombs: startBombs,
    startBombs,
    shield: up.bouclier,
    invuln: 120,
    focus: false,
    nova: 0,
    fireTimer: 0,
    missileTimer: 0,
    satellites: up.satellites,
    missiles: up.missiles,
    magnet: 44 + up.aimant * 34,
    vx: 0,
  };
}

export const powerLevel = (p: PlayerState): number => 1 + Math.floor(Math.min(p.powerPts, MAX_POWER_PTS) / POWER_PER_LEVEL);

/** Déplace le vaisseau selon les commandes (clavier/manette : direction ; tactile : cible). */
export function movePlayer(p: PlayerState, input: InputFrame): void {
  p.focus = input.focus;
  const speed = p.focus ? p.ship.focusSpeed : p.ship.speed;
  const ox = p.x;
  if (input.target) {
    const dx = input.target.x - p.x;
    const dy = input.target.y - p.y;
    const d = Math.hypot(dx, dy);
    const max = speed * 2.2;
    if (d > 0) {
      const k = Math.min(1, max / d);
      p.x += dx * k;
      p.y += dy * k;
    }
  } else {
    let dx = input.dx;
    let dy = input.dy;
    const len = Math.hypot(dx, dy);
    if (len > 1) {
      dx /= len;
      dy /= len;
    }
    p.x += dx * speed;
    p.y += dy * speed;
  }
  p.x = clamp(p.x, 12, FIELD_W - 12);
  p.y = clamp(p.y, 20, FIELD_H - 18);
  p.vx = p.x - ox;
}

export function addPower(p: PlayerState, pts: number): boolean {
  const before = powerLevel(p);
  p.powerPts = clamp(p.powerPts + pts, 0, MAX_POWER_PTS);
  return powerLevel(p) > before;
}
