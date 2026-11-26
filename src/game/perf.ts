/** Surveille le temps par image et baisse la résolution si l'appareil n'arrive plus à tenir 60 i/s. */
export class PerfGovernor {
  private samples: number[] = [];
  private cooldown = 120;
  level = 0;
  fps = 60;

  /** Renvoie true si le niveau de qualité vient de changer. */
  sample(dtMs: number): boolean {
    this.samples.push(dtMs);
    if (this.samples.length > 90) this.samples.shift();
    const avg = this.samples.reduce((a, b) => a + b, 0) / this.samples.length;
    this.fps = 1000 / Math.max(1, avg);
    if (--this.cooldown > 0 || this.samples.length < 90) return false;
    if (avg > 19.5 && this.level < 2) {
      this.level++;
      this.cooldown = 180;
      this.samples.length = 0;
      return true;
    }
    return false;
  }

  get quality(): number {
    return [1, 0.8, 0.62][this.level]!;
  }
}
