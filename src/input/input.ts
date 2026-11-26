import { FIELD_H, FIELD_W, type InputFrame } from '../sim/types';
import type { View } from '../render/view';
import { deadzone, dragTarget, type DragState } from './touch';

const KEYS = {
  left: ['ArrowLeft', 'KeyA', 'KeyQ'],
  right: ['ArrowRight', 'KeyD'],
  up: ['ArrowUp', 'KeyW', 'KeyZ'],
  down: ['ArrowDown', 'KeyS'],
  focus: ['ShiftLeft', 'ShiftRight'],
  bomb: ['KeyX', 'Space', 'KeyC'],
  pause: ['Escape', 'KeyP'],
};

/** Clavier (QWERTY et AZERTY), manette et tactile réunis en une commande par image. */
export class Input {
  private down = new Set<string>();
  private bombQueued = false;
  private pauseQueued = false;
  private drag: DragState | null = null;
  private dragId: number | null = null;
  private fingerField: { x: number; y: number } | null = null;
  private padBomb = false;
  private padPause = false;
  touchFocus = false;
  sensitivity = 1;
  usedTouch = false;
  enabled = true;

  constructor(
    private readonly surface: HTMLElement,
    private readonly view: View,
  ) {
    window.addEventListener('keydown', (e) => this.onKey(e, true));
    window.addEventListener('keyup', (e) => this.onKey(e, false));
    window.addEventListener('blur', () => this.down.clear());
    surface.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    window.addEventListener('pointermove', (e) => this.onPointerMove(e));
    window.addEventListener('pointerup', (e) => this.onPointerUp(e));
    window.addEventListener('pointercancel', (e) => this.onPointerUp(e));
  }

  private onKey(e: KeyboardEvent, isDown: boolean): void {
    if (isDown) {
      if (KEYS.bomb.includes(e.code) && !e.repeat) this.bombQueued = true;
      if (KEYS.pause.includes(e.code) && !e.repeat) this.pauseQueued = true;
      this.down.add(e.code);
    } else {
      this.down.delete(e.code);
    }
    if (this.enabled && Object.values(KEYS).some((k) => k.includes(e.code)) && e.target === document.body) e.preventDefault();
  }

  private onPointerDown(e: PointerEvent): void {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    this.usedTouch = e.pointerType !== 'mouse';
    this.dragId = e.pointerId;
    this.fingerField = this.view.toField(e.clientX, e.clientY);
    this.drag = null;
  }

  private onPointerMove(e: PointerEvent): void {
    if (e.pointerId !== this.dragId) return;
    this.fingerField = this.view.toField(e.clientX, e.clientY);
  }

  private onPointerUp(e: PointerEvent): void {
    if (e.pointerId !== this.dragId) return;
    this.dragId = null;
    this.drag = null;
    this.fingerField = null;
  }

  queueBomb(): void {
    this.bombQueued = true;
  }

  consumePause(): boolean {
    const p = this.pauseQueued;
    this.pauseQueued = false;
    return p;
  }

  private any(list: string[]): boolean {
    return list.some((k) => this.down.has(k));
  }

  /** Commande de l'image courante. `ship` sert d'ancre au glisser tactile. */
  read(ship: { x: number; y: number }): InputFrame {
    let dx = (this.any(KEYS.right) ? 1 : 0) - (this.any(KEYS.left) ? 1 : 0);
    let dy = (this.any(KEYS.down) ? 1 : 0) - (this.any(KEYS.up) ? 1 : 0);
    let focus = this.any(KEYS.focus) || this.touchFocus;
    let bomb = this.bombQueued;
    this.bombQueued = false;

    const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : [];
    for (const pad of pads) {
      if (!pad) continue;
      const ax = deadzone(pad.axes[0] ?? 0);
      const ay = deadzone(pad.axes[1] ?? 0);
      const b = (i: number): boolean => !!pad.buttons[i]?.pressed;
      if (ax || ay) {
        dx = ax;
        dy = ay;
      }
      if (b(14)) dx = -1;
      if (b(15)) dx = 1;
      if (b(12)) dy = -1;
      if (b(13)) dy = 1;
      focus = focus || b(2) || b(4) || b(5) || b(7);
      const bombBtn = b(0) || b(1);
      if (bombBtn && !this.padBomb) bomb = true;
      this.padBomb = bombBtn;
      if (b(9) && !this.padPause) this.pauseQueued = true;
      this.padPause = b(9);
    }

    let target: { x: number; y: number } | null = null;
    if (this.fingerField) {
      if (!this.drag) this.drag = { fingerX: this.fingerField.x, fingerY: this.fingerField.y, shipX: ship.x, shipY: ship.y };
      target = dragTarget(this.drag, this.fingerField.x, this.fingerField.y, this.sensitivity);
    }
    return { dx, dy, focus, bomb, target };
  }

  /** Recale l'ancre du glisser quand le vaisseau est bloqué au bord. */
  rebaseDrag(ship: { x: number; y: number }, target: { x: number; y: number } | null | undefined): void {
    if (!this.drag || !target || !this.fingerField) return;
    const ex = target.x - ship.x;
    const ey = target.y - ship.y;
    const atX = ship.x <= 12.5 || ship.x >= FIELD_W - 12.5;
    const atY = ship.y <= 20.5 || ship.y >= FIELD_H - 18.5;
    if (atX && Math.abs(ex) > 2) this.drag.shipX -= ex;
    if (atY && Math.abs(ey) > 2) this.drag.shipY -= ey;
  }

  reset(): void {
    this.down.clear();
    this.bombQueued = false;
    this.pauseQueued = false;
    this.drag = null;
  }
}
