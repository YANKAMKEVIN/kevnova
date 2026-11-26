import { clamp } from '../core/math';
import { SHIPS } from '../data/ships';
import { STAGES } from '../data/stages';
import { UPGRADES } from '../data/upgrades';
import { NO_UPGRADES, type Difficulty, type Rank, type ShipId, type StageId, type Upgrades } from '../sim/types';

export const SAVE_VERSION = 2;

export interface Settings {
  music: number;
  sfx: number;
  shake: boolean;
  /** Réduit les flashs lumineux (accessibilité). */
  calmFlashes: boolean;
  difficulty: Difficulty;
  touchSensitivity: number;
  alwaysShowHitbox: boolean;
}

export interface Progress {
  cleared: StageId[];
  bestRank: Partial<Record<StageId, Rank>>;
  bestScore: Partial<Record<StageId, number>>;
  endingSeen: boolean;
  plays: number;
}

export interface Stats {
  kills: number;
  grazes: number;
  bombs: number;
  seconds: number;
}

export interface SaveData {
  version: typeof SAVE_VERSION;
  createdAt: number;
  updatedAt: number;
  settings: Settings;
  progress: Progress;
  wallet: { shards: number; earned: number };
  upgrades: Upgrades;
  ship: ShipId;
  stats: Stats;
}

export function defaultSave(now = 0): SaveData {
  return {
    version: SAVE_VERSION,
    createdAt: now,
    updatedAt: now,
    settings: { music: 0.7, sfx: 0.8, shake: true, calmFlashes: false, difficulty: 'normal', touchSensitivity: 1, alwaysShowHitbox: false },
    progress: { cleared: [], bestRank: {}, bestScore: {}, endingSeen: false, plays: 0 },
    wallet: { shards: 0, earned: 0 },
    upgrades: { ...NO_UPGRADES },
    ship: 'etincelle',
    stats: { kills: 0, grazes: 0, bombs: 0, seconds: 0 },
  };
}

type Loose = Record<string, unknown>;
const obj = (v: unknown): Loose => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Loose) : {});
const num = (v: unknown, def: number, min: number, max: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? clamp(v, min, max) : def;
const int = (v: unknown, def: number, min: number, max: number): number => Math.floor(num(v, def, min, max));
const bool = (v: unknown, def: boolean): boolean => (typeof v === 'boolean' ? v : def);
const STAGE_IDS = STAGES.map((s) => s.id) as readonly string[];
const RANKS: readonly string[] = ['S', 'A', 'B', 'C'];
const DIFFS: readonly string[] = ['doux', 'normal', 'infernal'];
const BIG = 1e12;

/**
 * Remet d'aplomb n'importe quelle donnée (version courante) : champs manquants, types faux,
 * valeurs hors bornes ou identifiants inconnus sont remplacés par des valeurs sûres. Ne jette jamais.
 */
export function sanitize(raw: unknown, now = 0): SaveData {
  const d = defaultSave(now);
  const r = obj(raw);
  const s = obj(r.settings);
  const p = obj(r.progress);
  const w = obj(r.wallet);
  const u = obj(r.upgrades);
  const st = obj(r.stats);
  const ds = d.settings;
  const settings: Settings = {
    music: num(s.music, ds.music, 0, 1),
    sfx: num(s.sfx, ds.sfx, 0, 1),
    shake: bool(s.shake, ds.shake),
    calmFlashes: bool(s.calmFlashes, ds.calmFlashes),
    difficulty: typeof s.difficulty === 'string' && DIFFS.includes(s.difficulty) ? (s.difficulty as Difficulty) : ds.difficulty,
    touchSensitivity: num(s.touchSensitivity, ds.touchSensitivity, 0.5, 2),
    alwaysShowHitbox: bool(s.alwaysShowHitbox, ds.alwaysShowHitbox),
  };
  const cleared = Array.isArray(p.cleared)
    ? STAGES.map((x) => x.id).filter((id) => (p.cleared as unknown[]).includes(id))
    : [];
  const bestRank: Partial<Record<StageId, Rank>> = {};
  const bestScore: Partial<Record<StageId, number>> = {};
  const br = obj(p.bestRank);
  const bs = obj(p.bestScore);
  for (const id of STAGE_IDS) {
    const rk = br[id];
    if (typeof rk === 'string' && RANKS.includes(rk)) bestRank[id as StageId] = rk as Rank;
    if (typeof bs[id] === 'number') bestScore[id as StageId] = int(bs[id], 0, 0, BIG);
  }
  const upgrades = { ...NO_UPGRADES };
  for (const def of UPGRADES) upgrades[def.id] = int(u[def.id], 0, 0, def.costs.length);
  const ship = SHIPS.some((x) => x.id === r.ship) ? (r.ship as ShipId) : d.ship;
  return {
    version: SAVE_VERSION,
    createdAt: num(r.createdAt, now, 0, BIG * 10),
    updatedAt: num(r.updatedAt, now, 0, BIG * 10),
    settings,
    progress: { cleared, bestRank, bestScore, endingSeen: bool(p.endingSeen, false), plays: int(p.plays, 0, 0, BIG) },
    wallet: { shards: int(w.shards, 0, 0, BIG), earned: int(w.earned, 0, 0, BIG) },
    upgrades,
    ship,
    stats: {
      kills: int(st.kills, 0, 0, BIG),
      grazes: int(st.grazes, 0, 0, BIG),
      bombs: int(st.bombs, 0, 0, BIG),
      seconds: num(st.seconds, 0, 0, BIG),
    },
  };
}
