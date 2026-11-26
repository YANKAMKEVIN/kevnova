import { BulletColor as C, BulletKind as K, type BossId, type FireSpec } from '../sim/types';

export type BossMove = 'hover' | 'sweep' | 'figure8' | 'drift' | 'charge';

export interface BossPhase {
  name: string;
  hp: number;
  move: BossMove;
  /** Durée max (s) : au-delà, la phase cède sans bonus (le joueur n'est jamais bloqué). */
  timeLimit: number;
  fire: FireSpec[];
}

export interface BossDef {
  id: BossId;
  name: string;
  title: string;
  sprite: string;
  size: number;
  radius: number;
  score: number;
  shards: number;
  phases: BossPhase[];
}

const P = Math.PI;

export const BOSSES: Record<BossId, BossDef> = {
  faucheur: {
    id: 'faucheur', name: 'Le Faucheur Corail', title: 'Moissonneur de la Nébuleuse', sprite: 'boss_faucheur',
    size: 190, radius: 46, score: 50000, shards: 60,
    phases: [
      { name: 'Pinces de corail', hp: 700, move: 'sweep', timeLimit: 30, fire: [
        { pattern: 'aimed', every: 55, n: 5, spread: 0.8, speed: 2.6, kind: K.Rice, color: C.Magenta, offsetX: -50, offsetY: 20 },
        { pattern: 'aimed', every: 55, delay: 27, n: 5, spread: 0.8, speed: 2.6, kind: K.Rice, color: C.Magenta, offsetX: 50, offsetY: 20 },
        { pattern: 'ring', every: 90, delay: 45, n: 16, speed: 1.6, spin: 0.21, kind: K.Orb, color: C.Violet },
      ] },
      { name: 'Récolte', hp: 850, move: 'hover', timeLimit: 32, fire: [
        { pattern: 'spiral', every: 7, n: 4, speed: 1.8, spin: 0.055, kind: K.Small, color: C.Magenta },
        { pattern: 'aimed', every: 80, delay: 40, n: 3, spread: 0.35, speed: 2.8, kind: K.Big, color: C.Gold },
      ] },
      { name: 'Tempête de corail', hp: 950, move: 'figure8', timeLimit: 34, fire: [
        { pattern: 'flower', every: 55, n: 7, speed: 1.5, angVel: 0.011, spin: 0.3, kind: K.Orb, color: C.Magenta },
        { pattern: 'random', every: 20, n: 3, spread: 1.6, speed: 2.0, kind: K.Small, color: C.Gold },
      ] },
    ],
  },
  sentinelle: {
    id: 'sentinelle', name: 'La Sentinelle de Givre', title: 'Gardienne des Anneaux', sprite: 'boss_sentinelle',
    size: 190, radius: 46, score: 70000, shards: 80,
    phases: [
      { name: 'Cristaux', hp: 900, move: 'hover', timeLimit: 30, fire: [
        { pattern: 'stack', every: 40, n: 5, speed: 2.1, kind: K.Shard, color: C.Ice },
        { pattern: 'ring', every: 85, delay: 40, n: 20, speed: 1.5, spin: 0.13, kind: K.Small, color: C.White },
      ] },
      { name: 'Blizzard', hp: 950, move: 'drift', timeLimit: 32, fire: [
        { pattern: 'random', every: 7, n: 2, spread: 2.2, speed: 1.7, kind: K.Shard, color: C.Ice },
        { pattern: 'aimed', every: 110, delay: 60, n: 1, speed: 1.8, kind: K.Big, color: C.White },
      ] },
      { name: 'Prisme', hp: 1050, move: 'hover', timeLimit: 34, fire: [
        { pattern: 'spiral', every: 10, n: 3, speed: 1.7, spin: 0.05, kind: K.Rice, color: C.Ice },
        { pattern: 'spiral', every: 10, delay: 5, n: 3, speed: 1.7, spin: -0.05, kind: K.Rice, color: C.Violet },
      ] },
      { name: 'Zéro absolu', hp: 1100, move: 'sweep', timeLimit: 34, fire: [
        { pattern: 'ring', every: 45, n: 22, speed: 0.4, accel: 0.03, maxSpeed: 2.6, spin: 0.07, kind: K.Orb, color: C.Ice },
        { pattern: 'aimed', every: 70, delay: 20, n: 3, spread: 0.3, speed: 3, kind: K.Shard, color: C.White },
      ] },
    ],
  },
  fondeur: {
    id: 'fondeur', name: 'Le Grand Fondeur', title: 'Cœur de la Forge Écarlate', sprite: 'boss_fondeur',
    size: 210, radius: 52, score: 90000, shards: 100,
    phases: [
      { name: 'Coulée', hp: 1050, move: 'sweep', timeLimit: 30, fire: [
        { pattern: 'wall', every: 60, n: 11, spread: 300, speed: 1.6, kind: K.Orb, color: C.Braise, offsetY: 30 },
        { pattern: 'aimed', every: 45, delay: 20, n: 3, spread: 0.4, speed: 2.7, kind: K.Rice, color: C.Gold },
      ] },
      { name: 'Marteaux', hp: 1150, move: 'charge', timeLimit: 32, fire: [
        { pattern: 'stack', every: 50, n: 4, speed: 1.9, kind: K.Big, color: C.Braise, offsetX: -60 },
        { pattern: 'stack', every: 50, delay: 25, n: 4, speed: 1.9, kind: K.Big, color: C.Braise, offsetX: 60 },
        { pattern: 'ring', every: 70, delay: 35, n: 18, speed: 1.8, spin: 0.17, kind: K.Small, color: C.Gold },
      ] },
      { name: 'Étincelles', hp: 1200, move: 'figure8', timeLimit: 34, fire: [
        { pattern: 'random', every: 5, n: 2, spread: 2.6, speed: 2.1, kind: K.Small, color: C.Braise },
        { pattern: 'spiral', every: 14, n: 2, speed: 1.5, spin: 0.09, kind: K.Orb, color: C.Gold },
      ] },
      { name: 'Fusion', hp: 1300, move: 'hover', timeLimit: 36, fire: [
        { pattern: 'flower', every: 40, n: 8, speed: 1.6, angVel: 0.009, spin: 0.25, kind: K.Orb, color: C.Braise },
        { pattern: 'aimed', every: 90, delay: 45, n: 7, spread: 1.0, speed: 2.4, kind: K.Rice, color: C.White },
      ] },
    ],
  },
  leviathan: {
    id: 'leviathan', name: 'Le Léviathan Nacré', title: 'Chanteur de l’Abysse', sprite: 'boss_leviathan',
    size: 220, radius: 50, score: 110000, shards: 120,
    phases: [
      { name: 'Chant des abysses', hp: 1200, move: 'drift', timeLimit: 32, fire: [
        { pattern: 'flower', every: 50, n: 6, speed: 1.4, angVel: 0.014, spin: 0.4, kind: K.Orb, color: C.Violet },
        { pattern: 'aimed', every: 60, delay: 30, n: 3, spread: 0.5, speed: 2.5, kind: K.Rice, color: C.Ice },
      ] },
      { name: 'Marée', hp: 1300, move: 'sweep', timeLimit: 34, fire: [
        { pattern: 'spiral', every: 6, n: 2, speed: 1.9, spin: 0.11, kind: K.Small, color: C.Violet },
        { pattern: 'ring', every: 80, delay: 40, n: 14, speed: 1.3, angVel: 0.008, spin: 0.2, kind: K.Orb, color: C.Magenta },
      ] },
      { name: 'Spores', hp: 1350, move: 'figure8', timeLimit: 34, fire: [
        { pattern: 'random', every: 9, n: 2, spread: 3.2, speed: 1.1, kind: K.Orb, color: C.Ice },
        { pattern: 'stack', every: 55, delay: 25, n: 4, speed: 2.0, kind: K.Rice, color: C.Magenta },
      ] },
      { name: 'Gueule de nacre', hp: 1450, move: 'hover', timeLimit: 36, fire: [
        { pattern: 'ring', every: 38, n: 24, speed: 0.5, accel: 0.035, maxSpeed: 2.8, spin: 0.09, kind: K.Rice, color: C.Violet },
        { pattern: 'aimed', every: 100, delay: 50, n: 1, speed: 2, kind: K.Big, color: C.Magenta },
      ] },
    ],
  },
  archonte: {
    id: 'archonte', name: 'L’Archonte Cendre', title: 'Souverain de la Flotte Éteignoir', sprite: 'boss_archonte',
    size: 240, radius: 54, score: 200000, shards: 200,
    phases: [
      { name: 'Couronne d’ombre', hp: 1300, move: 'hover', timeLimit: 32, fire: [
        { pattern: 'ring', every: 50, n: 20, speed: 1.7, spin: 0.15, kind: K.Orb, color: C.Violet },
        { pattern: 'aimed', every: 50, delay: 25, n: 5, spread: 0.6, speed: 2.7, kind: K.Rice, color: C.Gold },
      ] },
      { name: 'Éclipse', hp: 1400, move: 'sweep', timeLimit: 34, fire: [
        { pattern: 'spiral', every: 8, n: 3, speed: 1.8, spin: 0.07, kind: K.Small, color: C.Magenta },
        { pattern: 'spiral', every: 8, delay: 4, n: 3, speed: 1.8, spin: -0.07, kind: K.Small, color: C.Violet },
      ] },
      { name: 'Pluie de cendres', hp: 1450, move: 'drift', timeLimit: 34, fire: [
        { pattern: 'random', every: 6, n: 2, spread: 2.4, speed: 1.9, kind: K.Small, color: C.Braise },
        { pattern: 'stack', every: 60, delay: 30, n: 5, speed: 2.0, kind: K.Big, color: C.Violet },
      ] },
      { name: 'Aspiration', hp: 1500, move: 'figure8', timeLimit: 36, fire: [
        { pattern: 'flower', every: 45, n: 8, speed: 1.5, angVel: 0.012, spin: 0.33, kind: K.Orb, color: C.Magenta },
        { pattern: 'ring', every: 60, delay: 30, n: 16, speed: 0.6, accel: 0.03, maxSpeed: 2.5, kind: K.Rice, color: C.Gold },
      ] },
      { name: 'Nova inversée', hp: 1700, move: 'hover', timeLimit: 40, fire: [
        { pattern: 'spiral', every: 5, n: 4, speed: 1.6, spin: 0.045, kind: K.Rice, color: C.Violet },
        { pattern: 'ring', every: 70, delay: 35, n: 26, speed: 1.3, spin: 0.12, kind: K.Orb, color: C.Gold },
        { pattern: 'aimed', every: 120, delay: 60, n: 1, speed: 2.2, kind: K.Big, color: C.White, angle: P / 2 },
      ] },
    ],
  },
};
