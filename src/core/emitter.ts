type Handler<T> = (payload: T) => void;

/** Bus d'événements typé : la simulation annonce, le rendu et l'audio écoutent. */
export class Emitter<Events extends object> {
  private handlers: { [K in keyof Events]?: Handler<Events[K]>[] } = {};

  on<K extends keyof Events>(type: K, fn: Handler<Events[K]>): () => void {
    const list = (this.handlers[type] ??= []);
    list.push(fn);
    return () => {
      const i = list.indexOf(fn);
      if (i >= 0) list.splice(i, 1);
    };
  }

  emit<K extends keyof Events>(type: K, payload: Events[K]): void {
    const list = this.handlers[type];
    if (!list) return;
    for (const fn of list) fn(payload);
  }

  clear(): void {
    this.handlers = {};
  }
}
