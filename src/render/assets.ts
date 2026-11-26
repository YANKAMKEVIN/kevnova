/** Chargement des illustrations (WebP générés par Codex) avec repli procédural si une image manque. */
export const IMAGE_NAMES = [
  'ship_etincelle', 'ship_lance', 'ship_gerbe', 'drone_pilou',
  'e_dard', 'e_toupie', 'e_mante', 'e_cuirasse', 'e_meduse', 'e_eclat', 'e_porteur', 'e_tourelle',
  'boss_faucheur', 'boss_sentinelle', 'boss_fondeur', 'boss_leviathan', 'boss_archonte',
  'fond_corail', 'fond_givre', 'fond_forge', 'fond_abysse', 'fond_couronne',
  'deco_asteroide', 'deco_glace', 'deco_epave',
  'portrait_lyse', 'portrait_pilou', 'portrait_archonte',
  'key_art', 'fin',
  'icone_puissance', 'icone_satellite', 'icone_missile', 'icone_bouclier', 'icone_aimant', 'icone_bombe', 'icone_coeur', 'icone_eclat',
] as const;

export type ImageName = (typeof IMAGE_NAMES)[number];

export const imageUrl = (name: string): string => `${import.meta.env.BASE_URL}assets/img/${name}.webp`;

export type Drawable = HTMLImageElement | HTMLCanvasElement;

export class Assets {
  private readonly images = new Map<string, Drawable>();
  private readonly scaled = new Map<string, HTMLCanvasElement>();
  loaded = 0;

  async loadAll(onProgress?: (k: number) => void): Promise<void> {
    let done = 0;
    await Promise.all(
      IMAGE_NAMES.map(
        (name) =>
          new Promise<void>((resolve) => {
            const img = new Image();
            img.decoding = 'async';
            img.onload = () => {
              this.images.set(name, img);
              this.loaded++;
              onProgress?.(++done / IMAGE_NAMES.length);
              resolve();
            };
            img.onerror = () => {
              this.images.set(name, placeholder(name));
              onProgress?.(++done / IMAGE_NAMES.length);
              resolve();
            };
            img.src = imageUrl(name);
          }),
      ),
    );
  }

  get(name: string): Drawable {
    let img = this.images.get(name);
    if (!img) {
      img = placeholder(name);
      this.images.set(name, img);
    }
    return img;
  }

  /**
   * Version pré-réduite d'une image à la taille d'affichage (en pixels physiques).
   * Dessiner une image 1024 px réduite à 40 px à chaque image coûte cher sur mobile : on le fait une seule fois.
   */
  sprite(name: string, size: number, rotate = 0): HTMLCanvasElement {
    const px = Math.max(8, Math.round(size));
    const key = `${name}@${px}@${rotate}`;
    let c = this.scaled.get(key);
    if (!c) {
      const src = this.get(name);
      const w = src.width || 1;
      const h = src.height || 1;
      const k = px / Math.max(w, h);
      c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(w * k));
      c.height = Math.max(1, Math.round(h * k));
      const g = c.getContext('2d')!;
      g.imageSmoothingQuality = 'high';
      if (rotate) {
        g.translate(c.width / 2, c.height / 2);
        g.rotate(rotate);
        g.translate(-c.width / 2, -c.height / 2);
      }
      g.drawImage(src, 0, 0, c.width, c.height);
      this.scaled.set(key, c);
    }
    return c;
  }

  clearScaled(): void {
    this.scaled.clear();
  }
}

/** Dessin de secours (formes et dégradés) pour que le jeu reste jouable sans les illustrations. */
function placeholder(name: string): HTMLCanvasElement {
  const big = name.startsWith('fond_') || name === 'key_art' || name === 'fin';
  const c = document.createElement('canvas');
  c.width = big ? 512 : 128;
  c.height = big ? 768 : 128;
  const g = c.getContext('2d')!;
  if (big) {
    const grad = g.createLinearGradient(0, 0, 0, c.height);
    grad.addColorStop(0, '#1d1b4f');
    grad.addColorStop(1, '#0b0f2a');
    g.fillStyle = grad;
    g.fillRect(0, 0, c.width, c.height);
    for (let i = 0; i < 160; i++) {
      g.fillStyle = `rgba(255,255,255,${(i % 7) / 10})`;
      g.fillRect((i * 97) % c.width, (i * 131) % c.height, 2, 2);
    }
    return c;
  }
  const hero = name.startsWith('ship_') || name.startsWith('drone') || name.startsWith('icone') || name.startsWith('portrait_l') || name.startsWith('portrait_p');
  g.translate(64, 64);
  g.fillStyle = hero ? '#f4f1ff' : '#1a1830';
  g.strokeStyle = hero ? '#4fe3ff' : '#ff3d7f';
  g.lineWidth = 6;
  g.beginPath();
  if (hero) {
    g.moveTo(0, -54);
    g.lineTo(46, 40);
    g.lineTo(0, 22);
    g.lineTo(-46, 40);
  } else {
    g.moveTo(0, 54);
    g.lineTo(50, -30);
    g.lineTo(0, -12);
    g.lineTo(-50, -30);
  }
  g.closePath();
  g.fill();
  g.stroke();
  g.fillStyle = hero ? '#4fe3ff' : '#ffb347';
  g.beginPath();
  g.arc(0, 4, 10, 0, Math.PI * 2);
  g.fill();
  return c;
}
