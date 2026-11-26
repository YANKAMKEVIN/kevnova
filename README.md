# KEVNOVA

**Shoot'em up vertical original (bullet hell), jouable dans le navigateur, sur ordinateur et sur téléphone.**

Lyse et son drone-lanterne Pilou pilotent l'Étincelle à travers cinq secteurs pour rallumer Astrée, la dernière étoile, que la Flotte Éteignoir de l'Archonte Cendre est en train d'aspirer.

👉 **Jouer : https://yankamkevin.github.io/kevnova/**

## Le jeu

- **5 secteurs** (Nébuleuse Corail, Anneaux de Givre, Forge Écarlate, Abysse Lumineuse, Couronne Éteinte), chacun avec ses vagues, son décor et sa musique.
- **5 boss** à phases nommées (3 à 5 phases chacun), avec chrono et bonus de capture si on termine une phase sans être touché.
- **3 vaisseaux** : Étincelle (équilibrée), Lance (perçante, débloquée après le secteur 2), Gerbe (couvrante, après le secteur 4).
- **Hangar** : 7 améliorations permanentes achetées avec les éclats ramassés (canon, satellites Pilou, missiles chercheurs, bouclier, aimant, réserve Nova, coque).
- **Frôlement et Nova** : frôler les balles remplit la jauge Nova ; pleine, elle offre une bombe qui efface l'écran et transforme les balles en étoiles.
- **3 difficultés** (Doux, Normal, Infernal), rangs S/A/B/C par secteur, records.

## Commandes

| | Clavier | Manette | Tactile |
|---|---|---|---|
| Bouger | Flèches, ZQSD ou WASD | Stick ou croix | Glisser n'importe où (déplacement relatif, le doigt ne cache jamais le vaisseau) |
| Précision (lent, tir resserré, cœur visible) | Maj | LB / RB / X | Bouton PRÉCIS |
| Nova | X, C ou Espace | A / B | Bouton NOVA |
| Pause | Échap ou P | Start | Bouton ❚❚ |

Le tir est automatique.

## Technique

- **TypeScript strict**, modules séparés par responsabilité (`core`, `data`, `sim`, `render`, `audio`, `input`, `ui`, `save`, `meta`, `game`). ESLint interdit les fichiers de plus de 450 lignes.
- **Simulation déterministe** à pas fixe (60 Hz), sans aucune dépendance au DOM : même graine + mêmes commandes = même partie.
- **Pilote automatique** (`src/sim/bot.ts`) qui prédit les balles et choisit la manœuvre la plus sûre. Il joue toute la campagne dans les tests.
- **Perf mobile** : balles en tableaux typés (zéro allocation), sprites pré-réduits à la taille d'écran, balles allongées pré-tournées (32 orientations), HUD dessiné dans le canvas, résolution adaptative si l'appareil passe sous 60 i/s.
- **Sauvegarde versionnée et robuste** : enveloppe avec empreinte FNV-1a, copie de secours automatique, migrations (v1 → v2), réparation des champs invalides, refus des versions futures, aucun plantage si le stockage est plein ou interdit.
- **Audio 100 % synthétisé** (Web Audio) : effets et musiques générées par séquenceur, aucun fichier audio.
- **Illustrations** peintes générées avec Codex à partir d'un ADN de style verrouillé (`art/ecrire_prompts.py`), converties en WebP (`tools/assets.py`).

## Tests

```bash
npm ci
npm run check   # types + lint + tests unitaires avec couverture + build + bout en bout
```

- **Tests unitaires (Vitest)** : RNG, motifs de tir, trajectoires, combat, frôlement, boss et phases, objets, sauvegarde (corruption, secours, migrations), hangar et progression, données du jeu, budget de performance, et **la campagne complète jouée par le bot** (3 vaisseaux × 5 secteurs × 2 difficultés).
- **Tests de bout en bout (Playwright)** : le bot finit les 5 secteurs dans un vrai navigateur jusqu'à l'écran de fin, clavier et pause, hangar et sauvegarde après rechargement, réglages, cadence pendant un boss, glisser tactile et bouton Nova sur téléphone.
- **CI GitHub Actions** bloquante : rien n'est publié sur GitHub Pages si une étape échoue.

Options d'URL pour les démos et les tests : `?bot=1` (pilote automatique), `?speed=8` (accéléré), `?stage=forge` (secteur direct), `?seed=42`, `?fresh=1` (partie neuve).

---
Kevin Creations
