/** Glisser relatif : le vaisseau suit le déplacement du doigt (pas sa position), donc le doigt ne le cache jamais. */
export interface DragState {
  fingerX: number;
  fingerY: number;
  shipX: number;
  shipY: number;
}

export function dragTarget(
  start: DragState,
  fingerX: number,
  fingerY: number,
  sensitivity: number,
): { x: number; y: number } {
  return {
    x: start.shipX + (fingerX - start.fingerX) * sensitivity,
    y: start.shipY + (fingerY - start.fingerY) * sensitivity,
  };
}

/** Zone morte des sticks analogiques, avec remise à l'échelle pour garder la précision. */
export function deadzone(v: number, dz = 0.18): number {
  const a = Math.abs(v);
  if (a < dz) return 0;
  return (Math.sign(v) * (a - dz)) / (1 - dz);
}
