import { SPEAKERS, type Line } from '../data/dialogues';
import { esc, img, mount } from './dom';

/** Dialogue illustré : touche, clic, Entrée ou Espace pour avancer ; « Passer » pour tout sauter. */
export function playDialogue(root: HTMLElement, lines: Line[], done: () => void): void {
  if (lines.length === 0) {
    done();
    return;
  }
  let i = 0;
  let typed = 0;
  let timer: ReturnType<typeof setInterval> | null = null;
  let finished = false;
  const el = mount(root, '', 'screen dialogue');
  const finish = (): void => {
    if (finished) return;
    finished = true;
    if (timer) clearInterval(timer);
    window.removeEventListener('keydown', onKey);
    root.innerHTML = '';
    done();
  };
  const render = (): void => {
    const line = lines[i]!;
    const sp = SPEAKERS[line.who];
    el.innerHTML = `<button class="btn small skip" data-skip>Passer</button>
      <div class="dlg" style="--who:${sp.color}"><img src="${img(sp.portrait)}" alt="">
      <div class="box"><div class="who">${esc(sp.name)}</div><div class="txt"></div><div class="hint">Toucher pour continuer ▸</div></div></div>`;
    el.querySelector('[data-skip]')!.addEventListener('click', (e) => {
      e.stopPropagation();
      finish();
    });
    const txt = el.querySelector<HTMLElement>('.txt')!;
    typed = 0;
    if (timer) clearInterval(timer);
    timer = setInterval(() => {
      typed = Math.min(line.text.length, typed + 2);
      txt.textContent = line.text.slice(0, typed);
      if (typed >= line.text.length && timer) clearInterval(timer);
    }, 16);
  };
  const advance = (): void => {
    const line = lines[i]!;
    if (typed < line.text.length) {
      typed = line.text.length;
      el.querySelector<HTMLElement>('.txt')!.textContent = line.text;
      return;
    }
    i++;
    if (i >= lines.length) finish();
    else render();
  };
  const onKey = (e: KeyboardEvent): void => {
    if (['Enter', 'Space', 'KeyX', 'KeyZ'].includes(e.code)) {
      e.preventDefault();
      advance();
    } else if (e.code === 'Escape') finish();
  };
  el.addEventListener('click', advance);
  window.addEventListener('keydown', onKey);
  render();
}
