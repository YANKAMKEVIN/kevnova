import { currentPhase, phaseMaxHp, phaseTimeLeft } from '../sim/boss';
import { MAX_POWER_PTS, NOVA_MAX, powerLevel } from '../sim/player';
import { FIELD_W, FPS } from '../sim/types';
import type { World } from '../sim/world';
import { formatScore } from '../core/math';
import type { Assets } from './assets';
import type { Fx } from './fx';
import { PALETTE } from './palette';

const FONT = '"Chakra Petch", system-ui, sans-serif';
const TITLE = '"Unbounded", system-ui, sans-serif';
// Polices précalculées : aucune chaîne reconstruite à chaque image.
const F_SCORE = `600 13px ${FONT}`;
const F_SMALL = `500 10px ${FONT}`;
const F_TINY = `600 9px ${FONT}`;
const F_BOSS = `600 10px ${FONT}`;
const F_PHASE = `500 9px ${FONT}`;
const F_BANNER = `700 22px ${TITLE}`;
const F_SUB = `500 11px ${FONT}`;

/** Texte dérivé d'un nombre, reconstruit seulement quand le nombre change (le HUD est redessiné 60 fois par seconde). */
export class NumberText {
  private last = Number.NaN;
  private text = '';
  constructor(private readonly format: (n: number) => string) {}
  get(n: number): string {
    if (n !== this.last) {
      this.last = n;
      this.text = this.format(n);
    }
    return this.text;
  }
}

const scoreText = new NumberText(formatScore);
const recordText = new NumberText((n) => `RECORD ${formatScore(n)}`);
const powerText = new NumberText((n) => (n >= 5 ? 'PUISSANCE MAX' : `PUISSANCE ${n}`));
const grazeText = new NumberText((n) => `NOVA · FRÔLEMENTS ${n}`);
const secsText = new NumberText((n) => `${n}`);

/** Dégradés à coordonnées fixes, créés une fois par contexte de dessin. */
const gradients = new WeakMap<CanvasRenderingContext2D, { top: CanvasGradient; boss: CanvasGradient }>();
function hudGradients(g: CanvasRenderingContext2D): { top: CanvasGradient; boss: CanvasGradient } {
  let gr = gradients.get(g);
  if (!gr) {
    const top = g.createLinearGradient(0, 0, 0, 34);
    top.addColorStop(0, 'rgba(6,8,24,0.75)');
    top.addColorStop(1, 'rgba(6,8,24,0)');
    const boss = g.createLinearGradient(BOSS_X, 0, BOSS_X + BOSS_W, 0);
    boss.addColorStop(0, PALETTE.magenta);
    boss.addColorStop(1, PALETTE.gold);
    gr = { top, boss };
    gradients.set(g, gr);
  }
  return gr;
}
const upperCache = new Map<string, string>();
const upper = (s: string): string => upperCache.get(s) ?? (upperCache.set(s, s.toUpperCase()), s.toUpperCase());

const BOSS_X = 40;
const BOSS_W = FIELD_W - 80;

/** Interface en jeu, dessinée dans le canvas (aucune mise à jour du DOM pendant l'action). */
export function drawHud(g: CanvasRenderingContext2D, w: World, fx: Fx, assets: Assets, px: number, hi: number, time: number): void {
  const p = w.player;
  g.textBaseline = 'top';
  // Bandeau supérieur
  const grads = hudGradients(g);
  g.fillStyle = grads.top;
  g.fillRect(0, 0, FIELD_W, 34);
  g.font = F_SCORE;
  g.fillStyle = PALETTE.pearl;
  g.textAlign = 'left';
  g.fillText(scoreText.get(w.score), 8, 6);
  g.textAlign = 'right';
  g.fillStyle = 'rgba(255,207,90,0.85)';
  g.font = F_SMALL;
  g.fillText(recordText.get(Math.max(hi, w.score)), FIELD_W - 8, 8);

  // Vies et bombes
  const heart = assets.sprite('icone_coeur', 16 * px);
  const bomb = assets.sprite('icone_bombe', 16 * px);
  for (let i = 0; i < p.lives; i++) g.drawImage(heart, 6 + i * 15, 22, 14, 14);
  for (let i = 0; i < p.bombs; i++) g.drawImage(bomb, 6 + i * 15, 38, 14, 14);
  if (p.shield > 0) {
    const sh = assets.sprite('icone_bouclier', 16 * px);
    for (let i = 0; i < p.shield; i++) g.drawImage(sh, FIELD_W - 20 - i * 15, 22, 14, 14);
  }

  // Bas : puissance + jauge Nova
  const by = 628;
  g.fillStyle = 'rgba(6,8,24,0.55)';
  g.fillRect(6, by, 110, 6);
  g.fillStyle = PALETTE.cyan;
  g.fillRect(6, by, (110 * p.powerPts) / MAX_POWER_PTS, 6);
  g.font = F_TINY;
  g.textAlign = 'left';
  g.fillStyle = PALETTE.pearl;
  g.fillText(powerText.get(powerLevel(p)), 6, by - 12);
  g.fillStyle = 'rgba(6,8,24,0.55)';
  g.fillRect(FIELD_W - 116, by, 110, 6);
  const novaFull = p.nova / NOVA_MAX;
  g.fillStyle = PALETTE.gold;
  g.fillRect(FIELD_W - 116, by, 110 * novaFull, 6);
  g.textAlign = 'right';
  g.fillStyle = PALETTE.pearl;
  g.fillText(grazeText.get(w.grazes), FIELD_W - 6, by - 12);

  // Boss
  const b = w.boss;
  if (b && (b.stage === 'fighting' || b.stage === 'transition')) {
    const max = phaseMaxHp(b);
    const ratio = Math.max(0, b.hp / max);
    const x = BOSS_X;
    const bw = BOSS_W;
    g.fillStyle = 'rgba(6,8,24,0.7)';
    g.fillRect(x - 2, 52, bw + 4, 9);
    g.fillStyle = grads.boss;
    g.fillRect(x, 54, bw * ratio, 5);
    // Phases restantes
    const left = b.def.phases.length - b.phaseIndex - 1;
    for (let i = 0; i < left; i++) {
      g.fillStyle = PALETTE.gold;
      g.beginPath();
      g.arc(x + 4 + i * 10, 68, 3, 0, Math.PI * 2);
      g.fill();
    }
    g.font = F_BOSS;
    g.fillStyle = PALETTE.pearl;
    g.textAlign = 'center';
    g.fillText(upper(b.def.name), FIELD_W / 2, 38);
    g.textAlign = 'right';
    const secs = Math.ceil(phaseTimeLeft(b) / FPS);
    g.fillStyle = secs <= 5 ? PALETTE.magenta : PALETTE.pearl;
    g.fillText(secsText.get(secs), x + bw, 63);
    g.textAlign = 'left';
    g.fillStyle = 'rgba(244,241,255,0.7)';
    g.font = F_PHASE;
    g.fillText(currentPhase(b).name, x + 4 + left * 10 + 4, 64);
  }

  // Bannière (alerte, phases, puissance)
  const ban = fx.banner;
  if (ban) {
    const t = Math.min(1, ban.t / 20);
    g.globalAlpha = t;
    g.textAlign = 'center';
    g.fillStyle = 'rgba(6,8,24,0.55)';
    g.fillRect(0, 262, FIELD_W, ban.sub ? 64 : 44);
    g.font = F_BANNER;
    g.fillStyle = ban.color;
    g.fillText(ban.text, FIELD_W / 2, 272 + Math.sin(time * 0.2) * (ban.text === 'ALERTE' ? 2 : 0));
    if (ban.sub) {
      g.font = F_SUB;
      g.fillStyle = PALETTE.pearl;
      g.fillText(ban.sub, FIELD_W / 2, 304);
    }
    g.globalAlpha = 1;
  }
}
