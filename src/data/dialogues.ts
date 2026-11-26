import type { StageId } from '../sim/types';

export type Speaker = 'lyse' | 'pilou' | 'archonte';

export interface Line {
  who: Speaker;
  text: string;
}

export const SPEAKERS: Record<Speaker, { name: string; portrait: string; color: string }> = {
  lyse: { name: 'Lyse', portrait: 'portrait_lyse', color: '#4fe3ff' },
  pilou: { name: 'Pilou', portrait: 'portrait_pilou', color: '#ffcf5a' },
  archonte: { name: 'L’Archonte Cendre', portrait: 'portrait_archonte', color: '#c86bff' },
};

export const INTRO: Line[] = [
  { who: 'pilou', text: 'Bip ! Astrée faiblit, Lyse. Encore trois jours et la dernière étoile s’éteint.' },
  { who: 'lyse', text: 'Alors on n’a pas trois jours. La Flotte Éteignoir aspire sa lumière depuis la Couronne.' },
  { who: 'archonte', text: 'Une étincelle contre l’éternité de la nuit ? Touchant. Inutile, mais touchant.' },
  { who: 'lyse', text: 'Accroche-toi, Pilou. On traverse les cinq secteurs, et on rallume le ciel.' },
];

export const BEFORE: Record<StageId, Line[]> = {
  corail: [
    { who: 'pilou', text: 'Nébuleuse Corail en vue ! Des moissonneuses arrachent les coraux de lumière.' },
    { who: 'lyse', text: 'Concentration sur Maj pour viser fin. Et frôle les tirs : ça charge la Nova.' },
  ],
  givre: [
    { who: 'pilou', text: 'Les Anneaux de Givre… Brrr. Mes circuits gèlent rien qu’à les regarder.' },
    { who: 'lyse', text: 'La Sentinelle garde le passage. On passe quand même.' },
  ],
  forge: [
    { who: 'pilou', text: 'Alerte chaleur ! C’est ici que la flotte fond la lumière volée en obsidienne.' },
    { who: 'lyse', text: 'Alors on éteint la forge. Pour de bon.' },
  ],
  abysse: [
    { who: 'archonte', text: 'L’Abysse avale tout ce qui brille. Tu y disparaîtras, petite flamme.' },
    { who: 'lyse', text: 'Dans le noir, on voit mieux les étoiles. Et moi, je brille fort.' },
  ],
  couronne: [
    { who: 'pilou', text: 'La Couronne Éteinte. Astrée est juste derrière. Je… j’ai un peu peur, Lyse.' },
    { who: 'lyse', text: 'Moi aussi. On y va ensemble.' },
    { who: 'archonte', text: 'Approche. Que je boive ta lumière en dernier.' },
  ],
};

export const AFTER: Record<StageId, Line[]> = {
  corail: [
    { who: 'pilou', text: 'Le Faucheur est tombé ! Les coraux se rallument un à un.' },
    { who: 'lyse', text: 'Un secteur de moins. On récupère les éclats et on file au hangar.' },
  ],
  givre: [
    { who: 'lyse', text: 'La glace fond. Pilou, la Lance est prête au hangar ?' },
    { who: 'pilou', text: 'Bip-bip ! Nouveau vaisseau débloqué : la Lance, perçante comme ton regard.' },
  ],
  forge: [
    { who: 'pilou', text: 'La forge s’éteint… Toute la lumière volée remonte vers le ciel !' },
    { who: 'archonte', text: 'Tu brises mes outils. Tu ne briseras pas ma volonté.' },
  ],
  abysse: [
    { who: 'lyse', text: 'Le Léviathan chantait pour ne pas avoir peur du noir. Je crois que je comprends.' },
    { who: 'pilou', text: 'Nouveau vaisseau débloqué : la Gerbe ! Cinq canons, zéro excuse.' },
  ],
  couronne: [
    { who: 'archonte', text: 'Impossible… La lumière… revient…' },
    { who: 'pilou', text: 'Astrée se rallume ! Lyse, regarde ! Le ciel entier se rallume !' },
    { who: 'lyse', text: 'On l’a fait, Pilou. Le ciel est à nouveau à tout le monde.' },
  ],
};
