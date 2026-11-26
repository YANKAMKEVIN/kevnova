import { Rng } from '../core/rng';
import { stageById, type StageDef } from '../data/stages';
import { createBoss, phaseMaxHp, stepBoss, type Boss } from './boss';
import { BulletField } from './bullets';
import { resolveBullets, resolveShots, touchesEnemy } from './combat';
import { createEnemy, stepEnemy, type Enemy } from './enemy';
import { ItemField, type Item } from './items';
import { DIFFICULTY, type DifficultyScale, type PatternContext } from './patterns';
import { addPower, createPlayer, movePlayer, MAX_BOMBS, MAX_LIVES, NOVA_MAX, powerLevel, RESPAWN_INVULN, type PlayerState } from './player';
import {
  CAPTURE_BONUS, computeRank, GRAZE_NOVA, GRAZE_SCORE, ITEM_VALUE, LIFE_BONUS, NO_HIT_BONUS, splitShards,
} from './scoring';
import { satelliteOffsets, SHOT_SPEED, ShotKind, ShotPool, volley } from './shots';
import {
  BulletColor, FPS, type Difficulty, type EnemyId, type InputFrame, type PathSpec, type ShipId, type SimEvent,
  type StageId, type StageResult, type Upgrades,
} from './types';

export interface WorldOptions {
  stage: StageId;
  ship: ShipId;
  difficulty: Difficulty;
  upgrades: Upgrades;
  seed: number;
}

export type WorldPhase = 'waves' | 'warning' | 'boss' | 'clearing' | 'cleared' | 'gameover';

interface Spawn {
  frame: number;
  enemy: EnemyId;
  x: number;
  path: PathSpec;
}

export const WARNING_FRAMES = 150;
export const CLEARING_FRAMES = 200;
const HP_SCALE: Record<Difficulty, number> = { doux: 0.8, normal: 1, infernal: 1.15 };

/** Programme d'apparition à partir des vagues du secteur, trié dans le temps. */
export function buildSchedule(stage: StageDef): Spawn[] {
  const out: Spawn[] = [];
  for (const w of stage.waves) {
    for (let i = 0; i < w.count; i++) {
      out.push({
        frame: Math.round((w.at + i * w.gap) * FPS),
        enemy: w.enemy,
        x: Math.min(0.95, Math.max(0.05, w.x + i * (w.dx ?? 0))),
        path: w.path,
      });
    }
  }
  return out.sort((a, b) => a.frame - b.frame);
}

/** Un secteur complet : vagues, boss, score. Déterministe pour une graine et des commandes données. */
export class World {
  readonly stage: StageDef;
  readonly opts: WorldOptions;
  readonly rng: Rng;
  readonly scale: DifficultyScale;
  readonly bullets = new BulletField();
  readonly shots = new ShotPool();
  readonly items = new ItemField();
  readonly player: PlayerState;
  enemies: Enemy[] = [];
  boss: Boss | null = null;
  events: SimEvent[] = [];
  phase: WorldPhase = 'waves';
  frame = 0;
  phaseFrame = 0;
  score = 0;
  shards = 0;
  grazes = 0;
  hits = 0;
  bombsUsed = 0;
  kills = 0;
  /** Images restantes de l'onde de choc Nova (rendu + invulnérabilité). */
  bombTimer = 0;
  private readonly schedule: Spawn[];
  private nextSpawn = 0;
  private readonly ctx: PatternContext;
  private readonly hpScale: number;

  constructor(opts: WorldOptions) {
    this.opts = opts;
    this.stage = stageById(opts.stage);
    this.rng = new Rng(opts.seed);
    this.scale = DIFFICULTY[opts.difficulty];
    this.hpScale = HP_SCALE[opts.difficulty];
    this.player = createPlayer(opts.ship, opts.upgrades);
    this.schedule = buildSchedule(this.stage);
    this.ctx = { bullets: this.bullets, rng: this.rng, scale: this.scale, targetX: 0, targetY: 0 };
  }

  get finished(): boolean {
    return this.phase === 'cleared' || this.phase === 'gameover';
  }

  /** Avance la simulation d'une image (1/60 s). */
  step(input: InputFrame): void {
    this.events.length = 0;
    if (this.finished) return;
    this.frame++;
    this.phaseFrame++;
    const p = this.player;
    this.ctx.targetX = p.x;
    this.ctx.targetY = p.y;

    this.stepPhase();
    if (this.phase === 'gameover') return;

    // Joueur
    const playing = this.phase !== 'clearing';
    if (p.invuln > 0) p.invuln--;
    if (this.bombTimer > 0) this.bombTimer--;
    if (playing) {
      movePlayer(p, input);
      if (input.bomb) this.useBomb();
      this.firePlayer();
    }

    // Tirs du joueur
    const bossBefore = this.boss?.hp ?? 0;
    resolveShots(
      this.shots,
      this.enemies,
      this.boss,
      (h) => {
        if (this.frame % 3 === 0) this.events.push({ type: 'hit', x: h.x, y: h.y });
      },
      (e) => this.killEnemy(e),
    );
    if (this.boss && this.boss.hp < bossBefore) this.score += Math.round((bossBefore - this.boss.hp) * 10);

    // Ennemis et boss
    for (const e of this.enemies) stepEnemy(e, this.ctx);
    this.enemies = this.enemies.filter((e) => e.alive);
    if (this.boss) this.stepBossEntity(this.boss);

    // Balles
    this.bullets.step();
    if (playing) {
      const contact = resolveBullets(this.bullets, p, (x, y) => {
        this.grazes++;
        this.score += GRAZE_SCORE;
        p.nova += GRAZE_NOVA;
        if (this.grazes % 2 === 0) this.events.push({ type: 'graze', x, y });
      });
      if (p.nova >= NOVA_MAX) {
        p.nova = 0;
        if (p.bombs < MAX_BOMBS) p.bombs++;
        this.events.push({ type: 'pickup', kind: 'bomb', x: p.x, y: p.y });
      }
      if (contact.hit || touchesEnemy(this.enemies, this.boss, p)) this.playerHit();
    }

    // Objets
    this.items.step(p, true, (it) => this.collect(it));
  }

  private stepPhase(): void {
    const waveEnd = this.stage.duration * FPS;
    switch (this.phase) {
      case 'waves':
        while (this.nextSpawn < this.schedule.length && this.schedule[this.nextSpawn]!.frame <= this.frame) {
          const s = this.schedule[this.nextSpawn++]!;
          this.enemies.push(createEnemy(s.enemy, s.x, s.path, this.hpScale));
        }
        if (this.frame >= waveEnd && (this.enemies.length === 0 || this.frame >= waveEnd + 6 * FPS)) {
          this.setPhase('warning');
          this.events.push({ type: 'bossWarning' });
        }
        break;
      case 'warning':
        if (this.phaseFrame >= WARNING_FRAMES) {
          this.boss = createBoss(this.stage.boss, this.hpScale);
          this.setPhase('boss');
        }
        break;
      case 'clearing':
        if (this.phaseFrame === 1) this.items.attractAll();
        if (this.phaseFrame >= CLEARING_FRAMES) {
          this.setPhase('cleared');
          this.events.push({ type: 'cleared' });
        }
        break;
      default:
        break;
    }
  }

  private setPhase(ph: WorldPhase): void {
    this.phase = ph;
    this.phaseFrame = 0;
  }

  private stepBossEntity(b: Boss): void {
    const wasEntering = b.stage === 'entering';
    const r = stepBoss(b, this.ctx);
    if (wasEntering && b.stage === 'fighting') {
      this.events.push({ type: 'bossPhase', name: b.def.phases[0]!.name, index: 0 });
    }
    if (!r.phaseEnded) return;
    this.cancelBullets(true);
    if (r.captured) this.score += CAPTURE_BONUS * (b.phaseIndex + (r.defeated ? 1 : 0));
    const reward = splitShards(Math.round(b.def.shards / b.def.phases.length));
    this.dropShards(b.x, b.y, reward.big, reward.small);
    if (r.defeated) {
      this.score += b.def.score;
      this.kills++;
      this.events.push({ type: 'bossDefeated', x: b.x, y: b.y });
      this.events.push({ type: 'explode', x: b.x, y: b.y, size: 3, color: BulletColor.Gold });
      this.finishStage();
    } else {
      this.events.push({ type: 'explode', x: b.x, y: b.y, size: 1.5, color: BulletColor.Magenta });
      this.events.push({ type: 'bossPhase', name: b.def.phases[b.phaseIndex]!.name, index: b.phaseIndex });
      b.hp = phaseMaxHp(b);
    }
  }

  private finishStage(): void {
    const p = this.player;
    if (this.hits === 0) this.score += NO_HIT_BONUS;
    this.score += p.lives * LIFE_BONUS;
    this.enemies.forEach((e) => this.killEnemy(e));
    this.enemies = [];
    this.setPhase('clearing');
  }

  private firePlayer(): void {
    const p = this.player;
    if (--p.fireTimer <= 0) {
      p.fireTimer = 5;
      const lvl = powerLevel(p);
      for (const v of volley(p.ship.id, lvl, p.focus)) {
        this.shots.spawn(p.x + v.dx, p.y - 10 + v.dy, Math.sin(v.angle) * SHOT_SPEED, -Math.cos(v.angle) * SHOT_SPEED, v.dmg, v.kind);
      }
      if (p.fireTimer === 5 && this.frame % 10 < 5) {
        for (const s of satelliteOffsets(p.satellites, p.focus)) {
          this.shots.spawn(p.x + s.dx, p.y + s.dy - 6, Math.sin(s.angle) * SHOT_SPEED, -Math.cos(s.angle) * SHOT_SPEED, 0.7, ShotKind.Satellite);
        }
      }
    }
    if (p.missiles > 0 && --p.missileTimer <= 0) {
      p.missileTimer = 44 - p.missiles * 9;
      this.shots.spawn(p.x - 12, p.y, -2.5, -5, 2.4, ShotKind.Missile);
      this.shots.spawn(p.x + 12, p.y, 2.5, -5, 2.4, ShotKind.Missile);
    }
  }

  /** Bombe Nova : efface les balles (transformées en étoiles), blesse tout l'écran, rend invulnérable. */
  useBomb(): boolean {
    const p = this.player;
    if (p.bombs <= 0 || this.bombTimer > 0 || this.finished) return false;
    p.bombs--;
    this.bombsUsed++;
    this.bombTimer = 110;
    p.invuln = Math.max(p.invuln, 150);
    this.cancelBullets(true);
    for (const e of this.enemies) {
      e.hp -= 40;
      e.flash = 6;
      if (e.hp <= 0) {
        e.alive = false;
        this.killEnemy(e);
      }
    }
    if (this.boss && this.boss.stage === 'fighting') {
      this.boss.hp -= 90;
      this.boss.flash = 8;
    }
    this.events.push({ type: 'bomb', x: p.x, y: p.y });
    return true;
  }

  private cancelBullets(toStars: boolean): void {
    if (toStars) {
      const n = this.bullets.count;
      const step = Math.max(1, Math.ceil(n / 120));
      for (let i = 0; i < n; i += step) this.items.spawn(this.bullets.x[i]!, this.bullets.y[i]!, 'star', 0.3, true);
    }
    this.bullets.clear();
  }

  private playerHit(): void {
    const p = this.player;
    if (this.boss) this.boss.hitsInPhase++;
    if (p.shield > 0) {
      p.shield--;
      p.invuln = 100;
      this.cancelBullets(false);
      this.events.push({ type: 'playerHit', x: p.x, y: p.y, shieldOnly: true });
      return;
    }
    this.hits++;
    p.lives--;
    this.events.push({ type: 'playerHit', x: p.x, y: p.y, shieldOnly: false });
    this.events.push({ type: 'explode', x: p.x, y: p.y, size: 1.2, color: BulletColor.Ice });
    this.cancelBullets(false);
    if (p.lives <= 0) {
      this.setPhase('gameover');
      this.events.push({ type: 'gameOver' });
      return;
    }
    const lost = Math.min(p.powerPts, 100);
    p.powerPts -= lost;
    for (let i = 0; i < Math.floor(lost / 25); i++) this.items.spawn(p.x, p.y - 30, 'power', 2);
    p.bombs = Math.max(p.bombs, p.startBombs);
    p.invuln = RESPAWN_INVULN;
  }

  private killEnemy(e: Enemy): void {
    this.kills++;
    this.score += e.def.score;
    const sizeK = e.def.size > 100 ? 2 : e.def.size > 60 ? 1.2 : 0.7;
    this.events.push({ type: 'explode', x: e.x, y: e.y, size: sizeK, color: BulletColor.Magenta });
    const r = splitShards(e.def.shards);
    this.dropShards(e.x, e.y, r.big, r.small);
    if (this.rng.chance(e.def.powerChance)) {
      const n = e.def.size > 100 ? 4 : e.def.size > 70 ? 2 : 1;
      for (let i = 0; i < n; i++) this.items.spawn(e.x, e.y, 'power', 1);
    }
    if (e.def.id === 'porteur') this.items.spawn(e.x, e.y, 'bomb', 0.5);
  }

  private dropShards(x: number, y: number, big: number, small: number): void {
    for (let i = 0; i < big; i++) this.items.spawn(x, y, 'bigShard', 1.5);
    for (let i = 0; i < small; i++) this.items.spawn(x, y, 'shard', 1);
  }

  private collect(it: Item): void {
    const p = this.player;
    const v = ITEM_VALUE[it.kind];
    this.score += v.score;
    this.shards += v.shards;
    if (it.kind === 'power') {
      if (addPower(p, 25)) this.events.push({ type: 'powerUp', level: powerLevel(p) });
    } else if (it.kind === 'bomb') {
      p.bombs = Math.min(MAX_BOMBS, p.bombs + 1);
    } else if (it.kind === 'life') {
      p.lives = Math.min(MAX_LIVES, p.lives + 1);
    }
    if (it.kind !== 'star' && it.kind !== 'shard') this.events.push({ type: 'pickup', kind: it.kind, x: it.x, y: it.y });
  }

  result(): StageResult {
    const cleared = this.phase === 'cleared' || this.phase === 'clearing';
    return {
      stage: this.stage.id,
      cleared,
      score: this.score,
      shards: this.shards,
      grazes: this.grazes,
      hits: this.hits,
      bombsUsed: this.bombsUsed,
      frames: this.frame,
      kills: this.kills,
      rank: computeRank(this.hits, this.bombsUsed, cleared),
    };
  }
}
