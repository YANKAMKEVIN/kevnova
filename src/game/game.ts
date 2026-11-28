import { AudioEngine } from '../audio/engine';
import { Music } from '../audio/music';
import { AFTER, BEFORE, INTRO } from '../data/dialogues';
import { nextStage, stageById, STAGES } from '../data/stages';
import { Input } from '../input/input';
import { applyStageResult, buyUpgrade, isShipUnlocked, isStageUnlocked, nextStageToPlay } from '../meta/progress';
import { Assets } from '../render/assets';
import { View } from '../render/view';
import { defaultSave, type SaveData } from '../save/schema';
import { SaveStore, type KeyValueStore, MemoryStore } from '../save/storage';
import type { StageId, StageResult } from '../sim/types';
import { playDialogue } from '../ui/dialogue';
import { MenuNav } from '../ui/dom';
import { hangarScreen } from '../ui/hangar';
import { endingScreen, pauseScreen, resultsScreen, settingsScreen } from '../ui/panels';
import { loadingScreen, stagesScreen, titleScreen } from '../ui/screens';
import { parseParams, type GameParams } from './params';
import { PerfGovernor } from './perf';
import { Session } from './session';

export type GameState = 'loading' | 'title' | 'stages' | 'hangar' | 'dialogue' | 'playing' | 'paused' | 'results' | 'settings' | 'ending';

function storage(): KeyValueStore {
  try {
    const k = '__kevnova_test__';
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    return localStorage;
  } catch {
    return new MemoryStore();
  }
}

/** Chef d'orchestre : enchaîne les écrans, lance les secteurs et tient la sauvegarde à jour. */
export class Game {
  state: GameState = 'loading';
  save: SaveData;
  readonly store: SaveStore;
  readonly params: GameParams;
  readonly assets = new Assets();
  readonly view = new View();
  readonly audio = new AudioEngine();
  readonly music = new Music(this.audio);
  readonly input: Input;
  readonly perf = new PerfGovernor();
  private readonly nav: MenuNav;
  private readonly g: CanvasRenderingContext2D;
  session: Session | null = null;
  stage: StageId = 'corail';
  campaignScore = 0;
  lastResult: StageResult | null = null;
  private last = 0;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly ui: HTMLElement,
    private readonly touch: HTMLElement,
    private readonly pauseBtn: HTMLElement,
  ) {
    this.params = parseParams(location.search);
    this.store = new SaveStore(storage());
    if (this.params.fresh) this.store.reset();
    this.save = this.store.load().save;
    this.g = canvas.getContext('2d', { alpha: false })!;
    this.input = new Input(canvas, this.view);
    this.nav = new MenuNav(ui);
    this.applySettings();
    this.bindTouch();
    window.addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === 'playing') this.pause();
    });
    // Le premier geste débloque l'audio (règle des navigateurs).
    const unlock = (): void => {
      this.audio.unlock();
      if (this.state === 'title') this.music.play('titre');
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
  }

  async start(): Promise<void> {
    this.resize();
    const progress = loadingScreen(this.ui);
    await Promise.race([this.assets.loadAll(progress), new Promise((r) => setTimeout(r, 15000))]);
    await document.fonts?.ready;
    requestAnimationFrame((t) => this.loop(t));
    if (this.params.stage) this.launch(this.params.stage, false);
    else this.title();
  }

  private loop(t: number): void {
    const dt = this.last ? t - this.last : 16.7;
    this.last = t;
    this.nav.pollGamepad();
    if (this.session && (this.state === 'playing' || this.state === 'paused' || this.state === 'dialogue' || this.state === 'results')) {
      if (this.state === 'playing' && this.input.consumePause()) this.pause();
      this.session.paused = this.state !== 'playing';
      this.session.frame(dt);
      if (this.state === 'playing' && this.perf.sample(dt)) {
        this.view.quality = this.perf.quality;
        this.session.fx.setQuality(this.perf.level > 0);
        this.resize();
      }
    } else {
      this.g.setTransform(1, 0, 0, 1, 0, 0);
      this.g.fillStyle = '#0b0f2a';
      this.g.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    requestAnimationFrame((n) => this.loop(n));
  }

  private resize(): void {
    this.view.layout(this.canvas, window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);
    this.session?.prepare();
  }

  private persist(): void {
    this.store.write(this.save);
  }

  private applySettings(): void {
    const s = this.save.settings;
    this.audio.setVolumes(s.music, s.sfx);
    this.input.sensitivity = s.touchSensitivity;
  }

  private setState(s: GameState): void {
    this.state = s;
    const playing = s === 'playing';
    const coarse = matchMedia('(pointer: coarse)').matches || this.input.usedTouch;
    this.touch.classList.toggle('hidden', !(playing && coarse));
    this.pauseBtn.classList.toggle('hidden', !playing);
    this.input.enabled = playing;
    if (!playing) this.input.touchFocus = false;
  }

  // ---------- Écrans ----------
  title(): void {
    this.session = null;
    this.setState('title');
    this.nav.back = null;
    if (this.audio.ctx) this.music.play('titre');
    titleScreen(this.ui, this.save, {
      play: () => {
        this.audio.ui('ok');
        if (this.save.progress.cleared.length === 0 && this.save.progress.plays === 0) {
          this.setState('dialogue');
          playDialogue(this.ui, INTRO, () => this.launch('corail'));
        } else this.hangar(nextStageToPlay(this.save));
      },
      stages: () => this.stages(),
      hangar: () => this.hangar(nextStageToPlay(this.save)),
      settings: () => this.settings(() => this.title()),
    });
  }

  stages(): void {
    this.setState('stages');
    this.audio.ui('ok');
    this.music.play('hangar');
    this.nav.back = () => this.title();
    stagesScreen(this.ui, this.save, (id) => this.hangar(id), () => this.title());
  }

  hangar(stage: StageId): void {
    this.session = null;
    this.stage = stage;
    this.setState('hangar');
    this.music.play('hangar');
    this.nav.back = () => this.title();
    if (!isShipUnlocked(this.save, this.save.ship)) this.save.ship = 'etincelle';
    hangarScreen(this.ui, this.save, stage, {
      buy: (id) => {
        const r = buyUpgrade(this.save, id);
        this.audio.ui(r.ok ? 'buy' : 'deny');
        if (r.ok) this.persist();
        return r.ok;
      },
      ship: (id) => {
        this.save.ship = id;
        this.audio.ui('move');
        this.persist();
      },
      difficulty: (d) => {
        this.save.settings.difficulty = d;
        this.audio.ui('move');
        this.persist();
      },
      launch: () => this.launch(stage),
      back: () => this.title(),
    });
  }

  settings(back: () => void): void {
    const prev = this.state;
    this.setState('settings');
    this.nav.back = back;
    settingsScreen(
      this.ui,
      this.save,
      () => {
        this.applySettings();
        this.persist();
      },
      () => {
        this.store.reset();
        this.save = defaultSave(Date.now());
        this.persist();
        this.title();
      },
      () => {
        this.state = prev;
        back();
      },
    );
  }

  /** Dialogue d'avant-secteur puis départ. */
  launch(stage: StageId, withDialogue = true): void {
    if (!isStageUnlocked(this.save, stage) && !this.params.stage) stage = nextStageToPlay(this.save);
    this.stage = stage;
    this.audio.ui('ok');
    this.setState('dialogue');
    this.nav.back = null;
    const go = (): void => this.play(stage);
    if (withDialogue) playDialogue(this.ui, BEFORE[stage], go);
    else go();
  }

  private play(stage: StageId): void {
    this.ui.innerHTML = '';
    const st = stageById(stage);
    if (st.index === 0) this.campaignScore = 0;
    const seed = this.params.seed ?? (Date.now() % 100000) + st.index;
    this.session = new Session(
      { stage, ship: this.save.ship, difficulty: this.save.settings.difficulty, upgrades: { ...this.save.upgrades }, seed },
      this.g, this.assets, this.view, this.input, this.audio, this.music,
      { onFinished: (r) => this.finish(r) },
      this.params.bot, this.params.speed, this.save.progress.bestScore[stage] ?? 0, this.save.settings.alwaysShowHitbox,
    );
    this.session.fx.shakeEnabled = this.save.settings.shake;
    this.session.fx.calmFlashes = this.save.settings.calmFlashes;
    this.session.fx.setQuality(this.perf.level > 0);
    this.input.reset();
    this.music.play(`s${st.music}`);
    this.setState('playing');
  }

  pause(): void {
    if (this.state !== 'playing') return;
    this.setState('paused');
    this.audio.ui('back');
    this.nav.back = () => this.resume();
    pauseScreen(this.ui, {
      resume: () => this.resume(),
      restart: () => this.launch(this.stage, false),
      settings: () => this.settings(() => this.pauseAgain()),
      quit: () => this.title(),
    });
  }

  private pauseAgain(): void {
    this.state = 'playing';
    this.pause();
  }

  resume(): void {
    this.ui.innerHTML = '';
    this.audio.ui('ok');
    this.setState('playing');
  }

  private finish(r: StageResult): void {
    this.lastResult = r;
    const out = applyStageResult(this.save, r);
    if (r.cleared) this.campaignScore += r.score;
    this.persist();
    this.music.play(r.cleared ? 'hangar' : 'titre');
    const show = (): void => {
      this.setState('results');
      this.nav.back = null;
      resultsScreen(this.ui, r, out, {
        next: () => {
          const nx = nextStage(r.stage);
          if (r.cleared && !nx) this.ending();
          else this.hangar(r.cleared && nx ? nx.id : r.stage);
        },
        retry: () => this.launch(r.stage, false),
        menu: () => this.title(),
      });
    };
    if (r.cleared) {
      this.setState('dialogue');
      playDialogue(this.ui, AFTER[r.stage], show);
    } else show();
  }

  ending(): void {
    this.session = null;
    this.setState('ending');
    this.save.progress.endingSeen = true;
    this.persist();
    this.music.play('fin');
    endingScreen(this.ui, this.campaignScore, () => this.title());
  }

  private bindTouch(): void {
    const nova = this.touch.querySelector<HTMLElement>('#btn-nova')!;
    const focus = this.touch.querySelector<HTMLElement>('#btn-focus')!;
    const stop = (e: Event): void => e.stopPropagation();
    nova.addEventListener('pointerdown', (e) => {
      stop(e);
      this.input.queueBomb();
    });
    focus.addEventListener('pointerdown', (e) => {
      stop(e);
      this.input.touchFocus = !this.input.touchFocus;
      focus.classList.toggle('active', this.input.touchFocus);
    });
    this.pauseBtn.addEventListener('pointerdown', (e) => {
      stop(e);
      this.pause();
    });
  }

  /** Données exposées aux tests de bout en bout. */
  debug(): Record<string, unknown> {
    const w = this.session?.world;
    return {
      state: this.state,
      stage: this.stage,
      fps: Math.round(this.perf.fps),
      quality: this.perf.level,
      world: w
        ? { phase: w.phase, frame: w.frame, score: w.score, bullets: w.bullets.count, lives: w.player.lives, bombs: w.player.bombs, bombsUsed: w.bombsUsed, focus: w.player.focus, x: w.player.x, y: w.player.y }
        : null,
      save: this.save,
      stages: STAGES.length,
      imagesLoaded: this.assets.loaded,
    };
  }

  /** Rejeu de la partie en cours (ou de la dernière) : rejouable hors navigateur avec playReplay. */
  replay(): { text: string; hash: string; frames: number } | null {
    return this.session?.replay() ?? null;
  }
}
