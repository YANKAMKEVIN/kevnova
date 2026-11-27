import { displayUrl } from '../render/assets';

export const esc = (s: string | number): string =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export const img = (name: string): string => displayUrl(name);

/** Remplace le contenu de la couche d'interface par un écran. */
export function mount(root: HTMLElement, html: string, cls = 'screen dim'): HTMLElement {
  root.innerHTML = '';
  const el = document.createElement('div');
  el.className = cls;
  el.innerHTML = html;
  root.appendChild(el);
  const first = el.querySelector<HTMLElement>('[data-autofocus]') ?? el.querySelector<HTMLElement>('button:not(:disabled)');
  if (first && !matchMedia('(pointer: coarse)').matches) first.focus({ preventScroll: true });
  return el;
}

export function on(root: HTMLElement, selector: string, fn: (el: HTMLElement) => void): void {
  root.querySelectorAll<HTMLElement>(selector).forEach((el) => el.addEventListener('click', () => fn(el)));
}

/**
 * Navigation au clavier et à la manette dans les menus : flèches pour se déplacer, Entrée/A pour valider,
 * Échap/B pour revenir.
 */
export class MenuNav {
  private prevPad: boolean[] = [];
  back: (() => void) | null = null;

  constructor(private readonly root: HTMLElement) {
    window.addEventListener('keydown', (e) => {
      if (!this.active()) return;
      if (['ArrowDown', 'ArrowRight'].includes(e.code)) this.move(1, e);
      else if (['ArrowUp', 'ArrowLeft'].includes(e.code)) this.move(-1, e);
      else if (e.code === 'Escape' && this.back) {
        e.preventDefault();
        this.back();
      }
    });
  }

  private active(): boolean {
    return this.root.childElementCount > 0 && !this.root.querySelector('.dialogue');
  }

  private items(): HTMLElement[] {
    return [...this.root.querySelectorAll<HTMLElement>('button:not(:disabled), input')].filter((b) => b.offsetParent !== null);
  }

  private move(dir: number, e?: Event): void {
    const list = this.items();
    if (!list.length) return;
    if (document.activeElement instanceof HTMLInputElement && e instanceof KeyboardEvent && e.code.startsWith('ArrowL')) return;
    if (document.activeElement instanceof HTMLInputElement && e instanceof KeyboardEvent && e.code.startsWith('ArrowR')) return;
    e?.preventDefault();
    const i = list.indexOf(document.activeElement as HTMLElement);
    const next = list[(i + dir + list.length) % list.length]!;
    next.focus();
  }

  pollGamepad(): void {
    if (!this.active() || !navigator.getGamepads) return;
    const pad = [...navigator.getGamepads()].find(Boolean);
    if (!pad) return;
    const now = [12, 13, 14, 15, 0, 1].map((i) => !!pad.buttons[i]?.pressed);
    const edge = (k: number): boolean => now[k]! && !this.prevPad[k];
    if (edge(0) || edge(2)) this.move(-1);
    if (edge(1) || edge(3)) this.move(1);
    if (edge(4)) (document.activeElement as HTMLElement | null)?.click();
    if (edge(5)) this.back?.();
    this.prevPad = now;
  }
}
