import { placeholder } from './fallback';

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

/** Images absentes remplacées par un dessin procédural, exposé en data URL pour les écrans HTML. */
const fallbackUrls = new Map<string, string>();

/** URL à utiliser dans l'interface : l'illustration si elle a chargé, sinon son dessin de secours. */
export const displayUrl = (name: string): string => fallbackUrls.get(name) ?? imageUrl(name);

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
              const c = placeholder(name);
              this.images.set(name, c);
              fallbackUrls.set(name, c.toDataURL('image/webp', 0.85));
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
