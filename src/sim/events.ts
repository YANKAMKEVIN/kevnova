import type { BulletColor, SimEvent } from './types';

type HitEvent = Extract<SimEvent, { type: 'hit' }>;
type GrazeEvent = Extract<SimEvent, { type: 'graze' }>;
type ExplodeEvent = Extract<SimEvent, { type: 'explode' }>;

/**
 * Réserve d'événements fréquents (impacts, frôlements, explosions), recyclés à chaque image.
 * Les événements d'une image ne sont lus que pendant cette image (effets, sons) : on peut
 * réutiliser les mêmes objets à l'image suivante au lieu d'en allouer des milliers par minute.
 */
export class EventPool {
  private readonly hits: HitEvent[] = [];
  private readonly grazes: GrazeEvent[] = [];
  private readonly explodes: ExplodeEvent[] = [];
  private nHit = 0;
  private nGraze = 0;
  private nExplode = 0;

  reset(): void {
    this.nHit = 0;
    this.nGraze = 0;
    this.nExplode = 0;
  }

  hit(x: number, y: number): HitEvent {
    const e = this.hits[this.nHit] ?? (this.hits[this.nHit] = { type: 'hit', x: 0, y: 0 });
    this.nHit++;
    e.x = x;
    e.y = y;
    return e;
  }

  graze(x: number, y: number): GrazeEvent {
    const e = this.grazes[this.nGraze] ?? (this.grazes[this.nGraze] = { type: 'graze', x: 0, y: 0 });
    this.nGraze++;
    e.x = x;
    e.y = y;
    return e;
  }

  explode(x: number, y: number, size: number, color: BulletColor): ExplodeEvent {
    const e = this.explodes[this.nExplode] ?? (this.explodes[this.nExplode] = { type: 'explode', x: 0, y: 0, size: 0, color });
    this.nExplode++;
    e.x = x;
    e.y = y;
    e.size = size;
    e.color = color;
    return e;
  }
}
