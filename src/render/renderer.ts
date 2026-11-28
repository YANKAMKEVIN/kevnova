import { BOSS_ENTRY_FRAMES, type Boss } from '../sim/boss';
import { powerLevel, type PlayerState } from '../sim/player';
import { satelliteOffsets } from '../sim/shots';
import { FIELD_H, FIELD_W } from '../sim/types';
import type { World } from '../sim/world';
import type { Assets } from './assets';
import { Background } from './background';
import { BulletSprites } from './bulletSprites';
import type { Fx } from './fx';
import { drawHud } from './hud';
import { PALETTE } from './palette';
import { MiniSprites } from './sprites';
import type { View } from './view';

/** Dimensions d'affichage : le plus grand côté de l'image vaut `size`. */
const fit = (img: { width: number; height: number }, size: number): { w: number; h: number } =>
  img.width >= img.height ? { w: size, h: (size * img.height) / img.width } : { w: (size * img.width) / img.height, h: size };

export interface RenderOptions {
  alwaysShowHitbox: boolean;
  hiScore: number;
}

/** Dessine un secteur en cours. Le monde n'est jamais modifié ici. */
export class Renderer {
  readonly bg = new Background();
  private readonly bullets = new BulletSprites();
  private readonly mini = new MiniSprites();
  private frameCache: HTMLCanvasElement | null = null;
  private frameKey = '';
  time = 0;

  constructor(
    private readonly g: CanvasRenderingContext2D,
    private readonly assets: Assets,
  ) {}

  prepare(view: View, world: World): void {
    const px = view.pxPerUnit;
    this.bullets.build(px);
    this.mini.setScale(px);
    this.bg.prepare(this.assets, world.stage.background, px);
    this.buildFrame(view, world);
  }

  /** Cadre autour du terrain (grands écrans) : décor assombri + liseré doré. Calculé une fois par taille. */
  private buildFrame(view: View, world: World): void {
    const key = `${view.cssW}x${view.cssH}@${view.dpr}:${world.stage.id}`;
    if (key === this.frameKey) return;
    this.frameKey = key;
    const c = document.createElement('canvas');
    c.width = Math.round(view.cssW * view.dpr);
    c.height = Math.round(view.cssH * view.dpr);
    const g = c.getContext('2d')!;
    const src = this.assets.get(world.stage.background);
    const k = Math.max(c.width / (src.width || 1), c.height / (src.height || 1));
    g.filter = 'blur(6px)';
    g.drawImage(src, (c.width - src.width * k) / 2, (c.height - src.height * k) / 2, src.width * k, src.height * k);
    g.filter = 'none';
    g.fillStyle = 'rgba(6,8,24,0.72)';
    g.fillRect(0, 0, c.width, c.height);
    const fx = view.offX * view.dpr;
    const fy = view.offY * view.dpr;
    const fw = FIELD_W * view.pxPerUnit;
    const fh = FIELD_H * view.pxPerUnit;
    g.shadowColor = PALETTE.cyan;
    g.shadowBlur = 24 * view.dpr;
    g.strokeStyle = 'rgba(255,207,90,0.85)';
    g.lineWidth = 2 * view.dpr;
    g.strokeRect(fx - 3 * view.dpr, fy - 3 * view.dpr, fw + 6 * view.dpr, fh + 6 * view.dpr);
    this.frameCache = c;
  }

  draw(view: View, world: World, fx: Fx, opts: RenderOptions): void {
    const g = this.g;
    this.time++;
    const px = view.pxPerUnit;
    g.setTransform(1, 0, 0, 1, 0, 0);
    if (view.letterboxed && this.frameCache) g.drawImage(this.frameCache, 0, 0);
    const sx = fx.shake ? (Math.random() - 0.5) * fx.shake : 0;
    const sy = fx.shake ? (Math.random() - 0.5) * fx.shake : 0;
    g.setTransform(px, 0, 0, px, (view.offX + sx) * view.dpr, (view.offY + sy) * view.dpr);
    g.save();
    g.beginPath();
    g.rect(0, 0, FIELD_W, FIELD_H);
    g.clip();

    this.bg.draw(g, this.assets, world.stage.deco, px, world.stage.tint);
    this.drawItems(world);
    this.drawEnemies(world, px);
    if (world.boss) this.drawBoss(world.boss, px);
    this.drawShots(world);
    if (world.phase !== 'gameover') this.drawPlayer(world.player, world, px, opts.alwaysShowHitbox);
    g.globalCompositeOperation = 'lighter';
    fx.particles.draw(g);
    g.globalCompositeOperation = 'source-over';
    this.drawBullets(world);
    if (world.phase === 'warning') this.drawWarning(world.phaseFrame);

    drawHud(g, world, fx, this.assets, px, opts.hiScore, this.time);
    if (fx.flash > 0) {
      g.globalAlpha = fx.flash;
      g.fillStyle = fx.flashColor;
      g.fillRect(0, 0, FIELD_W, FIELD_H);
      g.globalAlpha = 1;
    }
    g.restore();
  }

  private drawItems(w: World): void {
    const g = this.g;
    for (const it of w.items.items) {
      const { img, s } = this.mini.item(it.kind);
      const bob = it.kind === 'star' ? 0 : Math.sin((this.time + it.x) * 0.15) * 1.5;
      g.drawImage(img, it.x - s / 2, it.y - s / 2 + bob, s, s);
    }
  }

  private drawEnemies(w: World, px: number): void {
    const g = this.g;
    for (const e of w.enemies) {
      const size = e.def.size;
      const img = this.assets.sprite(e.def.sprite, size * px);
      const { w, h } = fit(img, size);
      if (e.def.spin) {
        g.save();
        g.translate(e.x, e.y);
        g.rotate(e.rot);
        g.drawImage(img, -w / 2, -h / 2, w, h);
        if (e.flash > 0) this.flashOver(img, -w / 2, -h / 2, w, h);
        g.restore();
      } else {
        g.drawImage(img, e.x - w / 2, e.y - h / 2, w, h);
        if (e.flash > 0) this.flashOver(img, e.x - w / 2, e.y - h / 2, w, h);
      }
    }
  }

  private flashOver(img: CanvasImageSource, x: number, y: number, w: number, h: number): void {
    const g = this.g;
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = 0.55;
    g.drawImage(img, x, y, w, h);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
  }

  private drawBoss(b: Boss, px: number): void {
    const g = this.g;
    if (b.stage === 'dead') return;
    const size = b.def.size;
    const img = this.assets.sprite(b.def.sprite, size * px);
    const { w, h } = fit(img, size);
    const glow = this.mini.glow(PALETTE.magenta, 128);
    const pulse = 0.5 + 0.3 * Math.sin(this.time * 0.08);
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = pulse;
    g.drawImage(glow, b.x - size * 0.6, b.y - size * 0.6, size * 1.2, size * 1.2);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    let jx = 0;
    if (b.stage === 'dying') {
      jx = (Math.random() - 0.5) * 6;
      g.globalAlpha = Math.max(0, 1 - b.t / 150);
    } else if (b.stage === 'entering') {
      g.globalAlpha = Math.min(1, b.t / (BOSS_ENTRY_FRAMES * 0.5));
    }
    g.drawImage(img, b.x - w / 2 + jx, b.y - h / 2, w, h);
    if (b.flash > 0) this.flashOver(img, b.x - w / 2, b.y - h / 2, w, h);
    g.globalAlpha = 1;
    if (b.stage === 'transition') {
      g.strokeStyle = PALETTE.gold;
      g.globalAlpha = 0.6;
      g.lineWidth = 2;
      g.beginPath();
      g.arc(b.x, b.y, b.def.radius * 1.8 + Math.sin(this.time * 0.3) * 4, 0, Math.PI * 2);
      g.stroke();
      g.globalAlpha = 1;
    }
  }

  private drawShots(w: World): void {
    const g = this.g;
    const accent = w.player.ship.accent;
    g.globalCompositeOperation = 'lighter';
    for (const s of w.shots.items) {
      const { img, w: sw, h: sh } = this.mini.shot(s.kind, accent);
      if (s.vx !== 0) {
        g.save();
        g.translate(s.x, s.y);
        g.rotate(Math.atan2(s.vy, s.vx) + Math.PI / 2);
        g.drawImage(img, -sw / 2, -sh / 2, sw, sh);
        g.restore();
      } else {
        g.drawImage(img, s.x - sw / 2, s.y - sh / 2, sw, sh);
      }
    }
    g.globalCompositeOperation = 'source-over';
  }

  private drawPlayer(p: PlayerState, world: World, px: number, alwaysHitbox: boolean): void {
    const g = this.g;
    if (p.invuln > 0 && world.bombTimer <= 0 && Math.floor(p.invuln / 4) % 2 === 0) g.globalAlpha = 0.35;
    // Flamme des réacteurs
    const flame = this.mini.glow(p.ship.accent, 48);
    g.globalCompositeOperation = 'lighter';
    const fl = 16 + Math.sin(this.time * 0.9) * 4 + (p.focus ? -4 : 0);
    g.drawImage(flame, p.x - 9, p.y + 10, 18, fl);
    g.globalCompositeOperation = 'source-over';
    const size = 46;
    const img = this.assets.sprite(p.ship.sprite, size * px);
    const { w, h } = fit(img, size);
    const tilt = Math.max(-1, Math.min(1, p.vx / 4));
    g.save();
    g.translate(p.x, p.y);
    g.scale(1 - Math.abs(tilt) * 0.16, 1);
    g.drawImage(img, -w / 2, -h / 2, w, h);
    g.restore();
    for (const s of satelliteOffsets(p.satellites, p.focus)) {
      const sat = this.assets.sprite('drone_pilou', 18 * px);
      g.drawImage(sat, p.x + s.dx - 9, p.y + s.dy - 9 + Math.sin(this.time * 0.1 + s.dx) * 1.5, 18, 18);
    }
    if (p.shield > 0) {
      g.strokeStyle = PALETTE.cyan;
      g.globalAlpha = 0.35 + 0.15 * Math.sin(this.time * 0.12);
      g.lineWidth = 1.5;
      g.beginPath();
      g.arc(p.x, p.y, 28, 0, Math.PI * 2);
      g.stroke();
    }
    g.globalAlpha = 1;
    if (p.focus || alwaysHitbox) {
      g.strokeStyle = 'rgba(255,255,255,0.5)';
      g.lineWidth = 1;
      g.beginPath();
      g.arc(p.x, p.y, 10, this.time * 0.08, this.time * 0.08 + Math.PI * 1.5);
      g.stroke();
      g.fillStyle = '#ff3d7f';
      g.beginPath();
      g.arc(p.x, p.y, 4, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
      g.fill();
    }
    if (powerLevel(p) >= 5 && this.time % 6 === 0) {
      /* scintillement discret à puissance max */
      g.globalCompositeOperation = 'lighter';
      g.drawImage(this.mini.glow(PALETTE.gold, 32), p.x - 16, p.y - 16, 32, 32);
      g.globalCompositeOperation = 'source-over';
    }
  }

  private drawBullets(w: World): void {
    const g = this.g;
    const b = w.bullets;
    const half = this.bullets.half;
    for (let i = 0; i < b.count; i++) {
      const k = b.kind[i]!;
      const img = this.bullets.get(k, b.color[i]!, b.ang[i]!);
      const hs = half[k]!;
      const grow = b.age[i]! < 6 ? 0.4 + b.age[i]! * 0.1 : 1;
      const s = hs * grow;
      g.drawImage(img, b.x[i]! - s, b.y[i]! - s, s * 2, s * 2);
    }
  }

  private drawWarning(t: number): void {
    const g = this.g;
    const a = 0.25 + 0.2 * Math.sin(t * 0.25);
    g.globalAlpha = a; // plutôt qu'une chaîne rgba() reconstruite à chaque image
    g.fillStyle = '#ff3d7f';
    g.fillRect(0, 0, FIELD_W, 8);
    g.fillRect(0, FIELD_H - 8, FIELD_W, 8);
    g.globalAlpha = 1;
  }
}
