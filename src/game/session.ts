import type { AudioEngine } from '../audio/engine';
import type { Music } from '../audio/music';
import type { Input } from '../input/input';
import type { Assets } from '../render/assets';
import { Fx } from '../render/fx';
import { Renderer } from '../render/renderer';
import type { View } from '../render/view';
import { Bot } from '../sim/bot';
import { NO_INPUT, type StageResult } from '../sim/types';
import { World, type WorldOptions } from '../sim/world';

const STEP_MS = 1000 / 60;

export interface SessionHooks {
  onFinished: (r: StageResult) => void;
}

/** Une partie en cours : pas de temps fixe (60 Hz), effets, sons et rendu. */
export class Session {
  readonly world: World;
  readonly fx = new Fx();
  readonly renderer: Renderer;
  private readonly bot = new Bot();
  private acc = 0;
  paused = false;
  private ended = false;
  private endDelay = 0;

  constructor(
    opts: WorldOptions,
    g: CanvasRenderingContext2D,
    private readonly assets: Assets,
    private readonly view: View,
    private readonly input: Input,
    private readonly audio: AudioEngine,
    private readonly music: Music,
    private readonly hooks: SessionHooks,
    private readonly autopilot: boolean,
    private readonly speed: number,
    private readonly hiScore: number,
    private readonly showHitbox: boolean,
  ) {
    this.world = new World(opts);
    this.renderer = new Renderer(g, assets);
    this.renderer.bg.reset();
    this.prepare();
    const st = this.world.stage;
    this.fx.banner = { text: st.name.toUpperCase(), sub: st.subtitle, t: 160, color: '#ffcf5a' };
  }

  prepare(): void {
    this.renderer.prepare(this.view, this.world);
  }

  /** Appelé à chaque image d'affichage avec le temps écoulé réel. */
  frame(dtMs: number): void {
    if (!this.paused) {
      this.acc += Math.min(dtMs, 100) * this.speed;
      let steps = 0;
      const maxSteps = 4 * this.speed;
      while (this.acc >= STEP_MS && steps < maxSteps) {
        this.acc -= STEP_MS;
        steps++;
        this.tick();
      }
      if (steps >= maxSteps) this.acc = 0;
    }
    this.renderer.draw(this.view, this.world, this.fx, { alwaysShowHitbox: this.showHitbox, hiScore: this.hiScore });
  }

  private tick(): void {
    const w = this.world;
    const p = w.player;
    const cmd = this.autopilot ? this.bot.decide(w) : this.input.read(p);
    w.step(cmd ?? NO_INPUT);
    if (!this.autopilot) this.input.rebaseDrag(p, cmd.target);
    for (const e of w.events) {
      this.fx.handle(e);
      this.audio.handle(e);
      if (e.type === 'bossWarning') this.music.play('boss');
    }
    if (w.phase !== 'clearing' && !w.finished && w.shots.items.length) this.audio.shoot();
    this.fx.step();
    this.renderer.bg.step(w.phase === 'boss' ? 1.6 : 1);
    if (w.finished && !this.ended) {
      this.ended = true;
      this.endDelay = w.phase === 'gameover' ? 90 : 20;
    }
    if (this.ended && this.endDelay > 0 && --this.endDelay === 0) this.hooks.onFinished(w.result());
  }

  get assetsReady(): boolean {
    return this.assets.loaded > 0;
  }
}
