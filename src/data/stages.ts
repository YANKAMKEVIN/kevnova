import type { BossId, EnemyId, PathSpec, StageId } from '../sim/types';

export interface WaveSpec {
  /** Instant d'apparition du premier ennemi (secondes depuis le début du secteur). */
  at: number;
  enemy: EnemyId;
  count: number;
  /** Écart entre deux ennemis (secondes). */
  gap: number;
  /** Abscisse de départ (0 = gauche, 1 = droite). */
  x: number;
  /** Décalage d'abscisse entre deux ennemis successifs. */
  dx?: number;
  path: PathSpec;
}

export interface StageDef {
  id: StageId;
  index: number;
  name: string;
  subtitle: string;
  background: string;
  deco: string;
  /** Teinte d'ambiance (vignette, particules). */
  tint: string;
  /** Durée de la phase de vagues avant le boss (s). */
  duration: number;
  waves: WaveSpec[];
  boss: BossId;
  music: number;
}

const dive = (speed = 1.6): PathSpec => ({ kind: 'dive', speed });
const sine = (speed = 1.2, amp = 50, freq = 0.03): PathSpec => ({ kind: 'sine', speed, amp, freq });
const swoop = (dir: 1 | -1, speed = 2): PathSpec => ({ kind: 'swoop', speed, dir });
const hover = (stopY: number, hold = 240, speed = 1.6): PathSpec => ({ kind: 'hover', speed, stopY, hold });
const cross = (dir: 1 | -1, stopY: number, speed = 1.4): PathSpec => ({ kind: 'cross', speed, dir, stopY });
const orbit = (speed = 0.6, amp = 50): PathSpec => ({ kind: 'orbit', speed, amp, freq: 0.03 });

/** Une file d'ennemis identiques. */
const file = (at: number, enemy: EnemyId, count: number, x: number, path: PathSpec, gap = 0.45, dx = 0): WaveSpec => ({
  at, enemy, count, gap, x, dx, path,
});
/** Deux files symétriques. */
const paire = (at: number, enemy: EnemyId, count: number, x: number, path: PathSpec, gap = 0.45): WaveSpec[] => {
  const mirror: PathSpec = path.dir ? { ...path, dir: (path.dir * -1) as 1 | -1 } : path;
  return [file(at, enemy, count, x, path, gap), file(at, enemy, count, 1 - x, mirror, gap)];
};

export const STAGES: readonly StageDef[] = [
  {
    id: 'corail', index: 0, name: 'Nébuleuse Corail', subtitle: 'Secteur 1', background: 'fond_corail', deco: 'deco_asteroide',
    tint: '#ff7aa8', duration: 62, boss: 'faucheur', music: 0,
    waves: [
      file(2, 'dard', 5, 0.3, dive(1.8), 0.4),
      file(5, 'dard', 5, 0.7, dive(1.8), 0.4),
      ...paire(9, 'dard', 4, 0.15, swoop(1, 2.1), 0.35),
      file(13, 'toupie', 3, 0.2, sine(1.1, 60), 0.9, 0.3),
      file(18, 'mante', 1, 0.5, hover(150, 260), 0),
      ...paire(22, 'dard', 5, 0.1, swoop(1, 2.2), 0.3),
      file(27, 'toupie', 4, 0.8, sine(1.2, 50), 0.8, -0.2),
      ...paire(32, 'mante', 1, 0.25, hover(170, 220), 0),
      file(37, 'dard', 8, 0.5, sine(1.6, 120, 0.02), 0.3),
      ...paire(42, 'toupie', 3, 0.2, dive(1.3), 0.7),
      file(46, 'cuirasse', 1, 0.5, hover(140, 360, 1.2), 0),
      ...paire(52, 'dard', 6, 0.05, swoop(1, 2.4), 0.25),
      file(56, 'mante', 2, 0.3, hover(200, 200), 1.2, 0.4),
    ],
  },
  {
    id: 'givre', index: 1, name: 'Anneaux de Givre', subtitle: 'Secteur 2', background: 'fond_givre', deco: 'deco_glace',
    tint: '#9fe8ff', duration: 66, boss: 'sentinelle', music: 1,
    waves: [
      file(2, 'eclat', 4, 0.2, dive(1.6), 0.6, 0.2),
      file(5, 'eclat', 4, 0.8, dive(1.6), 0.6, -0.2),
      ...paire(9, 'dard', 5, 0.1, swoop(1, 2.3), 0.3),
      ...paire(13, 'tourelle', 1, 0.25, hover(130, 300, 1.2), 0),
      file(19, 'eclat', 7, 0.5, sine(1.3, 110, 0.025), 0.4),
      file(24, 'mante', 3, 0.2, hover(180, 200), 1, 0.3),
      file(30, 'porteur', 1, 0.5, hover(130, 600, 0.9), 0),
      ...paire(42, 'eclat', 4, 0.15, swoop(1, 2.0), 0.45),
      file(46, 'cuirasse', 1, 0.3, hover(150, 300, 1.1), 0),
      file(48, 'cuirasse', 1, 0.7, hover(190, 300, 1.1), 0),
      ...paire(54, 'toupie', 4, 0.1, cross(1, 120), 0.6),
      file(58, 'dard', 10, 0.5, sine(1.8, 140, 0.02), 0.22),
    ],
  },
  {
    id: 'forge', index: 2, name: 'Forge Écarlate', subtitle: 'Secteur 3', background: 'fond_forge', deco: 'deco_epave',
    tint: '#ff8a3d', duration: 68, boss: 'fondeur', music: 2,
    waves: [
      file(2, 'cuirasse', 1, 0.5, hover(140, 260, 1.2), 0),
      ...paire(6, 'dard', 6, 0.08, swoop(1, 2.4), 0.25),
      ...paire(11, 'tourelle', 1, 0.2, hover(120, 320, 1.0), 0),
      file(14, 'mante', 4, 0.15, cross(1, 200, 1.2), 0.8),
      file(20, 'toupie', 6, 0.5, orbit(0.7, 70), 0.5),
      file(26, 'porteur', 1, 0.5, hover(120, 620, 0.9), 0),
      ...paire(38, 'cuirasse', 1, 0.25, hover(160, 280, 1.1), 0),
      ...paire(44, 'dard', 8, 0.05, swoop(1, 2.6), 0.2),
      file(50, 'mante', 4, 0.85, cross(-1, 160, 1.3), 0.7),
      ...paire(55, 'tourelle', 1, 0.35, hover(200, 300, 1.0), 0),
      file(60, 'toupie', 8, 0.5, sine(1.5, 130, 0.022), 0.3),
    ],
  },
  {
    id: 'abysse', index: 3, name: 'Abysse Lumineuse', subtitle: 'Secteur 4', background: 'fond_abysse', deco: 'deco_glace',
    tint: '#7d6bff', duration: 70, boss: 'leviathan', music: 3,
    waves: [
      file(2, 'meduse', 3, 0.25, sine(0.9, 40), 1.0, 0.25),
      ...paire(7, 'dard', 6, 0.1, swoop(1, 2.4), 0.25),
      file(12, 'meduse', 4, 0.5, orbit(0.6, 80), 0.9),
      ...paire(18, 'mante', 2, 0.2, hover(170, 220), 0.9),
      file(24, 'porteur', 1, 0.5, hover(120, 600, 0.9), 0),
      ...paire(36, 'meduse', 2, 0.15, dive(1.0), 1.0),
      file(41, 'cuirasse', 1, 0.5, hover(150, 330, 1.1), 0),
      ...paire(46, 'toupie', 5, 0.1, cross(1, 140), 0.5),
      file(52, 'meduse', 5, 0.1, sine(1.0, 30), 0.7, 0.2),
      ...paire(57, 'tourelle', 1, 0.2, hover(130, 300, 1.0), 0),
      file(62, 'dard', 12, 0.5, sine(2.0, 150, 0.02), 0.2),
    ],
  },
  {
    id: 'couronne', index: 4, name: 'Couronne Éteinte', subtitle: 'Secteur 5', background: 'fond_couronne', deco: 'deco_epave',
    tint: '#c86bff', duration: 72, boss: 'archonte', music: 4,
    waves: [
      ...paire(2, 'dard', 6, 0.08, swoop(1, 2.5), 0.22),
      file(6, 'meduse', 3, 0.5, orbit(0.6, 90), 0.9),
      ...paire(11, 'cuirasse', 1, 0.25, hover(150, 260, 1.1), 0),
      file(17, 'eclat', 8, 0.5, sine(1.5, 140, 0.025), 0.3),
      ...paire(22, 'tourelle', 1, 0.15, hover(120, 300, 1.0), 0),
      file(26, 'porteur', 1, 0.5, hover(120, 600, 0.9), 0),
      ...paire(38, 'mante', 2, 0.2, hover(180, 220), 0.8),
      file(43, 'toupie', 6, 0.15, cross(1, 120, 1.5), 0.45),
      file(46, 'toupie', 6, 0.85, cross(-1, 200, 1.5), 0.45),
      ...paire(51, 'meduse', 2, 0.2, dive(1.0), 0.9),
      file(56, 'cuirasse', 1, 0.5, hover(140, 320, 1.1), 0),
      ...paire(62, 'dard', 8, 0.05, swoop(1, 2.7), 0.2),
    ],
  },
];

export const stageById = (id: StageId): StageDef => {
  const s = STAGES.find((x) => x.id === id);
  if (!s) throw new Error(`Secteur inconnu : ${id}`);
  return s;
};

export const nextStage = (id: StageId): StageDef | null => STAGES[stageById(id).index + 1] ?? null;
