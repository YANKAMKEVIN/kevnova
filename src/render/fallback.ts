/**
 * Illustrations procédurales de secours. Elles prennent le relais quand une image Codex manque
 * (génération en cours, réseau coupé) et restent dans la direction artistique « émail céleste » :
 * nébuleuses teintées par secteur, émaux cernés d'or, icônes lisibles.
 */
import { Rng } from '../core/rng';

const STAGE_TINTS: Record<string, [string, string, string]> = {
  fond_corail: ['#2a0f2e', '#ff7aa8', '#ffb38a'],
  fond_givre: ['#0c1a33', '#9fe8ff', '#e6f7ff'],
  fond_forge: ['#2a120a', '#ff8a3d', '#ffd36b'],
  fond_abysse: ['#0b0a2a', '#7d6bff', '#4fe3ff'],
  fond_couronne: ['#1c0a2e', '#c86bff', '#ffd36b'],
  key_art: ['#120f3a', '#c86bff', '#4fe3ff'],
  fin: ['#1a1240', '#ffd36b', '#ff7aa8'],
};

const GOLD = '#ffd36b';
const INK = '#0b0f2a';

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!];
}

function seedOf(name: string): number {
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) h = Math.imul(h ^ name.charCodeAt(i), 16777619);
  return h >>> 0;
}

function nebula(name: string): HTMLCanvasElement {
  const [base, mid, light] = STAGE_TINTS[name] ?? STAGE_TINTS.key_art!;
  const [c, g] = canvas(540, 810);
  const rng = new Rng(seedOf(name));
  const grad = g.createLinearGradient(0, 0, 0, c.height);
  grad.addColorStop(0, base);
  grad.addColorStop(1, INK);
  g.fillStyle = grad;
  g.fillRect(0, 0, c.width, c.height);
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 26; i++) {
    const x = rng.range(-60, c.width + 60);
    const y = rng.range(-60, c.height + 60);
    const r = rng.range(80, 260);
    const col = i % 3 === 0 ? light : mid;
    const rg = g.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, hexA(col, rng.range(0.06, 0.16)));
    rg.addColorStop(1, hexA(col, 0));
    g.fillStyle = rg;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  for (let i = 0; i < 420; i++) {
    const s = rng.chance(0.08) ? 2.2 : rng.range(0.6, 1.4);
    g.fillStyle = `rgba(255,255,255,${rng.range(0.25, 0.9).toFixed(2)})`;
    g.beginPath();
    g.arc(rng.range(0, c.width), rng.range(0, c.height), s, 0, Math.PI * 2);
    g.fill();
  }
  g.globalCompositeOperation = 'source-over';
  return c;
}

function hexA(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a.toFixed(3)})`;
}

/** Médaillon émaillé cerné d'or, fond commun aux icônes et portraits. */
function medallion(g: CanvasRenderingContext2D, size: number, color: string): void {
  const r = size / 2 - 6;
  const cx = size / 2;
  const rg = g.createRadialGradient(cx - r * 0.3, cx - r * 0.35, r * 0.1, cx, cx, r);
  rg.addColorStop(0, hexA(color, 0.95));
  rg.addColorStop(0.65, hexA(color, 0.55));
  rg.addColorStop(1, '#1a1650');
  g.fillStyle = rg;
  g.beginPath();
  g.arc(cx, cx, r, 0, Math.PI * 2);
  g.fill();
  g.lineWidth = size * 0.045;
  g.strokeStyle = GOLD;
  g.stroke();
}

type Glyph = (g: CanvasRenderingContext2D, s: number) => void;

const star = (g: CanvasRenderingContext2D, cx: number, cy: number, r: number, pts = 4): void => {
  g.beginPath();
  for (let i = 0; i < pts * 2; i++) {
    const a = (i / (pts * 2)) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 ? r * 0.38 : r;
    g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  g.closePath();
  g.fill();
};

const GLYPHS: Record<string, [string, Glyph]> = {
  icone_puissance: ['#ff7aa8', (g, s) => { g.beginPath(); g.moveTo(s * 0.56, s * 0.2); g.lineTo(s * 0.34, s * 0.54); g.lineTo(s * 0.5, s * 0.54); g.lineTo(s * 0.42, s * 0.82); g.lineTo(s * 0.68, s * 0.44); g.lineTo(s * 0.52, s * 0.44); g.closePath(); g.fill(); }],
  icone_satellite: ['#4fe3ff', (g, s) => { g.beginPath(); g.arc(s / 2, s / 2, s * 0.12, 0, 7); g.fill(); g.lineWidth = s * 0.04; g.beginPath(); g.ellipse(s / 2, s / 2, s * 0.3, s * 0.14, -0.5, 0, 7); g.stroke(); g.beginPath(); g.arc(s * 0.76, s * 0.36, s * 0.06, 0, 7); g.fill(); }],
  icone_missile: ['#ff8a3d', (g, s) => { g.save(); g.translate(s / 2, s / 2); g.rotate(-0.7); g.beginPath(); g.moveTo(0, -s * 0.3); g.lineTo(s * 0.09, -s * 0.12); g.lineTo(s * 0.09, s * 0.2); g.lineTo(s * 0.17, s * 0.3); g.lineTo(-s * 0.17, s * 0.3); g.lineTo(-s * 0.09, s * 0.2); g.lineTo(-s * 0.09, -s * 0.12); g.closePath(); g.fill(); g.restore(); }],
  icone_bouclier: ['#9fe8ff', (g, s) => { g.beginPath(); g.moveTo(s / 2, s * 0.2); g.lineTo(s * 0.74, s * 0.3); g.quadraticCurveTo(s * 0.72, s * 0.66, s / 2, s * 0.82); g.quadraticCurveTo(s * 0.28, s * 0.66, s * 0.26, s * 0.3); g.closePath(); g.fill(); }],
  icone_aimant: ['#c86bff', (g, s) => { g.lineWidth = s * 0.12; g.lineCap = 'butt'; g.beginPath(); g.arc(s / 2, s * 0.46, s * 0.18, Math.PI, 0, true); g.stroke(); g.beginPath(); g.moveTo(s * 0.32, s * 0.46); g.lineTo(s * 0.32, s * 0.7); g.moveTo(s * 0.68, s * 0.46); g.lineTo(s * 0.68, s * 0.7); g.stroke(); }],
  icone_bombe: ['#ffd36b', (g, s) => star(g, s / 2, s / 2, s * 0.32, 4)],
  icone_coeur: ['#ff3d7f', (g, s) => { g.beginPath(); g.moveTo(s / 2, s * 0.78); g.bezierCurveTo(s * 0.12, s * 0.5, s * 0.28, s * 0.18, s / 2, s * 0.36); g.bezierCurveTo(s * 0.72, s * 0.18, s * 0.88, s * 0.5, s / 2, s * 0.78); g.fill(); }],
  icone_eclat: ['#4fe3ff', (g, s) => { g.beginPath(); g.moveTo(s / 2, s * 0.16); g.lineTo(s * 0.72, s * 0.44); g.lineTo(s / 2, s * 0.84); g.lineTo(s * 0.28, s * 0.44); g.closePath(); g.fill(); }],
};

function icon(name: string): HTMLCanvasElement {
  const [color, glyph] = GLYPHS[name] ?? GLYPHS.icone_eclat!;
  const s = 192;
  const [c, g] = canvas(s, s);
  medallion(g, s, color);
  g.fillStyle = '#fffaf0';
  g.strokeStyle = '#fffaf0';
  g.shadowColor = hexA(color, 0.9);
  g.shadowBlur = s * 0.08;
  glyph(g, s);
  return c;
}

const PORTRAITS: Record<string, [string, string]> = {
  portrait_lyse: ['#4fe3ff', '#f4d2b8'],
  portrait_pilou: ['#ffd36b', '#cfd8ff'],
  portrait_archonte: ['#c86bff', '#2a1c4f'],
};

function portrait(name: string): HTMLCanvasElement {
  const [color, skin] = PORTRAITS[name] ?? PORTRAITS.portrait_lyse!;
  const s = 384;
  const [c, g] = canvas(s, s);
  medallion(g, s, color);
  g.save();
  g.beginPath();
  g.arc(s / 2, s / 2, s / 2 - 12, 0, Math.PI * 2);
  g.clip();
  g.fillStyle = INK;
  g.beginPath();
  g.ellipse(s / 2, s * 0.98, s * 0.34, s * 0.3, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = skin;
  if (name === 'portrait_pilou') {
    g.beginPath();
    g.arc(s / 2, s * 0.5, s * 0.2, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = color;
    g.beginPath();
    g.ellipse(s / 2, s * 0.5, s * 0.12, s * 0.06, 0, 0, Math.PI * 2);
    g.fill();
  } else {
    g.beginPath();
    g.ellipse(s / 2, s * 0.48, s * 0.15, s * 0.19, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = name === 'portrait_archonte' ? GOLD : '#2b2160';
    g.beginPath();
    g.ellipse(s / 2, s * 0.36, s * 0.19, s * 0.12, 0, Math.PI, 0);
    g.fill();
  }
  g.restore();
  return c;
}

function sprite(name: string): HTMLCanvasElement {
  const s = 192;
  const [c, g] = canvas(s, s);
  const hero = name.startsWith('ship_') || name.startsWith('drone');
  const color = name === 'ship_lance' ? '#9fe8ff' : name === 'ship_gerbe' ? '#ff8a3d' : hero ? '#4fe3ff' : '#ff3d7f';
  g.translate(s / 2, s / 2);
  if (!hero) g.rotate(Math.PI);
  const body = g.createLinearGradient(0, -s * 0.4, 0, s * 0.4);
  body.addColorStop(0, '#fffaf0');
  body.addColorStop(1, hero ? '#c9c4ff' : '#3a2a5f');
  g.fillStyle = body;
  g.strokeStyle = GOLD;
  g.lineWidth = s * 0.03;
  g.beginPath();
  g.moveTo(0, -s * 0.42);
  g.quadraticCurveTo(s * 0.1, -s * 0.1, s * 0.4, s * 0.28);
  g.lineTo(s * 0.12, s * 0.2);
  g.lineTo(0, s * 0.36);
  g.lineTo(-s * 0.12, s * 0.2);
  g.lineTo(-s * 0.4, s * 0.28);
  g.quadraticCurveTo(-s * 0.1, -s * 0.1, 0, -s * 0.42);
  g.closePath();
  g.fill();
  g.stroke();
  g.fillStyle = color;
  g.shadowColor = color;
  g.shadowBlur = s * 0.1;
  g.beginPath();
  g.ellipse(0, -s * 0.04, s * 0.06, s * 0.11, 0, 0, Math.PI * 2);
  g.fill();
  return c;
}

/** Choisit le dessin de secours adapté au nom de l'image. */
export function placeholder(name: string): HTMLCanvasElement {
  if (name.startsWith('fond_') || name === 'key_art' || name === 'fin') return nebula(name);
  if (name.startsWith('icone_')) return icon(name);
  if (name.startsWith('portrait_')) return portrait(name);
  return sprite(name);
}
